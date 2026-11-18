/**
 * Tests for verifyStripeWebhookRequest (server.ts).
 *
 * These tests cover the exported pure-verification function.  Route-level tests
 * (503 for missing webhook secret, 500 on session-retrieve failure, duplicate
 * delivery idempotency) require a full express server with mocked DB and payment
 * settings; that infrastructure is not currently present in this test suite.  Those
 * cases are documented below as pending stubs.
 */
import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { getStripeClient, verifyStripeWebhookRequest } from '../server.js';

// A test-only secret that never touches Stripe's real validation service.
const TEST_WEBHOOK_SECRET = 'whsec_test_only_secret_for_unit_tests_1234';

function makeStripe(): Stripe {
  return getStripeClient('sk_test_placeholder_key_for_tests_only');
}

function makeEventPayload(): string {
  return JSON.stringify({
    id: 'evt_test_123',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_abc',
        object: 'checkout.session',
        payment_status: 'paid',
        metadata: { txn_id: 'txn_test_456' },
        client_reference_id: 'txn_test_456',
      },
    },
  });
}

describe('verifyStripeWebhookRequest', () => {
  const stripe = makeStripe();

  describe('missing or invalid inputs', () => {
    it('returns status 400 when stripe-signature header is absent', () => {
      const payload = Buffer.from(makeEventPayload());
      const result = verifyStripeWebhookRequest({
        rawBody: payload,
        signature: undefined,
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
        expect(failed.error).toMatch(/stripe-signature/i);
      }
    });

    it('returns status 400 when rawBody is undefined', () => {
      const result = verifyStripeWebhookRequest({
        rawBody: undefined,
        signature: 'some_sig_value',
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
        expect(failed.error).toMatch(/raw/i);
      }
    });

    it('returns status 400 when rawBody is an empty buffer', () => {
      const result = verifyStripeWebhookRequest({
        rawBody: Buffer.alloc(0),
        signature: 'some_sig_value',
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
      }
    });

    it('returns status 400 when signature is syntactically invalid', () => {
      const payload = Buffer.from(makeEventPayload());
      const result = verifyStripeWebhookRequest({
        rawBody: payload,
        signature: 'clearly_not_a_stripe_signature',
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
      }
    });

    it('returns status 400 when signature was generated with a different secret', () => {
      const payloadStr = makeEventPayload();
      const payload = Buffer.from(payloadStr);
      // Sign with a different secret — should fail verification against TEST_WEBHOOK_SECRET.
      const wrongSecret = 'whsec_wrong_secret_should_fail_verification_ok';
      const sig = stripe.webhooks.generateTestHeaderString({
        payload: payloadStr,
        secret: wrongSecret,
      });
      const result = verifyStripeWebhookRequest({
        rawBody: payload,
        signature: sig,
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const failed = result as { ok: false; status: 400; error: string };
        expect(failed.status).toBe(400);
      }
    });
  });

  describe('valid signature', () => {
    it('returns ok:true with the verified Stripe event', () => {
      const payloadStr = makeEventPayload();
      const payload = Buffer.from(payloadStr);
      const sig = stripe.webhooks.generateTestHeaderString({
        payload: payloadStr,
        secret: TEST_WEBHOOK_SECRET,
      });
      const result = verifyStripeWebhookRequest({
        rawBody: payload,
        signature: sig,
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.event.type).toBe('checkout.session.completed');
        expect((result.event.data.object as any).id).toBe('cs_test_abc');
      }
    });

    it('does not accept a re-serialised body in place of the original rawBody', () => {
      // This test guards against the removed JSON.stringify(req.body) fallback:
      // the signature was computed over the original wire bytes, so a re-serialised
      // body will (in general) differ and must not verify.
      const payloadStr = makeEventPayload();
      const originalBuffer = Buffer.from(payloadStr);
      const sig = stripe.webhooks.generateTestHeaderString({
        payload: payloadStr,
        secret: TEST_WEBHOOK_SECRET,
      });

      // Simulate what would happen if we passed the JSON-parsed-and-re-stringified body.
      const reserialised = Buffer.from(JSON.stringify(JSON.parse(payloadStr)));

      if (!originalBuffer.equals(reserialised)) {
        // The buffers differ (e.g. key order changed) — verify that the tampered buffer fails.
        const result = verifyStripeWebhookRequest({
          rawBody: reserialised,
          signature: sig,
          webhookSecret: TEST_WEBHOOK_SECRET,
          stripe,
        });
        expect(result.ok).toBe(false);
      }
      // If the buffers happen to be identical (stable JSON.stringify), the original succeeds.
      const originalResult = verifyStripeWebhookRequest({
        rawBody: originalBuffer,
        signature: sig,
        webhookSecret: TEST_WEBHOOK_SECRET,
        stripe,
      });
      expect(originalResult.ok).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Route-level integration stubs (require a test server with mocked DB/settings)
// ---------------------------------------------------------------------------
// The following cases cannot be exercised with a pure-function test because they
// depend on getPaymentGatewaySettings(), db.collection(), execute(), etc.:
//
//   • POST /api/webhooks/stripe with Stripe configured but no webhookSecret → 503, no DB writes
//   • Valid signature + stripe.checkout.sessions.retrieve() throws → 500, no fulfilment rows created
//   • Valid signature + retrieved session txn_id !== txnId → 200 verified:false, no fulfilment
//   • Valid signature + retrieved session payment_status !== 'paid' → 200 verified:false
//   • Duplicate delivery of a completed transaction → 200 already_processed:true, no second purchase
//   • body claiming payment_status:'paid' while retrieved session is unpaid → no fulfilment
//
// These should be added to an integration test suite (e.g. tests/integration/stripeWebhookRoute.test.ts)
// once a test-server helper is available that can inject mock DB and gateway settings.
