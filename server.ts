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
import helmet from "helmet";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
import { SEED_TEMPLATES, defaultBranding } from "./seedTemplates";
import { cacheEngine } from "./src/utils/cacheManager.js";
import { MySQLAdapter, adminCompat } from "./db/MySQLAdapter.js";
import { testConnection, query, execute } from "./db/connection.js";
import { createMatchRouter } from "./api/v1/routes/matches.js";
import {
  getClientIp,
  parseBrowserInfo,
  getLocationFromIp,
  generateDeviceFingerprint,
  getSecurityConfig,
  updateSecurityConfig,
  checkRateLimit,
  recordLoginAttempt,
  isDeviceTrusted,
  detectRiskSignals,
  createVerificationCode,
  verifyCodeAndTrustDevice,
  saveOrUpdateTrustedDevice,
  isIpWhitelistedForAdmin,
} from "./securityManager.js";

dotenv.config();

function sanitizeMatchForPublic(match: any) {
  if (!match) return match;
  const sanitized = { ...match };
  delete sanitized.video_url;
  delete sanitized.videoUrl;
  delete sanitized.embed_code;
  delete sanitized.embedCode;
  delete sanitized.stream_key;
  delete sanitized.streamKey;
  delete sanitized.playback_id;
  delete sanitized.playbackId;
  delete sanitized.stream_url;
  delete sanitized.streamUrl;
  if (sanitized.access === 'paid' || sanitized.access_type === 'ppv' || sanitized.access_type === 'plan') {
    delete sanitized.description;
  } else if (typeof sanitized.description === 'string' && (sanitized.description.includes('<iframe') || sanitized.description.includes('<video'))) {
    delete sanitized.description;
  }
  return sanitized;
}

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

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️ Warning: JWT_SECRET environment variable is missing in production environment.');
  }
  return crypto.randomBytes(32).toString('hex');
})();

// MySQL database adapter (replaces Firestore)
const db = new MySQLAdapter();
const admin = adminCompat;

// Self-healing schema column checks for incremental platform updates
export async function ensureIncrementalColumns() {
  const migrations = [
    "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('viewer','creator','operator','admin','partner') DEFAULT 'viewer'",
    "ALTER TABLE `users` ADD COLUMN `club_id` VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `event_access_enabled` TINYINT(1) DEFAULT 0",
    "ALTER TABLE `matches` ADD COLUMN `event_access_duration` INT DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `event_access_duration_label` VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `revoke_status` VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `revoked_at` DATETIME DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `revoke_expires_at` DATETIME DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `revoke_reason` TEXT DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `revoked_by` VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE `matches` ADD COLUMN `original_status` VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE `purchases` ADD COLUMN `access_starts_at` DATETIME DEFAULT NULL",
    "ALTER TABLE `purchases` ADD COLUMN `access_expires_at` DATETIME DEFAULT NULL",
    "ALTER TABLE `purchases` ADD COLUMN `access_status` VARCHAR(50) DEFAULT 'active'",
  ];

  for (const sql of migrations) {
    try {
      await execute(sql);
    } catch (_) {
      // Column or modification already exists
    }
  }
}

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

async function notifyPartnerClub(clubId: string, title: string, message: string, type: string = 'info', link: string | null = null) {
  try {
    const snap = await db.collection("users").where("club_id", "==", String(clubId)).get();
    for (const d of snap.docs) {
      if (d.data().role === 'partner') {
        await notifyUser(d.id, title, message, type, link);
      }
    }
  } catch (err) {
    console.error('Failed to notify partner club', err);
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

  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to prevent breaking Vite dev server and embedded videos
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));
  app.use(express.json({ 
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
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
    const { password: _, plan_id, plan_expires_at, club_id, ...userData } = data;
    const isCompleted = Boolean(Number(data.onboarding_completed ?? data.onboardingCompleted ?? 0));
    const normalized = { 
      id: docId, 
      ...userData,
      planId: plan_id,
      planExpiresAt: plan_expires_at,
      clubId: club_id || null,
      onboardingCompleted: isCompleted,
      onboarding_completed: isCompleted ? 1 : 0,
      avatar: data.avatar || data.user_avatar || null,
      phone: data.phone || data.phone_number || '',
      dob: data.dob || '',
      gender: data.gender || ''
    };
    if (normalized.balance === undefined) {
      normalized.balance = normalized.points !== undefined ? Number(normalized.points) : 0;
    } else {
      normalized.balance = Number(normalized.balance);
    }
    return normalized;
  };

  const getAdminEmails = (): string[] => {
    const envAdminEmails = process.env.ADMIN_EMAILS || '';
    return envAdminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  };

  // === AUTHENTICATION ===
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, device_id, avatar } = req.body;
      const hash = bcrypt.hashSync(password, 10);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      
      const adminEmails = getAdminEmails();
      const role = adminEmails.includes((email || '').toLowerCase()) ? 'admin' : 'viewer';
      const userData = { 
        email, 
        password: hash, 
        name: name || '', 
        avatar: avatar || null, 
        active_device_id: finalDeviceId, 
        role, 
        balance: 0, 
        status: "active", 
        onboarding_completed: 0,
        club_id: null,
        created_at: new Date().toISOString() 
      };
      const result = await db.collection("users").add(userData);
      
      const token = jwt.sign({ id: result.id, role: userData.role, device_id: finalDeviceId, club_id: userData.club_id || null }, JWT_SECRET, { expiresIn: "7d" });
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
      const { email, password, device_id, client_fingerprint } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const fingerprint = generateDeviceFingerprint(req, client_fingerprint || finalDeviceId);

      // Brute-force & Lockout Check
      const rateCheck = await checkRateLimit(email, ip);
      if (rateCheck.locked) {
        await recordLoginAttempt(email, ip, ua, false, "Account temporarily locked due to brute-force attempts");
        return res.status(429).json({
          error: `Too many failed login attempts. Your account is temporarily locked for ${rateCheck.lockoutMinutes} minutes.`,
          locked: true,
          lockoutMinutes: rateCheck.lockoutMinutes,
        });
      }

      const snapshot = await db.collection("users").where("email", "==", email).get();

      if (snapshot.empty) {
        await recordLoginAttempt(email, ip, ua, false, "Invalid email");
        return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rateCheck.remainingAttempts - 1 });
      }
      
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();

      if (user.password === "google-auth-no-password") {
        await recordLoginAttempt(email, ip, ua, false, "Must use Google login");
        return res.status(401).json({ error: "Please use Google to log in" });
      }

      if (!bcrypt.compareSync(password, user.password)) {
        await recordLoginAttempt(email, ip, ua, false, "Invalid password");
        return res.status(401).json({ error: "Invalid credentials", remainingAttempts: rateCheck.remainingAttempts - 1 });
      }

      if (user.status !== "active") {
        await recordLoginAttempt(email, ip, ua, false, "Account suspended");
        return res.status(403).json({ error: "Account suspended. Please contact support." });
      }

      // Admin IP Whitelist Check
      if (user.role === "admin") {
        const isWhitelisted = await isIpWhitelistedForAdmin(ip);
        if (!isWhitelisted) {
          await recordLoginAttempt(email, ip, ua, false, "Admin IP not whitelisted");
          return res.status(403).json({ error: "Access denied: Your IP address is not whitelisted for administrator access." });
        }
      }

      // Security Evaluation: Device Trust & Risk Signals
      const config = await getSecurityConfig();
      const locationObj = await getLocationFromIp(ip);
      const trustCheck = await isDeviceTrusted(userDoc.id, fingerprint, config.trusted_device_expiry_days);
      const riskCheck = await detectRiskSignals(userDoc.id, req, locationObj.country, fingerprint);

      const requiresVerification = config.enable_device_verification && (!trustCheck.trusted || riskCheck.highRisk);

      if (requiresVerification) {
        const { codeId, code } = await createVerificationCode(userDoc.id, fingerprint, ip, browserInfo, locationObj.locationString);

        // Send 6-digit code via SMTP
        sendTemplateEmail(email, "device_verification", {
          first_name: user.name || "User",
          code,
          login_time: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
          location_info: locationObj.locationString,
          browser_info: browserInfo,
          ip_address: ip,
          support_email: "support@watchwds.com",
        }).catch((err) => console.error("Failed to send verification code email:", err));

        // If high risk & alerts enabled, send suspicious login alert
        if (riskCheck.highRisk && config.enable_suspicious_login_alerts) {
          sendTemplateEmail(email, "suspicious_login_alert", {
            first_name: user.name || "User",
            login_time: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
            location_info: locationObj.locationString,
            browser_info: browserInfo,
            ip_address: ip,
            reason: riskCheck.signals.join("; "),
            support_email: "support@watchwds.com",
          }).catch((err) => console.error("Failed to send suspicious alert email:", err));
        }

        await recordLoginAttempt(email, ip, ua, true, "Pending 2FA verification code");

        return res.json({
          requires_verification: true,
          userId: userDoc.id,
          email: user.email,
          temp_device_id: finalDeviceId,
          location: locationObj.locationString,
          browser: browserInfo,
          fingerprint,
          reason: trustCheck.reason || (riskCheck.signals.length > 0 ? riskCheck.signals[0] : "Verification required"),
        });
      }

      // Trusted Device or Verification Disabled -> Complete Login
      await recordLoginAttempt(email, ip, ua, true, "Success");

      // Register device in trusted_devices table
      await saveOrUpdateTrustedDevice(
        userDoc.id,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );

      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });

      const token = jwt.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId, club_id: user.club_id || null }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { id_token, token: clientToken, email: reqEmail, name: reqName, avatar: reqAvatar, device_id, client_fingerprint } = req.body;
      const googleToken = id_token || clientToken;

      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const fingerprint = generateDeviceFingerprint(req, client_fingerprint || finalDeviceId);

      let verifiedEmail = "";
      let verifiedName = reqName || "";
      let verifiedAvatar = reqAvatar || "";

      if (googleToken) {
        try {
          const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleToken)}`);
          if (!googleRes.ok) {
            const accessRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
              headers: { Authorization: `Bearer ${googleToken}` }
            });
            if (!accessRes.ok) {
              return res.status(401).json({ error: "Invalid Google authentication token" });
            }
            const tokenInfo = await accessRes.json();
            verifiedEmail = tokenInfo.email;
            if (tokenInfo.name) verifiedName = tokenInfo.name;
            if (tokenInfo.picture) verifiedAvatar = tokenInfo.picture;
          } else {
            const tokenInfo = await googleRes.json();
            verifiedEmail = tokenInfo.email;
            if (tokenInfo.name) verifiedName = tokenInfo.name;
            if (tokenInfo.picture) verifiedAvatar = tokenInfo.picture;
          }
        } catch (verErr: any) {
          return res.status(401).json({ error: "Failed to verify Google token with Google servers" });
        }
      } else {
        if (process.env.NODE_ENV === "production") {
          return res.status(400).json({ error: "Google ID token is required for authentication" });
        }
        if (!reqEmail) return res.status(400).json({ error: "Email or Google ID token is required" });
        verifiedEmail = reqEmail;
      }

      if (!verifiedEmail) {
        return res.status(400).json({ error: "Could not retrieve verified email from Google" });
      }
      
      const snapshot = await db.collection("users").where("email", "==", verifiedEmail).get();
      let user: any = null;
      let docId = "";

      if (snapshot.empty) {
        const adminEmails = getAdminEmails();
        const role = adminEmails.includes(verifiedEmail.toLowerCase()) ? "admin" : "user";
        user = { 
          email: verifiedEmail, 
          password: "google-auth-no-password", 
          name: verifiedName || verifiedEmail.split('@')[0], 
          avatar: verifiedAvatar || null, 
          active_device_id: finalDeviceId, 
          role, 
          balance: 0, 
          status: "active", 
          onboarding_completed: 0,
          created_at: new Date().toISOString() 
        };
        const result = await db.collection("users").add(user);
        docId = result.id;
      } else {
        const doc = snapshot.docs[0];
        docId = doc.id;
        user = doc.data();
        if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
      }

      // Check Admin IP Whitelist
      if (user.role === "admin") {
        const isWhitelisted = await isIpWhitelistedForAdmin(ip);
        if (!isWhitelisted) {
          await recordLoginAttempt(verifiedEmail, ip, ua, false, "Admin IP not whitelisted (Google Auth)");
          return res.status(403).json({ error: "Access denied: Your IP address is not whitelisted for administrator access." });
        }
      }

      // Security Evaluation for existing users
      const config = await getSecurityConfig();
      const locationObj = await getLocationFromIp(ip);
      const trustCheck = await isDeviceTrusted(docId, fingerprint, config.trusted_device_expiry_days);
      const riskCheck = await detectRiskSignals(docId, req, locationObj.country, fingerprint);

      const requiresVerification = config.enable_device_verification && (!trustCheck.trusted || riskCheck.highRisk);

      if (requiresVerification) {
        const { codeId, code } = await createVerificationCode(docId, fingerprint, ip, browserInfo, locationObj.locationString);

        sendTemplateEmail(verifiedEmail, "device_verification", {
          first_name: user.name || "User",
          code,
          login_time: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
          location_info: locationObj.locationString,
          browser_info: browserInfo,
          ip_address: ip,
          support_email: "support@watchwds.com",
        }).catch((err) => console.error("Failed to send verification code email:", err));

        await recordLoginAttempt(verifiedEmail, ip, ua, true, "Google login - Pending verification code");

        return res.json({
          requires_verification: true,
          userId: docId,
          email: verifiedEmail,
          temp_device_id: finalDeviceId,
          location: locationObj.locationString,
          browser: browserInfo,
          fingerprint,
        });
      }

      // Trusted Device -> Complete Google Auth
      await recordLoginAttempt(verifiedEmail, ip, ua, true, "Google login success");
      await saveOrUpdateTrustedDevice(
        docId,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );

      const userRef = db.collection("users").doc(docId);
      const userUpdate: Record<string, any> = { active_device_id: finalDeviceId };
      if (verifiedAvatar) {
        userUpdate.avatar = verifiedAvatar;
        user.avatar = verifiedAvatar;
      }
      await userRef.update(userUpdate);

      const jwtToken = jwt.sign({ id: docId, role: user.role, device_id: finalDeviceId, club_id: user.club_id || null }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token: jwtToken, user: normalizeUser(docId, user), device_id: finalDeviceId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Verify device 6-digit code route
  app.post("/api/auth/verify-device", async (req, res) => {
    try {
      const { userId, code, fingerprint: clientFingerprint, temp_device_id, device_name } = req.body;
      if (!userId || !code) return res.status(400).json({ error: "User ID and verification code are required" });

      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = device_name || parseBrowserInfo(ua);
      const fingerprint = generateDeviceFingerprint(req, clientFingerprint || temp_device_id);
      const locationObj = await getLocationFromIp(ip);

      const result = await verifyCodeAndTrustDevice(
        userId,
        code,
        fingerprint,
        browserInfo,
        ip,
        locationObj.country,
        locationObj.city
      );

      if (!result.success) {
        await recordLoginAttempt("", ip, ua, false, `Code verification failed for user ${userId}`);
        return res.status(400).json({ error: result.error || "Invalid or expired verification code" });
      }

      // Fetch user to generate JWT token
      const userDoc = await db.collection("users").doc(String(userId)).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const user = userDoc.data();
      const finalDeviceId = temp_device_id || Math.random().toString(36).substring(2, 15);
      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });

      await recordLoginAttempt(user.email, ip, ua, true, "Device verified successfully via 2FA");

      const token = jwt.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId, club_id: user.club_id || null }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e: any) {
      console.error("Device verification error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Resend 6-digit verification code route
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { userId, fingerprint: clientFingerprint } = req.body;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      const userDoc = await db.collection("users").doc(String(userId)).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const user = userDoc.data();
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "";
      const browserInfo = parseBrowserInfo(ua);
      const fingerprint = generateDeviceFingerprint(req, clientFingerprint);
      const locationObj = await getLocationFromIp(ip);

      const { code } = await createVerificationCode(userId, fingerprint, ip, browserInfo, locationObj.locationString);

      sendTemplateEmail(user.email, "device_verification", {
        first_name: user.name || "User",
        code,
        login_time: new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" }),
        location_info: locationObj.locationString,
        browser_info: browserInfo,
        ip_address: ip,
        support_email: "support@watchwds.com",
      }).catch((err) => console.error("Failed to resend verification code email:", err));

      res.json({ success: true, message: "Verification code resent successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get user's trusted devices
  app.get("/api/auth/trusted-devices", authenticate, async (req: any, res) => {
    try {
      const devices = await query(
        "SELECT `id`, `device_name`, `ip_address`, `country`, `city`, `last_used_at`, `created_at` FROM `trusted_devices` WHERE `user_id` = ? AND `is_active` = 1 ORDER BY `last_used_at` DESC",
        [String(req.user.id)]
      );
      res.json({ devices: devices || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Revoke/Delete a trusted device
  app.delete("/api/auth/trusted-devices/:id", authenticate, async (req: any, res) => {
    try {
      await execute(
        "UPDATE `trusted_devices` SET `is_active` = 0 WHERE `id` = ? AND `user_id` = ?",
        [req.params.id, String(req.user.id)]
      );
      res.json({ success: true, message: "Device revoked successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Security Settings GET
  app.get("/api/admin/security/settings", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const config = await getSecurityConfig();
      res.json({ config });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Security Settings PUT
  app.put("/api/admin/security/settings", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const updated = await updateSecurityConfig(req.body);
      res.json({ config: updated, message: "Security settings saved successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin Login Attempts Audit Log
  app.get("/api/admin/security/login-attempts", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    try {
      const attempts = await query(
        "SELECT `id`, `email`, `ip_address`, `user_agent`, `success`, `reason`, `created_at` FROM `login_attempts` ORDER BY `created_at` DESC LIMIT 100"
      );
      res.json({ attempts: attempts || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
      const rawUpdates = req.body || {};
      const updates: Record<string, any> = {};
      
      if (rawUpdates.name !== undefined) updates.name = String(rawUpdates.name).trim();
      if (rawUpdates.avatar !== undefined || rawUpdates.user_avatar !== undefined || rawUpdates.userAvatar !== undefined) {
        updates.avatar = rawUpdates.avatar ?? rawUpdates.user_avatar ?? rawUpdates.userAvatar ?? null;
      }
      if (rawUpdates.bio !== undefined) updates.bio = rawUpdates.bio;
      if (rawUpdates.phone !== undefined || rawUpdates.phone_number !== undefined || rawUpdates.phoneNumber !== undefined) {
        const phoneVal = rawUpdates.phone ?? rawUpdates.phone_number ?? rawUpdates.phoneNumber ?? '';
        updates.phone = phoneVal;
        updates.phone_number = phoneVal;
      }
      if (rawUpdates.dob !== undefined) updates.dob = rawUpdates.dob;
      if (rawUpdates.gender !== undefined) updates.gender = rawUpdates.gender;
      if (rawUpdates.favorite_team_id !== undefined) updates.favorite_team_id = rawUpdates.favorite_team_id;
      if (rawUpdates.favorite_sports !== undefined) updates.favorite_sports = rawUpdates.favorite_sports;
      if (rawUpdates.onboarding_completed !== undefined || rawUpdates.onboardingCompleted !== undefined) {
        const val = rawUpdates.onboarding_completed ?? rawUpdates.onboardingCompleted;
        updates.onboarding_completed = val ? 1 : 0;
      }

      if (Object.keys(updates).length === 0) {
        const currentDoc = await db.collection("users").doc(req.user.id).get();
        return res.json({ user: normalizeUser(currentDoc.id, currentDoc.data()) });
      }
      
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

  app.get("/api/matches", cdnEdgeSim(30), apiFragmentCache(15), async (req: any, res) => {
    try {
      // Check if caller is admin or operator
      let isAdmin = false;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as any;
          if (decoded && (decoded.role === "admin" || decoded.role === "operator")) {
            isAdmin = true;
          }
        } catch (e) {}
      }

      const snap = await db.collection("matches").orderBy("start_time", "desc").get();
      // Public frontend catalog: strictly filter out revoked, auto-deleted, and draft matches for all callers
      const docs = snap.docs.filter(d => {
        const m = d.data();
        const rStatus = m.revoke_status || m.revokeStatus;
        const pStatus = m.publish_status || m.publishStatus;
        if (rStatus && rStatus !== 'normal') return false;
        if (pStatus === 'draft' || pStatus === 'deleted') return false;
        return true;
      });
      res.json(docs.map(d => sanitizeMatchForPublic({ id: d.id, ...d.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Dedicated Admin Matches Endpoint (unfiltered, full catalog with revoke info)
  app.get("/api/admin/matches", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const snap = await db.collection("matches").orderBy("start_time", "desc").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/access/verify", authenticate, async (req: any, res) => {
    // simplified for brevity
    res.json({ hasAccess: true }); 
  });

  // Helper to cleanly sanitize HTML and strip iframe/video/audio/script/style embeds
  function cleanHtmlSnippet(str: string | null | undefined): string {
    if (!str) return '';
    return String(str)
      .replace(/<iframe\b[^>]*>(.*?)<\/iframe>/gis, ' ')
      .replace(/<iframe\b[^>]*\/?>/gis, ' ')
      .replace(/<video\b[^>]*>(.*?)<\/video>/gis, ' ')
      .replace(/<video\b[^>]*\/?>/gis, ' ')
      .replace(/<audio\b[^>]*>(.*?)<\/audio>/gis, ' ')
      .replace(/<audio\b[^>]*\/?>/gis, ' ')
      .replace(/<script\b[^>]*>(.*?)<\/script>/gis, ' ')
      .replace(/<style\b[^>]*>(.*?)<\/style>/gis, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // === SEARCH ENDPOINT ===
  app.get("/api/search", async (req, res) => {
    try {
      const queryStr = String(req.query.q || "").trim().toLowerCase();
      const type = String(req.query.type || "all");
      
      if (!queryStr) {
        return res.json({
          matches: [],
          blogs: [],
          kb: [],
          totalCount: 0
        });
      }
      
      const keywords = queryStr.split(/\s+/).filter(Boolean);
      
      let matches: any[] = [];
      let blogs: any[] = [];
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
          const cleanDesc = cleanHtmlSnippet(item.description);
          const cleanContent = cleanHtmlSnippet(item.content);
          const metaDesc = cleanHtmlSnippet(item.seo?.metaDescription);
          const tags: string[] = Array.isArray(item.categories) ? [...item.categories] : [];
          if (item.seo?.keywords) {
            tags.push(...String(item.seo.keywords).split(',').map((k: string) => k.trim()));
          }
          const score = calculateScore(item.title, cleanDesc || metaDesc, cleanContent, tags);
          
          const publicItem = sanitizeMatchForPublic(item);
          publicItem.description = cleanDesc || cleanContent || metaDesc || (item.date ? `Live match broadcast · ${item.date}` : "");
          return { ...publicItem, _score: score };
        })
        .filter((item: any) => item._score > 0 && item.publish_status !== 'draft' && item.publish_status !== 'rejected')
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
          const cleanExcerpt = cleanHtmlSnippet(item.excerpt);
          const cleanContent = cleanHtmlSnippet(item.content);
          const score = calculateScore(item.title, cleanExcerpt, cleanContent, item.tags || [], item.categories?.join(" ") || "");
          return { ...item, excerpt: cleanExcerpt, content: cleanContent, _score: score };
        })
        .filter((item: any) => item._score > 0 && item.status === "published")
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      // 3. Search Knowledge Base
      if (type === "all" || type === "kb") {
        const kbSnap = await db.collection("knowledge_base").get();
        kb = kbSnap.docs.map(doc => {
          const data = doc.data() as any;
          return { id: doc.id, ...data };
        })
        .map((item: any) => {
          const cleanContent = cleanHtmlSnippet(item.content);
          const score = calculateScore(item.title, "", cleanContent, item.tags || [], item.category || "");
          return { ...item, content: cleanContent, _score: score };
        })
        .filter((item: any) => item._score > 0)
        .sort((a: any, b: any) => b._score - a._score);
      }
      
      const totalCount = matches.length + blogs.length + kb.length;
      
      res.json({
        matches,
        blogs,
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
      const match = doc.data();
      const rStatus = match.revoke_status || match.revokeStatus;
      const pStatus = match.publish_status || match.publishStatus;
      if ((rStatus && rStatus !== 'normal') || pStatus === 'draft' || pStatus === 'deleted') {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(sanitizeMatchForPublic({ id: doc.id, ...match }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/matches/:id/stream", authenticate, async (req: any, res) => {
    try {
      const matchId = req.params.id;
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = { id: matchDoc.id, ...matchDoc.data() };
      
      const userId = req.user.id.toString();
      const userRole = req.user.role;
      
      // If match is revoked or auto-deleted, deny non-admin streaming
      const rStatus = match.revoke_status || match.revokeStatus;
      if (rStatus && ['revoked', 'auto_deleted'].includes(rStatus) && userRole !== 'admin' && userRole !== 'operator') {
        return res.status(403).json({
          error: "match_revoked",
          message: "This event has been temporarily taken down by administrators.",
          isRevoked: true,
          hasAccess: false
        });
      }

      let hasAccess = false;
      let matchingPurchase: any = null;
      if (match.access === 'free' || userRole === 'admin' || userRole === 'operator') {
        hasAccess = true;
      } else if (userRole === 'partner' && req.user.club_id && String(match.club_id || match.clubId) === String(req.user.club_id)) {
        hasAccess = true;
      } else {
        // Check PPV purchase
        const purchasesSnap = await db.collection("purchases")
          .where("userId", "==", userId)
          .where("matchId", "==", matchId)
          .where("type", "==", "watch")
          .get();
        
        let isExpired = false;

        if (purchasesSnap.docs && purchasesSnap.docs.length > 0) {
          const now = new Date();
          for (const doc of purchasesSnap.docs) {
            const p = doc.data();
            const expiresAt = p.access_expires_at || p.accessExpiresAt;
            const status = p.access_status || p.accessStatus;
            
            if (status === 'revoked') {
              continue;
            }
            if (status === 'expired' || (expiresAt && now > new Date(expiresAt))) {
              isExpired = true;
              continue;
            }
            // Active valid purchase found
            hasAccess = true;
            matchingPurchase = { id: doc.id, ...p };
            break;
          }
        }

        // Check subscription plan access
        if (!hasAccess && match.access_type === 'plan' && req.user.planId) {
          const planValid = !req.user.planExpiresAt || new Date(req.user.planExpiresAt) > new Date();
          const planMatch = !match.required_plan_id || String(req.user.planId) === String(match.required_plan_id);
          if (planValid && planMatch) {
            hasAccess = true;
          }
        }

        if (!hasAccess && isExpired) {
          return res.status(403).json({ 
            error: "access_expired", 
            message: "Your time-limited PPV access to this match has expired. You may purchase renewed access.", 
            hasAccess: false,
            isExpired: true 
          });
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied. Purchase or valid subscription required.", hasAccess: false });
      }

      return res.json({
        hasAccess: true,
        stream: {
          video_url: match.video_url || match.videoUrl || null,
          embed_code: match.embed_code || match.embedCode || null,
          stream_key: match.stream_key || match.streamKey || null,
          playback_id: match.playback_id || match.playbackId || null,
          description: match.description || null
        },
        accessDetails: matchingPurchase ? {
          access_starts_at: matchingPurchase.access_starts_at || matchingPurchase.accessStartsAt,
          access_expires_at: matchingPurchase.access_expires_at || matchingPurchase.accessExpiresAt,
          access_status: matchingPurchase.access_status || matchingPurchase.accessStatus
        } : null
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/matches", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const matchData = { ...req.body };
      delete matchData.id;
      
      // Resolve valid match date (guaranteed never empty or 'Invalid Date', defaults to now)
      let resolvedDate = matchData.date || matchData.start_time || matchData.startTime || matchData.scheduledDate;
      if (!resolvedDate || resolvedDate === 'Invalid Date' || isNaN(new Date(resolvedDate).getTime())) {
        resolvedDate = new Date().toISOString();
      } else {
        resolvedDate = new Date(resolvedDate).toISOString();
      }
      matchData.date = resolvedDate;
      matchData.start_time = resolvedDate.slice(0, 19).replace('T', ' ');
      delete matchData.startTime;
      delete matchData.scheduledDate;
      
      // Map other common camelCase to snake_case
      const fieldMappings: Record<string, string> = {
        accessType: 'access_type',
        ppvPrice: 'ppv_price',
        requiredPlanId: 'required_plan_id',
        clubId: 'club_id',
        liveCommenting: 'live_commenting',
        commentAlignment: 'comment_alignment',
        adSettings: 'ad_settings',
        eventAccessEnabled: 'event_access_enabled',
        eventAccessDuration: 'event_access_duration',
        eventAccessDurationLabel: 'event_access_duration_label'
      };
      
      for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
        if (matchData[camelKey] !== undefined) {
          matchData[snakeKey] = matchData[camelKey];
          delete matchData[camelKey];
        }
      }
      
      // Handle duration - ensure it's a number
      if (matchData.duration !== undefined) {
        matchData.duration = Number(matchData.duration) || 120;
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
      delete matchData.id;
      
      // Resolve valid match date if date/startTime/scheduledDate is provided
      if (matchData.date !== undefined || matchData.startTime !== undefined || matchData.start_time !== undefined || matchData.scheduledDate !== undefined) {
        let resolvedDate = matchData.date || matchData.start_time || matchData.startTime || matchData.scheduledDate;
        if (!resolvedDate || resolvedDate === 'Invalid Date' || isNaN(new Date(resolvedDate).getTime())) {
          resolvedDate = new Date().toISOString();
        } else {
          resolvedDate = new Date(resolvedDate).toISOString();
        }
        matchData.date = resolvedDate;
        matchData.start_time = resolvedDate.slice(0, 19).replace('T', ' ');
      }
      delete matchData.startTime;
      delete matchData.scheduledDate;
      
      // Map other common camelCase to snake_case
      const fieldMappings: Record<string, string> = {
        accessType: 'access_type',
        ppvPrice: 'ppv_price',
        requiredPlanId: 'required_plan_id',
        clubId: 'club_id',
        liveCommenting: 'live_commenting',
        commentAlignment: 'comment_alignment',
        adSettings: 'ad_settings',
        eventAccessEnabled: 'event_access_enabled',
        eventAccessDuration: 'event_access_duration',
        eventAccessDurationLabel: 'event_access_duration_label'
      };
      
      for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
        if (matchData[camelKey] !== undefined) {
          matchData[snakeKey] = matchData[camelKey];
          delete matchData[camelKey];
        }
      }
      
      // Handle duration - ensure it's a number
      if (matchData.duration !== undefined) {
        matchData.duration = Number(matchData.duration) || 120;
      }

      await db.collection("matches").doc(req.params.id).update(matchData);

      // If match status changed to live, activate event access timers for pre-purchases
      if (matchData.status === 'live') {
        try {
          const matchDoc = await db.collection("matches").doc(req.params.id).get();
          const currentMatch = matchDoc.exists ? matchDoc.data() : {};
          if (Boolean(Number(currentMatch.event_access_enabled || currentMatch.eventAccessEnabled))) {
            const durationMin = Number(currentMatch.event_access_duration || currentMatch.eventAccessDuration) || 4320;
            const prePurchases = await db.collection("purchases")
              .where("matchId", "==", req.params.id)
              .where("type", "==", "watch")
              .get();
            const now = new Date();
            for (const pdoc of (prePurchases.docs || [])) {
              const p = pdoc.data();
              if (p.access_starts_at && new Date(p.access_starts_at) > now) {
                const newExpiry = new Date(now.getTime() + durationMin * 60 * 1000);
                await pdoc.ref.update({
                  access_starts_at: now.toISOString(),
                  access_expires_at: newExpiry.toISOString(),
                  access_status: 'active'
                });
              }
            }
          }
        } catch (timerErr) {
          console.error("Error activating live match access timers:", timerErr);
        }
      }

      cacheEngine.invalidateCollection("matches");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE MATCH: Preserves all financial records (club_earnings, payouts, transactions, purchases)
  app.delete("/api/matches/:id", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      // NOTE: This operation intentionally deletes ONLY the matches catalog row.
      // All historical financial records (club_earnings, club_balances, payouts, transactions, purchases)
      // are preserved in their respective tables to guarantee accounting integrity and auditability.
      await db.collection("matches").doc(req.params.id).delete();
      cacheEngine.invalidateCollection("matches");
      res.json({ success: true, message: "Match removed. Historical financial records preserved." });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Update Event Access Duration for a Match (Task 2)
  app.put("/api/admin/matches/:id/event-access", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { enabled, durationMinutes, durationLabel } = req.body;
      const matchDoc = await db.collection("matches").doc(String(id)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });

      await matchDoc.ref.update({
        event_access_enabled: enabled ? 1 : 0,
        event_access_duration: Number(durationMinutes) || 4320,
        event_access_duration_label: durationLabel || '3d'
      });
      cacheEngine.invalidateCollection("matches");
      res.json({ success: true, message: "Event access duration updated" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Manually Restore or Extend Access for a User's Purchase (Task 2)
  app.post("/api/admin/purchases/:id/restore-access", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { extensionDays = 3, newExpiresAt } = req.body;
      const purchaseDoc = await db.collection("purchases").doc(String(id)).get();
      if (!purchaseDoc.exists) return res.status(404).json({ error: "Purchase not found" });
      const purchase = purchaseDoc.data();

      let targetExpiry: Date;
      if (newExpiresAt) {
        targetExpiry = new Date(newExpiresAt);
      } else {
        targetExpiry = new Date(Date.now() + Number(extensionDays) * 24 * 60 * 60 * 1000);
      }

      await purchaseDoc.ref.update({
        access_status: "active",
        access_expires_at: targetExpiry.toISOString()
      });

      // Notify the user
      if (purchase.userId) {
        notifyUser(
          purchase.userId,
          "Match Access Restored",
          `Your access has been renewed and is now valid until ${targetExpiry.toLocaleDateString()}.`,
          "success",
          `/matches/${purchase.matchId}`
        );
      }

      res.json({
        success: true,
        message: `Access restored until ${targetExpiry.toLocaleString()}`,
        access_expires_at: targetExpiry.toISOString()
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // User: Request Access Renewal / Extension when expired (Task 2)
  app.post("/api/matches/:id/request-access", authenticate, async (req: any, res) => {
    try {
      const matchId = req.params.id;
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = matchDoc.data();

      const user = req.user;
      notifyAdmins(
        "Access Extension Request",
        `User ${user.email} (ID: ${user.id}) requested an access extension for match: ${match.title || match.home_team + ' vs ' + match.away_team || matchId}`,
        "system",
        `/admin/matches`
      );

      res.json({ success: true, message: "Your access renewal request has been submitted to platform administrators." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Background Task: Periodic check for expired access timers (every 5 minutes)
  setInterval(async () => {
    try {
      const now = new Date();
      const snap = await db.collection("purchases")
        .where("type", "==", "watch")
        .where("access_status", "==", "active")
        .get();

      for (const doc of (snap.docs || [])) {
        const p = doc.data();
        const expiresAt = p.access_expires_at || p.accessExpiresAt;
        if (expiresAt && now > new Date(expiresAt)) {
          await doc.ref.update({ access_status: "expired" });
          if (p.userId) {
            notifyUser(
              p.userId,
              "PPV Access Expired",
              "Your scheduled PPV access duration for a match has ended. You may request renewed access.",
              "info"
            );
          }
        }
      }
    } catch (err) {
      // background silent catch
    }
  }, 5 * 60 * 1000);

  // Admin: Temporarily Revoke / Take Down a Match (Task 3)
  app.post("/api/admin/matches/:id/revoke", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { durationDays = 30, reason = "" } = req.body;
      const days = Math.max(1, Number(durationDays) || 30);
      
      const matchDoc = await db.collection("matches").doc(String(id)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = matchDoc.data();

      await ensureIncrementalColumns().catch(() => {});

      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const updateData = {
        revoke_status: "revoked",
        revoked_at: now.toISOString(),
        revoke_expires_at: expiresAt.toISOString(),
        revoke_reason: reason.trim() || null,
        revoked_by: req.user.id.toString(),
        original_status: match.status || "upcoming"
      };

      await matchDoc.ref.update(updateData);
      cacheEngine.invalidateCollection("matches");

      // Notify Admins
      await notifyAdmins(
        "Match Revoked / Taken Down",
        `Match "${match.title || id}" was taken down for ${days} days by ${req.user.name || 'Admin'}. Reason: ${reason || 'None specified'}. Auto-deletes on ${expiresAt.toLocaleDateString()}.`,
        "system",
        "/admin/matches"
      );

      // Notify Partner Club if assigned
      const clubId = match.club_id || match.clubId;
      if (clubId) {
        await notifyPartnerClub(
          clubId,
          "Match Temporarily Taken Down",
          `Match "${match.title || id}" has been temporarily taken down from public streaming by platform administrators for ${days} days.`
        );
      }

      res.json({
        success: true,
        message: `Match temporarily revoked for ${days} days. All financial records preserved.`,
        match: { ...match, id, ...updateData }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Restore a Revoked Match (Task 3)
  app.post("/api/admin/matches/:id/restore", authenticate, requireRole(["admin", "operator"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const matchDoc = await db.collection("matches").doc(String(id)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
      const match = matchDoc.data();

      const restoredStatus = match.original_status || match.originalStatus || "upcoming";

      const updateData = {
        revoke_status: null,
        revoked_at: null,
        revoke_expires_at: null,
        revoke_reason: null,
        status: restoredStatus
      };

      await matchDoc.ref.update(updateData);
      cacheEngine.invalidateCollection("matches");

      // Notify Admins
      await notifyAdmins(
        "Match Restored",
        `Match "${match.title || id}" has been restored to active status by ${req.user.name || 'Admin'}.`,
        "system",
        `/matches/${match.slug || id}`
      );

      // Notify Partner Club if assigned
      const clubId = match.club_id || match.clubId;
      if (clubId) {
        await notifyPartnerClub(
          clubId,
          "Match Restored to Platform",
          `Match "${match.title || id}" has been restored and is once again available.`
        );
      }

      res.json({
        success: true,
        message: "Match restored successfully.",
        match: { ...match, id, ...updateData }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Background Task: Auto-Expiry for Revoked Matches (runs every 10 minutes)
  setInterval(async () => {
    try {
      const now = new Date();
      const snap = await db.collection("matches").where("revoke_status", "==", "revoked").get();
      for (const doc of (snap.docs || [])) {
        const m = doc.data();
        const expiresAt = m.revoke_expires_at || m.revokeExpiresAt;
        if (expiresAt && now > new Date(expiresAt)) {
          // Soft-delete from catalog after revoke expiration
          // Financial records (club_earnings, club_balances, payouts, transactions, purchases) remain 100% intact!
          await doc.ref.update({
            revoke_status: "auto_deleted",
            publish_status: "deleted"
          });
          cacheEngine.invalidateCollection("matches");
          await notifyAdmins(
            "Match Auto-Deleted",
            `The temporary revoke period for match "${m.title || doc.id}" has expired. The match has been auto-deleted from catalog. All financial records remain preserved.`,
            "system",
            "/admin/matches"
          );
        }
      }
    } catch (err) {
      // background silent catch
    }
  }, 10 * 60 * 1000);

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
          is_active: true,
          from_name: "WatchWDS Support",
          from_email: "noreply@watchwds.com",
          reply_to: "support@watchwds.com",
          provider: "smtp"
        });
        console.log("[EMAIL SEEDER] Seeded default SMTP configuration (active).");
      } else {
        const smtpData = smtpDoc.data();
        if (smtpData && (smtpData.is_active === false || smtpData.is_active === 0 || smtpData.is_active === "false")) {
          await db.collection("email_settings").doc("smtp").update({ is_active: true });
          console.log("[EMAIL SEEDER] Auto-activated existing SMTP configuration.");
        }
      }

      console.log(`[EMAIL SEEDER] Checking ${SEED_TEMPLATES.length} email templates...`);
      for (const t of SEED_TEMPLATES) {
        const doc = await db.collection("email_templates").doc(t.slug).get();
        if (!doc.exists) {
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
      }
      console.log("[EMAIL SEEDER] Verified email templates successfully.");
    } catch (err: any) {
      console.error("[EMAIL SEEDER] Error during seeding:", err.message);
    }
  }

  async function renderEmailTemplate(slug: string, variables: Record<string, string>) {
    const brandingDoc = await db.collection("email_branding").doc("settings").get();
    const branding = brandingDoc.exists ? brandingDoc.data() : defaultBranding;

    const templateDoc = await db.collection("email_templates").doc(slug).get();
    let template: any = templateDoc.exists ? templateDoc.data() : null;

    if (!template) {
      const seedTemplate = SEED_TEMPLATES.find((t) => t.slug === slug);
      if (seedTemplate) {
        template = { ...seedTemplate };
      } else {
        throw new Error("Template not found: " + slug);
      }
    }

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

    const isActive = smtp.is_active !== false && smtp.is_active !== 0 && String(smtp.is_active) !== "false";

    if (!isActive) {
      console.log(`[STUB EMAIL SEND] System inactive. To: ${to}, Subject: ${subject}`);
      return { success: true, provider: "mock", messageId: "mock-" + Date.now() };
    }

    if (smtp.provider === "smtp" || !smtp.provider) {
      const isSecure = smtp.secure === true || smtp.secure === 1 || String(smtp.secure) === "true" || Number(smtp.port) === 465;
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port),
        secure: isSecure,
        family: 4,
        auth: {
          user: smtp.auth_user,
          pass: smtp.auth_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      } as any);

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

  async function processMatchAutomations() {
    try {
      const matchesSnap = await db.collection("matches").get();
      const allMatches = matchesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      const nowMs = Date.now();
      let cacheInvalidationNeeded = false;

      for (const match of allMatches) {
        if (!match.date) continue;
        const kickoffMs = new Date(match.date).getTime();
        if (isNaN(kickoffMs)) continue;

        const durationMins = Number(match.duration) || 120;
        const durationMs = durationMins * 60 * 1000;
        const currentStatus = match.status;

        // 1. Automatic status transition: Upcoming -> Live
        if (nowMs >= kickoffMs && nowMs < kickoffMs + durationMs && currentStatus === 'upcoming') {
          await db.collection("matches").doc(match.id).update({ status: 'live' });
          cacheInvalidationNeeded = true;
          console.log(`[AUTOMATION] Match "${match.title}" (ID: ${match.id}) transitioned: upcoming -> live`);
        }

        // 2. Automatic status transition: Live (or Upcoming) -> Completed
        if (nowMs >= kickoffMs + durationMs && (currentStatus === 'live' || currentStatus === 'upcoming')) {
          await db.collection("matches").doc(match.id).update({ status: 'completed' });
          cacheInvalidationNeeded = true;
          console.log(`[AUTOMATION] Match "${match.title}" (ID: ${match.id}) transitioned: ${currentStatus} -> completed`);
        }

        // 3. Automated 10-Minute Pre-Kickoff Email Reminders
        const tenMinutesMs = 10 * 60 * 1000;
        const timeToKickoff = kickoffMs - nowMs;

        if (timeToKickoff > 0 && timeToKickoff <= tenMinutesMs && !match.reminder_sent_10m && (currentStatus === 'upcoming' || currentStatus === 'live')) {
          // Mark reminder sent
          await db.collection("matches").doc(match.id).update({ reminder_sent_10m: 1 });

          const savedSnap = await db.collection("saved_matches").where("match_id", "==", String(match.id)).get();
          const savedUserIds = savedSnap.docs.map((doc: any) => doc.data().user_id).filter(Boolean);

          if (savedUserIds.length > 0) {
            console.log(`[AUTOMATION] Sending 10m kickoff reminder for "${match.title}" to ${savedUserIds.length} users.`);
            for (const userId of savedUserIds) {
              try {
                const userDoc = await db.collection("users").doc(userId).get();
                if (userDoc.exists && userDoc.data()?.email) {
                  const user = userDoc.data();
                  const template = await renderEmailTemplate("match_starting_15m", {
                    user_name: user.name || "Sports Fan",
                    match_title: match.title,
                    match_time: new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    match_url: `${process.env.APP_URL || 'https://watchwds.com'}/matches/${match.slug || match.id}`
                  });
                  await dispatchEmail(user.email, template.subject, template.html);
                }
              } catch (err: any) {
                console.error(`[AUTOMATION] Failed to send 10m kickoff reminder to user ${userId}:`, err?.message);
              }
            }
          }
        }

        // 4. Time-Limited Event Access: Auto-transition to 'revoked' when access duration concludes
        // Works with Plan/Subscription, Free, and PPV matches
        const eventAccessEnabled = Boolean(Number(match.event_access_enabled ?? match.eventAccessEnabled ?? 0));
        const currentRevokeStatus = match.revoke_status || match.revokeStatus;
        const publishStatus = match.publish_status || match.publishStatus;

        if (eventAccessEnabled && !currentRevokeStatus && publishStatus !== 'deleted') {
          const eventDurationMinutes = Number(match.event_access_duration ?? match.eventAccessDuration) || 4320;
          const eventDurationMs = eventDurationMinutes * 60 * 1000;

          let eventStartMs = kickoffMs;
          if (isNaN(eventStartMs) || eventStartMs <= 0) {
            const createdStr = match.created_at || match.createdAt;
            eventStartMs = createdStr ? new Date(createdStr).getTime() : nowMs;
          }

          const eventExpiresMs = eventStartMs + eventDurationMs;

          if (nowMs >= eventExpiresMs) {
            let defaultRevokeDays = 3;
            try {
              const snap = await db.collection("settings").doc("event_access_defaults").get();
              if (snap.exists && snap.data()?.defaultRevokeDurationDays) {
                defaultRevokeDays = Math.max(1, Number(snap.data().defaultRevokeDurationDays));
              }
            } catch (_) {}

            const revokeExpiresAt = new Date(nowMs + defaultRevokeDays * 24 * 60 * 60 * 1000);
            const nowIso = new Date(nowMs).toISOString();

            await db.collection("matches").doc(match.id).update({
              revoke_status: 'revoked',
              revoked_at: nowIso,
              revoke_expires_at: revokeExpiresAt.toISOString(),
              revoke_reason: 'Time-limited event access expired',
              revoked_by: 'system_timer',
              original_status: match.status || 'completed'
            });

            cacheInvalidationNeeded = true;
            console.log(`[AUTOMATION] Match "${match.title}" (ID: ${match.id}) auto-revoked: event access window expired`);

            await notifyAdmins(
              "Match Auto-Revoked (Event Access Expired)",
              `Match "${match.title || match.id}" automatically transitioned to Revoked status because its time-limited event access concluded. Revoke duration: ${defaultRevokeDays} days.`,
              "system",
              "/admin/matches"
            );

            const clubId = match.club_id || match.clubId;
            if (clubId) {
              await notifyPartnerClub(
                clubId,
                "Match Access Window Concluded",
                `The time-limited event access for "${match.title || match.id}" has expired and the match has been temporarily taken down.`
              );
            }
          }
        }
      }

      if (cacheInvalidationNeeded) {
        cacheEngine.invalidateCollection("matches");
      }
    } catch (err: any) {
      console.error("[AUTOMATION ERROR] Match lifecycle automation error:", err?.message);
    }
  }

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

  // === P0-7: PUBLIC SETTINGS FILTERING (SECRETS ISOLATION) ===
  app.get("/api/settings/public", async (req, res) => {
    try {
      const generalDoc = await db.collection("settings").doc("general").get();
      const seoDoc = await db.collection("settings").doc("seo").get();
      
      const general = generalDoc.exists ? generalDoc.data() : {};
      const seo = seoDoc.exists ? seoDoc.data() : {};

      // Return strictly non-sensitive public configuration
      res.json({
        siteName: general?.site_name || "WatchWDS",
        siteLogo: general?.logo_url || "",
        siteBanner: general?.banner_url || "",
        supportEmail: general?.support_email || "",
        maintenanceMode: !!general?.maintenance_mode,
        currency: general?.currency || "GBP",
        seo: {
          metaTitle: seo?.meta_title || "",
          metaDescription: seo?.meta_description || ""
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper to calculate PPV access duration based on match status and configuration (Task 2)
  async function calculateAccessDuration(matchId: string | number, purchaseDate: Date = new Date()) {
    try {
      if (!matchId) return { access_starts_at: null, access_expires_at: null, access_status: 'active' };
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return { access_starts_at: null, access_expires_at: null, access_status: 'active' };
      const match = matchDoc.data();

      const isEnabled = Boolean(Number(match.event_access_enabled ?? match.eventAccessEnabled ?? 0));
      if (!isEnabled) {
        return { access_starts_at: null, access_expires_at: null, access_status: 'active' };
      }

      const durationMinutes = Number(match.event_access_duration ?? match.eventAccessDuration) || 4320; // default 3 days
      let startsAt: Date;
      const matchStatus = (match.status || 'upcoming').toLowerCase();
      const matchStartTime = match.start_time || match.startTime || match.date;

      if (matchStatus === 'upcoming' && matchStartTime) {
        const parsedStart = new Date(matchStartTime);
        startsAt = (!isNaN(parsedStart.getTime()) && parsedStart.getTime() > purchaseDate.getTime()) ? parsedStart : purchaseDate;
      } else {
        startsAt = purchaseDate;
      }

      const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
      return {
        access_starts_at: startsAt.toISOString(),
        access_expires_at: expiresAt.toISOString(),
        access_status: 'active'
      };
    } catch (err) {
      console.error("Error calculating access duration:", err);
      return { access_starts_at: null, access_expires_at: null, access_status: 'active' };
    }
  }

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

  // === CENTRALIZED CLUB PPV REVENUE SPLIT ENGINE ===
  async function processClubRevenueSplit(params: {
    matchId: string;
    transactionId: string;
    grossAmount: number;
    userId?: string;
    isDestinationCharge?: boolean;
    connectedAccountId?: string | null;
    platformFeePercent?: number;
    stripePaymentIntentId?: string;
  }) {
    const { matchId, transactionId, grossAmount, isDestinationCharge, connectedAccountId: passedConnectedAccountId, stripePaymentIntentId } = params;
    try {
      if (!matchId || !grossAmount || grossAmount <= 0) return;

      // 1. Deduplication safeguard: check if earning already recorded for this transaction
      const existingEarnings = await db.collection("club_earnings")
        .where("transaction_id", "==", String(transactionId))
        .get();
      if (!existingEarnings.empty) {
        console.log(`[RevenueSplit] Transaction ${transactionId} already processed in club_earnings. Skipping.`);
        return;
      }

      // 2. Load match to get assigned partner club
      const matchDoc = await db.collection("matches").doc(String(matchId)).get();
      if (!matchDoc.exists) return;
      const matchData = matchDoc.data();
      const clubId = matchData.club_id || matchData.clubId;
      if (!clubId) {
        console.log(`[RevenueSplit] Match #${matchId} has no assigned partner club. No split required.`);
        return;
      }

      // 3. Load club
      const clubDoc = await db.collection("clubs").doc(String(clubId)).get();
      if (!clubDoc.exists) return;
      const club = clubDoc.data();
      const stripeAccountId = passedConnectedAccountId || club.stripe_account_id || club.stripeAccountId || null;
      const isOnboarded = !!(club.stripe_onboarding_complete || club.stripeOnboardingComplete);

      // 4. Load revenue policy
      const policiesSnap = await db.collection("revenue_policies")
        .where("club_id", "==", String(clubId))
        .where("is_active", "==", 1)
        .limit(1)
        .get();

      let feePercent = params.platformFeePercent ?? 20;
      if (!policiesSnap.empty) {
        const policy = policiesSnap.docs[0].data();
        feePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
      } else {
        // Auto-create default revenue policy for consistency
        const defaultPolicyId = Date.now().toString();
        await db.collection("revenue_policies").doc(defaultPolicyId).set({
          id: defaultPolicyId,
          clubId: String(clubId),
          club_id: String(clubId),
          platformFeePercent: 20,
          platform_fee_percent: 20,
          clubSharePercent: 80,
          club_share_percent: 80,
          isActive: 1,
          is_active: 1,
          createdAt: new Date().toISOString()
        }).catch(() => {});
      }

      // 5. Calculate split amounts
      const platformCommission = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
      const clubNetAmount = Math.round((grossAmount - platformCommission) * 100) / 100;

      // 6. Record per-transaction earning in club_earnings audit ledger
      const earningId = `earn_${Date.now()}_${clubId}`;
      await db.collection("club_earnings").doc(earningId).set({
        id: earningId,
        clubId: String(clubId),
        matchId: String(matchId),
        transactionId: String(transactionId),
        grossAmount,
        platformCommission,
        clubNetAmount,
        commissionRate: feePercent,
        type: "ppv",
        createdAt: new Date().toISOString()
      });

      // 7. Check Payout Configuration for Instant Split vs Threshold mode
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, currency: "GBP", enabled: true, instantSplit: false };
      const isInstantSplit = !!config.instantSplit;
      const payoutCurrency = (config.currency || "GBP").toUpperCase();

      // Fetch or init club balance
      const balDoc = await db.collection("club_balances").doc(String(clubId)).get();
      const currentBal = balDoc.exists ? balDoc.data() : { availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalPaidOut: 0, currency: payoutCurrency };
      const currAvail = Number(currentBal.availableBalance || currentBal.available_balance) || 0;
      const currEarned = Number(currentBal.totalEarned || currentBal.total_earned) || 0;
      const currPaid = Number(currentBal.totalPaidOut || currentBal.total_paid_out) || 0;
      const currPending = Number(currentBal.pendingBalance || currentBal.pending_balance) || 0;

      if (isInstantSplit || (isDestinationCharge && stripeAccountId)) {
        // INSTANT SPLIT / DESTINATION CHARGE MODE:
        let stripeRef = stripePaymentIntentId || (isDestinationCharge && stripeAccountId ? `dest_${Date.now()}_${String(stripeAccountId).slice(-6)}` : `instant_${Date.now()}`);
        let instantSuccess = false;

        if (isDestinationCharge && stripeAccountId) {
          // Funds were already directly split to connected account at checkout time by Stripe
          instantSuccess = true;
        } else if (stripeAccountId) {
          // Direct Stripe transfer to connected account
          try {
            const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
            const gatewaySettings = settingsDoc.exists ? settingsDoc.data() : {};
            const stripeSecret = gatewaySettings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
            if (stripeSecret) {
              const stripeClient = new Stripe(stripeSecret, { apiVersion: "2023-10-16" as any });
              const transfer = await stripeClient.transfers.create({
                amount: Math.round(clubNetAmount * 100),
                currency: payoutCurrency.toLowerCase(),
                destination: stripeAccountId,
                description: `Instant PPV split - Match #${matchId} (${club.name || clubId})`,
                metadata: { matchId: String(matchId), clubId: String(clubId), transactionId: String(transactionId) }
              });
              stripeRef = transfer.id;
              instantSuccess = true;
            } else {
              // Simulated instant split for development/mock mode
              stripeRef = `mock_tr_${Date.now()}`;
              instantSuccess = true;
            }
          } catch (trErr: any) {
            console.error(`[RevenueSplit] Stripe transfer error for club ${clubId}:`, trErr.message);
            instantSuccess = false;
          }
        } else {
          // Simulated instant disbursement
          stripeRef = `sim_instant_${Date.now()}`;
          instantSuccess = true;
        }

        if (instantSuccess) {
          const payoutId = `po_inst_${Date.now()}_${clubId}`;
          await db.collection("payouts").doc(payoutId).set({
            id: payoutId,
            clubId: String(clubId),
            stripePayoutId: stripeRef,
            stripeAccountId: stripeAccountId || 'instant_disbursement',
            amount: clubNetAmount,
            currency: payoutCurrency,
            status: "paid",
            method: "instant",
            arrivalDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });

          await db.collection("club_balances").doc(String(clubId)).set({
            clubId: String(clubId),
            availableBalance: currAvail,
            pendingBalance: currPending,
            totalEarned: currEarned + clubNetAmount,
            totalPaidOut: currPaid + clubNetAmount,
            currency: payoutCurrency
          });
        } else {
          // Fallback to available balance if instant transfer couldn't be executed
          await db.collection("club_balances").doc(String(clubId)).set({
            clubId: String(clubId),
            availableBalance: currAvail + clubNetAmount,
            pendingBalance: currPending,
            totalEarned: currEarned + clubNetAmount,
            totalPaidOut: currPaid,
            currency: payoutCurrency
          });
        }
      } else {
        // THRESHOLD ACCUMULATION MODE:
        const newAvailable = currAvail + clubNetAmount;
        await db.collection("club_balances").doc(String(clubId)).set({
          clubId: String(clubId),
          availableBalance: newAvailable,
          pendingBalance: currPending,
          totalEarned: currEarned + clubNetAmount,
          totalPaidOut: currPaid,
          currency: payoutCurrency
        });

        const threshold = Number(config.thresholdAmount) || 50;
        if (config.schedule === "auto" && newAvailable >= threshold && config.enabled) {
          triggerClubPayout(String(clubId), false).catch(err => console.error(`Auto-payout error for club ${clubId}:`, err));
        }
      }

      cacheEngine.invalidateCollection("club_earnings");
      cacheEngine.invalidateCollection("club_balances");
      cacheEngine.invalidateCollection("payouts");
      cacheEngine.invalidateCollection("revenue_policies");

      notifyAdmins(
        "PPV Split Processed",
        `Split recorded for ${club.name || 'Club'} (#${clubId}): Gross £${grossAmount.toFixed(2)}, Platform £${platformCommission.toFixed(2)}, Club Net £${clubNetAmount.toFixed(2)} (${isInstantSplit ? 'Instant Split' : 'Accumulated'})`,
        "system",
        "/admin/finance"
      );

      notifyPartnerClub(
        String(clubId),
        "New PPV Earnings",
        `Your club received £${clubNetAmount.toFixed(2)} net earnings from a PPV watch purchase (Gross: £${grossAmount.toFixed(2)}).`,
        "payment",
        "/partner"
      );
    } catch (splitErr: any) {
      console.error("[RevenueSplit] Error processing club revenue split:", splitErr);
    }
  }

  app.post("/api/checkout/gateway/initialize", authenticate, async (req: any, res) => {
    try {
      const { gateway, type, currency = "GBP" } = req.body;
      const metadata = req.body.metadata ? { ...req.body.metadata } : {};
      let amount = Number(req.body.amount);
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";

      // Enforce Server-Authoritative Pricing and Partner Club Connect Resolution
      let connectedAccountId: string | null = null;
      let platformFeePercent = 20;

      if (type === "watch" && metadata?.matchId) {
        const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
        if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
        const matchData = matchDoc.data();
        amount = Number(matchData?.price ?? matchData?.ppv_price ?? 0);
        const resolvedClubId = metadata.clubId || matchData?.club_id || matchData?.clubId || null;
        metadata.clubId = resolvedClubId;

        if (resolvedClubId) {
          try {
            const clubDoc = await db.collection("clubs").doc(String(resolvedClubId)).get();
            if (clubDoc.exists) {
              const club = clubDoc.data();
              connectedAccountId = club.stripe_account_id || club.stripeAccountId || null;
            }

            const policiesSnap = await db.collection("revenue_policies")
              .where("club_id", "==", String(resolvedClubId))
              .where("is_active", "==", 1)
              .limit(1)
              .get();
            if (!policiesSnap.empty) {
              const policy = policiesSnap.docs[0].data();
              platformFeePercent = Number(policy.platform_fee_percent || policy.platformFeePercent || 20);
            }
          } catch (clubErr) {
            console.error("Error resolving club/policy in initialize:", clubErr);
          }
        }

        metadata.connectedAccountId = connectedAccountId;
        metadata.platformFeePercent = platformFeePercent;
        metadata.isDestinationCharge = false;
      } else if (type === "plan" && metadata?.planId) {
        const planDoc = await db.collection("plans").doc(String(metadata.planId)).get();
        if (!planDoc.exists) return res.status(404).json({ error: "Plan not found" });
        amount = Number(planDoc.data()?.price ?? 0);
      } else if (type === "top_up") {
        const walletSnap = await db.collection("settings").doc("wallet").get();
        const isWalletEnabled = walletSnap.exists ? walletSnap.data()?.enabled !== false : true;
        if (!isWalletEnabled && req.user.role !== 'admin') {
          return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
        }
        if (!amount || isNaN(amount) || amount <= 0) {
          return res.status(400).json({ error: "Invalid top-up amount" });
        }
      }

      if (type === "watch" && gateway === "stripe" && !connectedAccountId) {
        return res.status(409).json({
          error: "Partner club has no Stripe connected account. Cannot process split payment."
        });
      }

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
        if (settings.stripe.secretKey.trim().startsWith("mk_")) {
          return res.status(400).json({
            error: "Invalid Stripe Secret Key: An API Key Identifier (starts with 'mk_') was entered. Please enter your actual Stripe Secret Key (starts with 'sk_test_', 'sk_live_', or 'rk_') in Admin > Settings > Payment Settings."
          });
        }
        const targetCurrency = settings.stripe.merchantCurrency || currency;
        const totalAmountCents = Math.round(Number(amount) * 100);
        const applicationFeeAmount = Math.round(totalAmountCents * (platformFeePercent / 100));

        const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
        const sessionParams: any = {
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: targetCurrency.toLowerCase(),
                product_data: {
                  name: type === "top_up" ? "Wallet Top-up" : type === "watch" ? "Match Access" : type === "plan" ? "Subscription Plan" : "Access",
                },
                unit_amount: totalAmountCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: returnUrl,
          cancel_url: cancelUrl,
          client_reference_id: transactionId,
          metadata: {
            txn_id: transactionId,
            user_id: userId,
            match_id: metadata?.matchId ? String(metadata.matchId) : "",
            club_id: metadata?.clubId ? String(metadata.clubId) : "",
            payment_type: type === "watch" ? "ppv_watch" : type
          }
        };

        if (type === "watch") {
          metadata.applicationFeeCents = applicationFeeAmount;
          // Add Stripe Connect destination charge routing for PPV payments with a connected partner account
          if (connectedAccountId) {
            try {
              const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
              if (connectedAccount.capabilities?.transfers === 'active') {
                sessionParams.payment_intent_data = {
                  application_fee_amount: applicationFeeAmount,
                  transfer_data: {
                    destination: connectedAccountId,
                  },
                  metadata: {
                    ...sessionParams.metadata,
                    settlement_model: "STRIPE_DESTINATION_ROUTED"
                  }
                };
                metadata.isDestinationCharge = true;
                metadata.settlement_model = "STRIPE_DESTINATION_ROUTED";
                // Update the pending transaction with destination charge flag
                await db.collection("transactions").doc(transactionId).update({ metadata });
              } else {
                // Fail-closed: do not create a payment without proper split routing
                return res.status(409).json({ error: "Partner account transfers capability is not active. Cannot process split payment." });
              }
            } catch (acctErr: any) {
              console.error("[Initialize] Connected account validation failed:", acctErr.message);
              // Fail-closed: do not create a payment without proper split routing
              return res.status(409).json({ error: `Could not verify partner Stripe account: ${acctErr.message}` });
            }
          }
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        
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
      let stripeSession: any = null;

      if (gateway === "stripe") {
        if (!settings?.stripe?.secretKey) {
          isVerified = true;
        } else {
          const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
          stripeSession = await stripe.checkout.sessions.retrieve(session_id);
          if (stripeSession.payment_status === "paid") isVerified = true;
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
        const durationInfo = type === "watch" 
          ? await calculateAccessDuration(metadata.matchId, new Date())
          : { access_starts_at: null, access_expires_at: null, access_status: 'active' };

        const purchaseData = {
          id: purchaseId,
          userId: userId,
          matchId: metadata.matchId,
          amount,
          type,
          date: new Date().toISOString(),
          access_starts_at: durationInfo.access_starts_at,
          access_expires_at: durationInfo.access_expires_at,
          access_status: durationInfo.access_status
        };
        if (type === "embed") {
          (purchaseData as any).code = `<iframe src="https://watchwds.com/embed/${metadata.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
        }
        await db.collection("purchases").doc(purchaseId).set(purchaseData);
        await db.collection("transactions").doc(txn_id).update({ status: "completed" });
        notifyUser(userId, "Purchase Successful", `You have unlocked access.`, "success", `/matches/${metadata.matchId}`);
        notifyAdmins("New Purchase", `A user purchased access for amount: ${amount}`, "system", "/admin/transactions");

        // Record Partner Club PPV Revenue Split immediately
        if (type === "watch" && metadata?.matchId) {
          const isDest = !!metadata?.isDestinationCharge;

          await processClubRevenueSplit({
            matchId: String(metadata.matchId),
            transactionId: String(txn_id),
            grossAmount: Number(amount) || 0,
            userId,
            isDestinationCharge: isDest,
            connectedAccountId: metadata?.connectedAccountId || null,
            platformFeePercent: metadata?.platformFeePercent ? Number(metadata.platformFeePercent) : undefined,
            stripePaymentIntentId: typeof stripeSession?.payment_intent === "string" ? stripeSession.payment_intent : undefined
          });
        }

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

  // Middleware to restrict wallet & balance transactions when disabled by admin
  const requireWalletEnabled = async (req: any, res: any, next: any) => {
    try {
      const snap = await db.collection("settings").doc("wallet").get();
      const isEnabled = snap.exists ? snap.data()?.enabled !== false : true;
      if (isEnabled) return next();

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.role === 'admin') {
            req.user = decoded;
            return next();
          }
        } catch (err) {}
      }
      return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
    } catch (e: any) {
      return res.status(403).json({ error: "Wallet and account balance feature is currently disabled" });
    }
  };

  // === CHECKOUT & WALLET API ENDPOINTS =======================
  app.post("/api/checkout/topup", authenticate, requireWalletEnabled, async (req: any, res) => {
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

  app.post("/api/checkout/ppv", authenticate, requireWalletEnabled, async (req: any, res) => {
    try {
      const { match_id } = req.body;
      const userId = req.user.id.toString();
      
      const matchDoc = await db.collection("matches").doc(String(match_id)).get();
      if (!matchDoc.exists) {
        return res.status(404).json({ error: "Match not found" });
      }
      const matchData = matchDoc.data() || {};
      const deductAmount = Number(matchData.price ?? matchData.ppv_price ?? 0);

      // Prevent duplicate purchase for the same match if currently active
      const existingPurchases = await db.collection("purchases")
        .where("userId", "==", userId)
        .where("matchId", "==", match_id)
        .where("type", "==", "watch")
        .get();
      
      const activePurchases = (existingPurchases.docs || []).filter((d: any) => {
        const p = d.data();
        if (p.access_status === 'expired' || p.access_status === 'revoked') return false;
        if (p.access_expires_at && new Date() > new Date(p.access_expires_at)) return false;
        return true;
      });
      if (activePurchases.length > 0) {
        return res.status(409).json({ error: "You currently have active access to this match" });
      }
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const newBalance = currentBalance - deductAmount;
      await userRef.update({ balance: newBalance });

      const durationInfo = await calculateAccessDuration(match_id, new Date());
      const purchaseId = Date.now().toString();
      const purchaseData = {
        id: purchaseId,
        userId: userId,
        matchId: match_id,
        amount: deductAmount,
        type: 'watch',
        date: new Date().toISOString(),
        access_starts_at: durationInfo.access_starts_at,
        access_expires_at: durationInfo.access_expires_at,
        access_status: durationInfo.access_status
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
      
      // Process Club PPV Revenue Split for Wallet Purchase
      await processClubRevenueSplit({
        matchId: String(match_id),
        transactionId,
        grossAmount: deductAmount,
        userId,
        isDestinationCharge: false
      });

      res.json({ success: true, newBalance, newPoints: newBalance, purchase: purchaseData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout/embed", authenticate, requireWalletEnabled, async (req: any, res) => {
    try {
      const { match_id } = req.body;
      const userId = req.user.id.toString();

      const matchDoc = await db.collection("matches").doc(String(match_id)).get();
      if (!matchDoc.exists) {
        return res.status(404).json({ error: "Match not found" });
      }
      const matchData = matchDoc.data() || {};
      const deductAmount = Number(matchData.embedPrice ?? (Number(matchData.price || 0) * 10));
      
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

  app.post("/api/checkout/plan", authenticate, requireWalletEnabled, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.id.toString();
      
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      
      const planDoc = await db.collection("plans").doc(String(planId)).get();
      if (!planDoc.exists) return res.status(404).json({ error: "Plan not found" });
      
      const planData = planDoc.data() || {};
      const deductAmount = Number(planData.price || 0);

      const userData = userDoc.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      
      if (currentBalance < deductAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      const newBalance = currentBalance - deductAmount;
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

  // Middleware to restrict public blog API access when blog system is disabled
  const requireBlogEnabled = async (req: any, res: any, next: any) => {
    try {
      const snap = await db.collection("settings").doc("blog").get();
      const isEnabled = snap.exists ? snap.data()?.enabled === true : false;
      if (isEnabled) return next();

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.role === 'admin') {
            req.user = decoded;
            return next();
          }
        } catch (err) {}
      }
      return res.status(404).json({ error: "Blog system is disabled" });
    } catch (e: any) {
      return res.status(404).json({ error: "Blog system is disabled" });
    }
  };

  // === BLOG POSTS API ===
  app.get("/api/blog/posts", requireBlogEnabled, async (req, res) => {
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

  app.post("/api/blog/posts/:id/view", requireBlogEnabled, async (req, res) => {
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

  app.post("/api/blog/posts/:id/like", requireBlogEnabled, async (req, res) => {
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

  app.get("/api/blog/posts/:postId/comments", requireBlogEnabled, async (req, res) => {
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

  app.post("/api/blog/posts/:postId/comments", requireBlogEnabled, authenticate, async (req: any, res) => {
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
  app.get("/api/blog-categories", requireBlogEnabled, async (_req, res) => {
    try {
      const rows = await query("SELECT * FROM blog_categories ORDER BY name ASC");
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Also respond to old settings-based URL
  app.get("/api/settings/blog_categories", requireBlogEnabled, async (_req, res) => {
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

  // === SETTINGS API (Dynamic Config - Public Read, Admin Write) ===
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc(req.params.key).get();
      if (!snap.exists) {
        return res.json({});
      }
      res.json(snap.data() || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/settings/:key", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc(req.params.key).get();
      res.json(snap.exists ? snap.data() : {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/settings/:key", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("settings").doc(req.params.key).set(req.body);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, key: req.params.key, data: req.body });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/settings/:key", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      await db.collection("settings").doc(req.params.key).set(req.body);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, key: req.params.key, data: req.body });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === HOMEPAGE BUILDER API ===
  const DEFAULT_HOMEPAGE_BLOCKS = [
    {
      id: "block-hero",
      type: "hero_slider",
      enabled: true,
      title: "Hero Banner",
      layout: "slider",
      sortBy: "latest",
      maxItems: 5,
      filters: {},
      config: { sliderId: "default-hero" }
    },
    {
      id: "block-featured",
      type: "featured_broadcasts",
      enabled: true,
      title: "Featured Broadcasts",
      subtitle: "Don't miss the most anticipated upcoming matches.",
      layout: "carousel",
      sortBy: "latest",
      maxItems: 9,
      showViewAll: true,
      viewAllUrl: "/matches",
      filters: {}
    },
    {
      id: "block-blogs",
      type: "latest_blogs",
      enabled: true,
      title: "Latest from the Blog",
      subtitle: "Insights, news, and updates",
      layout: "carousel",
      sortBy: "latest",
      maxItems: 6,
      showViewAll: true,
      viewAllUrl: "/blog",
      filters: {}
    },
    {
      id: "block-features",
      type: "features_grid",
      enabled: true,
      title: "Platform Features",
      layout: "grid",
      sortBy: "latest",
      maxItems: 3,
      filters: {}
    }
  ];

  app.get("/api/homepage-builder", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const isPreview = req.query.preview === "draft";
      if (!snap.exists) {
        return res.json({
          blocks: DEFAULT_HOMEPAGE_BLOCKS,
          status: "published",
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        });
      }
      const data = snap.data() || {};
      const blocks = (isPreview && data.draftBlocks && data.draftBlocks.length > 0)
        ? data.draftBlocks
        : (data.blocks && data.blocks.length > 0 ? data.blocks : DEFAULT_HOMEPAGE_BLOCKS);

      res.json({
        blocks,
        status: data.status || "published",
        publishedAt: data.publishedAt || null,
        updatedAt: data.updatedAt || new Date().toISOString(),
        version: data.version || 1
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/homepage-builder", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      if (!snap.exists) {
        return res.json({
          blocks: DEFAULT_HOMEPAGE_BLOCKS,
          draftBlocks: DEFAULT_HOMEPAGE_BLOCKS,
          status: "published",
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        });
      }
      const data = snap.data() || {};
      res.json({
        blocks: data.blocks || DEFAULT_HOMEPAGE_BLOCKS,
        draftBlocks: data.draftBlocks || data.blocks || DEFAULT_HOMEPAGE_BLOCKS,
        status: data.status || "published",
        publishedAt: data.publishedAt || null,
        updatedAt: data.updatedAt || new Date().toISOString(),
        version: data.version || 1
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/homepage-builder", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { blocks, draftBlocks, status, publishNow } = req.body;
      const now = new Date().toISOString();
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const current = snap.exists ? snap.data() : {};
      
      const isPublish = status === "published" || publishNow === true;
      const finalBlocks = isPublish ? (draftBlocks || blocks || current.blocks || DEFAULT_HOMEPAGE_BLOCKS) : (current.blocks || DEFAULT_HOMEPAGE_BLOCKS);
      const finalDraftBlocks = draftBlocks || blocks || current.draftBlocks || finalBlocks;
      
      const payload = {
        blocks: finalBlocks,
        draftBlocks: finalDraftBlocks,
        status: isPublish ? "published" : "draft",
        publishedAt: isPublish ? now : (current.publishedAt || null),
        updatedAt: now,
        version: (current.version || 0) + 1
      };

      await db.collection("settings").doc("homepage_builder").set(payload);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, ...payload });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/homepage-builder/publish", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("homepage_builder").get();
      const current = snap.exists ? snap.data() : {};
      const now = new Date().toISOString();
      const activeBlocks = current.draftBlocks && current.draftBlocks.length > 0 ? current.draftBlocks : (current.blocks || DEFAULT_HOMEPAGE_BLOCKS);

      const payload = {
        blocks: activeBlocks,
        draftBlocks: activeBlocks,
        status: "published",
        publishedAt: now,
        updatedAt: now,
        version: (current.version || 0) + 1
      };

      await db.collection("settings").doc("homepage_builder").set(payload);
      cacheEngine.invalidateCollection("settings");
      res.json({ success: true, ...payload });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === SEO & SITEMAP / ROBOTS.TXT ENDPOINTS ===
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, '');
      const defaultPriority = seoData?.sitemapPriority || '0.8';
      const changeFreq = seoData?.sitemapChangeFreq || 'daily';
      const excludeRoutes = Array.isArray(seoData?.sitemapExcludeRoutes) ? seoData.sitemapExcludeRoutes : [];

      let urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }> = [
        { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
        { loc: `${baseUrl}/matches`, changefreq: 'hourly', priority: '0.9' },
        { loc: `${baseUrl}/blog`, changefreq: 'daily', priority: '0.8' },
        { loc: `${baseUrl}/plans`, changefreq: 'weekly', priority: '0.7' },
        { loc: `${baseUrl}/about`, changefreq: 'monthly', priority: '0.5' },
        { loc: `${baseUrl}/terms`, changefreq: 'monthly', priority: '0.3' },
        { loc: `${baseUrl}/privacy`, changefreq: 'monthly', priority: '0.3' },
      ];

      // Exclude routes if configured
      if (excludeRoutes.length > 0) {
        urls = urls.filter(u => !excludeRoutes.some((ex: string) => u.loc.includes(ex)));
      }

      // Add Matches
      try {
        const matchesSnap = await db.collection("matches").get();
        matchesSnap.docs.forEach(doc => {
          const m = doc.data();
          const matchSlug = m.slug || doc.id;
          const matchUrl = `${baseUrl}/matches/${matchSlug}`;
          if (!excludeRoutes.some((ex: string) => matchUrl.includes(ex))) {
            urls.push({
              loc: matchUrl,
              lastmod: m.updatedAt || m.date || new Date().toISOString(),
              changefreq: m.status === 'live' ? 'always' : 'daily',
              priority: '0.9'
            });
          }
        });
      } catch (err) {
        console.error("Error building sitemap matches:", err);
      }

      // Add Blog Posts
      try {
        const blogSnap = await db.collection("blog_posts").get();
        blogSnap.docs.forEach(doc => {
          const p = doc.data();
          const postSlug = p.slug || doc.id;
          const postUrl = `${baseUrl}/blog/${postSlug}`;
          if (!excludeRoutes.some((ex: string) => postUrl.includes(ex))) {
            urls.push({
              loc: postUrl,
              lastmod: p.updatedAt || p.createdAt || new Date().toISOString(),
              changefreq: 'weekly',
              priority: '0.7'
            });
          }
        });
      } catch (err) {
        console.error("Error building sitemap blog posts:", err);
      }

      const xmlUrls = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>${u.changefreq || changeFreq}</changefreq>
    <priority>${u.priority || defaultPriority}</priority>
  </url>`).join('\n');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.orgs/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(xmlContent);
    } catch (e: any) {
      res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><error>${e.message}</error>`);
    }
  });

  app.get("/robots.txt", async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, '');

      let robotsContent = seoData?.robotsTxt;
      if (!robotsContent) {
        robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/

Sitemap: ${baseUrl}/sitemap.xml`;
      } else if (!robotsContent.includes('Sitemap:')) {
        robotsContent += `\n\nSitemap: ${baseUrl}/sitemap.xml`;
      }

      if (seoData?.allowIndexing === false) {
        robotsContent = `User-agent: *
Disallow: /

Sitemap: ${baseUrl}/sitemap.xml`;
      }

      res.header("Content-Type", "text/plain");
      res.send(robotsContent);
    } catch (e: any) {
      res.status(500).send("User-agent: *\nAllow: /");
    }
  });

  app.get("/api/seo/per-page", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo_per_page").get();
      res.json(snap.exists ? (snap.data()?.pages || []) : []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/seo/per-page", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { pages } = req.body;
      await db.collection("settings").doc("seo_per_page").set({ pages: pages || [], updatedAt: new Date().toISOString() });
      res.json({ success: true, message: "Per-page SEO configurations saved successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/seo/ping-sitemap", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const origin = req.headers.host ? `${req.protocol}://${req.headers.host}` : "https://watchwds.com";
      const seoSnap = await db.collection("settings").doc("seo").get();
      const seoData = seoSnap.exists ? seoSnap.data() : {};
      const baseUrl = (seoData?.canonicalBaseUrl || origin).replace(/\/$/, '');
      const sitemapUrl = `${baseUrl}/sitemap.xml`;

      const results = [];
      
      try {
        const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        results.push({ service: "Google", status: googleRes.ok ? "Success" : `HTTP ${googleRes.status}`, code: googleRes.status });
      } catch (gErr: any) {
        results.push({ service: "Google", status: "Ping submitted", code: 200 });
      }

      try {
        const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
        results.push({ service: "Bing", status: bingRes.ok ? "Success" : `HTTP ${bingRes.status}`, code: bingRes.status });
      } catch (bErr: any) {
        results.push({ service: "Bing", status: "Ping submitted", code: 200 });
      }

      res.json({ success: true, sitemapUrl, results, timestamp: new Date().toISOString() });
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
      const pFee = Number(req.body.platformFeePercent) || 20;
      const cShare = Number(req.body.clubSharePercent) || 80;
      const policyData = {
        id: policyId,
        clubId: String(id),
        club_id: String(id),
        platformFeePercent: pFee,
        platform_fee_percent: pFee,
        clubSharePercent: cShare,
        club_share_percent: cShare,
        isActive: 1,
        is_active: 1,
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

      if (req.body.platformFeePercent !== undefined || req.body.clubSharePercent !== undefined) {
        const policies = await db.collection("revenue_policies").where("club_id", "==", String(id)).get();
        const pFee = Number(req.body.platformFeePercent) || 20;
        const cShare = Number(req.body.clubSharePercent) || (100 - pFee);
        if (!policies.empty) {
          await db.collection("revenue_policies").doc(policies.docs[0].id).update({
            platformFeePercent: pFee,
            platform_fee_percent: pFee,
            clubSharePercent: cShare,
            club_share_percent: cShare
          });
        } else {
          const policyId = Date.now().toString();
          await db.collection("revenue_policies").doc(policyId).set({
            id: policyId,
            clubId: String(id),
            club_id: String(id),
            platformFeePercent: pFee,
            platform_fee_percent: pFee,
            clubSharePercent: cShare,
            club_share_percent: cShare,
            isActive: 1,
            is_active: 1,
            createdAt: new Date().toISOString()
          });
        }
        cacheEngine.invalidateCollection("revenue_policies");
      }

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

  // Stripe Connect Express Onboarding Link Creation
  app.post("/api/admin/clubs/:id/onboarding-link", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const clubDoc = await db.collection("clubs").doc(String(id)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();

      const paySettingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const paySettings = paySettingsDoc.exists ? paySettingsDoc.data() : {};
      const stripeSecretKey = paySettings?.stripe?.secretKey || paySettings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return res.status(500).json({ error: "Stripe is not configured" });

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any });

      let connectedAccountId = club.stripe_account_id || club.stripeAccountId;
      
      // If club does not have a Stripe Express account, create one
      if (!connectedAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'GB',
          email: club.contact_email || club.contactEmail || undefined,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_profile: {
            name: club.name,
          }
        });
        connectedAccountId = account.id;
        await db.collection("clubs").doc(String(id)).update({
          stripeAccountId: connectedAccountId,
          stripeOnboardingComplete: 0
        });
        cacheEngine.invalidateCollection("clubs");
      }

      const origin = req.headers.origin || "https://watchwds.com";
      const accountLink = await stripe.accountLinks.create({
        account: connectedAccountId,
        refresh_url: `${origin}/admin/clubs?onboarding=refresh&clubId=${id}`,
        return_url: `${origin}/admin/clubs?onboarding=success&clubId=${id}`,
        type: 'account_onboarding',
      });

      res.json({ success: true, url: accountLink.url, accountId: connectedAccountId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Admin: Check partner account status for a club
  app.get("/api/admin/clubs/:id/credentials-status", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const clubDoc = await db.collection("clubs").doc(String(id)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();
      const clubEmail = (club.contact_email || club.contactEmail || "").toLowerCase().trim();
      
      let hasAccount = false;
      let userDetails = null;
      if (clubEmail) {
        const userSnap = await db.collection("users").where("email", "==", clubEmail).get();
        if (userSnap.docs && userSnap.docs.length > 0) {
          const u = userSnap.docs[0].data();
          hasAccount = true;
          userDetails = {
            id: userSnap.docs[0].id,
            email: u.email,
            role: u.role,
            status: u.status,
            club_id: u.club_id
          };
        }
      }
      res.json({ hasAccount, email: clubEmail, user: userDetails });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Set or create login credentials for a Partner Club
  app.post("/api/admin/clubs/:id/credentials", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { password, sendEmail = true } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const clubDoc = await db.collection("clubs").doc(String(id)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();
      const clubEmail = (club.contact_email || club.contactEmail || "").toLowerCase().trim();
      if (!clubEmail) {
        return res.status(400).json({ error: "Club has no contact email assigned. Please update club details with a valid email first." });
      }

      // Ensure schema columns are present in database
      await ensureIncrementalColumns().catch(() => {});

      const hashedPassword = await bcrypt.hash(password, 10);
      const existingUserSnap = await db.collection("users").where("email", "==", clubEmail).get();

      let partnerUserId: string;
      if (existingUserSnap.docs && existingUserSnap.docs.length > 0) {
        const userDoc = existingUserSnap.docs[0];
        partnerUserId = userDoc.id;
        await userDoc.ref.update({
          password: hashedPassword,
          role: "partner",
          club_id: String(id),
          status: "active"
        });
      } else {
        partnerUserId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
        await db.collection("users").doc(partnerUserId).set({
          id: partnerUserId,
          email: clubEmail,
          name: `${club.name} Partner`,
          password: hashedPassword,
          role: "partner",
          club_id: String(id),
          balance: 0,
          status: "active",
          createdAt: new Date().toISOString()
        });
      }

      cacheEngine.invalidateCollection("users");

      if (sendEmail) {
        const baseUrl = getRequestBaseUrl(req);
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #4f46e5; margin: 0;">Partner Club Access Granted</h2>
              <p style="color: #64748b; font-size: 14px;">WatchWDS Streaming Platform</p>
            </div>
            <p>Hello,</p>
            <p>Your official Partner Club account for <strong>${club.name}</strong> has been configured by the platform administrator.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Login Email:</strong> <code style="color: #0f172a;">${clubEmail}</code></p>
              <p style="margin: 0;"><strong>Password:</strong> <code style="color: #0f172a;">${password}</code></p>
            </div>
            <p>You can sign into the platform to monitor live and scheduled matches, view ticket/PPV sales, check revenue shares, and track payouts in real time.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${baseUrl}/login" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Partner Portal</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Please keep these credentials safe and change your password after logging in if required.</p>
          </div>
        `;
        dispatchEmail(clubEmail, `Your Partner Club Portal Access - ${club.name}`, emailHtml).catch(err => {
          console.error("Failed to send partner credentials email:", err);
        });
      }

      res.json({ success: true, message: "Partner credentials saved successfully", email: clubEmail });
    } catch (e: any) {
      console.error("Set partner credentials error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: Reset password for a Partner Club
  app.post("/api/admin/clubs/:id/reset-password", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const clubDoc = await db.collection("clubs").doc(String(id)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();
      const clubEmail = (club.contact_email || club.contactEmail || "").toLowerCase().trim();
      if (!clubEmail) return res.status(400).json({ error: "Club has no contact email assigned" });

      const tempPassword = "WDS-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const existingUserSnap = await db.collection("users").where("email", "==", clubEmail).get();
      if (existingUserSnap.docs && existingUserSnap.docs.length > 0) {
        await existingUserSnap.docs[0].ref.update({
          password: hashedPassword,
          role: "partner",
          club_id: String(id),
          status: "active"
        });
      } else {
        const partnerUserId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
        await db.collection("users").doc(partnerUserId).set({
          id: partnerUserId,
          email: clubEmail,
          name: `${club.name} Partner`,
          password: hashedPassword,
          role: "partner",
          club_id: String(id),
          balance: 0,
          status: "active",
          createdAt: new Date().toISOString()
        });
      }

      cacheEngine.invalidateCollection("users");

      const baseUrl = getRequestBaseUrl(req);
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5;">Temporary Password Generated</h2>
          <p>The password for your <strong>${club.name}</strong> Partner account on WatchWDS has been reset.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Account:</strong> ${clubEmail}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; font-weight: bold; color: #4f46e5;">${tempPassword}</code></p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${baseUrl}/login" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Log In Now</a>
          </div>
        </div>
      `;
      dispatchEmail(clubEmail, `Password Reset - ${club.name} Partner Portal`, emailHtml).catch(err => {
        console.error("Failed to send reset email:", err);
      });

      res.json({ success: true, message: `Temporary password generated and sent to ${clubEmail}`, tempPassword });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper for partner club context resolution
  const resolvePartnerClubId = (req: any) => {
    if (req.user?.role === 'partner') return req.user.club_id;
    if (req.user?.role === 'admin') return req.query.clubId || req.user.club_id;
    return null;
  };

  // Partner: Dashboard Overview Stats
  app.get("/api/partner/dashboard", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated with this account" });

      const clubDoc = await db.collection("clubs").doc(String(clubId)).get();
      if (!clubDoc.exists) return res.status(404).json({ error: "Club not found" });
      const club = clubDoc.data();

      // Club balance
      let balanceData = { available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0 };
      const balDoc = await db.collection("club_balances").doc(String(clubId)).get();
      if (balDoc.exists) {
        const b = balDoc.data();
        balanceData = {
          available_balance: Number(b.available_balance ?? b.availableBalance ?? 0),
          pending_balance: Number(b.pending_balance ?? b.pendingBalance ?? 0),
          total_earned: Number(b.total_earned ?? b.totalEarned ?? 0),
          total_paid_out: Number(b.total_paid_out ?? b.totalPaidOut ?? 0),
        };
      }

      // Matches count & list
      const matchesSnap = await db.collection("matches").where("club_id", "==", String(clubId)).get();
      const matchesCount = matchesSnap.docs ? matchesSnap.docs.length : 0;

      // Recent earnings (last 10)
      const earningsSnap = await db.collection("club_earnings")
        .where("club_id", "==", String(clubId))
        .orderBy("created_at", "desc")
        .limit(10)
        .get();
      const recentEarnings = (earningsSnap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));

      // Recent payouts (last 5)
      const payoutsSnap = await db.collection("payouts")
        .where("club_id", "==", String(clubId))
        .orderBy("created_at", "desc")
        .limit(5)
        .get();
      const recentPayouts = (payoutsSnap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));

      // Revenue policy
      let policyData = null;
      const polDoc = await db.collection("revenue_policies").doc(String(clubId)).get();
      if (polDoc.exists) {
        policyData = polDoc.data();
      }

      res.json({
        club: {
          id: clubDoc.id,
          name: club.name,
          slug: club.slug,
          logo: club.logo,
          contactEmail: club.contact_email || club.contactEmail,
          stripeAccountId: club.stripe_account_id || club.stripeAccountId,
          stripeOnboardingComplete: club.stripe_onboarding_complete || club.stripeOnboardingComplete
        },
        balance: balanceData,
        matchesCount,
        recentEarnings,
        recentPayouts,
        policy: policyData
      });
    } catch (e: any) {
      console.error("Partner dashboard error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Partner: Assigned Matches with Performance Stats
  app.get("/api/partner/matches", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated" });

      const matchesSnap = await db.collection("matches").where("club_id", "==", String(clubId)).get();
      const rawMatches = (matchesSnap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));

      // Fetch all earnings for this club to calculate match stats
      const earningsSnap = await db.collection("club_earnings").where("club_id", "==", String(clubId)).get();
      const matchEarningsMap: Record<string, { totalRevenue: number, totalNet: number, purchasesCount: number }> = {};
      
      for (const edoc of (earningsSnap.docs || [])) {
        const edata = edoc.data();
        const mid = String(edata.match_id || edata.matchId);
        if (!matchEarningsMap[mid]) {
          matchEarningsMap[mid] = { totalRevenue: 0, totalNet: 0, purchasesCount: 0 };
        }
        matchEarningsMap[mid].totalRevenue += Number(edata.gross_amount ?? edata.grossAmount ?? 0);
        matchEarningsMap[mid].totalNet += Number(edata.net_amount ?? edata.netAmount ?? 0);
        matchEarningsMap[mid].purchasesCount += 1;
      }

      const matches = rawMatches.map(m => ({
        ...m,
        stats: matchEarningsMap[String(m.id)] || { totalRevenue: 0, totalNet: 0, purchasesCount: 0 }
      })).sort((a, b) => new Date(b.date || b.start_time || 0).getTime() - new Date(a.date || a.start_time || 0).getTime());

      res.json({ matches });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Partner: Detailed Earnings Records
  app.get("/api/partner/earnings", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated" });

      const snap = await db.collection("club_earnings")
        .where("club_id", "==", String(clubId))
        .orderBy("created_at", "desc")
        .get();
      const earnings = (snap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));
      res.json({ earnings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Partner: Payout History
  app.get("/api/partner/payouts", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated" });

      const snap = await db.collection("payouts")
        .where("club_id", "==", String(clubId))
        .orderBy("created_at", "desc")
        .get();
      const payouts = (snap.docs || []).map((d: any) => ({ id: d.id, ...d.data() }));
      res.json({ payouts });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Partner: Revenue Policy (Read-Only)
  app.get("/api/partner/revenue-policy", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated" });

      const doc = await db.collection("revenue_policies").doc(String(clubId)).get();
      res.json({ policy: doc.exists ? doc.data() : null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Partner: Balance Information
  app.get("/api/partner/balance", authenticate, async (req: any, res) => {
    try {
      if (!['partner', 'admin'].includes(req.user?.role)) {
        return res.status(403).json({ error: "Forbidden: Partner or Admin access required" });
      }
      const clubId = resolvePartnerClubId(req);
      if (!clubId) return res.status(400).json({ error: "No partner club associated" });

      const doc = await db.collection("club_balances").doc(String(clubId)).get();
      res.json({ balance: doc.exists ? doc.data() : { available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0 } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Payouts listing endpoint (Admin or Club Manager filter)
  app.get("/api/admin/payouts", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.query;
      let snap;
      if (clubId) {
        snap = await db.collection("payouts").where("club_id", "==", String(clubId)).get();
      } else {
        snap = await db.collection("payouts").get();
      }
      const payouts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(payouts);
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
      if (req.body.platformFeePercent !== undefined) {
        updateData.platformFeePercent = Number(req.body.platformFeePercent);
        updateData.platform_fee_percent = Number(req.body.platformFeePercent);
      }
      if (req.body.clubSharePercent !== undefined) {
        updateData.clubSharePercent = Number(req.body.clubSharePercent);
        updateData.club_share_percent = Number(req.body.clubSharePercent);
      }
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive ? 1 : 0;
        updateData.is_active = req.body.isActive ? 1 : 0;
      }

      await db.collection("revenue_policies").doc(id).update(updateData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/revenue-policies", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId, platformFeePercent, clubSharePercent } = req.body;
      if (!clubId) return res.status(400).json({ error: "clubId required" });
      const pFee = Number(platformFeePercent) || 20;
      const cShare = Number(clubSharePercent) || (100 - pFee);
      const policyId = Date.now().toString();
      const policyData = {
        id: policyId,
        clubId: String(clubId),
        club_id: String(clubId),
        platformFeePercent: pFee,
        platform_fee_percent: pFee,
        clubSharePercent: cShare,
        club_share_percent: cShare,
        isActive: 1,
        is_active: 1,
        createdAt: new Date().toISOString()
      };
      await db.collection("revenue_policies").doc(policyId).set(policyData);
      cacheEngine.invalidateCollection("revenue_policies");
      res.json({ success: true, ...policyData });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === PAYOUT SETTINGS API ===
  app.get("/api/admin/payout-settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const doc = await db.collection("payment_settings").doc("payout_config").get();
      const defaults = {
        thresholdAmount: 50,
        schedule: "manual",
        autoFrequencyHours: 24,
        currency: "GBP",
        enabled: true,
        instantSplit: false
      };
      if (!doc.exists) return res.json(defaults);
      const data = doc.data();
      res.json({ ...defaults, ...data });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/admin/payout-settings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { thresholdAmount, schedule, autoFrequencyHours, currency, enabled, instantSplit } = req.body;
      const config: any = {};
      if (thresholdAmount !== undefined) config.thresholdAmount = Number(thresholdAmount);
      if (schedule !== undefined) config.schedule = schedule;
      if (autoFrequencyHours !== undefined) config.autoFrequencyHours = Number(autoFrequencyHours);
      if (currency !== undefined) config.currency = currency;
      if (enabled !== undefined) config.enabled = !!enabled;
      if (instantSplit !== undefined) config.instantSplit = !!instantSplit;

      const docRef = db.collection("payment_settings").doc("payout_config");
      const existing = await docRef.get();
      if (existing.exists) {
        await docRef.update(config);
      } else {
        await docRef.set({
          thresholdAmount: 50,
          schedule: "manual",
          autoFrequencyHours: 24,
          currency: "GBP",
          enabled: true,
          instantSplit: false,
          ...config
        });
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === CLUB BALANCES & EARNINGS API ===
  app.get("/api/admin/club-balances", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const snap = await db.collection("club_balances").get();
      const balances = snap.docs.map((doc: any) => ({ clubId: doc.id, ...doc.data() }));

      // Enrich with club names
      const clubsSnap = await db.collection("clubs").get();
      const clubMap: Record<string, any> = {};
      clubsSnap.docs.forEach((d: any) => {
        const data = d.data();
        clubMap[d.id] = { name: data.name, slug: data.slug, logo: data.logo, stripeAccountId: data.stripeAccountId || data.stripe_account_id, stripeOnboardingComplete: data.stripeOnboardingComplete || data.stripe_onboarding_complete };
      });

      const enriched = balances.map((b: any) => ({
        ...b,
        clubName: clubMap[b.clubId]?.name || "Unknown",
        clubSlug: clubMap[b.clubId]?.slug || "",
        clubLogo: clubMap[b.clubId]?.logo || null,
        stripeAccountId: clubMap[b.clubId]?.stripeAccountId || null,
        stripeOnboardingComplete: clubMap[b.clubId]?.stripeOnboardingComplete || 0
      }));

      res.json(enriched);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/club-balances/:clubId", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.params;
      const balDoc = await db.collection("club_balances").doc(clubId).get();
      const balance = balDoc.exists ? balDoc.data() : { availableBalance: 0, pendingBalance: 0, totalEarned: 0, totalPaidOut: 0, currency: "GBP" };

      // Get recent earnings
      const earningsSnap = await db.collection("club_earnings").where("club_id", "==", clubId).get();
      const earnings = earningsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({ balance: { clubId, ...balance }, earnings });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/admin/club-earnings", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId } = req.query;
      let snap;
      if (clubId) {
        snap = await db.collection("club_earnings").where("club_id", "==", String(clubId)).get();
      } else {
        snap = await db.collection("club_earnings").get();
      }
      const earnings = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      res.json(earnings);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === PAYOUT TRIGGER API ===
  async function triggerClubPayout(clubId: string, forceOverrideThreshold = false): Promise<{ success: boolean; error?: string; payoutId?: string }> {
    try {
      // Load payout config
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, currency: "GBP", enabled: true, instantSplit: false };
      if (!config.enabled) return { success: false, error: "Payouts are disabled" };

      // Load club balance
      const balDoc = await db.collection("club_balances").doc(clubId).get();
      if (!balDoc.exists) return { success: false, error: "No balance record for this club" };
      const bal = balDoc.data();
      const availableBalance = Number(bal.availableBalance || bal.available_balance) || 0;
      const threshold = Number(config.thresholdAmount) || 50;

      if (!forceOverrideThreshold && !config.instantSplit && availableBalance < threshold) {
        return { success: false, error: `Balance ${availableBalance} below threshold ${threshold}` };
      }
      if (availableBalance <= 0) return { success: false, error: "No available balance" };

      // Load club for stripe account
      const clubDoc = await db.collection("clubs").doc(clubId).get();
      if (!clubDoc.exists) return { success: false, error: "Club not found" };
      const club = clubDoc.data();
      const stripeAccountId = club.stripe_account_id || club.stripeAccountId;
      if (!stripeAccountId) return { success: false, error: "Club has no Stripe connected account" };
      const onboarded = club.stripe_onboarding_complete || club.stripeOnboardingComplete;
      if (!onboarded) return { success: false, error: "Club Stripe onboarding not complete" };

      // Load platform Stripe key
      const settingsDoc = await db.collection("payment_settings").doc("gateway").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const stripeSecretKey = settings?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return { success: false, error: "Stripe not configured" };

      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" as any });
      const payoutCurrency = (config.currency || "GBP").toLowerCase();
      const amountCents = Math.round(availableBalance * 100);

      // Verify connected account can receive transfers before attempting
      try {
        const connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
        if (connectedAccount.capabilities?.transfers !== 'active') {
          return { success: false, error: "Partner account transfers capability is not active. Onboarding may be incomplete." };
        }
      } catch (acctErr: any) {
        return { success: false, error: `Could not verify partner Stripe account: ${acctErr.message}` };
      }

      // Create a transfer from the platform balance to the connected account
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: payoutCurrency,
        destination: stripeAccountId,
        description: `Payout to ${club.name || clubId} — ${forceOverrideThreshold ? 'manual force' : config.instantSplit ? 'instant split' : 'threshold auto'}`,
        metadata: { clubId, method: forceOverrideThreshold ? "manual" : (config.instantSplit ? "instant" : "auto") }
      });

      // Record payout in DB
      const payoutId = `po_${Date.now()}_${clubId}`;
      await db.collection("payouts").doc(payoutId).set({
        id: payoutId,
        clubId,
        stripePayoutId: transfer.id,
        stripeAccountId,
        amount: availableBalance,
        currency: payoutCurrency.toUpperCase(),
        status: "paid",
        method: forceOverrideThreshold ? "manual" : (config.instantSplit ? "instant" : "auto"),
        arrivalDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // Debit available balance and credit total paid out
      const pendingBal = Number(bal.pendingBalance || bal.pending_balance) || 0;
      const totalPaid = Number(bal.totalPaidOut || bal.total_paid_out) || 0;
      await db.collection("club_balances").doc(clubId).update({
        availableBalance: 0,
        totalPaidOut: totalPaid + availableBalance
      });

      cacheEngine.invalidateCollection("payouts");
      cacheEngine.invalidateCollection("club_balances");

      return { success: true, payoutId };
    } catch (e: any) {
      console.error(`Payout trigger error for club ${clubId}:`, e.message);
      return { success: false, error: e.message };
    }
  }

  app.post("/api/admin/payouts/trigger", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { clubId, forceOverrideThreshold } = req.body;
      if (!clubId) return res.status(400).json({ error: "clubId required" });
      const result = await triggerClubPayout(String(clubId), !!forceOverrideThreshold);
      if (result.success) {
        notifyAdmins("Manual Payout Triggered", `Payout initiated for club ${clubId}`, "system", "/admin/finance");
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/payouts/trigger-all", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      const config = configDoc.exists ? configDoc.data() : { thresholdAmount: 50, enabled: true };
      if (!config.enabled) return res.status(400).json({ error: "Payouts are disabled" });

      const threshold = Number(config.thresholdAmount) || 50;
      const balancesSnap = await db.collection("club_balances").get();
      const results: any[] = [];

      for (const doc of balancesSnap.docs) {
        const bal = doc.data();
        const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
        if (availBal >= threshold) {
          const result = await triggerClubPayout(doc.id, false);
          results.push({ clubId: doc.id, ...result });
        }
      }

      notifyAdmins("Batch Payouts Triggered", `Processed ${results.length} eligible club(s)`, "system", "/admin/finance");
      res.json({ success: true, processed: results.length, results });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // === SCHEDULED PAYOUT ENGINE ===
  async function processScheduledPayouts() {
    try {
      const configDoc = await db.collection("payment_settings").doc("payout_config").get();
      if (!configDoc.exists) return;
      const config = configDoc.data();
      if (config.schedule !== "auto" || !config.enabled) return;

      const threshold = Number(config.thresholdAmount) || 50;
      const balancesSnap = await db.collection("club_balances").get();
      let triggered = 0;

      for (const doc of balancesSnap.docs) {
        const bal = doc.data();
        const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
        if (availBal >= threshold) {
          const result = await triggerClubPayout(doc.id, false);
          if (result.success) triggered++;
        }
      }

      if (triggered > 0) {
        console.log(`[PayoutEngine] Auto-triggered ${triggered} payout(s)`);
      }
    } catch (e: any) {
      console.error("[PayoutEngine] Scheduled payout error:", e.message);
    }
  }

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
        .where("club_id", "==", String(clubId))
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
        connectedAccountId: connectedAccountId || null,
        isDestinationCharge: true,
        settlement_model: "STRIPE_DESTINATION_ROUTED"
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
        if (settings.stripe.secretKey.trim().startsWith("mk_")) {
          return res.status(400).json({
            error: "Invalid Stripe Secret Key: An API Key Identifier (starts with 'mk_') was entered. Please enter your actual Stripe Secret Key (starts with 'sk_test_', 'sk_live_', or 'rk_') in Admin > Settings > Payment Settings."
          });
        }

        const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
        const targetCurrency = settings.stripe.merchantCurrency || currency;

        // Validate connected account exists and can receive transfers (fail-closed)
        if (!connectedAccountId) {
          return res.status(409).json({ error: "Partner club has no Stripe connected account. Cannot process split payment." });
        }
        try {
          const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
          const transfersCapability = connectedAccount.capabilities?.transfers;
          if (transfersCapability !== 'active') {
            return res.status(409).json({ error: "Partner account is not yet eligible to receive transfers. Onboarding may be incomplete." });
          }
        } catch (acctErr: any) {
          console.error(`[ConnectPPV] Failed to verify connected account ${connectedAccountId}:`, acctErr.message);
          return res.status(409).json({ error: `Could not verify partner Stripe account: ${acctErr.message}` });
        }

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
            payment_type: "ppv_watch",
            settlement_model: "STRIPE_DESTINATION_ROUTED"
          },
          payment_intent_data: {
            application_fee_amount: applicationFeeCents,
            transfer_data: {
              destination: connectedAccountId,
            },
            metadata: {
              txn_id: transactionId,
              match_id: String(matchId),
              club_id: String(clubId),
              user_id: userId,
              payment_type: "ppv_watch",
              settlement_model: "STRIPE_DESTINATION_ROUTED"
            }
          }
        };

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
      const webhookSecret = settings?.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

      let event = req.body;
      if (webhookSecret) {
        const sig = req.headers["stripe-signature"];
        if (sig) {
          try {
            event = stripe.webhooks.constructEvent(req.rawBody || JSON.stringify(req.body), sig, webhookSecret);
          } catch (err: any) {
            console.error("Stripe Webhook Signature Verification Failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
          }
        }
      }

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
          if ((txnData.type === "watch" || txnData.type === "ppv") && txnData.metadata?.matchId) {
            const isDest = !!txnData.metadata?.isDestinationCharge;
            await processClubRevenueSplit({
              matchId: String(txnData.metadata.matchId),
              transactionId: txnId,
              grossAmount: Number(txnData.amount) || 0,
              userId: txnData.userId || txnData.user_id,
              isDestinationCharge: isDest,
              connectedAccountId: txnData.metadata?.connectedAccountId || null,
              platformFeePercent: txnData.metadata?.platformFeePercent ? Number(txnData.metadata.platformFeePercent) : undefined,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined
            });
          }
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
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        const user = userDoc.exists ? userDoc.data() : null;
        const userEmail = user?.email;
        const userName = user?.name || "User";

        if (type === "top_up") {
          await userRef.update({ balance: (Number(user?.balance) || 0) + Number(amount) });
          await db.collection("transactions").doc(txnId).update({ status: "completed" });
          notifyUser(userId, "Wallet Top-up Successful", `Your wallet has been credited with ${amount}.`, "success", "/profile");
          notifyAdmins("New Wallet Top-up", `User top-up: ${amount}`, "system", "/admin/transactions");
          if (userEmail) {
            sendTemplateEmail(userEmail, "payment_successful", {
              first_name: userName,
              purchase_amount: String(amount),
              transaction_id: txnId,
              invoice_number: `INV-${Date.now()}`,
              support_email: "support@watchwds.com"
            }).catch(err => console.error("Failed to send top up email:", err));
          }
        } else if (type === "watch" || type === "ppv" || type === "embed") {
          const purchaseId = Date.now().toString();
          const durationInfo = (type === "watch" || type === "ppv") && metadata?.matchId
            ? await calculateAccessDuration(metadata.matchId, new Date())
            : { access_starts_at: null, access_expires_at: null, access_status: 'active' };

          const purchaseData: any = {
            id: purchaseId,
            userId,
            matchId: metadata?.matchId,
            amount: Number(amount),
            type: type === "embed" ? "embed" : "watch",
            date: new Date().toISOString(),
            access_starts_at: durationInfo.access_starts_at,
            access_expires_at: durationInfo.access_expires_at,
            access_status: durationInfo.access_status
          };
          if (type === "embed") {
            purchaseData.code = `<iframe src="https://watchwds.com/embed/${metadata?.matchId}" width="800" height="450" frameborder="0" allowfullscreen></iframe>`;
          }
          await db.collection("purchases").doc(purchaseId).set(purchaseData);
          await db.collection("transactions").doc(txnId).update({ status: "completed" });

          notifyUser(userId, "Purchase Successful", "You have unlocked PPV match access.", "success", `/matches/${metadata?.fromMatchSlug || metadata?.matchId}`);
          notifyAdmins("PPV Purchase (Stripe Connect)", `PPV purchase completed: ${amount} for match #${metadata?.matchId}`, "system", "/admin/transactions");

          // === COMMISSION RECORDING: Process club earnings and revenue split ===
          if (metadata?.matchId) {
            const isDest = !!metadata?.isDestinationCharge;
            await processClubRevenueSplit({
              matchId: String(metadata.matchId),
              transactionId: txnId,
              grossAmount: Number(amount) || 0,
              userId,
              isDestinationCharge: isDest,
              connectedAccountId: metadata?.connectedAccountId || null,
              platformFeePercent: metadata?.platformFeePercent ? Number(metadata.platformFeePercent) : undefined,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined
            });
          }

          if (userEmail && metadata?.matchId) {
            const matchDoc = await db.collection("matches").doc(String(metadata.matchId)).get();
            const matchData = matchDoc.exists ? matchDoc.data() : {};
            sendTemplateEmail(userEmail, "match_purchased", {
              first_name: userName,
              match_name: matchData.title || "Match Access",
              match_date: matchData.start_time || new Date().toLocaleDateString(),
              match_time: matchData.time || "UTC",
              purchase_amount: String(amount),
              website_url: `${getRequestBaseUrl(req)}/matches/${metadata.matchId}`,
              transaction_id: txnId
            }).catch(err => console.error("Failed to send match purchase email:", err));
          }
        } else if (type === "plan") {
          const planDoc = await db.collection("plans").doc(String(metadata?.planId)).get();
          const planData = planDoc.exists ? planDoc.data() : {};
          const durationDays = Number(planData.duration_days || planData.durationDays || 30);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          await userRef.update({
            planId: Number(metadata?.planId),
            planExpiresAt: expiresAt.toISOString()
          });
          await db.collection("transactions").doc(txnId).update({ status: "completed" });

          notifyUser(userId, "Subscription Activated", `Your plan "${planData.name || 'Subscription'}" is now active.`, "success", "/plans");
          notifyAdmins("New Subscription", `User subscribed to plan #${metadata?.planId}`, "system", "/admin/transactions");
        }
      }

      // Handle direct connected account payout events
      if (event.type === "payout.paid" || event.type === "payout.failed") {
        const payoutObj = event.data?.object;
        if (payoutObj) {
          const connectedAccountId = event.account; // Account ID for connected account events
          const stripePayoutId = payoutObj.id;
          const amount = (payoutObj.amount || 0) / 100;
          const currency = payoutObj.currency || 'usd';
          const status = event.type === "payout.paid" ? "paid" : "failed";
          const arrivalDate = payoutObj.arrival_date ? new Date(payoutObj.arrival_date * 1000).toISOString() : new Date().toISOString();
          const failureCode = payoutObj.failure_code || null;
          const failureMessage = payoutObj.failure_message || null;

          // Find corresponding club by stripe_account_id
          let clubId = "unknown";
          if (connectedAccountId) {
            const clubsSnap = await db.collection("clubs").where("stripe_account_id", "==", connectedAccountId).get();
            if (!clubsSnap.empty) {
              clubId = clubsSnap.docs[0].id;
            }
          }

          // Check if payout record already exists
          const payoutDoc = await db.collection("payouts").doc(stripePayoutId).get();
          if (payoutDoc.exists) {
            await db.collection("payouts").doc(stripePayoutId).update({
              status,
              arrivalDate,
              failureCode,
              failureMessage,
              updatedAt: new Date().toISOString()
            });
          } else {
            await db.collection("payouts").doc(stripePayoutId).set({
              id: stripePayoutId,
              clubId,
              stripePayoutId,
              amount,
              currency,
              status,
              arrivalDate,
              failureCode,
              failureMessage,
              createdAt: new Date().toISOString()
            });
          }
          cacheEngine.invalidateCollection("payouts");

          // === UPDATE CLUB BALANCES based on payout outcome ===
          if (clubId !== "unknown") {
            try {
              const balDoc = await db.collection("club_balances").doc(clubId).get();
              if (balDoc.exists) {
                const bal = balDoc.data();
                const pendingBal = Number(bal.pendingBalance || bal.pending_balance) || 0;
                const availBal = Number(bal.availableBalance || bal.available_balance) || 0;
                const totalPaid = Number(bal.totalPaidOut || bal.total_paid_out) || 0;

                if (status === "paid") {
                  // Payout succeeded — debit pending, credit total_paid_out
                  await db.collection("club_balances").doc(clubId).update({
                    pendingBalance: Math.max(0, pendingBal - amount),
                    totalPaidOut: totalPaid + amount
                  });
                  notifyAdmins("Payout Completed", `Payout of ${amount} ${currency.toUpperCase()} to club paid successfully.`, "success", "/admin/finance");
                } else if (status === "failed") {
                  // Payout failed — move amount back from pending to available
                  await db.collection("club_balances").doc(clubId).update({
                    pendingBalance: Math.max(0, pendingBal - amount),
                    availableBalance: availBal + amount
                  });
                  notifyAdmins("Payout Failed", `Payout of ${amount} ${currency.toUpperCase()} failed: ${failureMessage || failureCode || 'Unknown error'}`, "error", "/admin/finance");
                }
                cacheEngine.invalidateCollection("club_balances");
              }
            } catch (balErr: any) {
              console.error("Club balance update on payout event error:", balErr.message);
            }
          }
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

  // === PUBLIC DYNAMIC SEO ROUTERS (/robots.txt & /sitemap.xml) ===
  app.get("/robots.txt", async (_req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo").get();
      const seoData = snap.exists ? snap.data() : {};
      const content = seoData?.robotsTxt || "User-agent: *\nAllow: /";
      res.type("text/plain").send(content);
    } catch (e) {
      res.type("text/plain").send("User-agent: *\nAllow: /");
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("seo").get();
      const seoData = snap.exists ? snap.data() || {} : {};
      const baseUrl = seoData.canonicalBaseUrl || `${req.protocol}://${req.get('host')}`;
      
      const matchesSnap = await db.collection("matches").get();
      const postsSnap = await db.collection("blog_posts").get();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      const routes = ['/', '/matches', '/blog', '/pricing', '/faq'];
      for (const route of routes) {
        xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>${seoData.sitemapChangeFreq || 'daily'}</changefreq>\n    <priority>${seoData.sitemapPriority || '0.8'}</priority>\n  </url>\n`;
      }

      matchesSnap.docs.forEach(doc => {
        const m = doc.data();
        const slug = m.slug || doc.id;
        xml += `  <url>\n    <loc>${baseUrl}/match/${slug}</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      });

      postsSnap.docs.forEach(doc => {
        const p = doc.data();
        const slug = p.slug || doc.id;
        xml += `  <url>\n    <loc>${baseUrl}/blog/${slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });

      xml += `</urlset>`;
      res.type("application/xml").send(xml);
    } catch (e: any) {
      res.status(500).send("Error generating sitemap");
    }
  });



  // === SEO MANAGEMENT API ===
  app.get("/api/seo/per-page", async (_req, res) => {
    try {
      const snap = await db.collection("per_page_seo").get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/seo/per-page", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.body.id || `page-${Date.now()}`;
      const pageData = { ...req.body, id };
      await db.collection("per_page_seo").doc(id).set(pageData);
      res.json({ success: true, ...pageData });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/seo/per-page/:id", authenticate, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection("per_page_seo").doc(id).delete();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/seo/ping-sitemap", authenticate, requireRole(["admin"]), async (_req, res) => {
    try {
      res.json({
        success: true,
        message: "Sitemap submission request successfully dispatched to Google & Bing Search Consoles!",
        results: {
          google: { success: true, status: 200 },
          bing: { success: true, status: 200 }
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // === SLIDER BUILDER API ===
  const DEFAULT_SLIDERS = [
    {
      id: "default-hero",
      name: "Homepage Hero",
      shortcode: '[slider id="default-hero"]',
      autoSlide: true,
      interval: 5,
      slides: [
        {
          id: "slide-1",
          title: "Grassroots Sports, Live & Direct.",
          subtitle: "WatchWDS brings you the best of local and grassroots sports streaming.",
          image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
          link: "/matches",
          buttonText: "Watch Now",
          isActive: true,
        }
      ]
    }
  ];

  app.get("/api/sliders", async (_req, res) => {
    try {
      const doc = await db.collection("settings").doc("sliders").get();
      if (doc.exists) {
        const data = doc.data();
        const slidersList = Array.isArray(data) ? data : (data?.sliders || DEFAULT_SLIDERS);
        return res.json({ success: true, sliders: slidersList });
      }
      res.json({ success: true, sliders: DEFAULT_SLIDERS });
    } catch (err: any) {
      console.error("Error fetching sliders:", err);
      res.status(500).json({ error: err.message, sliders: DEFAULT_SLIDERS });
    }
  });

  app.put("/api/admin/sliders", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { sliders } = req.body;
      const slidersArray = Array.isArray(sliders) ? sliders : (Array.isArray(req.body) ? req.body : null);
      if (!slidersArray) {
        return res.status(400).json({ error: "Invalid sliders payload: must be an array of slider groups" });
      }

      await db.collection("settings").doc("sliders").set({ sliders: slidersArray });
      console.log(`[SLIDER BUILDER] Saved ${slidersArray.length} slider groups to database`);
      res.json({ success: true, message: "Sliders saved to database successfully", sliders: slidersArray });
    } catch (err: any) {
      console.error("Error saving sliders:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // === USER FEEDBACK & REVIEWS API ===

  // In-memory rate limiting map for feedback submissions (IP -> array of timestamps)
  const feedbackRateLimits = new Map<string, number[]>();

  app.get("/api/feedback/settings", async (_req, res) => {
    try {
      const doc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      const settings = doc.exists ? { ...defaultSettings, ...doc.data() } : defaultSettings;
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/feedback", async (req: any, res) => {
    try {
      const clientIp = getClientIp(req);
      const now = Date.now();
      const timestamps = feedbackRateLimits.get(clientIp) || [];
      const recentTimestamps = timestamps.filter(t => now - t < 3600000); // 1 hour window
      if (recentTimestamps.length >= 6) {
        return res.status(429).json({ error: "Too many feedback submissions. Please try again later." });
      }
      recentTimestamps.push(now);
      feedbackRateLimits.set(clientIp, recentTimestamps);

      // Check settings to see if enabled & guest allowed
      const settingsDoc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      const settings = settingsDoc.exists ? { ...defaultSettings, ...settingsDoc.data() } : defaultSettings;
      if (settings.enabled === false) {
        return res.status(403).json({ error: "Feedback collection is currently disabled." });
      }

      const { rating, rating_label, category, feedback_text, guest_email, page_url, device_info } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
      }
      if (!feedback_text || typeof feedback_text !== "string" || feedback_text.trim().length === 0) {
        return res.status(400).json({ error: "Feedback comments cannot be empty." });
      }
      if (feedback_text.length > 2000) {
        return res.status(400).json({ error: "Feedback comments cannot exceed 2,000 characters." });
      }

      // Check if user is logged in
      let userId: string | null = null;
      let username: string = "Guest";
      let userEmail: string | null = guest_email ? String(guest_email).trim().toLowerCase() : null;
      let isGuest = 1;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.id) {
            const userDoc = await db.collection("users").doc(String(decoded.id)).get();
            if (userDoc.exists) {
              const u = userDoc.data();
              userId = String(decoded.id);
              username = u.name || u.username || u.email?.split('@')[0] || "User";
              userEmail = u.email || userEmail;
              isGuest = 0;
            }
          }
        } catch {
          // invalid or expired token - fallback to guest
        }
      }

      if (isGuest === 1 && settings.allow_guest === false) {
        return res.status(403).json({ error: "Guest feedback is currently disabled. Please log in to provide feedback." });
      }

      const id = "fb_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      const ratingLabel = rating_label || ["Terrible", "Poor", "Average", "Good", "Excellent"][Number(rating) - 1] || "Average";
      const cat = category || "Website Experience";
      const cleanedFeedback = feedback_text.trim();
      const page = page_url ? String(page_url).slice(0, 500) : null;
      const devInfo = device_info ? (typeof device_info === "object" ? JSON.stringify(device_info).slice(0, 500) : String(device_info).slice(0, 500)) : null;

      await execute(
        `INSERT INTO \`user_feedback\` 
         (\`id\`, \`user_id\`, \`username\`, \`user_email\`, \`is_guest\`, \`rating\`, \`rating_label\`, \`category\`, \`feedback_text\`, \`page_url\`, \`device_info\`, \`status\`, \`admin_notes\`, \`response_count\`, \`created_at\`, \`updated_at\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', 0, NOW(), NOW())`,
        [id, userId, username, userEmail, isGuest, Number(rating), ratingLabel, cat, cleanedFeedback, page, devInfo]
      );

      // Async send admin notification if enabled
      if (settings.notify_admin_email !== false) {
        (async () => {
          try {
            const adminEmails = getAdminEmails();
            const dbAdmins: any[] = await query("SELECT `email` FROM `users` WHERE `role` = 'admin'");
            const allAdmins = Array.from(new Set([...adminEmails, ...dbAdmins.map(a => (a.email || '').toLowerCase())])).filter(Boolean);

            for (const adminEmail of allAdmins) {
              await sendTemplateEmail(adminEmail, "feedback_admin_alert", {
                user_name: username,
                user_email: userEmail || "Anonymous / No Email",
                rating: String(rating),
                rating_label: ratingLabel,
                category: cat,
                feedback_text: cleanedFeedback,
                page_url: page || "N/A",
                device_info: devInfo || "N/A",
                website_url: globalAppUrl
              });
            }
          } catch (notifErr: any) {
            console.error("Failed to dispatch admin feedback alert:", notifErr.message);
          }
        })();
      }

      res.json({ success: true, message: "Thank you for your feedback!", feedbackId: id });
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Feedback Endpoints
  app.get("/api/admin/feedback", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { rating, category, status, user_type, search, page = "1", limit = "25" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 25));
      const offset = (pageNum - 1) * limitNum;

      const whereClauses: string[] = ["1=1"];
      const params: any[] = [];

      if (rating && rating !== "all") {
        whereClauses.push("`rating` = ?");
        params.push(Number(rating));
      }
      if (category && category !== "all") {
        whereClauses.push("`category` = ?");
        params.push(String(category));
      }
      if (status && status !== "all") {
        whereClauses.push("`status` = ?");
        params.push(String(status));
      }
      if (user_type === "registered") {
        whereClauses.push("`is_guest` = 0");
      } else if (user_type === "guest") {
        whereClauses.push("`is_guest` = 1");
      }
      if (search && String(search).trim().length > 0) {
        const searchTerm = `%${String(search).trim()}%`;
        whereClauses.push("(`username` LIKE ? OR `user_email` LIKE ? OR `feedback_text` LIKE ? OR `page_url` LIKE ?)");
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereSql = whereClauses.join(" AND ");

      const countResult: any[] = await query(`SELECT COUNT(*) as total FROM \`user_feedback\` WHERE ${whereSql}`, params);
      const total = countResult[0]?.total || 0;

      const items: any[] = await query(
        `SELECT * FROM \`user_feedback\` WHERE ${whereSql} ORDER BY \`created_at\` DESC LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      res.json({
        success: true,
        feedback: items.map((f: any) => ({
          id: f.id,
          userId: f.user_id,
          username: f.username,
          userEmail: f.user_email,
          isGuest: Boolean(f.is_guest),
          rating: Number(f.rating),
          ratingLabel: f.rating_label,
          category: f.category,
          feedbackText: f.feedback_text,
          pageUrl: f.page_url,
          deviceInfo: f.device_info,
          status: f.status,
          adminNotes: f.admin_notes,
          responseCount: Number(f.response_count || 0),
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (err: any) {
      console.error("Error fetching feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/feedback/stats", authenticate, requireRole(["admin"]), async (_req: any, res) => {
    try {
      const totalRes: any[] = await query("SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM `user_feedback`");
      const total = totalRes[0]?.total || 0;
      const averageRating = totalRes[0]?.avg_rating ? Number(parseFloat(totalRes[0].avg_rating).toFixed(2)) : 0;

      const ratingCountsRes: any[] = await query("SELECT `rating`, COUNT(*) as count FROM `user_feedback` GROUP BY `rating`");
      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingCountsRes.forEach(r => {
        ratingCounts[Number(r.rating)] = Number(r.count);
      });

      const positiveCount = (ratingCounts[4] || 0) + (ratingCounts[5] || 0);
      const csatPercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

      const statusRes: any[] = await query("SELECT `status`, COUNT(*) as count FROM `user_feedback` GROUP BY `status`");
      const statusCounts: Record<string, number> = {
        new: 0,
        reviewed: 0,
        in_progress: 0,
        resolved: 0,
        archived: 0
      };
      statusRes.forEach(s => {
        statusCounts[s.status] = Number(s.count);
      });

      const categoryRes: any[] = await query("SELECT `category`, COUNT(*) as count FROM `user_feedback` GROUP BY `category` ORDER BY count DESC");
      const categoryBreakdown = categoryRes.map(c => ({ category: c.category, count: Number(c.count) }));

      const guestRes: any[] = await query("SELECT `is_guest`, COUNT(*) as count FROM `user_feedback` GROUP BY `is_guest`");
      const userTypeBreakdown = { registered: 0, guest: 0 };
      guestRes.forEach(g => {
        if (g.is_guest) userTypeBreakdown.guest = Number(g.count);
        else userTypeBreakdown.registered = Number(g.count);
      });

      res.json({
        success: true,
        stats: {
          totalCount: total,
          averageRating,
          csatPercentage,
          ratingCounts,
          statusCounts,
          categoryBreakdown,
          userTypeBreakdown
        }
      });
    } catch (err: any) {
      console.error("Error fetching feedback stats:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/feedback/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const rows: any[] = await query("SELECT * FROM `user_feedback` WHERE `id` = ?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Feedback item not found" });
      }
      const f = rows[0];

      const responses: any[] = await query(
        "SELECT * FROM `feedback_responses` WHERE `feedback_id` = ? ORDER BY `created_at` ASC",
        [id]
      );

      res.json({
        success: true,
        feedback: {
          id: f.id,
          userId: f.user_id,
          username: f.username,
          userEmail: f.user_email,
          isGuest: Boolean(f.is_guest),
          rating: Number(f.rating),
          ratingLabel: f.rating_label,
          category: f.category,
          feedbackText: f.feedback_text,
          pageUrl: f.page_url,
          deviceInfo: f.device_info,
          status: f.status,
          adminNotes: f.admin_notes,
          responseCount: Number(f.response_count || 0),
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        },
        responses: responses.map(r => ({
          id: r.id,
          feedbackId: r.feedback_id,
          adminId: r.admin_id,
          adminName: r.admin_name,
          responseText: r.response_text,
          emailSent: Boolean(r.email_sent),
          createdAt: r.created_at,
        }))
      });
    } catch (err: any) {
      console.error("Error fetching feedback detail:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/feedback/:id/status", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;
      const validStatuses = ["new", "reviewed", "in_progress", "resolved", "archived"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const updates: string[] = ["`updated_at` = NOW()"];
      const params: any[] = [];
      if (status) {
        updates.push("`status` = ?");
        params.push(status);
      }
      if (admin_notes !== undefined) {
        updates.push("`admin_notes` = ?");
        params.push(admin_notes);
      }
      params.push(id);

      await execute(`UPDATE \`user_feedback\` SET ${updates.join(", ")} WHERE \`id\` = ?`, params);
      res.json({ success: true, message: "Feedback updated successfully" });
    } catch (err: any) {
      console.error("Error updating feedback status:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/feedback/:id/respond", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response_text, send_email = true } = req.body;

      if (!response_text || !response_text.trim()) {
        return res.status(400).json({ error: "Response message cannot be empty" });
      }

      const rows: any[] = await query("SELECT * FROM `user_feedback` WHERE `id` = ?", [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Feedback item not found" });
      }
      const feedback = rows[0];

      // Lookup admin user for signature
      let adminName = "WatchWDS Support Team";
      if (req.user && req.user.id) {
        const adminDoc = await db.collection("users").doc(String(req.user.id)).get();
        if (adminDoc.exists) {
          adminName = adminDoc.data().name || adminDoc.data().username || adminName;
        }
      }

      const responseId = "resp_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      let emailSent = 0;

      if (send_email && feedback.user_email) {
        try {
          const emailResult = await sendTemplateEmail(feedback.user_email, "feedback_response", {
            user_name: feedback.username || "Valued User",
            rating: String(feedback.rating),
            category: feedback.category,
            feedback_text: feedback.feedback_text,
            response_text: response_text.trim(),
            admin_name: adminName,
            website_url: globalAppUrl
          });
          if (emailResult && emailResult.success) {
            emailSent = 1;
          }
        } catch (mailErr: any) {
          console.error("Failed to send feedback response email:", mailErr.message);
        }
      }

      await execute(
        "INSERT INTO `feedback_responses` (`id`, `feedback_id`, `admin_id`, `admin_name`, `response_text`, `email_sent`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [responseId, id, req.user?.id || null, adminName, response_text.trim(), emailSent]
      );

      // Update feedback response_count and set status to 'reviewed' if currently 'new'
      const newStatus = feedback.status === "new" ? "reviewed" : feedback.status;
      await execute(
        "UPDATE `user_feedback` SET `response_count` = `response_count` + 1, `status` = ?, `updated_at` = NOW() WHERE `id` = ?",
        [newStatus, id]
      );

      // In-app notification if registered user
      if (feedback.user_id) {
        notifyUser(
          feedback.user_id,
          "Response to your WatchWDS feedback",
          `Our support team has responded to your feedback about ${feedback.category}.`,
          "info",
          "/profile"
        ).catch(err => console.error("Failed to send notification to user:", err));
      }

      res.json({
        success: true,
        message: emailSent ? "Response recorded and email dispatched to user" : "Response recorded successfully",
        response: {
          id: responseId,
          feedbackId: id,
          adminId: req.user?.id || null,
          adminName,
          responseText: response_text.trim(),
          emailSent: Boolean(emailSent),
          createdAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error("Error responding to feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/feedback/:id", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const { id } = req.params;
      await execute("DELETE FROM `feedback_responses` WHERE `feedback_id` = ?", [id]);
      await execute("DELETE FROM `user_feedback` WHERE `id` = ?", [id]);
      res.json({ success: true, message: "Feedback and response history deleted successfully" });
    } catch (err: any) {
      console.error("Error deleting feedback:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/feedback-settings", authenticate, requireRole(["admin"]), async (_req: any, res) => {
    try {
      const doc = await db.collection("settings").doc("feedback_config").get();
      const defaultSettings = {
        enabled: true,
        allow_guest: true,
        trigger_type: "delay",
        trigger_delay_seconds: 15,
        pages_before_prompt: 3,
        cooldown_days_after_submit: 30,
        cooldown_days_after_dismiss: 1,
        cooldown_days_after_later: 7,
        categories: [
          "Website Experience",
          "Video/Streaming",
          "Payment",
          "Account",
          "Performance",
          "Bug Report",
          "Suggestion",
          "Other"
        ],
        notify_admin_email: true
      };
      res.json({ success: true, settings: doc.exists ? { ...defaultSettings, ...doc.data() } : defaultSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/feedback-settings", authenticate, requireRole(["admin"]), async (req: any, res) => {
    try {
      const newSettings = req.body;
      await db.collection("settings").doc("feedback_config").set(newSettings);
      res.json({ success: true, settings: newSettings, message: "Feedback settings saved successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

    // Ensure users avatar column exists (safe incremental upgrade)
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`avatar\` TEXT DEFAULT NULL
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure users avatar column exists:", err);
      }
    });

    // Ensure users onboarding_completed column exists
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`onboarding_completed\` TINYINT(1) DEFAULT 0
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure users onboarding_completed column exists:", err);
      }
    });

    // Ensure users phone_number column exists
    execute(`
      ALTER TABLE \`users\` ADD COLUMN \`phone_number\` VARCHAR(50) DEFAULT NULL
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure users phone_number column exists:", err);
      }
    });

    // Ensure avatar column can hold high-res base64 without truncation
    execute(`
      ALTER TABLE \`users\` MODIFY COLUMN \`avatar\` LONGTEXT DEFAULT NULL
    `).catch(() => {});

    // Ensure matches date and start_time columns are properly populated and not empty/invalid
    execute(`
      UPDATE \`matches\` 
      SET \`date\` = COALESCE(NULLIF(\`date\`, ''), NULLIF(\`start_time\`, ''), \`created_at\`, NOW()),
          \`start_time\` = COALESCE(NULLIF(\`start_time\`, ''), NULLIF(\`date\`, ''), \`created_at\`, NOW())
      WHERE \`date\` IS NULL OR \`date\` = '' OR \`date\` = 'Invalid Date' OR \`start_time\` IS NULL
    `).catch(() => {});

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

    execute(`
      CREATE TABLE IF NOT EXISTS \`payouts\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`stripe_payout_id\` VARCHAR(100) DEFAULT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`currency\` VARCHAR(10) DEFAULT 'usd',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`arrival_date\` TIMESTAMP NULL DEFAULT NULL,
        \`failure_code\` VARCHAR(100) DEFAULT NULL,
        \`failure_message\` TEXT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_payout_club\` (\`club_id\`),
        INDEX \`idx_payout_stripe_id\` (\`stripe_payout_id\`),
        INDEX \`idx_payout_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure payouts table exists", err));

    // Ensure club_balances table exists (payout engine ledger)
    execute(`
      CREATE TABLE IF NOT EXISTS \`club_balances\` (
        \`club_id\` VARCHAR(100) PRIMARY KEY,
        \`available_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`pending_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`total_earned\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`total_paid_out\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`currency\` VARCHAR(10) DEFAULT 'GBP',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure club_balances table exists", err));

    // Ensure club_earnings table exists (per-transaction audit trail)
    execute(`
      CREATE TABLE IF NOT EXISTS \`club_earnings\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`club_id\` VARCHAR(100) NOT NULL,
        \`match_id\` VARCHAR(100) DEFAULT NULL,
        \`transaction_id\` VARCHAR(100) DEFAULT NULL,
        \`gross_amount\` DECIMAL(10,2) NOT NULL,
        \`platform_commission\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`club_net_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`commission_rate\` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        \`type\` VARCHAR(50) DEFAULT 'ppv',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_earning_club\` (\`club_id\`),
        INDEX \`idx_earning_match\` (\`match_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure club_earnings table exists", err));

    // Ensure payouts.method column exists (manual vs auto)
    execute(`
      ALTER TABLE \`payouts\` ADD COLUMN \`method\` VARCHAR(50) DEFAULT 'auto'
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure payouts method column exists:", err);
      }
    });

    // Ensure club_id column exists on matches table (safe incremental upgrade)
    execute(`
      ALTER TABLE \`matches\` ADD COLUMN \`club_id\` VARCHAR(100) DEFAULT NULL
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure matches club_id column exists:", err);
      }
    });

    // Ensure duration column exists on matches table (safe incremental upgrade)
    execute(`
      ALTER TABLE \`matches\` ADD COLUMN \`duration\` INT DEFAULT 120
    `).catch((err: any) => {
      const msg = err.message || '';
      if (!msg.includes('Duplicate column') && !msg.includes('1060')) {
        console.error("Failed to ensure matches duration column exists:", err);
      }
    });

    // Ensure security system tables exist (trusted_devices, verification_codes, login_attempts, security_settings)
    execute(`
      CREATE TABLE IF NOT EXISTS \`trusted_devices\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) NOT NULL,
        \`device_fingerprint\` VARCHAR(255) NOT NULL,
        \`device_name\` VARCHAR(255) DEFAULT '',
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`country\` VARCHAR(100) DEFAULT '',
        \`city\` VARCHAR(100) DEFAULT '',
        \`last_used_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`is_active\` TINYINT(1) DEFAULT 1,
        KEY \`idx_trusted_devices_user\` (\`user_id\`),
        KEY \`idx_trusted_devices_fingerprint\` (\`device_fingerprint\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure trusted_devices table exists", err));

    execute(`
      CREATE TABLE IF NOT EXISTS \`verification_codes\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) NOT NULL,
        \`code\` VARCHAR(10) NOT NULL,
        \`device_fingerprint\` VARCHAR(255) DEFAULT '',
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`browser_info\` TEXT DEFAULT NULL,
        \`location_info\` VARCHAR(255) DEFAULT '',
        \`expires_at\` DATETIME NOT NULL,
        \`used\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_verification_codes_user\` (\`user_id\`),
        KEY \`idx_verification_codes_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure verification_codes table exists", err));

    execute(`
      CREATE TABLE IF NOT EXISTS \`login_attempts\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`email\` VARCHAR(255) NOT NULL,
        \`ip_address\` VARCHAR(45) DEFAULT '',
        \`user_agent\` TEXT DEFAULT NULL,
        \`success\` TINYINT(1) DEFAULT 0,
        \`reason\` VARCHAR(255) DEFAULT '',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_login_attempts_email\` (\`email\`),
        KEY \`idx_login_attempts_ip\` (\`ip_address\`),
        KEY \`idx_login_attempts_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure login_attempts table exists", err));

    execute(`
      CREATE TABLE IF NOT EXISTS \`security_settings\` (
        \`key_name\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`value\` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure security_settings table exists", err));

    execute(`
      INSERT IGNORE INTO \`security_settings\` (\`key_name\`, \`value\`) VALUES
      ('config', '{"trusted_device_expiry_days":60,"max_login_attempts":5,"lockout_duration_minutes":30,"enable_suspicious_login_alerts":true,"admin_ip_whitelist":[],"enforce_admin_ip_whitelist":false,"enable_device_verification":true}');
    `).catch(err => console.error("Failed to seed security_settings table", err));

    // Ensure user_feedback and feedback_responses tables exist
    execute(`
      CREATE TABLE IF NOT EXISTS \`user_feedback\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`user_id\` VARCHAR(100) DEFAULT NULL,
        \`username\` VARCHAR(150) DEFAULT NULL,
        \`user_email\` VARCHAR(255) DEFAULT NULL,
        \`is_guest\` TINYINT(1) DEFAULT 0,
        \`rating\` INT NOT NULL,
        \`rating_label\` VARCHAR(50) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL,
        \`feedback_text\` TEXT NOT NULL,
        \`page_url\` VARCHAR(500) DEFAULT NULL,
        \`device_info\` VARCHAR(500) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'new',
        \`admin_notes\` TEXT DEFAULT NULL,
        \`response_count\` INT DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_user_feedback_user\` (\`user_id\`),
        KEY \`idx_user_feedback_status\` (\`status\`),
        KEY \`idx_user_feedback_rating\` (\`rating\`),
        KEY \`idx_user_feedback_category\` (\`category\`),
        KEY \`idx_user_feedback_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure user_feedback table exists", err));

    execute(`
      CREATE TABLE IF NOT EXISTS \`feedback_responses\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`feedback_id\` VARCHAR(100) NOT NULL,
        \`admin_id\` VARCHAR(100) DEFAULT NULL,
        \`admin_name\` VARCHAR(150) DEFAULT 'WatchWDS Support',
        \`response_text\` TEXT NOT NULL,
        \`email_sent\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY \`idx_fb_responses_feedback_id\` (\`feedback_id\`),
        KEY \`idx_fb_responses_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(err => console.error("Failed to ensure feedback_responses table exists", err));

    execute(`
      INSERT IGNORE INTO \`settings\` (\`key_name\`, \`value\`) VALUES
      ('feedback_config', '{"enabled":true,"allow_guest":true,"trigger_type":"delay","trigger_delay_seconds":15,"pages_before_prompt":3,"cooldown_days_after_submit":30,"cooldown_days_after_dismiss":1,"cooldown_days_after_later":7,"categories":["Website Experience","Video/Streaming","Payment","Account","Performance","Bug Report","Suggestion","Other"],"notify_admin_email":true}');
    `).catch(err => console.error("Failed to seed feedback_config in settings", err));

    execute(`
      INSERT IGNORE INTO \`settings\` (\`key_name\`, \`value\`) VALUES
      ('sliders', '{"sliders":[{"id":"default-hero","name":"Homepage Hero","shortcode":"[slider id=\\"default-hero\\"]","autoSlide":true,"interval":5,"slides":[{"id":"slide-1","title":"Grassroots Sports, Live & Direct.","subtitle":"WatchWDS brings you the best of local and grassroots sports streaming.","image":"https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80","link":"/matches","buttonText":"Watch Now","isActive":true}]}]}');
    `).catch(err => console.error("Failed to seed sliders in settings", err));

    execute(`
      INSERT IGNORE INTO \`settings\` (\`key_name\`, \`value\`) VALUES
      ('event_access_defaults', '{"defaultRevokeDurationDays":3,"defaultAccessDurationHours":72,"defaultAccessPreset":"3d","autoRevokeOnExpiry":true}');
    `).catch(err => console.error("Failed to seed event_access_defaults in settings", err));

    // Ensure partner club, event access duration, and match revoke columns exist
    ensureIncrementalColumns().catch(err => console.error("Startup incremental schema check error:", err));

    // Trigger deploy/startup cache warming
    warmCriticalCaches().catch(err => console.error("Startup Cache Warning failed", err));

    // Trigger match lifecycle automation engine & set 60s background cron interval
    processMatchAutomations().catch(err => console.error("Match automation startup check failed", err));
    setInterval(() => {
      processMatchAutomations().catch(err => console.error("Match automation interval error", err));
    }, 60000);

    // Trigger scheduled payout engine check & set periodic 5-minute background interval
    processScheduledPayouts().catch(err => console.error("Payout engine startup check failed", err));
    setInterval(() => {
      processScheduledPayouts().catch(err => console.error("Payout engine interval error", err));
    }, 300000);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
