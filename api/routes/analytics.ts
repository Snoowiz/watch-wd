import { Router, Request, Response } from 'express';
import { adminCompat } from '../../db/MySQLAdapter.js';

const db = adminCompat;

export function createAnalyticsRouter() {
  const router = Router();

  router.post('/event', async (req: Request | any, res: Response) => {
    try {
      const { eventName, matchId, clubId, watchDurationSeconds, trafficSource, metadata } = req.body;
      const userId = req.user?.id || 'anonymous';

      if (!eventName) {
        return res.status(400).json({ error: "eventName is required" });
      }

      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.collection("analytics_events").doc(eventId).set({
        id: eventId,
        event_name: eventName,
        user_id: userId,
        match_id: matchId ? String(matchId) : null,
        club_id: clubId ? String(clubId) : null,
        watch_duration: watchDurationSeconds ? Number(watchDurationSeconds) : 0,
        traffic_source: trafficSource || 'direct',
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString()
      });

      return res.json({ success: true, eventId });
    } catch (err: any) {
      console.error("[ANALYTICS ERROR]", err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
