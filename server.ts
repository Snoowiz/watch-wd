import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import fs from "fs";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import crypto from "crypto";
import dotenv from "dotenv";
import { SEED_TEMPLATES, defaultBranding } from "./seedTemplates";
import { cacheEngine } from "./src/utils/cacheManager.js";
import { MySQLAdapter, adminCompat } from "./db/MySQLAdapter.js";
import { testConnection, query, execute } from "./db/connection.js";
import { createMatchRouter } from "./api/v1/routes/matches.js";

dotenv.config();

let _filename = '';
let _dirname = '';
try {
  _filename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
  _dirname = _filename ? path.dirname(_filename) : (typeof __dirname !== 'undefined' ? __dirname : process.cwd());
} catch (e) {
  _filename = '';
  _dirname = process.cwd();
}
const currentFilename = _filename;
const currentDirname = _dirname;

const JWT_SECRET = process.env.JWT_SECRET || "watchwds-super-secret-key-2026";

// MySQL database adapter (replaces Firestore)
const db = new MySQLAdapter();
const admin = adminCompat;

// === API FRAGMENT CACHE MIDDLEWARE ===
function apiFragmentCache(ttlSeconds: number) {
  return (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    
    const key = `fragment::${req.originalUrl}`;
    const cached = cacheEngine.get('fragment', key);
    if (cached) {
      res.setHeader('X-Cache-Layer', 'Fragment');
      res.setHeader('X-Cache-Hit', 'true');
      return res.json(cached);
    }
    
    const origJson = res.json;
    res.json = function(body: any) {
      res.json = origJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheEngine.set('fragment', key, body, ttlSeconds);
      }
      return origJson.call(this, body);
    };
    next();
  };
}

// === CDN EDGE SIMULATOR MIDDLEWARE ===
function cdnEdgeSim(ttlSeconds: number) {
  return (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    const key = `cdn::${req.path}`;
    const cached = cacheEngine.get('cdn', key);

    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=30`);

    if (cached) {
      res.setHeader('X-CDN-Cache', cached.stale ? 'STALE' : 'HIT');
      res.setHeader('X-CDN-Edge-IP', '185.190.140.23');
      res.setHeader('X-CDN-Region', 'EU-West (London)');
      
      if (cached.stale) {
        process.nextTick(() => {
          console.log(`[CDN Edge SIM] Asynchronously revalidating stale route: ${key}`);
        });
      }
      return res.json(cached.value);
    }

    const origJson = res.json;
    res.json = function(body: any) {
      res.json = origJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheEngine.set('cdn', key, body, ttlSeconds);
      }
      res.setHeader('X-CDN-Cache', 'MISS');
      res.setHeader('X-CDN-Edge-IP', '185.190.140.23');
      res.setHeader('X-CDN-Region', 'EU-West (London)');
      return origJson.call(this, body);
    };
    next();
  };
}

// === DEPLOY CACHE WARMING FUNCTION ===
async function warmCriticalCaches() {
  return true;
  try {
    console.log('[Cache Warmer] Pre-heating database collections and API cache content...');
    
    const collectionsToWarm = ['features', 'matches', 'plans', 'tasks'];
    for (const coll of collectionsToWarm) {
      const snapshot = await db.collection(coll).get();
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Warm API Route cache keys
      cacheEngine.set('fragment', `fragment::/api/${coll}`, docs);
      
      // Warm CDN Cache keys
      cacheEngine.set('cdn', `cdn::/api/${coll}`, docs);
    }
    
    cacheEngine.logEvent('Deploy Cache Warming', 'Successfully pre-heated database collections, fragment API paths, and CDN POP simulators', 'general');
    return true;
  } catch (err: any) {
    console.error('[Cache Warmer] Error warming critical paths:', err);
    return false;
  }
}

// Helpers
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
};

async function notifyUser(userId: string, title: string, message: string, type: string = 'info', link: string | null = null, actorName: string | null = null, actorAvatar: string | null = null) {
  try {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    await db.collection("notifications").doc(id).set({
      id,
      userId,
      title,
      message,
      type,
      link,
      actorName,
      actorAvatar,
      isRead: 0,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to notify user', err);
  }
}

async function notifyAdmins(title: string, message: string, type: string = 'system', link: string | null = null, actorName: string | null = null, actorAvatar: string | null = null) {
  try {
    const snap = await db.collection("users").where("role", "==", "admin").get();
    for (const d of snap.docs) {
      await notifyUser(d.id, title, message, type, link, actorName, actorAvatar);
    }
  } catch (err) {
    console.error('Failed to notify admins', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.APP_PORT || process.env.PORT || 3000;
  fs.writeFileSync('server-pid.txt', process.pid.toString());

  let globalAppUrl = process.env.APP_URL || "http://localhost:3000";

  function getRequestBaseUrl(req: any): string {
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'watchwds.com';
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const finalProto = isLocal ? proto : 'https';
    return `${finalProto}://${host}`;
  }

  app.use(express.json({ limit: "50mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-My-Server", "true");
    globalAppUrl = getRequestBaseUrl(req);
    next();
  });
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use("/api", (req, res, next) => { console.log(`[API] ${req.method} ${req.url}`); next(); });

  // === API v1 — External third-party endpoints ===
  app.use("/api/v1/matches", createMatchRouter({ db, cacheEngine }));

  const normalizeUser = (docId: string, data: any) => {
    if (!data) return null;
    const { password: _, plan_id, plan_expires_at, ...userData } = data;
    const normalized = { 
      id: docId, 
      ...userData,
      planId: plan_id,
      planExpiresAt: plan_expires_at
    };
    if (normalized.balance === undefined) {
      normalized.balance = normalized.points !== undefined ? Number(normalized.points) : 0;
    } else {
      normalized.balance = Number(normalized.balance);
    }
    return normalized;
  };

  // === AUTHENTICATION ===
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, device_id } = req.body;
      const hash = bcrypt.hashSync(password, 10);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      
      const role = email === 'mayycutee1@gmail.com' ? 'admin' : 'viewer';
      const userData = { email, password: hash, name, active_device_id: finalDeviceId, role, balance: 0, status: "active", created_at: new Date().toISOString() };
      const result = await db.collection("users").add(userData);
      
      const token = jwt.sign({ id: result.id, role: userData.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      notifyAdmins("New User Registration", `${name || email} has joined the platform.`, "system", "/admin/users");
      notifyUser(result.id, "Welcome to WatchWDS!", "Your account has been created successfully.", "info", "/profile");
      
      sendTemplateEmail(email, "welcome_email", {
        first_name: name || "User",
        user_name: name || email,
        user_email: email,
        website_url: getRequestBaseUrl(req),
        support_email: "support@watchwds.com"
      }).catch(err => console.error("Failed to send welcome email:", err));

      res.json({ token, user: normalizeUser(result.id, userData), device_id: finalDeviceId });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get("/api/testdb", async (req, res) => {
    try {
      const snap = await db.collection("users").limit(1).get();
      res.json({ success: true, dbType: "mysql", size: snap.size });
    } catch (e: any) {
      res.status(500).json({ error: e.message, dbType: "mysql" });
    }
  });

  app.post("/api/testpost", async (req, res) => {
    try {
      const snap = await db.collection("users").where("email", "==", req.body.email).get();
      res.json({ success: true, dbType: "mysql", size: snap.size });
    } catch (e: any) {
      res.status(500).json({ error: e.message, dbType: "mysql" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, device_id } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const snapshot = await db.collection("users").where("email", "==", email).get();

      if (snapshot.empty) return res.status(401).json({ error: "Invalid credentials" });
      
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();

      // For google-auth users logging in via email/password intentionally without password? Not possible, but check.
      if (user.password === "google-auth-no-password") return res.status(401).json({ error: "Please use Google to log in" });
      if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });

      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });

      const token = jwt.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, name, avatar, device_id } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });
      
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      
      const snapshot = await db.collection("users").where("email", "==", email).get();
      let user: any = null;
      let docId = "";

      if (snapshot.empty) {
        const role = email === 'mayycutee1@gmail.com' ? 'admin' : 'viewer';
        user = { email, password: "google-auth-no-password", name, avatar, active_device_id: finalDeviceId, role, balance: 0, status: "active", created_at: new Date().toISOString() };
        const result = await db.collection("users").add(user);
        docId = result.id;
      } else {
        const doc = snapshot.docs[0];
        docId = doc.id;
        user = doc.data();
        if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
        if (email === 'mayycutee1@gmail.com' && user.role !== 'admin') {
          user.role = 'admin';
          await doc.ref.update({ role: 'admin', active_device_id: finalDeviceId, avatar });
        } else {
          await doc.ref.update({ active_device_id: finalDeviceId, avatar });
        }
        user.avatar = avatar;
      }

      const token = jwt.sign({ id: docId, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(docId, user), device_id: finalDeviceId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/auth/google/validate-credentials", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can validate Google credentials" });
    }
    try {
      const { clientId, clientSecret } = req.body;
      const errors: string[] = [];

      if (!clientId) {
        errors.push("Google Client ID is required.");
      } else if (!/^[0-9a-zA-Z._-]+.apps.googleusercontent.com$/.test(clientId)) {
        errors.push("Invalid Client ID format. It should end with '.apps.googleusercontent.com'.");
      }

      if (!clientSecret) {
        errors.push("Google Client Secret is required.");
      } else if (clientSecret.length < 10) {
        errors.push("Google Client Secret is too short to be valid.");
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      try {
        const response = await fetch("https://accounts.google.com/.well-known/openid-configuration");
        if (!response.ok) {
          throw new Error("Unable to connect to Google OAuth discovery services.");
        }
      } catch (connErr) {
        return res.status(502).json({ 
          success: false, 
          errors: ["Connectivity Warning: Could not reach Google's authentication discovery endpoints. Please verify your server's network connection."] 
        });
      }

      res.json({ success: true, message: "Credentials format and connection checks completed successfully." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const doc = await db.collection("users").doc(req.user.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const user = doc.data() as any;
      if (req.user.device_id && user.active_device_id && req.user.device_id !== user.active_device_id) {
        return res.status(401).json({ error: "Session invalidated." });
      }
      res.json({ user: normalizeUser(doc.id, user) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/auth/profile", authenticate, async (req: any, res) => {
    try {
      const updates = req.body;
      // Remove any undefined or null values
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
      
      await db.collection("users").doc(req.user.id).update(updates);
      const doc = await db.collection("users").doc(req.user.id).get();
      res.json({ user: normalizeUser(doc.id, doc.data()) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const snaps = await db.collection('users').where('email','==',req.body.email).get();
      if (!snaps.empty) {
         const user = snaps.docs[0].data();
         const name = user.name || "User";
         // Create reset token
         const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
         await db.collection('password_resets').add({ email: req.body.email, token, expires_at: new Date(Date.now() + 60*60*1000) });

         const resetLink = `${getRequestBaseUrl(req)}/reset-password?token=${token}`;
         sendTemplateEmail(req.body.email, "password_reset_branding", {
           first_name: name,
           reset_password_link: resetLink,
           support_email: "support@watchwds.com"
         }).catch(err => console.error("Failed to send password reset email:", err));
      }
      res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
    } catch (e:any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, new_password } = req.body;
      const snap = await db.collection('password_resets').where('token','==',token).get();
      if (snap.empty) return res.status(400).json({ error: 'Invalid or expired token' });
      const reset = snap.docs[0].data();
      const expiresDate = typeof reset.expires_at === 'string' ? new Date(reset.expires_at) : (reset.expires_at instanceof Date ? reset.expires_at : new Date(reset.expires_at));
      if (expiresDate < new Date()) return res.status(400).json({ error: 'Token expired' });
      
      // Update password
      const users = await db.collection('users').where('email','==',reset.email).get();
      if (!users.empty) {
         const hash = bcrypt.hashSync(new_password, 10);
         await users.docs[0].ref.update({ password: hash });
         await snap.docs[0].ref.delete();
      }
      res.json({ message: 'Password has been reset successfully' });
    } catch(e:any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/notifications/notify-match-live", authenticate, async (req: any, res) => {
    try {
      const { matchId, matchTitle } = req.body;
      
      console.log(`[PUSH] Match Live -> ${matchId} (${matchTitle})`);

      // Find all users who saved this match
      const savedSnap = await db.collection("saved_matches").where("match_id", "==", matchId).get();
      const userIds = savedSnap.docs.map(d => d.data().user_id);

      if (userIds.length > 0) {
        const matchDoc = await db.collection("matches").doc(matchId).get();
        const matchData = matchDoc.exists ? matchDoc.data() : {};
        
        // Fetch all users to filter down
        const usersSnap = await db.collection("users").get();
        const usersToEmail = usersSnap.docs.filter(u => userIds.includes(u.id));

        for (const userDoc of usersToEmail) {
          const user = userDoc.data();
          sendTemplateEmail(user.email, "match_live_now", {
            first_name: user.name || "User",
            match_name: matchData.title || matchTitle || "Saved Match",
            website_url: `${getRequestBaseUrl(req)}/matches/${matchId}`
          }).catch(err => console.error(`Failed to send match live email to ${user.email}:`, err));
        }
      }
      
      res.json({ success: true, message: `Notification broadcast sent for match ${matchId}`});
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === NOTIFICATIONS CRUD API ===
  app.get("/api/notifications", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("notifications").where("user_id", "==", req.user.id).get();
      const list = snap.docs.map(d => {
        const rawId = d.id;
        let parsedId: any = rawId;
        if (/^\d+$/.test(rawId)) {
          parsedId = parseInt(rawId, 10);
        }
        return { ...d.data(), id: parsedId };
      });
      list.sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/notifications", authenticate, async (req: any, res) => {
    try {
      const notification = req.body;
      const ref = db.collection("notifications").doc();
      const numericalId = Date.now() + Math.floor(Math.random() * 1000);
      const data = {
        ...notification,
        id: numericalId,
        user_id: notification.user_id || req.user.id,
        is_read: 0,
        created_at: new Date().toISOString()
      };
      await ref.set(data);
      res.json({ id: numericalId, ...data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/notifications/:id/read", authenticate, async (req: any, res) => {
    try {
      const { id } = req.params;
      // Fetch all to find the one matching the id
      const snap = await db.collection("notifications").get();
      const docToUpdate = snap.docs.find(d => {
        const data = d.data();
        return String(d.id) === String(id) || String(data.id) === String(id);
      });
      if (docToUpdate) {
        await docToUpdate.ref.update({ is_read: 1 });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/notifications/read-all", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("notifications").where("user_id", "==", req.user.id).get();
      for (const d of snap.docs) {
        await d.ref.update({ is_read: 1 });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/features", cdnEdgeSim(60), apiFragmentCache(30), async (req, res) => {
    try {
      const snap = await db.collection("features").get();
      res.json(snap.docs.map(d => {
        const data = d.data();
        return {
          id: Number(d.id) || d.id,
          slug: data.slug || data.key_name || '',
          name: data.name || data.label || '',
          description: data.description || '',
          is_active: data.is_active !== undefined ? Number(data.is_active) : (data.enabled ? 1 : 0)
        };
      }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/matches", cdnEdgeSim(30), apiFragmentCache(15), async (req, res) => {
    try {
      const snap = await db.collection("matches").orderBy("start_time", "desc").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/access/verify", authenticate, async (req: any, res) => {
    // simplified for brevity
    res.json({ hasAccess: true }); 
  });

  // === SEARCH ENDPOINT ===
  app.get("/api/search", async (req, res) => {
    try {
      const queryStr = String(req.query.q || "").trim().toLowerCase();
      const type = String(req.query.type || "all");
      
      if (!queryStr) {
        return res.json({
          matches: [],
          blogs: [],
          forums: [],
          kb: [],
          totalCount: 0
        });
      }
      
      const keywords = queryStr.split(/\s+/).filter(Boolean);
      
      let matches: any[] = [];
      let blogs: any[] = [];
      let forums: any[] = [];
      let kb: any[] = [];
      
      // Dynamic scoring helper
      const calculateScore = (title: string, excerpt: string, bodyContent: string, tagsList: string[] = [], categoryValue = "") => {
        let score = 0;
        const lowercaseTitle = (title || "").toLowerCase();
        const lowercaseExcerpt = (excerpt || "").toLowerCase();
        const lowercaseBody = (bodyContent || "").toLowerCase();
        
        // Boost for exact phrase match
        if (lowercaseTitle.includes(queryStr)) score += 120;
        else if (lowercaseExcerpt.includes(queryStr)) score += 60;
        else if (lowercaseBody.includes(queryStr)) score += 20;
        
        // Keyword overlap match scoring
        keywords.forEach(keyword => {
          if (lowercaseTitle.includes(keyword)) {
            score += 40;
            if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowercaseTitle)) score += 20;
          }
          if (lowercaseExcerpt.includes(keyword)) {
            score += 15;
          }
          if (lowercaseBody.includes(keyword)) {
            score += 5;
          }
          if (categoryValue && categoryValue.toLowerCase().includes(keyword)) {
            score += 15;
          }
          if (tagsList && tagsList.some(tag => String(tag || "").toLowerCase().includes(keyword))) {
            score += 30;
          }
        });
        
        return score;
      };

      // 1. Search Matches
      if (type === "all" || type === "matches") {
        const matchesSnap = await db.collection("matches").get();
        matches = matchesSnap.docs.map(doc => {
          const data = doc.data() as any;
          return { id: Number(doc.id) || doc.id, ...data };
        })
        .map((item: any) => {
          const score = calculateScore(item.title, item.description || "", item.content || "", item.categories || []);
          return { ...item, _score: score };
        })
        .filter((item: any) => item._score > 0)
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      // 2. Search Blog posts (CMS Articles)
      if (type === "all" || type === "blog") {
        const blogsSnap = await db.collection("blog_posts").get();
        blogs = blogsSnap.docs.map(doc => {
          const data = doc.data() as any;
          return { id: Number(doc.id) || doc.id, ...data };
        })
        .map((item: any) => {
          const score = calculateScore(item.title, item.excerpt || "", item.content || "", item.tags || [], item.categories?.join(" ") || "");
          return { ...item, _score: score };
        })
        .filter((item: any) => item._score > 0 && item.status === "published")
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      // 3. Search Forum topics
      if (type === "all" || type === "forum") {
        const topicsSnap = await db.collection("forum_topics").get();
        forums = topicsSnap.docs.map(doc => {
          const data = doc.data() as any;
          return { id: Number(doc.id) || doc.id, ...data };
        })
        .map((item: any) => {
          const score = calculateScore(item.title, "", item.content || "");
          return { ...item, _score: score };
        })
        .filter((item: any) => item._score > 0)
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      // 4. Search Knowledge Base
      if (type === "all" || type === "kb") {
        const kbSnap = await db.collection("knowledge_base").get();
        kb = kbSnap.docs.map(doc => {
          const data = doc.data() as any;
          return { id: doc.id, ...data };
        })
        .map((item: any) => {
          const score = calculateScore(item.title, "", item.content || "", item.tags || [], item.category || "");
          return { ...item, _score: score };
        })
        .filter((item: any) => item._score > 0)
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      const totalCount = matches.length + blogs.length + forums.length + kb.length;
      
      res.json({
        matches,
        blogs,
        forums,
        kb,
        totalCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === FORUM API ENDPOINTS ===
  app.get("/api/forum/categories", async (req, res) => {
    try {
      const snap = await db.collection("forum_categories").get();
      const categories = snap.docs.map(doc => ({
        id: Number(doc.id) || doc.id,
        ...doc.data()
      }));
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/forum/categories/:id/topics", async (req, res) => {
    try {
      const { id } = req.params;
      const topicsSnap = await db.collection("forum_topics").where("category_id", "==", String(id)).get();
      const topics = topicsSnap.docs.map(doc => ({
        id: Number(doc.id) || doc.id,
        category_id: doc.data().category_id,
        ...doc.data()
      } as any));
      topics.sort((a: any, b: any) => {
        if (a.is_pinned !== b.is_pinned) {
          return (b.is_pinned || 0) - (a.is_pinned || 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      res.json(topics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/forum/topics", authenticate, async (req: any, res) => {
    try {
      const { category_id, title, content } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Title and content are required" });
      
      const userDoc = await db.collection("users").doc(req.user.id.toString()).get();
      const userData = userDoc.exists ? userDoc.data() : { name: "User" };
      
      const topicId = Date.now();
      const topicData = {
        id: topicId,
        category_id: String(category_id || "1"),
        title,
        content,
        author_id: req.user.id,
        author_name: userData.name || "Anonymous",
        author_avatar: userData.avatar || "",
        reply_count: 0,
        is_pinned: 0,
        is_locked: 0,
        created_at: new Date().toISOString()
      };
      
      await db.collection("forum_topics").doc(topicId.toString()).set(topicData);
      res.json({ success: true, id: topicId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/forum/topics/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const topicDoc = await db.collection("forum_topics").doc(id).get();
      if (!topicDoc.exists) return res.status(404).json({ error: "Topic not found" });
      
      const topic = { id: Number(topicDoc.id) || topicDoc.id, ...topicDoc.data() as any };
      
      const repliesSnap = await db.collection("forum_replies").where("topic_id", "==", String(id)).get();
      const replies = repliesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
      
      replies.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      res.json({ topic, replies });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/forum/topics/:id/replies", authenticate, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      
      const topicDoc = await db.collection("forum_topics").doc(id).get();
      if (!topicDoc.exists) return res.status(404).json({ error: "Topic not found" });
      
      const userDoc = await db.collection("users").doc(req.user.id.toString()).get();
      const userData = userDoc.exists ? userDoc.data() : { name: "User", role: "viewer" };
      
      const replyData = {
        topic_id: String(id),
        content,
        author_id: req.user.id,
        author_name: userData.name || "Anonymous",
        author_avatar: userData.avatar || "",
        author_role: userData.role || "user",
        created_at: new Date().toISOString()
      };
      
      const replyRef = await db.collection("forum_replies").add(replyData);
      
      const topicData = topicDoc.data();
      await db.collection("forum_topics").doc(id).update({
        reply_count: (topicData.reply_count || 0) + 1
      });
      
      res.json({ success: true, id: replyRef.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === FORUM & KNOWLEDGE BASE SEEDER ===
  async function seedForumAndKB() {
    try {
      const categoriesSnap = await db.collection("forum_categories").get();
      if (categoriesSnap.empty) {
        console.log("[FORUM SEEDER] Seeding default forum categories...");
        const defaultForumCategories = [
          { id: "1", name: "General Discussion", description: "Talk about anything related to WatchWDS or sports in general." },
          { id: "2", name: "Match Chat", description: "Discuss live streamed games, past matches, and highlights." },
          { id: "3", name: "Suggestions & Feedback", description: "Help us improve WatchWDS! Share your feature requests and ideas." },
        ];
        for (const cat of defaultForumCategories) {
          await db.collection("forum_categories").doc(cat.id).set(cat);
        }
        console.log("[FORUM SEEDER] Seeded 3 categories.");

        await db.collection("forum_topics").doc("101").set({
          id: 101,
          category_id: "1",
          title: "Welcome to the WatchWDS Fan Forum!",
          content: "<p>We are thrilled to launch our new community hub! Introduce yourselves here and let us know what teams you support.</p>",
          author_name: "Admin Support",
          author_id: 1,
          author_avatar: "",
          reply_count: 1,
          is_pinned: 1,
          is_locked: 0,
          created_at: new Date(Date.now() - 86400000).toISOString()
        });

        await db.collection("forum_replies").add({
          topic_id: "101",
          content: "<p>Welcome everyone! Excited to get this started.</p>",
          author_name: "Admin Support",
          author_id: 1,
          author_avatar: "",
          author_role: "admin",
          created_at: new Date(Date.now() - 86400000 + 10000).toISOString()
        });
      }

      const kbSnap = await db.collection("knowledge_base").get();
      if (kbSnap.empty) {
        console.log("[KB SEEDER] Seeding default knowledge base articles...");
        const defaultKB = [
          {
            id: "kb1",
            title: "How to add funds to my wallet?",
            content: "You can add funds to your WatchWDS wallet by clicking on 'Add Funds' in the user dropdown menu, entering the desired amount, and completing the payment transaction safely. Once completed, your balance will update instantly.",
            tags: ["wallet", "funds", "payment", "balance"],
            category: "Billing & Wallet",
            createdAt: new Date().toISOString()
          },
          {
            id: "kb2",
            title: "How to watch premium matches?",
            content: "Premium matches require a Pay-Per-View unlock or an active subscription plan. Make sure you have enough balance in your wallet, and click the 'Unlock Match' button on the match page. The required amount will be deducted from your balance.",
            tags: ["match", "watch", "premium", "ppv"],
            category: "Streaming guide",
            createdAt: new Date().toISOString()
          },
          {
            id: "kb3",
            title: "How to become a creator on WatchWDS?",
            content: "Go to your Profile settings, click on 'Become Creator', fill out your channel name and description, and submit. An admin will review your application soon. Once approved, you can schedule matches and earn from subscriptions.",
            tags: ["creator", "become creator", "channel", "apply"],
            category: "Creators",
            createdAt: new Date().toISOString()
          },
          {
            id: "kb4",
            title: "How do I reset my password?",
            content: "If you forgot your password, go to the Login page, click 'Forgot Password?', enter your registered email address, and follow the password reset link sent to your inbox to set a secure new password.",
            tags: ["password", "reset", "forgot password", "login"],
            category: "Account Safety",
            createdAt: new Date().toISOString()
          },
          {
            id: "kb5",
            title: "What is the refund policy?",
            content: "All transactions on WatchWDS are final. Points unlocked for Pay-Per-View matches or active subscriptions cannot be refunded to your standard financial accounts, owing to support of direct local sports creators.",
            tags: ["refund", "policy", "billing", "cancel"],
            category: "Billing & Wallet",
            createdAt: new Date().toISOString()
          }
        ];
        for (const kb of defaultKB) {
          await db.collection("knowledge_base").doc(kb.id).set(kb);
        }
        console.log("[KB SEEDER] Seeded 5 articles.");
      }
    } catch (err: any) {
      console.error("[SEED FORUM/KB ERROR]", err.message);
    }
  }

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const doc = await db.collection("matches").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      res.json({ id: doc.id, ...doc.data() });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/matches", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const matchData = { ...req.body };
      if (matchData.date && !matchData.startTime && !matchData.start_time) {
        matchData.start_time = matchData.date;
      }
      const docRef = await db.collection("matches").add({ ...matchData, operator_id: req.user.id, created_at: new Date().toISOString() });
      
      // Invalidate cache immediately on update
      cacheEngine.invalidateCollection("matches");

      // Send email alert to admins
      const adminsSnap = await db.collection("users").where("role", "==", "admin").get();
      for (const adminDoc of adminsSnap.docs) {
        const admin = adminDoc.data();
        sendTemplateEmail(admin.email, "admin_new_match_alert", {
          match_name: req.body.title || "New Match",
          creator_name: req.user.name || "Staff",
          match_date: req.body.start_time || req.body.date || new Date().toLocaleString(),
          website_url: getRequestBaseUrl(req)
        }).catch(err => console.error(`Failed to send admin match alert to ${admin.email}:`, err));
      }

      res.json({ id: docRef.id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const matchData = { ...req.body };
      if (matchData.date && !matchData.startTime && !matchData.start_time) {
        matchData.start_time = matchData.date;
      }
      await db.collection("matches").doc(req.params.id).update(matchData);
      cacheEngine.invalidateCollection("matches");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      await db.collection("matches").doc(req.params.id).delete();
      cacheEngine.invalidateCollection("matches");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/saved-matches", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).get();
      res.json(snap.docs.map(d => d.data().match_id));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  
  app.get("/api/saved-matches/details", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).get();
      const matchIds = snap.docs.map(d => d.data().match_id);
      if(matchIds.length === 0) return res.json([]);
      // Use IN query for MySQL
      const matchSnap = await db.collection("matches").where("id", "in", matchIds.slice(0, 30)).get();
      res.json(matchSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/matches/:id/save", authenticate, async (req: any, res) => {
    try {
      await db.collection("saved_matches").add({ user_id: req.user.id, match_id: req.params.id });
      notifyUser(req.user.id, "Match Saved", `You saved Match #${req.params.id} to watch later.`, "info", `/matches/${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === EMAIL DISPATCH & BRANDING SYSTEM ===
  async function seedEmailSystem() {
    try {
      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      if (!brandingDoc.exists) {
        await db.collection("email_branding").doc("settings").set(defaultBranding);
        console.log("[EMAIL SEEDER] Seeded default email branding configurations.");
      }

      const smtpDoc = await db.collection("email_settings").doc("smtp").get();
      if (!smtpDoc.exists) {
        await db.collection("email_settings").doc("smtp").set({
          host: "smtp.example.com",
          port: 465,
          auth_user: "user@example.com",
          auth_pass: "",
          secure: true,
          is_active: false,
          from_name: "WatchWDS Support",
          from_email: "noreply@watchwds.com",
          reply_to: "support@watchwds.com",
          provider: "smtp"
        });
        console.log("[EMAIL SEEDER] Seeded default SMTP configuration.");
      }

      const templatesSnap = await db.collection("email_templates").get();
      if (templatesSnap.empty) {
        console.log(`[EMAIL SEEDER] Seeding ${SEED_TEMPLATES.length} default email templates...`);
        for (const t of SEED_TEMPLATES) {
          await db.collection("email_templates").doc(t.slug).set({
            ...t,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          await db.collection("email_template_analytics").doc(t.slug).set({
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            failed: 0,
            bounced: 0,
            last_sent_at: ""
          });
        }
        console.log("[EMAIL SEEDER] Seeded 44 templates successfully.");
      }
    } catch (err: any) {
      console.error("[EMAIL SEEDER] Error during seeding:", err.message);
    }
  }

  async function renderEmailTemplate(slug: string, variables: Record<string, string>) {
    const brandingDoc = await db.collection("email_branding").doc("settings").get();
    const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;

    const templateDoc = await db.collection("email_templates").doc(slug).get();
    if (!templateDoc.exists) throw new Error("Template not found: " + slug);
    const template = templateDoc.data();

    let body = template.body;
    let subject = template.subject;

    const allVars = {
      first_name: "John",
      last_name: "Doe",
      user_name: "johndoe",
      user_email: "johndoe@example.com",
      match_name: "El Clásico Derby",
      match_date: new Date().toLocaleDateString(),
      match_time: "20:00 UTC",
      league_name: "Champions League",
      club_name: "Real FC",
      subscription_name: "Platinum Annual Access",
      purchase_amount: "49.99",
      transaction_id: "TXN_78291039",
      invoice_number: "INV-2026-908",
      support_email: "support@watchwds.com",
      company_name: "WatchWDS",
      website_url: globalAppUrl,
      reset_password_link: `${globalAppUrl}/auth/reset?token=abc`,
      verification_link: `${globalAppUrl}/auth/verify?token=xyz`,
      creator_name: "ProStreamer X",
      ...variables
    };

    Object.entries(allVars).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      body = body.replace(regex, String(val));
      subject = subject.replace(regex, String(val));
    });

    const siteUrl = allVars.website_url;
    body += `<img src="${siteUrl}/api/email/track-open?slug=${slug}" width="1" height="1" style="display:none;" />`;

    body = body.replace(/href="([^"]+)"/g, (match, p1) => {
      if (p1.includes("track-") || p1.includes("mailto:")) return match;
      return `href="${siteUrl}/api/email/track-click?slug=${slug}&url=${encodeURIComponent(p1)}"`;
    });

    const masterLayout = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .email-header { padding: 32px; text-align: center; }
    .email-logo { max-height: 48px; }
    .email-body { padding: 40px; color: #1e293b; font-size: 16px; line-height: 1.6; }
    .email-body h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .email-footer { padding: 32px; text-align: center; color: #cbd5e1; font-size: 12px; }
    .email-footer a { color: #f1f5f9; text-decoration: none; font-weight: bold; margin: 0 4px; }
    .button { display: inline-block; padding: 12px 24px; font-weight: bold; text-decoration: none; font-size: 14px; margin: 24px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .meta-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .meta-table td.label { font-weight: bold; color: #64748b; width: 40%; }
    .meta-table td.value { color: #1e293b; font-weight: 500; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header" style="background-color: ${branding.secondary_color || "#0f172a"}; text-align: center;">
      <img src="${branding.logo_url}" alt="WatchWDS" class="email-logo" style="max-height: 48px;" />
    </div>
    <div class="email-body">
      ${body}
    </div>
    <div class="email-footer" style="background-color: ${branding.secondary_color || "#0f172a"}; text-align: center;">
      <div style="margin-bottom: 16px; color: #cbd5e1; line-height: 1.4;">${branding.footer_content}</div>
      <div style="margin-bottom: 16px;">
        <a href="${branding.social_twitter || "https://twitter.com"}" style="color: #cbd5e1;">Twitter</a> &bull; 
        <a href="${branding.social_facebook || "https://facebook.com"}" style="color: #cbd5e1;">Facebook</a> &bull; 
        <a href="${branding.social_instagram || "https://instagram.com"}" style="color: #cbd5e1;">Instagram</a> &bull; 
        <a href="${branding.social_youtube || "https://youtube.com"}" style="color: #cbd5e1;">YouTube</a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
        ${branding.contact_info}<br/>
        ${branding.copyright_text}
      </div>
    </div>
  </div>
</body>
</html>`;

    return { subject, html: masterLayout };
  }

  async function dispatchEmail(to: string, subject: string, html: string, text?: string) {
    const settingsDoc = await db.collection("email_settings").doc("smtp").get();
    if (!settingsDoc.exists) throw new Error("No SMTP configuration found.");
    const smtp = settingsDoc.data();

    if (!smtp.is_active) {
      console.log(`[STUB EMAIL SEND] System inactive. To: ${to}, Subject: ${subject}`);
      return { success: true, provider: "mock", messageId: "mock-" + Date.now() };
    }

    if (smtp.provider === "smtp" || !smtp.provider) {
      const isSecure = smtp.secure === true || smtp.secure === 1 || String(smtp.secure) === "true" || Number(smtp.port) === 465;
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port),
        secure: isSecure,
        auth: {
          user: smtp.auth_user,
          pass: smtp.auth_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      try {
        const info = await transporter.sendMail({
          from: `"${smtp.from_name}" <${smtp.from_email}>`,
          replyTo: smtp.reply_to || smtp.from_email,
          to,
          subject,
          html,
          text: text || "WatchWDS Email Support"
        });
        console.log(`[SMTP SUCCESS] Sent email to ${to} (Subject: ${subject}) via SMTP. MessageId: ${info.messageId}`);
        return { success: true, provider: "smtp", messageId: info.messageId };
      } catch (err: any) {
        console.error(`[SMTP ERROR] Direct SMTP sendMail failed for ${to}:`, err.message || err);
        throw err;
      }
    } else {
      console.log(`[EXTERNAL PROVIDER DISPATCH] Routed via ${smtp.provider.toUpperCase()} to ${to} (Key: ${smtp.api_key ? "VALID" : "NONE"})`);
      return { success: true, provider: smtp.provider, messageId: `${smtp.provider}-dispatch-${Date.now()}` };
    }
  }

  async function sendTemplateEmail(to: string, slug: string, variables: Record<string, string>) {
    try {
      const { subject, html } = await renderEmailTemplate(slug, variables);
      const result = await dispatchEmail(to, subject, html);
      console.log(`[EMAIL DISPATCH] Sent ${slug} to ${to}: ${result.success ? "success" : "failed"}`);
      
      const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
      if (analyticsDoc.exists) {
        const data = analyticsDoc.data();
        await db.collection("email_template_analytics").doc(slug).update({
          sent: (data.sent || 0) + 1,
          delivered: (data.delivered || 0) + 1,
          last_sent_at: new Date().toISOString()
        });
      }
      return result;
    } catch (err: any) {
      console.error(`[EMAIL ERROR] Failed to send template ${slug} to ${to}:`, err.message || err);
      return { success: false, error: err.message };
    }
  }

  // Seed standard items
  seedEmailSystem().catch(err => console.error("Failed to seed mail system:", err));
  seedForumAndKB().catch(err => console.error("Failed to seed forum and knowledge base:", err));

  // EMAIL OPEN TRACKING
  app.get("/api/email/track-open", async (req, res) => {
    const { slug } = req.query as { slug: string };
    if (slug) {
      try {
        const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
        if (analyticsDoc.exists) {
          const data = analyticsDoc.data();
          await db.collection("email_template_analytics").doc(slug).update({
            opened: (data.opened || 0) + 1
          });
        }
      } catch (err) {
        console.error("Failed to track open:", err);
      }
    }
    const buf = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": buf.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    });
    res.end(buf);
  });

  // EMAIL CLICK TRACKING
  app.get("/api/email/track-click", async (req, res) => {
    const { slug, url } = req.query as { slug: string, url: string };
    if (slug) {
      try {
        const analyticsDoc = await db.collection("email_template_analytics").doc(slug).get();
        if (analyticsDoc.exists) {
          const data = analyticsDoc.data();
          await db.collection("email_template_analytics").doc(slug).update({
            clicked: (data.clicked || 0) + 1
          });
        }
      } catch (err) {
        console.error("Failed to track click:", err);
      }
    }
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.redirect("/");
    }
  });

  // GET EMAIL SETTINGS
  app.get("/api/admin/email/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const smtpDoc = await db.collection("email_settings").doc("smtp").get();
      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      
      const smtp = smtpDoc.exists ? smtpDoc.data() : {};
      const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;
      
      res.json({ ...smtp, branding });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT EMAIL SETTINGS
  app.put("/api/admin/email/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { branding, ...smtp } = req.body;
      
      if (smtp) {
        await db.collection("email_settings").doc("smtp").set({
          ...smtp,
          secure: smtp.secure === true || smtp.secure === 1,
          is_active: smtp.is_active === true || smtp.is_active === 1
        });
      }
      
      if (branding) {
        await db.collection("email_branding").doc("settings").set(branding);
      }

      res.json({ success: true, message: "Settings saved successfully" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST TEST EMAIL
  app.post("/api/admin/email/test", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) return res.status(400).json({ error: "Recipient email is required" });

      const testSubject = "WatchWDS SMTP Connection Verification";
      const testHtml = `<h2>SMTP Server Connected!</h2>
<p>Success! This email verifies that your SMTP server configuration on WatchWDS is active and dispatching emails correctly.</p>
<p>Timestamp: <strong>${new Date().toLocaleString()}</strong></p>
<p>If you received this message, your mail relay configurations are fully operational!</p>`;

      const brandingDoc = await db.collection("email_branding").doc("settings").get();
      const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;

      const fullLayout = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background: #f8fafc; padding: 20px; }
    .cont { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .hdr { background: ${branding.secondary_color || "#0f172a"}; padding: 24px; text-align: center; }
    .bdy { padding: 32px; color: #1e293b; line-height: 1.5; }
    .ftr { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="cont">
    <div class="hdr"><img src="${branding.logo_url}" style="max-height: 36px;" /></div>
    <div class="bdy">${testHtml}</div>
    <div class="ftr">${branding.contact_info}</div>
  </div>
</body>
</html>`;

      const result = await dispatchEmail(to, testSubject, fullLayout);
      res.json({ success: true, message: `Test email successfully dispatched to ${to} via ${result.provider}! ID: ${result.messageId}` });
    } catch (e: any) { 
      res.status(500).json({ success: false, message: "Email send failed: " + e.message }); 
    }
  });

  // GET TEMPLATES
  app.get("/api/admin/email/templates", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("email_templates").get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(list);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET TEMPLATE BY ID (WITH HISTORICAL VERSIONS)
  app.get("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });

      const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      const versions = versSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
        .sort((a: any, b: any) => b.version_number - a.version_number);

      res.json({
        ...doc.data(),
        id: doc.id,
        versions
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST CREATE CUSTOM TEMPLATE
  app.post("/api/admin/email/templates", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, subject, body, category, variables_hint } = req.body;
      if (!name || !subject || !body) return res.status(400).json({ error: "Missing required fields" });
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|_+$)/g, "");
      const checkDoc = await db.collection("email_templates").doc(slug).get();
      const finalSlug = checkDoc.exists ? `${slug}_${Date.now()}` : slug;

      const newTemplate = {
        slug: finalSlug,
        name,
        subject,
        body,
        category: category || "Custom",
        variables_hint: variables_hint || "user_name, user_email",
        is_active: true,
        is_custom: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.collection("email_templates").doc(finalSlug).set(newTemplate);

      await db.collection("email_template_analytics").doc(finalSlug).set({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        last_sent_at: ""
      });

      res.json({ id: finalSlug, ...newTemplate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT UPDATE TEMPLATE
  app.put("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const templateDoc = await db.collection("email_templates").doc(req.params.id).get();
      if (!templateDoc.exists) return res.status(404).json({ error: "Template not found" });

      const current = templateDoc.data();
      const { subject, body, name, category, is_active, variables_hint } = req.body;

      const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      const nextVersionNum = versSnap.docs.length + 1;

      await db.collection("email_versions").add({
        template_id: req.params.id,
        subject: current.subject,
        body: current.body,
        version_number: nextVersionNum,
        created_at: new Date().toISOString(),
        created_by: req.user.email || "Admin"
      });

      const updates: any = {};
      if (subject !== undefined) updates.subject = subject;
      if (body !== undefined) updates.body = body;
      if (name !== undefined) updates.name = name;
      if (category !== undefined) updates.category = category;
      if (is_active !== undefined) updates.is_active = is_active;
      if (variables_hint !== undefined) updates.variables_hint = variables_hint;
      
      updates.updated_at = new Date().toISOString();

      await db.collection("email_templates").doc(req.params.id).update(updates);
      res.json({ success: true, message: `Template compiled and archived to version ${nextVersionNum}` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE CUSTOM EMAIL TEMPLATE
  app.delete("/api/admin/email/templates/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });
      
      await db.collection("email_templates").doc(req.params.id).delete();
      
      const snap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
      for (const d of snap.docs) { await d.ref.delete(); }

      await db.collection("email_template_analytics").doc(req.params.id).delete();

      res.json({ success: true, message: "Template deleted" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DUPLICATE TEMPLATE
  app.post("/api/admin/email/templates/:id/duplicate", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("email_templates").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Template not found" });
      const current = doc.data();

      const newSlug = `${current.slug}_copy_${Date.now().toString().slice(-4)}`;
      const duplicated = {
        ...current,
        slug: newSlug,
        name: `${current.name} (Copy)`,
        is_custom: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.collection("email_templates").doc(newSlug).set(duplicated);
      
      await db.collection("email_template_analytics").doc(newSlug).set({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        bounced: 0,
        last_sent_at: ""
      });

      res.json({ success: true, id: newSlug, name: duplicated.name });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // RESTORE HISTORICAL VERSION
  app.post("/api/admin/email/templates/:id/restore-version", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { version_id } = req.body;
      if (!version_id) return res.status(400).json({ error: "Version ID is required" });

      const versionDoc = await db.collection("email_versions").doc(version_id).get();
      if (!versionDoc.exists) return res.status(404).json({ error: "Historical version not found" });
      const verObj = versionDoc.data();

      if (verObj.template_id !== req.params.id) return res.status(400).json({ error: "Version template mismatch" });

      const templateDoc = await db.collection("email_templates").doc(req.params.id).get();
      if (templateDoc.exists) {
        const cur = templateDoc.data();
        const versSnap = await db.collection("email_versions").where("template_id", "==", req.params.id).get();
        await db.collection("email_versions").add({
          template_id: req.params.id,
          subject: cur.subject,
          body: cur.body,
          version_number: versSnap.docs.length + 1,
          created_at: new Date().toISOString(),
          created_by: `Auto Rollback (v${verObj.version_number})`
        });
      }

      await db.collection("email_templates").doc(req.params.id).update({
        subject: verObj.subject,
        body: verObj.body,
        updated_at: new Date().toISOString()
      });

      res.json({ success: true, message: `Template successfully reverted to version ${verObj.version_number}` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // SEND TEST OF A SPECIFIC SYSTEM TEMPLATE RESTFUL
  app.post("/api/admin/email/templates/:id/test", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { to, customVariables } = req.body;
      if (!to) return res.status(400).json({ error: "Recipient email is required" });

      const { subject, html } = await renderEmailTemplate(req.params.id, customVariables || {});
      const dispatchResult = await dispatchEmail(to, subject, html);

      const analyticsDoc = await db.collection("email_template_analytics").doc(req.params.id).get();
      if (analyticsDoc.exists) {
        const data = analyticsDoc.data();
        await db.collection("email_template_analytics").doc(req.params.id).update({
          sent: (data.sent || 0) + 1,
          delivered: (data.delivered || 0) + 1,
          last_sent_at: new Date().toISOString()
        });
      }

      res.json({ success: true, message: `Template successfully sent in full branding to ${to}! Sender: ${dispatchResult.provider}` });
    } catch (e: any) { res.status(500).json({ success: false, message: "Template test dispatch failed: " + e.message }); }
  });

  // GET TEMPLATE ANALYTICS LIST
  app.get("/api/admin/email/analytics", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const templatesSnap = await db.collection("email_templates").get();
      const analyticsSnap = await db.collection("email_template_analytics").get();

      const templates = templatesSnap.docs.map(t => ({ id: t.id, name: t.data().name, category: t.data().category, slug: t.data().slug }));
      const analyticsGroup = analyticsSnap.docs.reduce((acc, d) => {
        acc[d.id] = d.data();
        return acc;
      }, {} as Record<string, any>);

      const rows = templates.map(t => {
        const stats = analyticsGroup[t.slug] || { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, bounced: 0, last_sent_at: "" };
        const opRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
        const clRate = stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0;
        const bounceRate = stats.sent > 0 ? Math.round((stats.bounced / stats.sent) * 100) : 0;
        
        return {
          ...t,
          sent: stats.sent || 0,
          delivered: stats.delivered || 0,
          opened: stats.opened || 0,
          clicked: stats.clicked || 0,
          failed: stats.failed || 0,
          bounce_rate: bounceRate,
          open_rate: opRate,
          click_rate: clRate,
          last_sent_at: stats.last_sent_at
        };
      });

      const globals = rows.reduce((acc, r) => {
        acc.sent += r.sent;
        acc.delivered += r.delivered;
        acc.opened += r.opened;
        acc.clicked += r.clicked;
        acc.failed += r.failed;
        return acc;
      }, { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 });

      res.json({
        globals: {
          ...globals,
          delivery_rate: globals.sent > 0 ? Math.round((globals.delivered / globals.sent) * 100) : 100,
          open_rate: globals.delivered > 0 ? Math.round((globals.opened / globals.delivered) * 100) : 0,
          click_rate: globals.opened > 0 ? Math.round((globals.clicked / globals.opened) * 100) : 0,
          bounce_rate: globals.sent > 0 ? Math.round((globals.failed / globals.sent) * 100) : 0
        },
        templatesList: rows
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/matches/:id/save", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("saved_matches").where("user_id", "==", req.user.id).where("match_id", "==", req.params.id).get();
      for (const doc of snap.docs) {
        await doc.ref.delete();
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Default catch-all for missing routes returning mock data or simple success so UI doesn't crash empty state
  app.post("/api/plans/upgrade-cost", authenticate, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userDoc = await db.collection("users").doc(req.user.id).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const user = userDoc.data() as any;
      
      const newPlanDoc = await db.collection("plans").doc(planId.toString()).get();
      if (!newPlanDoc.exists) return res.status(404).json({ error: "New plan not found" });
      const newPlan = newPlanDoc.data() as any;
      const newPlanPrice = Number(newPlan.price);

      if (!user.plan_id || !user.plan_expires_at) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }

      const currentPlanDoc = await db.collection("plans").doc(user.plan_id.toString()).get();
      if (!currentPlanDoc.exists) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }

      const currentPlan = currentPlanDoc.data() as any;
      const currentPlanPrice = Number(currentPlan.price);
      
      if (newPlanPrice <= currentPlanPrice && String(user.plan_id) !== String(planId)) {
        return res.status(400).json({ error: "You can only upgrade to a higher plan." });
      }
      
      if (String(user.plan_id) === String(planId)) {
        const expiresAt = new Date(user.plan_expires_at);
        if (expiresAt > new Date()) {
          return res.status(400).json({ error: "You already have an active subscription for this plan." });
        }
      }

      const expiresAt = new Date(user.plan_expires_at);
      const now = new Date();
      if (expiresAt <= now || String(user.plan_id) === String(planId)) {
        return res.json({ cost: newPlanPrice, credit: 0 });
      }

      // Calculate credit
      const durationDays = Number(currentPlan.duration_days) || 30;
      const totalMs = durationDays * 24 * 60 * 60 * 1000;
      const remainingMs = expiresAt.getTime() - now.getTime();
      const credit = (currentPlanPrice * remainingMs) / totalMs;

      let cost = newPlanPrice - credit;
      if (cost < 0) cost = 0;

      res.json({ cost: Math.round(cost * 100) / 100, credit: Math.round(credit * 100) / 100 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/plans", cdnEdgeSim(120), apiFragmentCache(60), async (req, res) => {
    try {
      const plansSnap = await db.collection("plans").get();
      const plansList = plansSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: Number(data.id || doc.id),
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price) || 0,
          duration_days: Number(data.duration_days) || 30,
          categories: typeof data.categories === 'string' ? data.categories : JSON.stringify(data.categories || []),
          is_active: Number(data.is_active) ?? 1
        };
      });
      res.json(plansList);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.get("/api/admin/plans", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const plansSnap = await db.collection("plans").get();
      const plansList = plansSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: Number(data.id || doc.id),
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price) || 0,
          duration_days: Number(data.duration_days) || 30,
          categories: typeof data.categories === 'string' ? data.categories : JSON.stringify(data.categories || []),
          is_active: Number(data.is_active) ?? 1
        };
      });
      res.json(plansList);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/plans", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now();
      const planData = {
        id,
        name: req.body.name,
        description: req.body.description,
        price: Number(req.body.price) || 0,
        duration_days: Number(req.body.duration_days) || 30,
        categories: Array.isArray(req.body.categories) ? JSON.stringify(req.body.categories) : (typeof req.body.categories === 'string' ? req.body.categories : '[]'),
        is_active: Number(req.body.is_active) ?? 1
      };
      await db.collection("plans").doc(id.toString()).set(planData);
      cacheEngine.invalidateCollection("plans");
      res.json({ success: true, ...planData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/plans/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const planData = {
        id: Number(id),
        name: req.body.name,
        description: req.body.description,
        price: Number(req.body.price) || 0,
        duration_days: Number(req.body.duration_days) || 30,
        categories: Array.isArray(req.body.categories) ? JSON.stringify(req.body.categories) : (typeof req.body.categories === 'string' ? req.body.categories : '[]'),
        is_active: Number(req.body.is_active) ?? 1
      };
      await db.collection("plans").doc(id).set(planData);
      cacheEngine.invalidateCollection("plans");
      res.json({ success: true, ...planData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/plans/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("plans").doc(id).delete();
      cacheEngine.invalidateCollection("plans");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === PAYMENT SETTINGS ENDPOINTS ===
  app.get("/api/payment/methods", async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      const settings: any = doc.exists ? doc.data() : {};
      
      res.json({
        stripe: { enabled: settings.stripe?.enabled || false },
        paypal: { enabled: settings.paypal?.enabled || false },
        paystack: { enabled: settings.paystack?.enabled || false }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper functions for masking sensitive secrets in the admin configuration panel
  function maskSecret(val: string): string {
    if (!val) return "";
    if (val.length <= 10) return "••••••••";
    return val.substring(0, 8) + "••••••••" + val.substring(val.length - 4);
  }

  function isMasked(val: string): boolean {
    return typeof val === "string" && val.includes("••••");
  }

  app.get("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      if (!doc.exists) return res.json({});
      const data = doc.data() as any;
      
      const maskedData = { ...data };
      if (maskedData.stripe && maskedData.stripe.secretKey) {
        maskedData.stripe.secretKey = maskSecret(maskedData.stripe.secretKey);
      }
      if (maskedData.paypal && maskedData.paypal.secretKey) {
        maskedData.paypal.secretKey = maskSecret(maskedData.paypal.secretKey);
      }
      if (maskedData.paystack && maskedData.paystack.secretKey) {
        maskedData.paystack.secretKey = maskSecret(maskedData.paystack.secretKey);
      }
      
      res.json(maskedData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/payment/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const incoming = req.body;
      const docRef = db.collection("payment_settings").doc("gateway");
      const existingDoc = await docRef.get();
      const existing = existingDoc.exists ? existingDoc.data() : {};
      
      const merged = { ...incoming };
      
      const mergeSecret = (provider: string) => {
        if (merged[provider] && existing[provider]) {
          if (isMasked(merged[provider].secretKey)) {
            merged[provider].secretKey = existing[provider].secretKey;
          }
        }
      };
      
      mergeSecret("stripe");
      mergeSecret("paypal");
      mergeSecret("paystack");
      
      await docRef.set(merged);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/payment/settings", async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("gateway").get();
      if (!doc.exists) {
        return res.json({
          stripe: { publicKey: "", isTestMode: true, enabled: false },
          paypal: { clientId: "", isTestMode: true, enabled: false },
          paystack: { publicKey: "", isTestMode: true, enabled: false }
        });
      }
      const data = doc.data() as any;
      const publicData = {
        stripe: {
          enabled: !!data.stripe?.enabled,
          publicKey: data.stripe?.publicKey || "",
          isTestMode: data.stripe?.isTestMode !== false
        },
        paypal: {
          enabled: !!data.paypal?.enabled,
          clientId: data.paypal?.clientId || "",
          isTestMode: data.paypal?.isTestMode !== false
        },
        paystack: {
          enabled: !!data.paystack?.enabled,
          publicKey: data.paystack?.publicKey || "",
          isTestMode: data.paystack?.isTestMode !== false
        }
      };
      res.json(publicData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/google-auth/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("settings").doc("google_auth").get();
      if (!doc.exists) return res.json({});
      const data = doc.data() as any;
      
      const maskedData = { ...data };
      if (maskedData.clientSecret) {
        maskedData.clientSecret = maskSecret(maskedData.clientSecret);
      }
      
      res.json(maskedData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/google-auth/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const incoming = req.body;
      const docRef = db.collection("settings").doc("google_auth");
      const existingDoc = await docRef.get();
      const existing = existingDoc.exists ? existingDoc.data() : {};
      
      const merged = { ...incoming };
      if (isMasked(merged.clientSecret) && existing.clientSecret) {
        merged.clientSecret = existing.clientSecret;
      }
      
      await docRef.set(merged);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/google/config", async (req, res) => {
    try {
      const doc = await db.collection("settings").doc("google_auth").get();
      if (!doc.exists) return res.json({ enabled: false, clientId: "" });
      const data = doc.data() as any;
      res.json({
        enabled: data.enabled || false,
        clientId: data.clientId || ""
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === SECURE PAYMENT GATEWAY INITIALIZATION ===
  async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) return amount;
    try {
      const resp = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
      if (resp.ok) {
        const data = await resp.json();
        const rate = data.rates[to.toUpperCase()];
        if (rate) return amount * rate;
      }
    } catch (e) {
      console.error("Currency conversion error:", e);
    }
    return amount; // Fallback to original amount if conversion fails
  }

  app.post("/api/checkout/gateway/initialize", authenticate, async (req: any, res) => {
    try {
      const { gateway, type, amount, metadata, currency = "GBP" } = req.body;
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";

      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      const transactionId = `txn_${Date.now()}_${userId}`;
      const returnUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=${gateway}`;
      const cancelUrl = `${origin}/checkout/cancel`;

      // Save pending transaction securely in backend
      const pendingData = {
        userId: userId,
        type,
        amount: Number(amount),
        status: "pending",
        gateway,
        metadata,
        date: new Date().toISOString()
      };
      await db.collection("transactions").doc(transactionId).set(pendingData);

      if (gateway === "stripe") {
        if (!settings?.stripe?.enabled || !settings?.stripe?.secretKey) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&session_id=mock_session&gateway=stripe` });
        }
        const targetCurrency = settings.stripe.merchantCurrency || currency;

        const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: type === "top_up" ? "Wallet Top-up" : type === "watch" ? "Match Access" : type === "plan" ? "Subscription Plan" : "Access",
                },
                unit_amount: Math.round(Number(amount) * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: returnUrl,
          cancel_url: cancelUrl,
          client_reference_id: transactionId,
        });
        
        return res.json({ checkoutUrl: session.url });
      }

      if (gateway === "paypal") {
        if (!settings?.paypal?.enabled || !settings?.paypal?.clientId || !settings?.paypal?.secret) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&token=mock_paypal_token&gateway=paypal` });
        }
        
        const targetCurrency = settings.paypal.merchantCurrency || currency;

        const isTest = settings.paypal.isTestMode !== false;
        const auth = Buffer.from(`${settings.paypal.clientId}:${settings.paypal.secret}`).toString('base64');
        const tokenResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token", {
           method: "POST",
           headers: {
             "Authorization": `Basic ${auth}`,
             "Content-Type": "application/x-www-form-urlencoded"
           },
           body: "grant_type=client_credentials"
        });
        const tokenData = await tokenResp.json();
        
        const orderResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v2/checkout/orders" : "https://api-m.paypal.com/v2/checkout/orders", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: transactionId,
              amount: {
                currency_code: targetCurrency.toUpperCase(),
                value: Number(amount).toFixed(2)
              }
            }],
            application_context: {
              return_url: returnUrl.replace("{CHECKOUT_SESSION_ID}", "paypal_session"),
              cancel_url: cancelUrl
            }
          })
        });
        
        const orderData = await orderResp.json();
        if (!orderData.links) {
           throw new Error("PayPal order creation failed");
        }
        
        const approveLink = orderData.links.find((l: any) => l.rel === "approve");
        return res.json({ checkoutUrl: approveLink.href });
      }

      if (gateway === "paystack") {
        if (!settings?.paystack?.enabled || !settings?.paystack?.secretKey) {
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&trxref=${transactionId}&gateway=paystack` });
        }
        
        let targetCurrency = settings.paystack.merchantCurrency || currency;
        // Paystack most commonly uses NGN, so fallback to NGN if GBP but merchantCurrency is unconfigured, because standard Paystack accounts fail on GBP
        if (!settings.paystack.merchantCurrency && currency.toUpperCase() === 'GBP') {
          targetCurrency = 'NGN';
        }
        const convertedAmount = await convertCurrency(Number(amount), currency, targetCurrency);

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const email = userDoc.exists ? userDoc.data()?.email : "customer@watchwds.com";

        const resp = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.paystack.secretKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            amount: Math.round(convertedAmount * 100), // Paystack uses smallest currency unit (kobo/cents)
            currency: targetCurrency.toUpperCase(),
            reference: transactionId,
            callback_url: `${origin}/checkout/success?txn_id=${transactionId}&gateway=paystack`
          })
        });
        const d = await resp.json();
        if (!d.status) throw new Error(d.message);
        return res.json({ checkoutUrl: d.data.authorization_url });
      }

      throw new Error("Unsupported gateway");
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout/gateway/verify", authenticate, async (req: any, res) => {
    try {
      const { txn_id, session_id, gateway } = req.body;
      const userId = req.user.id.toString();

      const txnDoc = await db.collection("transactions").doc(txn_id).get();
      if (!txnDoc.exists) throw new Error("Transaction not found");
      const txnData = txnDoc.data();

      if (txnData.status === "completed") {
        let matchSlug = txnData.metadata?.fromMatchSlug || null;
        if (txnData.metadata?.matchId && !matchSlug) {
          try {
            const matchDoc = await db.collection("matches").doc(String(txnData.metadata.matchId)).get();
            if (matchDoc.exists) {
              matchSlug = matchDoc.data()?.slug || null;
            }
          } catch (err) {}
        }
        return res.json({ 
          success: true, 
          alreadyCompleted: true, 
          type: txnData.type, 
          matchId: txnData.metadata?.matchId || null, 
          matchSlug 
        }); // Deduplication
      }
      
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      let isVerified = false;

      if (gateway === "stripe") {
        if (!settings?.stripe?.secretKey) {
          isVerified = true;
        } else {
          const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
          const session = await stripe.checkout.sessions.retrieve(session_id);
          if (session.payment_status === "paid") isVerified = true;
        }
      }

      if (gateway === "paypal") {
        if (!settings?.paypal?.secret) {
           isVerified = true;
        } else {
           const isTest = settings.paypal.isTestMode !== false;
           const auth = Buffer.from(`${settings.paypal.clientId}:${settings.paypal.secret}`).toString('base64');
           const tokenResp = await fetch(isTest ? "https://api-m.sandbox.paypal.com/v1/oauth2/token" : "https://api-m.paypal.com/v1/oauth2/token", {
              method: "POST",
              headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: "grant_type=client_credentials"
           });
           const tokenData = await tokenResp.json();
           
           // For PayPal, session_id or txn_id might contain the order ID passed in query like token=XXX
           // The return_url was something like /checkout/success?session_id=...&gateway=paypal
           // PayPal passes the order ID as `token=ORDERID`.
           // Let's assume the frontend passes `session_id=ORDERID` or `txn_id=ORDERID` if we extracted `token` from URL.
           // Actually, if we look at CheckoutSuccess.tsx, it extracts `session_id` from url if possible.
           // For paypal, checkout returns with ?token=ORDERID&PayerID=XXX.
           // I will configure the frontend to capture that if necessary, or check the token query param here if passed.
           const orderId = req.body.token || req.body.session_id; // Check both
           
           if (!orderId) {
              throw new Error("Missing PayPal order ID (token)");
           }

           const captureResp = await fetch(isTest ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture` : `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
             method: "POST",
             headers: {
               "Authorization": `Bearer ${tokenData.access_token}`,
               "Content-Type": "application/json"
             }
           });
           
           const captureData = await captureResp.json();
           if (captureData.status === "COMPLETED") {
             isVerified = true;
           } else {
             throw new Error("PayPal capture failed: " + (captureData.message || JSON.stringify(captureData.details || captureData.name)));
           }
        }
      }

      if (gateway === "paystack") {
        if (!settings?.paystack?.secretKey) {
           isVerified = true;
        } else {
           const resp = await fetch(`https://api.paystack.co/transaction/verify/${txn_id}`, {
             headers: { Authorization: `Bearer ${settings.paystack.secretKey}` }
           });
           const d = await resp.json();
           if (d.status && d.data.status === "success") isVerified = true;
        }
      }

      if (!isVerified) throw new Error("Payment verification failed");

      // Fulfill purchase
      const { type, amount, metadata } = txnData;

      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const user = userDoc.exists ? userDoc.data() : null;
      const userEmail = user?.email;
      const userName = user?.name || "User";

      let matchSlug = metadata?.fromMatchSlug || null;
      if (metadata?.matchId && !matchSlug) {
        try {
          const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
          if (matchDoc.exists) {
            matchSlug = matchDoc.data()?.slug || null;
          }
        } catch (err) {
          console.error("Error fetching match slug for redirect:", err);
        }
      }

      if (type === "top_up") {
        const currentBalance = Number(user?.balance || 0);
        await userRef.update({ balance: currentBalance + Number(amount) });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Wallet Top-up Successful", `Your wallet has been credited with ${amount}.`, "success", "/profile");
        notifyAdmins("New Wallet Top-up", `User top-up: ${amount}`, "system", "/admin/transactions");

        if (userEmail) {
          sendTemplateEmail(userEmail, "payment_successful", {
            first_name: userName,
            purchase_amount: String(amount),
            transaction_id: txn_id,
            invoice_number: `INV-${Date.now()}`,
            support_email: "support@watchwds.com"
          }).catch(err => console.error("Failed to send top up email:", err));
        }

        return res.json({ success: true, type, matchId: null, matchSlug: null });
      }

      if (type === "watch" || type === "embed") {
        const purchaseId = Date.now().toString();
        const purchaseData = {
          id: purchaseId,
          userId: userId,
          matchId: metadata.matchId,
          amount,
          type,
          date: new Date().toISOString()
        };
        if (type === "embed") {
          (purchaseData as any).code = `<iframe src="https://watchwds.com/embed/${metadata.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
        }
        await db.collection("purchases").doc(purchaseId).set(purchaseData);
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Purchase Successful", `You have unlocked access.`, "success", `/matches/${metadata.matchId}`);
        notifyAdmins("New Purchase", `A user purchased access for amount: ${amount}`, "system", "/admin/transactions");

        if (userEmail) {
          const matchDoc = await db.collection("matches").doc(metadata.matchId).get();
          const matchData = matchDoc.exists ? matchDoc.data() : {};
          sendTemplateEmail(userEmail, "match_purchased", {
            first_name: userName,
            match_name: matchData.title || "Match Access",
            match_date: matchData.start_time || new Date().toLocaleDateString(),
            match_time: matchData.time || "UTC",
            purchase_amount: String(amount),
            website_url: `${getRequestBaseUrl(req)}/matches/${metadata.matchId}`,
            transaction_id: txn_id
          }).catch(err => console.error("Failed to send match purchase email:", err));
        }

        return res.json({ success: true, type, matchId: metadata.matchId, matchSlug });
      }

      if (type === "plan") {
        const planDoc = await db.collection("plans").doc(String(metadata.planId)).get();
        const planData = planDoc.data() || {};
        const durationDays = Number(planData.duration_days) || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
        
        await userRef.update({ 
          planId: Number(metadata.planId),
          planExpiresAt: expiresAt.toISOString()
        });
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Plan Subscribed", `You have successfully subscribed to the plan.`, "success", "/profile");
        notifyAdmins("New Subscription", `A user subscribed to a plan.`, "system", "/admin/transactions");

        if (userEmail) {
          sendTemplateEmail(userEmail, "subscription_purchased", {
            first_name: userName,
            subscription_name: planData.name || "Premium Plan",
            purchase_amount: String(amount),
            transaction_id: txn_id,
            invoice_number: `INV-${Date.now()}`,
            website_url: `${getRequestBaseUrl(req)}/profile`
          }).catch(err => console.error("Failed to send plan subscription email:", err));
        }

        return res.json({ success: true, type, matchId: metadata.matchId || null, matchSlug });
      }

      throw new Error("Unknown transaction type");
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // === CHECKOUT & WALLET API ENDPOINTS =======================
  app.post("/api/checkout/topup", authenticate, async (req: any, res) => {
    try {
      const { amount, paymentMethod } = req.body;
      const userId = req.user.id.toString();
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const newBalance = currentBalance + Number(amount);
      
      await userRef.update({ balance: newBalance });

      // Save a transaction log for user
      const transactionId = Date.now().toString();
      const transactionData = {
        id: transactionId,
        userId: userId,
        type: 'top_up',
        amount: Number(amount),
        description: `Top up via ${paymentMethod || "Credit Card"}`,
        date: new Date().toISOString()
      };
      
      await db.collection("transactions").doc(transactionId).set(transactionData);
      
      res.json({ success: true, newBalance, newPoints: newBalance });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/user/purchases", authenticate, async (req: any, res) => {
    try {
      const snap = await db.collection("purchases").where("user_id", "==", req.user.id).get();
      res.json(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          userId: data.user_id,
          matchId: data.match_id
        };
      }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/checkout/ppv", authenticate, async (req: any, res) => {
    try {
      const { match_id, amount } = req.body;
      const userId = req.user.id.toString();
      
      // Prevent duplicate purchase for the same match
      const existingPurchases = await db.collection("purchases")
        .where("userId", "==", userId)
        .where("matchId", "==", match_id)
        .where("type", "==", "watch")
        .get();
      
      if (!existingPurchases.empty) {
        return res.status(409).json({ error: "You have already purchased access to this match" });
      }
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const deductAmount = Number(amount);
      
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const newBalance = currentBalance - deductAmount;
      await userRef.update({ balance: newBalance });

      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: purchaseId,
        userId: userId,
        matchId: match_id,
        amount: deductAmount,
        type: 'watch',
        date: new Date().toISOString()
      };
      
      // Save purchase in root collection for admin dashboard to load
      await db.collection("purchases").doc(purchaseId).set(purchaseData);

      // Save transaction
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: transactionId,
        userId: userId,
        type: 'purchase',
        amount: -deductAmount,
        description: `Purchased access to: Match #${match_id}`,
        date: new Date().toISOString(),
        status: 'completed'
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      
      res.json({ success: true, newBalance, newPoints: newBalance, purchase: purchaseData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout/embed", authenticate, async (req: any, res) => {
    try {
      const { match_id, amount } = req.body;
      const userId = req.user.id.toString();
      
      // Prevent duplicate embed purchase for the same match
      const existingEmbeds = await db.collection("purchases")
        .where("userId", "==", userId)
        .where("matchId", "==", match_id)
        .where("type", "==", "embed")
        .get();
      
      if (!existingEmbeds.empty) {
        return res.status(409).json({ error: "You have already purchased embed access to this match" });
      }
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const deductAmount = Number(amount);
      
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const newBalance = currentBalance - deductAmount;
      await userRef.update({ balance: newBalance });

      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: purchaseId,
        userId: userId,
        matchId: match_id,
        amount: deductAmount,
        type: 'embed',
        date: new Date().toISOString(),
        code: `<iframe src="https://watchwds.com/embed/${match_id}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`
      };
      
      // Save purchase in root collection for admin dashboard to load
      await db.collection("purchases").doc(purchaseId).set(purchaseData);

      // Save transaction
      const transactionId = (Date.now() + 1).toString();
      const transactionData = {
        id: transactionId,
        userId: userId,
        type: 'purchase',
        amount: -deductAmount,
        description: `Purchased embed access to: Match #${match_id}`,
        date: new Date().toISOString(),
        status: 'completed'
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      
      notifyUser(userId, "Embed Access Unlocked", `You unlocked embed access to Match #${match_id}.`, "success", `/matches/${match_id}`);
      notifyAdmins("Embed Purchase", `Embed access purchased via wallet for Match #${match_id}.`, "system", "/admin/transactions");
      res.json({ success: true, newBalance, newPoints: newBalance, purchase: purchaseData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tasks", apiFragmentCache(10), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      const tasks = snap.docs.map(doc => ({ id: Number(doc.id), ...doc.data() }));
      res.json({ tasks, completedTasks: [] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/checkout/plan", authenticate, async (req: any, res) => {
    try {
      const { planId, amount } = req.body;
      const userId = req.user.id.toString();
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const deductAmount = Number(amount);
      
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const newBalance = currentBalance - deductAmount;
      
      const planDoc = await db.collection("plans").doc(String(planId)).get();
      const planData = planDoc.data() || {};
      const durationDays = Number(planData.duration_days) || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      await userRef.update({ 
        balance: newBalance, 
        planId: Number(planId),
        planExpiresAt: expiresAt.toISOString()
      });

      // Save transaction
      const transactionId = Date.now().toString();
      const transactionData = {
        id: transactionId,
        userId: userId,
        type: 'purchase',
        amount: -deductAmount,
        description: `Purchased Subscription Plan #${planId}`,
        date: new Date().toISOString(),
        status: 'completed'
      };
      await db.collection("transactions").doc(transactionId).set(transactionData);
      
      notifyUser(userId, "Plan Upgraded", `You successfully upgraded your subscription using your wallet.`, "success", "/profile");
      notifyAdmins("Subscription Purchase", `A plan was purchased via wallet.`, "system", "/admin/transactions");
      
      const userEmail = userData.email;
      const userName = userData.name || "User";
      if (userEmail) {
        sendTemplateEmail(userEmail, "subscription_purchased", {
          first_name: userName,
          subscription_name: planData.name || "Premium Plan",
          purchase_amount: String(deductAmount),
          transaction_id: transactionId,
          invoice_number: `INV-${Date.now()}`,
          website_url: `${getRequestBaseUrl(req)}/profile`
        }).catch(err => console.error("Failed to send subscription purchased email:", err));
      }

      res.json({ success: true, newBalance, newPoints: newBalance, planId: Number(planId) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // Create an admin dashboard fallback
  app.get("/api/admin/users", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await db.collection("users").get();
      res.json(users.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/users/:id/ban", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.update({ status: "banned" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/users/:id/unban", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.update({ status: "active" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/users/:id/details", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      const { name, email, role, status, balance, verified } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (balance !== undefined) updateData.balance = Number(balance) || 0;
      if (verified !== undefined) updateData.verified = verified ? 1 : 0;

      await userRef.update(updateData);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/users/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const userRef = db.collection("users").doc(req.params.id);
      await userRef.delete();
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/transactions", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snapshot = await db.collection("transactions").get();
      const usersSnapshot = await db.collection("users").get();
      const usersMap = usersSnapshot.docs.reduce((acc: any, doc: any) => {
         acc[doc.id] = doc.data().email || 'Unknown';
         return acc;
      }, {});

      const docs = snapshot.docs.map((d: any) => {
        const data = d.data();
        const actualUserId = data.user_id || data.userId;
        let displayAmount = data.amount;
        if (data.gateway === "paystack" && data.amount && data.currency === "NGN") {
           displayAmount = data.amount / 100; // Format out of kobo
        } else if (data.gateway === "stripe" && data.amount) {
           displayAmount = data.amount / 100; // Default format out of cents
        }
        return { 
          id: d.id, 
          ...data,
          userId: actualUserId,
          userEmail: actualUserId ? usersMap[actualUserId.toString()] : 'Unknown',
          amount: displayAmount 
        };
      }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(docs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/user/transactions", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const snapshot = await db.collection("transactions").get();
      const docs = snapshot.docs
        .map((d: any) => {
          const data = d.data();
          const actualUserId = data.user_id || data.userId;
          let displayAmount = data.amount;
          if (data.gateway === "paystack" && data.amount && data.currency === "NGN") {
             displayAmount = data.amount / 100; // Format out of kobo
          } else if (data.gateway === "stripe" && data.amount) {
             displayAmount = data.amount / 100; // Default format out of cents
          }
          return { 
            id: d.id, 
            ...data,
            userId: actualUserId,
            amount: displayAmount 
          };
        })
        .filter((t: any) => t.userId && t.userId.toString() === userId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json({ transactions: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === AD MANAGER ENDPOINTS ===
  app.get("/api/ads", async (req, res) => {
    try {
      const snap = await db.collection("ads").get();
      res.json(snap.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/ads", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now().toString();
      const adData = { ...req.body, id, created_at: new Date().toISOString() };
      await db.collection("ads").doc(id).set(adData);
      res.json(adData);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/ads/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      const updates = { ...req.body, updated_at: new Date().toISOString() };
      await db.collection("ads").doc(id).update(updates);
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/ads/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection("ads").doc(id).delete();
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Ad Impressions
  app.get("/api/admin/ad-impressions", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("ad_impressions").get();
      res.json(snap.docs.map(doc => ({ id: Number(doc.id) || doc.id, ...doc.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/ads/impression", async (req, res) => {
    try {
      const id = Date.now().toString();
      const data = { ...req.body, id, timestamp: new Date().toISOString() };
      await db.collection("ad_impressions").doc(id).set(data);
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/ads/click/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection("ad_impressions").doc(id).update({ clicked: 1 });
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  // === TASKS ENDPOINTS ===
  app.get("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("tasks").get();
      res.json(snap.docs.map(doc => ({ id: Number(doc.id), ...doc.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/tasks", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now();
      const taskData = { ...req.body, id };
      await db.collection("tasks").doc(id.toString()).set(taskData);
      cacheEngine.invalidateCollection("tasks");
      res.json({ success: true, ...taskData });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/tasks/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const taskData = { ...req.body, id: Number(id) };
      await db.collection("tasks").doc(id).set(taskData);
      cacheEngine.invalidateCollection("tasks");
      res.json({ success: true, ...taskData });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/tasks/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("tasks").doc(id).delete();
      cacheEngine.invalidateCollection("tasks");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  
  // === CACHE MANAGEMENT ENDPOINTS ===
  app.get("/api/admin/cache/stats", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const memory = cacheEngine.getMemoryStats();
      res.json({
        metrics: cacheEngine.metrics,
        memory,
        events: cacheEngine.events,
        ttls: cacheEngine.ttls,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/cache/flush", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { layer } = req.body; // 'database' | 'fragment' | 'cdn' | 'all'
      if (!layer) return res.status(400).json({ error: "Missing layer" });
      
      cacheEngine.flush(layer);
      res.json({ success: true, message: `Flushed ${layer} cache successfully` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/cache/settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { database, fragment, cdn } = req.body;
      if (database !== undefined) cacheEngine.ttls.database = Number(database);
      if (fragment !== undefined) cacheEngine.ttls.fragment = Number(fragment);
      if (cdn !== undefined) cacheEngine.ttls.cdn = Number(cdn);
      
      cacheEngine.logEvent('Settings Update', `TTLs updated. DB: ${cacheEngine.ttls.database}s, Fragment: ${cacheEngine.ttls.fragment}s, CDN: ${cacheEngine.ttls.cdn}s`, 'general');
      res.json({ success: true, ttls: cacheEngine.ttls });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/cache/warm", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const success = await warmCriticalCaches();
      res.json({ success, message: "Manual cache warming executed" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === BLOG POSTS API ===
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const snap = await db.collection("blog_posts").orderBy("created_at", "desc").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/blog/posts", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const id = Date.now().toString();
      const postData = {
        ...req.body,
        id,
        views: 0,
        likes: 0,
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection("blog_posts").doc(id).set(postData);
      res.json(postData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/blog/posts/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("blog_posts").doc(req.params.id).update(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/blog/posts/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("blog_posts").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/blog/posts/:id/view", async (req, res) => {
    try {
      const doc = await db.collection("blog_posts").doc(req.params.id).get();
      if (doc.exists) {
        const currentViews = Number(doc.data()?.views || 0);
        await db.collection("blog_posts").doc(req.params.id).update({ views: currentViews + 1 });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/blog/posts/:id/like", async (req, res) => {
    try {
      const doc = await db.collection("blog_posts").doc(req.params.id).get();
      if (doc.exists) {
        const currentLikes = Number(doc.data()?.likes || 0);
        await db.collection("blog_posts").doc(req.params.id).update({ likes: currentLikes + 1 });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === COMMENTS API ===
  app.get("/api/comments", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("comments").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/matches/:matchId/comments", async (req, res) => {
    try {
      const snap = await db.collection("comments").where("match_id", "==", req.params.matchId).get();
      const allComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeComments = allComments.filter((c: any) => c.status !== 'spam');
      res.json(activeComments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/matches/:matchId/comments", authenticate, async (req: any, res) => {
    try {
      // Fetch actual user from DB for accurate name/avatar
      const userSnap = await db.collection("users").doc(req.user.id).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const id = Date.now().toString();
      const commentData = {
        id,
        matchId: req.params.matchId,
        userId: req.user.id.toString(),
        username: userData.name || req.body.username || 'User',
        avatar: userData.avatar || req.body.avatar || null,
        content: req.body.content || '',
        timestamp: new Date().toISOString(),
        likes: 0,
        role: userData.role || req.user.role || 'user',
        status: 'active'
      };
      await db.collection("comments").doc(id).set(commentData);
      cacheEngine.invalidateCollection("comments");
      res.json({ id, ...commentData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/blog/posts/:postId/comments", async (req, res) => {
    try {
      const matchId = `blog_${req.params.postId}`;
      const snap = await db.collection("comments").where("match_id", "==", matchId).get();
      const allComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeComments = allComments.filter((c: any) => c.status !== 'spam');
      res.json(activeComments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/blog/posts/:postId/comments", authenticate, async (req: any, res) => {
    try {
      // Fetch actual user from DB for accurate name/avatar
      const userSnap = await db.collection("users").doc(req.user.id).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const id = Date.now().toString();
      const matchId = `blog_${req.params.postId}`;
      const commentData = {
        id,
        matchId,
        userId: req.user.id.toString(),
        username: userData.name || req.body.username || 'User',
        avatar: userData.avatar || req.body.avatar || null,
        content: req.body.content || '',
        timestamp: new Date().toISOString(),
        likes: 0,
        role: userData.role || req.user.role || 'user',
        status: 'active'
      };
      await db.collection("comments").doc(id).set(commentData);
      cacheEngine.invalidateCollection("comments");
      res.json({ id, ...commentData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/comments/:id/like", async (req, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (doc.exists) {
        const currentLikes = Number(doc.data()?.likes || 0);
        await db.collection("comments").doc(req.params.id).update({ likes: currentLikes + 1 });
        cacheEngine.invalidateCollection("comments");
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/comments/:id", authenticate, async (req: any, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
      const data = doc.data();
      if (data.userId?.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates: any = {};
      if (req.body.content !== undefined) updates.content = req.body.content;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.likes !== undefined) updates.likes = req.body.likes;
      
      await db.collection("comments").doc(req.params.id).update(updates);
      cacheEngine.invalidateCollection("comments");
      res.json({ success: true, id: req.params.id, ...updates });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/comments/:id", authenticate, async (req: any, res) => {
    try {
      const doc = await db.collection("comments").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Comment not found" });
      const data = doc.data();
      if (data.userId?.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.collection("comments").doc(req.params.id).delete();
      cacheEngine.invalidateCollection("comments");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === MATCH CATEGORIES API (Dedicated Table) ===
  app.get("/api/match-categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM match_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Also respond to the old settings-based URL so existing frontend code keeps working
  app.get("/api/settings/match_categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM match_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/match-categories", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });
      const result = await execute(
        "INSERT INTO match_categories (name, slug, description) VALUES (?, ?, ?)",
        [name, slug, description || '']
      );
      res.json({ success: true, id: result.insertId, name, slug, description: description || '' });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/match-categories/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { name, slug, description } = req.body;
      await execute(
        "UPDATE match_categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description) WHERE id = ?",
        [name, slug, description, req.params.id]
      );
      res.json({ success: true });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/match-categories/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      await execute("DELETE FROM match_categories WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === BLOG CATEGORIES API (Dedicated Table) ===
  app.get("/api/blog-categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM blog_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Also respond to old settings-based URL
  app.get("/api/settings/blog_categories", async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM blog_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/blog-categories", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });
      const result = await execute(
        "INSERT INTO blog_categories (name, slug, description) VALUES (?, ?, ?)",
        [name, slug, description || '']
      );
      res.json({ success: true, id: result.insertId, name, slug, description: description || '' });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/blog-categories/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { name, slug, description } = req.body;
      await execute(
        "UPDATE blog_categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description) WHERE id = ?",
        [name, slug, description, req.params.id]
      );
      res.json({ success: true });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "A category with that slug already exists" });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/blog-categories/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      await execute("DELETE FROM blog_categories WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === SETTINGS API (Dynamic Config) ===
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc(req.params.key).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(snap.data() || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/settings/:key", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("settings").doc(req.params.key).set(req.body);
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === PARTNER CLUBS MANAGEMENT ===
  app.get("/api/admin/clubs", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("clubs").get();
      const clubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(clubs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/clubs/active", async (req, res) => {
    try {
      const snap = await db.collection("clubs").where("is_active", "==", 1).get();
      const clubs = snap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, name: data.name, slug: data.slug, logo: data.logo };
      });
      res.json(clubs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/clubs", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = Date.now().toString();
      const slug = (req.body.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const clubData = {
        id,
        name: req.body.name,
        slug: slug || id,
        logo: req.body.logo || null,
        contactEmail: req.body.contactEmail || null,
        stripeAccountId: req.body.stripeAccountId || null,
        stripeOnboardingComplete: req.body.stripeOnboardingComplete ? 1 : 0,
        isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : 1,
        createdAt: new Date().toISOString()
      };
      await db.collection("clubs").doc(id).set(clubData);
      cacheEngine.invalidateCollection("clubs");

      // Auto-create a default revenue policy for this club
      const policyId = (Date.now() + 1).toString();
      const policyData = {
        id: policyId,
        clubId: id,
        platformFeePercent: Number(req.body.platformFeePercent) || 20,
        clubSharePercent: Number(req.body.clubSharePercent) || 80,
        isActive: 1,
        createdAt: new Date().toISOString()
      };
      await db.collection("revenue_policies").doc(policyId).set(policyData);
      cacheEngine.invalidateCollection("revenue_policies");

      res.json({ success: true, ...clubData, policy: policyData });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/clubs/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.logo !== undefined) updateData.logo = req.body.logo;
      if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail;
      if (req.body.stripeAccountId !== undefined) updateData.stripeAccountId = req.body.stripeAccountId;
      if (req.body.stripeOnboardingComplete !== undefined) updateData.stripeOnboardingComplete = req.body.stripeOnboardingComplete ? 1 : 0;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive ? 1 : 0;

      await db.collection("clubs").doc(id).update(updateData);
      cacheEngine.invalidateCollection("clubs");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/clubs/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("clubs").doc(id).delete();
      // Also delete associated policies
      const policies = await db.collection("revenue_policies").where("club_id", "==", id).get();
      for (const doc of policies.docs) {
        await doc.ref.delete();
      }
      cacheEngine.invalidateCollection("clubs");
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === REVENUE POLICIES MANAGEMENT ===
  app.get("/api/admin/revenue-policies", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("revenue_policies").get();
      const policies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(policies);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/revenue-policies/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: any = {};
      if (req.body.platformFeePercent !== undefined) updateData.platformFeePercent = Number(req.body.platformFeePercent);
      if (req.body.clubSharePercent !== undefined) updateData.clubSharePercent = Number(req.body.clubSharePercent);
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive ? 1 : 0;

      await db.collection("revenue_policies").doc(id).update(updateData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === STRIPE CONNECT PPV CHECKOUT ===
  app.post("/api/checkout/gateway/connect-ppv", authenticate, async (req: any, res) => {
    try {
      const { matchId, gateway = "stripe", currency = "GBP" } = req.body;
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";

      // 1. Load match to get club_id and ppv_price
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = matchDoc.data();

      if (match.access === 'free' || match.access_type !== 'ppv') {
        return res.status(400).json({ error: "This match is not a PPV event" });
      }

      const clubId = match.club_id || match.clubId;
      if (!clubId) return res.status(400).json({ error: "No club assigned to this match" });

      const ppvPrice = Number(match.ppv_price || match.ppvPrice || match.price);
      if (!ppvPrice || ppvPrice <= 0) return res.status(400).json({ error: "Invalid PPV price" });

      // 2. Load club to get stripe_account_id
      const clubDoc = await db.collection("clubs").doc(String(clubId)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();

      const connectedAccountId = club.stripe_account_id || club.stripeAccountId;

      // 3. Load revenue policy for this club
      const policiesSnap = await db.collection("revenue_policies")
        .where("club_id", "==", clubId)
        .where("is_active", "==", 1)
        .limit(1)
        .get();

      let platformFeePercent = 20; // default 20% platform fee
      if (!policiesSnap.empty) {
        const policy = policiesSnap.docs[0].data();
        platformFeePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
      }

      // 4. Calculate application fee in smallest currency unit (pennies/cents)
      const totalAmountCents = Math.round(ppvPrice * 100);
      const applicationFeeCents = Math.round(totalAmountCents * (platformFeePercent / 100));

      // 5. Create pending transaction
      const transactionId = `txn_${Date.now()}_${userId}`;
      const metadata = {
        matchId: String(matchId),
        clubId: String(clubId),
        type: "watch",
        fromMatchSlug: match.slug || null,
        platformFeePercent,
        applicationFeeCents,
        connectedAccountId: connectedAccountId || null
      };

      await db.collection("transactions").doc(transactionId).set({
        userId,
        type: "watch",
        amount: ppvPrice,
        status: "pending",
        gateway,
        metadata,
        date: new Date().toISOString()
      });

      // 6. Initialize Stripe Checkout with Connect
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      if (gateway === "stripe") {
        if (!settings?.stripe?.enabled || !settings?.stripe?.secretKey) {
          // Mock mode — no real Stripe configured
          const returnUrl = `${origin}/checkout/success?txn_id=${transactionId}&session_id=mock_connect_session&gateway=stripe`;
          return res.json({ checkoutUrl: returnUrl });
        }

        const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
        const targetCurrency = settings.stripe.merchantCurrency || currency;

        const sessionParams: any = {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: match.title || "Match Access",
                  description: `PPV access — ${club.name || 'Partner Club'}`,
                },
                unit_amount: totalAmountCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=stripe`,
          cancel_url: `${origin}/checkout/cancel`,
          client_reference_id: transactionId,
          metadata: {
            txn_id: transactionId,
            match_id: String(matchId),
            club_id: String(clubId),
            user_id: userId,
            payment_type: "ppv_watch"
          }
        };

        // If club has a connected account, use Stripe Connect destination charges
        if (connectedAccountId) {
          sessionParams.payment_intent_data = {
            application_fee_amount: applicationFeeCents,
            transfer_data: {
              destination: connectedAccountId,
            },
          };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        return res.json({ checkoutUrl: session.url });
      }

      // Fallback for other gateways — use standard checkout flow
      return res.status(400).json({ error: "Only Stripe is supported for PPV Connect payments" });
    } catch (e: any) {
      console.error("Connect PPV checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // === STRIPE WEBHOOK (for Connect PPV fulfillment) ===
  // NOTE: This endpoint expects raw body. Since express.json() is already applied globally,
  // we handle signature verification gracefully — in production, you'd register this route
  // before express.json() or use express.raw() for this path specifically.
  app.post("/api/webhooks/stripe", async (req: any, res) => {
    try {
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      if (!settings?.stripe?.secretKey) {
        // No Stripe configured — acknowledge webhook anyway
        return res.json({ received: true });
      }

      const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });

      // Parse the event — in production with raw body + webhook secret, you'd use stripe.webhooks.constructEvent
      // For now, we trust the payload since we verify the payment via session retrieval
      const event = req.body;

      if (!event || !event.type) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data?.object;
        if (!session) return res.json({ received: true });

        const txnId = session.metadata?.txn_id || session.client_reference_id;
        if (!txnId) return res.json({ received: true });

        // Check if already processed
        const txnDoc = await db.collection("transactions").doc(txnId).get();
        if (!txnDoc.exists) return res.json({ received: true });
        const txnData = txnDoc.data();

        if (txnData.status === "completed") {
          return res.json({ received: true, already_processed: true });
        }

        // Verify payment status
        let verified = false;
        try {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id || session.session_id);
          if (fullSession.payment_status === "paid") verified = true;
        } catch (verifyErr) {
          // If the session ID doesn't exist (mock), check raw status
          if (session.payment_status === "paid") verified = true;
        }

        if (!verified) return res.json({ received: true, verified: false });

        // Fulfill the purchase
        const { type, amount, metadata } = txnData;
        const userId = txnData.userId || txnData.user_id;

        if (type === "watch" && metadata?.matchId) {
          const purchaseId = Date.now().toString();
          const purchaseData = {
            id: purchaseId,
            userId,
            matchId: metadata.matchId,
            amount,
            type: "watch",
            date: new Date().toISOString()
          };
          await db.collection("purchases").doc(purchaseId).set(purchaseData);
          await db.collection("transactions").doc(txnId).update({ status: "completed" });

          notifyUser(userId, "Purchase Successful", "You have unlocked PPV match access.", "success", `/matches/${metadata.fromMatchSlug || metadata.matchId}`);
          notifyAdmins("PPV Purchase (Stripe Connect)", `PPV purchase completed: ${amount} for match #${metadata.matchId}`, "system", "/admin/transactions");
        }
      }

      res.json({ received: true });
    } catch (e: any) {
      console.error("Stripe webhook error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // === SLIDING PUZZLE CAPTCHA API ===
  const captchaStore = new Map<string, { targetX: number; createdAt: number; used: boolean }>();
  const CAPTCHA_EXPIRY_MS = 120_000; // 2 minutes
  const CAPTCHA_TOLERANCE = 25; // pixels tolerance (allows easy ~50% piece overlap pass)

  // Cleanup expired tokens periodically
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of captchaStore.entries()) {
      if (now - data.createdAt > CAPTCHA_EXPIRY_MS) {
        captchaStore.delete(token);
      }
    }
  }, 60_000);

  // Generate a new captcha challenge
  app.post("/api/captcha/generate", async (_req, res) => {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const CANVAS_WIDTH = 320;
      const CANVAS_HEIGHT = 180;
      const PIECE_SIZE = 48;

      // Random target position (keeping piece within visible area)
      const targetX = Math.floor(Math.random() * (CANVAS_WIDTH - PIECE_SIZE - 80)) + 60;
      const targetY = Math.floor(Math.random() * (CANVAS_HEIGHT - PIECE_SIZE - 30)) + 15;
      const imageIndex = Math.floor(Math.random() * 6);

      captchaStore.set(token, { targetX, createdAt: Date.now(), used: false });

      res.json({ token, targetX, targetY, imageIndex });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Verify captcha solution
  app.post("/api/captcha/verify", async (req, res) => {
    try {
      const { token, sliderX } = req.body;

      if (!token || sliderX === undefined) {
        return res.status(400).json({ success: false, error: "Missing token or slider position" });
      }

      const challenge = captchaStore.get(token);
      if (!challenge) {
        return res.json({ success: false, error: "Invalid or expired captcha" });
      }

      // Check expiry
      if (Date.now() - challenge.createdAt > CAPTCHA_EXPIRY_MS) {
        captchaStore.delete(token);
        return res.json({ success: false, error: "Captcha expired" });
      }

      // Check single-use
      if (challenge.used) {
        captchaStore.delete(token);
        return res.json({ success: false, error: "Captcha already used" });
      }

      // Validate position with tolerance (dynamically loaded from admin settings)
      let tolerance = 25;
      try {
        const snap = await db.collection("settings").doc("captcha").get();
        if (snap.exists && snap.data()?.tolerance !== undefined) {
          tolerance = Number(snap.data()?.tolerance);
        }
      } catch (err) {
        console.error("Failed to read captcha tolerance setting:", err);
      }

      const diff = Math.abs(Number(sliderX) - challenge.targetX);
      if (diff <= tolerance) {
        // Mark as used
        challenge.used = true;

        // Generate a verified token (single-use proof for login/register)
        const verifiedToken = crypto.randomBytes(24).toString('hex');
        const hmac = crypto.createHmac('sha256', JWT_SECRET).update(verifiedToken).digest('hex');
        const verifiedKey = `captcha_verified_${hmac}`;

        // Store verified token with short expiry (30 seconds)
        captchaStore.set(verifiedKey, { targetX: 0, createdAt: Date.now(), used: false });

        // Clean up the challenge token
        captchaStore.delete(token);

        return res.json({ success: true, verifiedToken: `${verifiedToken}.${hmac}` });
      }

      // Failed — remove token to force regeneration
      captchaStore.delete(token);
      return res.json({ success: false, error: "Position mismatch" });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Check if captcha is enabled and fetch tolerance setting (public)
  app.get("/api/captcha/status", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("captcha").get();
      const data = snap.exists ? snap.data() : {};
      const enabled = data?.enabled === true;
      const tolerance = typeof data?.tolerance === 'number' ? data.tolerance : 25;
      res.json({ enabled, tolerance });
    } catch (e: any) {
      res.json({ enabled: false, tolerance: 25 });
    }
  });

  // Any missing API routes return 200 OK or empty to avoid 404 UI breaking
  app.use('/api', (req, res) => res.json({ success: true }));

  // Vite Integration
  const isProduction = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(currentDirname, "vite.config.ts")) || currentFilename.endsWith('.cjs');
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === 'true' ? false : undefined },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(currentDirname, "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      if (fs.existsSync(path.join(currentDirname, "index.html"))) {
        distPath = currentDirname;
      } else {
        const parentDist = path.join(currentDirname, "..", "dist");
        if (fs.existsSync(path.join(parentDist, "index.html"))) {
          distPath = parentDist;
        }
      }
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    
    // Ensure categories tables exist
    execute(`
      CREATE TABLE IF NOT EXISTS \`match_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(128) NOT NULL,
        \`slug\` VARCHAR(64) NOT NULL UNIQUE,
        \`description\` VARCHAR(500) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure match_categories table exists", err));

    execute(`
      CREATE TABLE IF NOT EXISTS \`blog_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(128) NOT NULL,
        \`slug\` VARCHAR(64) NOT NULL UNIQUE,
        \`description\` VARCHAR(500) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure blog_categories table exists", err));

    // Ensure comments status column exists (safe incremental upgrade)
    execute(`
      ALTER TABLE \`comments\` ADD COLUMN \`status\` VARCHAR(50) DEFAULT 'active'
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure comments status column exists:", err);
      }
    });

    // Ensure users verified column exists (safe incremental upgrade)
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`verified\` TINYINT(1) DEFAULT 0
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure users verified column exists:", err);
      }
    });

    // Ensure clubs table exists (PPV revenue split)
    execute(`
      CREATE TABLE IF NOT EXISTS \`clubs\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NOT NULL UNIQUE,
        \`logo\` TEXT DEFAULT NULL,
        \`contact_email\` VARCHAR(255) DEFAULT NULL,
        \`stripe_account_id\` VARCHAR(255) DEFAULT NULL,
        \`stripe_onboarding_complete\` TINYINT(1) DEFAULT 0,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure clubs table exists", err));

    // Ensure revenue_policies table exists (PPV revenue split)
    execute(`
      CREATE TABLE IF NOT EXISTS \`revenue_policies\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`platform_fee_percent\` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        \`club_share_percent\` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_policy_club\` (\`club_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure revenue_policies table exists", err));

    // Ensure club_id column exists on matches table (safe incremental upgrade)
    execute(`
      ALTER TABLE \`matches\` ADD COLUMN \`club_id\` VARCHAR(100) DEFAULT NULL
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure matches club_id column exists:", err);
      }
    });

    // Trigger deploy/startup cache warming
    warmCriticalCaches().catch(err => console.error("Startup Cache Warning failed", err));
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
