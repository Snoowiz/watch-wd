import { Request, Response, NextFunction } from 'express';
import { adminCompat } from '../../db/MySQLAdapter.js';

const db = adminCompat;

export async function logAuditEvent(
  userId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details: any,
  ipAddress: string | null = null
) {
  try {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection("audit_logs").doc(logId).set({
      id: logId,
      user_id: userId || 'system',
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      ip_address: ipAddress || 'unknown',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("[AUDIT LOG ERROR] Failed to record audit event:", err);
  }
}

export const auditAdminMiddleware = (actionName: string, targetType: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function(body: any) {
      res.json = originalJson;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.id || null;
        const targetId = req.params.id || req.body.id || req.body.matchId || null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        logAuditEvent(userId, actionName, targetType, targetId, { path: req.originalUrl, method: req.method }, String(ip));
      }
      return originalJson.call(this, body);
    };
    next();
  };
};
