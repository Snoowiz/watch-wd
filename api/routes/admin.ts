import { Router, Request, Response } from 'express';
import { adminCompat } from '../../db/MySQLAdapter.js';
import { auditAdminMiddleware, logAuditEvent } from '../middleware/auditLogger.js';

const db = adminCompat;

export function createAdminRouter(authenticate: any, requireRole: any, cacheEngine: any) {
  const router = Router();

  // Protect all admin routes
  router.use(authenticate, requireRole(['admin']));

  // Get system audit logs
  router.get('/audit-logs', async (req: Request, res: Response) => {
    try {
      const snap = await db.collection("audit_logs").orderBy("created_at", "desc").limit(100).get();
      return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // User role modification route with audit logging
  router.put('/users/:id/role', auditAdminMiddleware('CHANGE_USER_ROLE', 'users'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const allowedRoles = ['viewer', 'creator', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      const userDoc = await db.collection("users").doc(id).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      await userDoc.ref.update({ role, updated_at: new Date().toISOString() });
      return res.json({ success: true, message: `User role updated to ${role}` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Feature Flags Management
  router.get('/feature-flags', async (req: Request, res: Response) => {
    try {
      const flags = {
        feature_forum: process.env.FEATURE_FORUM === 'true',
        feature_ai_news: process.env.FEATURE_AI_NEWS === 'true',
        feature_ads: process.env.FEATURE_ADS === 'true',
        feature_wallet_points: process.env.FEATURE_WALLET_POINTS === 'true',
      };
      return res.json(flags);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
