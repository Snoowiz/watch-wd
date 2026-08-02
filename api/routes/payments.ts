import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { adminCompat } from '../../db/MySQLAdapter.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

const db = adminCompat;

export function createPaymentRouter(authenticate: any, cacheEngine: any) {
  const router = Router();

  // Unified Checkout Route (Calculates ALL prices server-side!)
  router.post("/checkout/gateway", authenticate, async (req: any, res: Response) => {
    try {
      const { matchId, planId, type = "watch", gateway = "stripe", currency = "GBP" } = req.body;
      const userId = req.user.id.toString();
      const origin = req.headers.origin || "https://watchwds.com";

      let finalAmount = 0;
      let titleName = "Access";

      // 1. Calculate price strictly from database record
      if (type === "watch" || type === "ppv") {
        if (!matchId) return res.status(400).json({ error: "matchId is required for watch purchases" });
        const matchDoc = await db.collection("matches").doc(String(matchId)).get();
        if (!matchDoc.exists) return res.status(404).json({ error: "Match not found" });
        const match = matchDoc.data();
        
        finalAmount = Number(match.ppv_price || match.ppvPrice || match.price || 0);
        if (finalAmount <= 0) return res.status(400).json({ error: "Match price is invalid or match is free" });
        titleName = `Watch Match: ${match.title || match.home_team + ' vs ' + match.away_team}`;
      } else if (type === "plan") {
        if (!planId) return res.status(400).json({ error: "planId is required for subscription plan purchases" });
        const planDoc = await db.collection("plans").doc(String(planId)).get();
        if (!planDoc.exists) return res.status(404).json({ error: "Subscription plan not found" });
        const plan = planDoc.data();
        
        finalAmount = Number(plan.price || 0);
        if (finalAmount <= 0) return res.status(400).json({ error: "Plan price is invalid" });
        titleName = `Subscription: ${plan.name || 'Plan'}`;
      } else {
        return res.status(400).json({ error: "Unsupported purchase type" });
      }

      const transactionId = `txn_${Date.now()}_${userId}`;
      const pendingData = {
        userId,
        type,
        amount: finalAmount,
        status: "pending",
        gateway,
        metadata: { matchId: matchId ? String(matchId) : null, planId: planId ? String(planId) : null },
        date: new Date().toISOString()
      };

      await db.collection("transactions").doc(transactionId).set(pendingData);
      logAuditEvent(userId, 'CHECKOUT_START', 'transactions', transactionId, { amount: finalAmount, type, gateway });

      // Fetch gateway settings
      const settingsSnap = await db.collection("settings").doc("gateways").get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};

      if (gateway === "stripe") {
        if (!settings?.stripe?.enabled || !settings?.stripe?.secretKey) {
          // Mock mode when Stripe is not configured
          return res.json({ checkoutUrl: `${origin}/checkout/success?txn_id=${transactionId}&session_id=mock_session&gateway=stripe` });
        }

        const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: (settings.stripe.merchantCurrency || currency).toLowerCase(),
                product_data: { name: titleName },
                unit_amount: Math.round(finalAmount * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=stripe`,
          cancel_url: `${origin}/checkout/cancel`,
          client_reference_id: transactionId,
        });

        return res.json({ checkoutUrl: session.url });
      }

      return res.status(400).json({ error: `Gateway ${gateway} is not supported` });
    } catch (err: any) {
      console.error("[CHECKOUT ERROR]", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Stripe Webhook Endpoint (With ConstructEvent Signature Verification)
  router.post("/webhooks/stripe", express.raw({ type: 'application/json' }), async (req: Request | any, res: Response) => {
    const settingsSnap = await db.collection("settings").doc("gateways").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    
    if (!settings?.stripe?.secretKey) {
      return res.status(400).json({ error: "Stripe secret key not configured" });
    }

    const stripe = new Stripe(settings.stripe.secretKey, { apiVersion: "2023-10-16" as any });
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (webhookSecret && sig) {
        // Enforce strict signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({ error: "Stripe Webhook Signature Missing" });
        }
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    } catch (err: any) {
      console.error(`[STRIPE WEBHOOK VERIFICATION FAILED] ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionId = session.client_reference_id;

      if (transactionId) {
        const txnDoc = await db.collection("transactions").doc(transactionId).get();
        if (txnDoc.exists) {
          await txnDoc.ref.update({ status: "completed", updated_at: new Date().toISOString() });
          const txnData = txnDoc.data();

          if (txnData.type === 'watch' && txnData.metadata?.matchId) {
            const purchaseId = `pur_${Date.now()}_${txnData.userId}`;
            await db.collection("purchases").doc(purchaseId).set({
              id: purchaseId,
              userId: txnData.userId,
              matchId: txnData.metadata.matchId,
              type: 'watch',
              transactionId,
              created_at: new Date().toISOString()
            });
            cacheEngine.invalidateCollection("purchases");
          }
          logAuditEvent(txnData.userId, 'PAYMENT_SUCCESS', 'transactions', transactionId, { amount: txnData.amount, type: txnData.type });
        }
      }
    }

    return res.json({ received: true });
  });

  return router;
}
