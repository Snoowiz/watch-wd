import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { adminCompat } from '../../db/MySQLAdapter.js';
import { authRateLimiter } from '../middleware/security.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

const db = adminCompat;
const JWT_SECRET = process.env.JWT_SECRET || "watchwds-super-secret-key-2026";

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

export function createAuthRouter(authenticate: any, getRequestBaseUrl: any, sendTemplateEmail: any) {
  const router = Router();

  // Registration route (NO hardcoded admin promotion)
  router.post("/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, name, device_id } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

      const existingSnap = await db.collection("users").where("email", "==", email).get();
      if (!existingSnap.empty) {
        return res.status(400).json({ error: "An account with this email address already exists" });
      }

      const hash = bcrypt.hashSync(password, 10);
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      
      // Default role is ALWAYS 'viewer'. Admin roles must be assigned explicitly via database or admin management.
      const userData = { 
        email, 
        password: hash, 
        name: name || email.split('@')[0], 
        active_device_id: finalDeviceId, 
        role: 'viewer', 
        balance: 0, 
        status: "active", 
        created_at: new Date().toISOString() 
      };
      
      const result = await db.collection("users").add(userData);
      const token = jwt.sign({ id: result.id, role: userData.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });

      logAuditEvent(result.id, 'USER_REGISTER', 'users', result.id, { email, role: userData.role });

      sendTemplateEmail(email, "welcome_email", {
        first_name: userData.name,
        user_name: userData.name,
        user_email: email,
        website_url: getRequestBaseUrl(req),
        support_email: "support@watchwds.com"
      }).catch((err: any) => console.error("Failed to send welcome email:", err));

      return res.json({ token, user: normalizeUser(result.id, userData), device_id: finalDeviceId });
    } catch (e: any) { 
      return res.status(400).json({ error: e.message }); 
    }
  });

  // Login route
  router.post("/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, device_id } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const snapshot = await db.collection("users").where("email", "==", email).get();

      if (snapshot.empty) return res.status(401).json({ error: "Invalid credentials" });
      
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();

      if (user.status !== "active") return res.status(403).json({ error: "Account is suspended" });
      if (user.password === "google-auth-no-password") return res.status(401).json({ error: "Please use Google to log in" });
      if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });

      await userDoc.ref.update({ active_device_id: finalDeviceId, status: "active" });
      const token = jwt.sign({ id: userDoc.id, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });

      logAuditEvent(userDoc.id, 'USER_LOGIN', 'users', userDoc.id, { email });

      return res.json({ token, user: normalizeUser(userDoc.id, user), device_id: finalDeviceId });
    } catch (e: any) { 
      return res.status(500).json({ error: e.message }); 
    }
  });

  // Google OAuth route (NO hardcoded admin promotion)
  router.post("/google", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, name, avatar, device_id } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });
      
      const finalDeviceId = device_id || Math.random().toString(36).substring(2, 15);
      const snapshot = await db.collection("users").where("email", "==", email).get();
      let user: any = null;
      let docId = "";

      if (snapshot.empty) {
        user = { 
          email, 
          password: "google-auth-no-password", 
          name, 
          avatar, 
          active_device_id: finalDeviceId, 
          role: 'viewer', 
          balance: 0, 
          status: "active", 
          created_at: new Date().toISOString() 
        };
        const result = await db.collection("users").add(user);
        docId = result.id;
      } else {
        const doc = snapshot.docs[0];
        docId = doc.id;
        user = doc.data();
        if (user.status !== "active") return res.status(403).json({ error: "Account suspended" });
        await doc.ref.update({ active_device_id: finalDeviceId, avatar });
        user.avatar = avatar;
      }

      const token = jwt.sign({ id: docId, role: user.role, device_id: finalDeviceId }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, user: normalizeUser(docId, user), device_id: finalDeviceId });
    } catch (e: any) { 
      return res.status(500).json({ error: e.message }); 
    }
  });

  // Current user route
  router.get("/me", authenticate, async (req: any, res: Response) => {
    try {
      const doc = await db.collection("users").doc(req.user.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const user = doc.data() as any;
      if (req.user.device_id && user.active_device_id && req.user.device_id !== user.active_device_id) {
        return res.status(401).json({ error: "Session invalidated." });
      }
      return res.json({ user: normalizeUser(doc.id, user) });
    } catch (e: any) { 
      return res.status(500).json({ error: e.message }); 
    }
  });

  // Password reset request
  router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const snaps = await db.collection('users').where('email','==', email).get();
      if (!snaps.empty) {
         const user = snaps.docs[0].data();
         const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
         await db.collection('password_resets').add({ email, token, expires_at: new Date(Date.now() + 60*60*1000) });

         const resetLink = `${getRequestBaseUrl(req)}/reset-password?token=${token}`;
         sendTemplateEmail(email, "password_reset_branding", {
           first_name: user.name || "User",
           reset_password_link: resetLink,
           support_email: "support@watchwds.com"
         }).catch((err: any) => console.error("Failed to send password reset email:", err));
      }
      return res.json({ message: 'If an account with that email exists, we have sent a reset link.' });
    } catch (e: any) { 
      return res.status(500).json({ error: e.message }); 
    }
  });

  // Password reset execution
  router.post('/reset-password', authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password) return res.status(400).json({ error: "Token and new_password are required" });

      const snap = await db.collection('password_resets').where('token','==',token).get();
      if (snap.empty) return res.status(400).json({ error: 'Invalid or expired token' });
      const reset = snap.docs[0].data();
      const expiresDate = new Date(reset.expires_at);
      if (expiresDate < new Date()) return res.status(400).json({ error: 'Token expired' });
      
      const users = await db.collection('users').where('email','==',reset.email).get();
      if (!users.empty) {
         const hash = bcrypt.hashSync(new_password, 10);
         await users.docs[0].ref.update({ password: hash });
         await snap.docs[0].ref.delete();
         logAuditEvent(users.docs[0].id, 'PASSWORD_RESET_SUCCESS', 'users', users.docs[0].id, { email: reset.email });
      }
      return res.json({ message: 'Password has been reset successfully' });
    } catch(e: any) { 
      return res.status(500).json({ error: e.message }); 
    }
  });

  return router;
}
