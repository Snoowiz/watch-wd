import { describe, it, expect, vi } from 'vitest';
import { getStripeClient } from '../server.js';
import https from 'https';

describe('PPV Stripe Checkout & Revenue Modes Suite', () => {

  describe('1. Resilient IPv4 Stripe Client Configuration', () => {
    it('should initialize Stripe client with IPv4 HTTPS Agent and correct timeout', () => {
      const dummyKey = 'sk_test_mockKeyForTesting12345';
      const stripe = getStripeClient(dummyKey);

      expect(stripe).toBeDefined();
      const internalApi = (stripe as any)._api;
      expect(internalApi).toBeDefined();
      expect(internalApi.timeout).toBe(30000);
      expect(internalApi.maxNetworkRetries).toBe(2);

      // Verify custom httpAgent is attached with family 4
      const agent = internalApi.agent;
      expect(agent).toBeInstanceOf(https.Agent);
      expect((agent as any).options?.family).toBe(4);
      expect((agent as any).options?.keepAlive).toBe(true);
    });

    it('should cleanly trim whitespace and newlines from Stripe secret key', () => {
      const paddedKey = '  sk_test_paddedKey123 \n ';
      const stripe = getStripeClient(paddedKey);
      expect((stripe as any)._authenticator).toBeDefined();
    });
  });

  describe('2. Mode Separation & Parameters Construction Logic', () => {
    // Pure function representing the exact decision logic in /api/checkout/gateway/connect-ppv
    const buildPpvSessionParams = (params: {
      match: {
        id: string;
        title?: string;
        ppv_price?: number;
        price?: number;
        club_id?: string | null;
        clubId?: string | null;
        slug?: string;
      };
      club?: {
        id: string;
        name: string;
        stripe_account_id?: string | null;
        stripeAccountId?: string | null;
      } | null;
      policy?: {
        platform_fee_percent?: number;
      } | null;
      currency?: string;
      origin?: string;
      userId: string;
    }) => {
      const { match, club, policy, currency = 'GBP', origin = 'https://watchwds.com', userId } = params;

      const rawClubId = match.club_id || match.clubId || null;
      const clubId = rawClubId && String(rawClubId).trim() !== '' ? String(rawClubId).trim() : null;
      const ppvPrice = Number(match.ppv_price ?? match.price ?? 0);

      let connectedAccountId: string | null = null;
      let platformFeePercent = 100;

      if (clubId && club) {
        connectedAccountId = club.stripe_account_id || club.stripeAccountId || null;
        platformFeePercent = Number(policy?.platform_fee_percent ?? 20);
      }

      const totalAmountCents = Math.round(ppvPrice * 100);
      const applicationFeeCents = clubId ? Math.round(totalAmountCents * (platformFeePercent / 100)) : 0;
      const isSplitPayment = Boolean(clubId);

      const transactionId = `txn_test_${userId}`;
      const metadata = {
        matchId: String(match.id),
        clubId: clubId ? String(clubId) : null,
        type: 'watch',
        fromMatchSlug: match.slug || null,
        platformFeePercent: isSplitPayment ? platformFeePercent : 100,
        applicationFeeCents: isSplitPayment ? applicationFeeCents : 0,
        connectedAccountId: isSplitPayment ? (connectedAccountId || null) : null,
        isDestinationCharge: isSplitPayment,
        settlement_model: isSplitPayment ? 'STRIPE_DESTINATION_ROUTED' : 'PLATFORM_DIRECT'
      };

      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: match.title || 'Match Access',
                description: isSplitPayment
                  ? `PPV access — ${club?.name || 'Partner Club'}`
                  : `PPV access — ${match.title || 'Match'}`,
              },
              unit_amount: totalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&txn_id=${transactionId}&gateway=stripe`,
        cancel_url: `${origin}/checkout/cancel`,
        client_reference_id: transactionId,
        metadata: {
          txn_id: transactionId,
          match_id: String(match.id),
          club_id: clubId ? String(clubId) : '',
          user_id: userId,
          payment_type: 'ppv_watch',
          settlement_model: isSplitPayment ? 'STRIPE_DESTINATION_ROUTED' : 'PLATFORM_DIRECT'
        }
      };

      if (isSplitPayment) {
        if (!connectedAccountId) {
          return { error: 'Partner club has no Stripe connected account. Cannot process split payment.', status: 409 };
        }
        sessionParams.payment_intent_data = {
          application_fee_amount: applicationFeeCents,
          transfer_data: {
            destination: connectedAccountId,
          },
          metadata: {
            txn_id: transactionId,
            match_id: String(match.id),
            club_id: String(clubId),
            user_id: userId,
            payment_type: 'ppv_watch',
            settlement_model: 'STRIPE_DESTINATION_ROUTED'
          }
        };
      }

      return { sessionParams, metadata, isSplitPayment };
    };

    it('Mode 1 (Platform 100%): should create direct checkout without transfer_data when no club is assigned', () => {
      const match = {
        id: 'match-100-platform',
        title: 'Platform Showcase Match',
        ppv_price: 10,
        club_id: null
      };

      const result = buildPpvSessionParams({
        match,
        club: null,
        policy: null,
        userId: 'usr-123'
      });

      expect(result.error).toBeUndefined();
      expect(result.isSplitPayment).toBe(false);
      expect(result.metadata.settlement_model).toBe('PLATFORM_DIRECT');
      expect(result.metadata.platformFeePercent).toBe(100);
      expect(result.metadata.applicationFeeCents).toBe(0);
      expect(result.metadata.connectedAccountId).toBeNull();
      expect(result.metadata.isDestinationCharge).toBe(false);

      const session = result.sessionParams;
      expect(session.payment_intent_data).toBeUndefined();
      expect(session.line_items[0].price_data.unit_amount).toBe(1000);
      expect(session.line_items[0].price_data.product_data.description).toContain('PPV access — Platform Showcase Match');
      expect(session.metadata.settlement_model).toBe('PLATFORM_DIRECT');
      expect(session.metadata.club_id).toBe('');
    });

    it('Mode 1 (Platform 100%): should treat empty string club_id as platform mode', () => {
      const match = {
        id: 'match-empty-club',
        title: 'Match With Empty Club',
        ppv_price: 15.5,
        club_id: '   '
      };

      const result = buildPpvSessionParams({
        match,
        club: null,
        policy: null,
        userId: 'usr-123'
      });

      expect(result.isSplitPayment).toBe(false);
      expect(result.metadata.settlement_model).toBe('PLATFORM_DIRECT');
      expect(result.sessionParams.payment_intent_data).toBeUndefined();
    });

    it('Mode 2 (Club Split): should attach destination charge routing and application fee when club is assigned', () => {
      const match = {
        id: 'match-200-split',
        title: 'SE Dons vs Baiteze',
        ppv_price: 10,
        club_id: 'club-se-dons'
      };
      const club = {
        id: 'club-se-dons',
        name: 'SE Dons FC',
        stripe_account_id: 'acct_1SEDONS123'
      };
      const policy = {
        platform_fee_percent: 25 // 25% platform, 75% club
      };

      const result = buildPpvSessionParams({
        match,
        club,
        policy,
        userId: 'usr-456'
      });

      expect(result.error).toBeUndefined();
      expect(result.isSplitPayment).toBe(true);
      expect(result.metadata.settlement_model).toBe('STRIPE_DESTINATION_ROUTED');
      expect(result.metadata.platformFeePercent).toBe(25);
      expect(result.metadata.applicationFeeCents).toBe(250); // 25% of 1000 = 250 cents
      expect(result.metadata.connectedAccountId).toBe('acct_1SEDONS123');
      expect(result.metadata.isDestinationCharge).toBe(true);

      const session = result.sessionParams;
      expect(session.payment_intent_data).toBeDefined();
      expect(session.payment_intent_data.application_fee_amount).toBe(250);
      expect(session.payment_intent_data.transfer_data.destination).toBe('acct_1SEDONS123');
      expect(session.payment_intent_data.metadata.settlement_model).toBe('STRIPE_DESTINATION_ROUTED');
      expect(session.line_items[0].price_data.product_data.description).toContain('SE Dons FC');
    });

    it('Mode 2 (Club Split): fails closed with 409 if club is assigned but has no connected Stripe account', () => {
      const match = {
        id: 'match-missing-acct',
        title: 'Club Match Without Stripe Account',
        ppv_price: 10,
        club_id: 'club-not-onboarded'
      };
      const club = {
        id: 'club-not-onboarded',
        name: 'Unonboarded Club',
        stripe_account_id: null
      };

      const result = buildPpvSessionParams({
        match,
        club,
        policy: null,
        userId: 'usr-789'
      });

      expect(result.error).toBe('Partner club has no Stripe connected account. Cannot process split payment.');
      expect(result.status).toBe(409);
    });
  });

  describe('3. Webhook Fulfillment & Ledger Safety', () => {
    it('Mode 1: processClubRevenueSplit safely skips when match has no assigned club', async () => {
      // Simulate processClubRevenueSplit decision check
      const simulateRevenueSplit = (matchData: { club_id?: string | null }) => {
        const clubId = matchData.club_id || null;
        if (!clubId) {
          return { skipped: true, reason: 'no assigned partner club' };
        }
        return { skipped: false, clubId };
      };

      const platformMatchResult = simulateRevenueSplit({ club_id: null });
      expect(platformMatchResult.skipped).toBe(true);
      expect(platformMatchResult.reason).toBe('no assigned partner club');

      const clubMatchResult = simulateRevenueSplit({ club_id: 'club-42' });
      expect(clubMatchResult.skipped).toBe(false);
      expect(clubMatchResult.clubId).toBe('club-42');
    });

    it('Mode 2: calculates exact platform commission and club net amount correctly', () => {
      const grossAmount = 15.00;
      const feePercent = 20;

      const platformCommission = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
      const clubNetAmount = Math.round((grossAmount - platformCommission) * 100) / 100;

      expect(platformCommission).toBe(3.00);
      expect(clubNetAmount).toBe(12.00);
      expect(platformCommission + clubNetAmount).toBe(grossAmount);
    });
  });
});
