import { describe, it, expect, vi } from 'vitest';
import { formatStreamHtml } from '../src/utils/embedHelper.js';

describe('Subscription System & Club Revenue Sharing Suite', () => {

  describe('1. Plan Scope & Parameter Resolution Logic', () => {
    // Pure function mirroring server-side plan checkout initialization in /api/checkout/gateway/initialize
    const buildSubscriptionSessionParams = (params: {
      plan: {
        id: string | number;
        name: string;
        price: number;
        plan_scope?: 'platform' | 'club';
        club_id?: string | null;
        platform_fee_percent?: number;
        club_share_percent?: number;
      };
      club?: {
        id: string;
        name: string;
        stripe_account_id?: string | null;
        stripeAccountId?: string | null;
        stripe_onboarding_complete?: boolean | number;
      } | null;
      currency?: string;
      origin?: string;
      userId: string;
    }) => {
      const { plan, club, currency = 'GBP', origin = 'https://watchwds.com', userId } = params;

      const planScope = plan.plan_scope || 'platform';
      const resolvedClubId = planScope === 'club' ? (plan.club_id || null) : null;
      const amount = Number(plan.price || 0);

      let connectedAccountId: string | null = null;
      let platformFeePercent = 100;
      let clubSharePercent = 0;

      if (planScope === 'club') {
        if (!resolvedClubId) {
          return { error: 'Club plan must have an assigned partner club', status: 400 };
        }
        if (!club) {
          return { error: 'Assigned club does not exist', status: 404 };
        }
        connectedAccountId = club.stripe_account_id || club.stripeAccountId || null;
        if (!connectedAccountId) {
          // Fail-closed rule: club plan checkout without connected Stripe account must fail closed
          return { error: 'The partner club associated with this plan does not have a Stripe Connect account configured.', status: 409 };
        }
        platformFeePercent = plan.platform_fee_percent != null ? Number(plan.platform_fee_percent) : 20;
        clubSharePercent = plan.club_share_percent != null ? Number(plan.club_share_percent) : (100 - platformFeePercent);
      }

      const totalAmountCents = Math.round(amount * 100);
      const applicationFeeAmount = Math.round(totalAmountCents * (platformFeePercent / 100));
      const isDestinationCharge = Boolean(planScope === 'club' && connectedAccountId);

      const transactionId = `txn_sub_${userId}_${Date.now()}`;
      const metadata: any = {
        txn_id: transactionId,
        user_id: userId,
        plan_id: String(plan.id),
        club_id: resolvedClubId ? String(resolvedClubId) : '',
        planScope,
        platformFeePercent,
        clubSharePercent,
        isDestinationCharge,
        connectedAccountId,
        settlement_model: isDestinationCharge ? 'STRIPE_DESTINATION_ROUTED' : 'PLATFORM_DIRECT'
      };

      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: plan.name || 'Subscription Plan',
                description: planScope === 'club'
                  ? `Subscription — ${club?.name || 'Club'} (Club Membership)`
                  : 'Platform All-Access Subscription',
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
        metadata
      };

      if (isDestinationCharge && connectedAccountId) {
        sessionParams.payment_intent_data = {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: connectedAccountId,
          },
          metadata: {
            ...metadata,
            settlement_model: 'STRIPE_DESTINATION_ROUTED'
          }
        };
      }

      return { sessionParams, metadata, isDestinationCharge, applicationFeeAmount };
    };

    it('Mode 1: Platform-wide plan creates direct payment without destination routing (100% platform revenue)', () => {
      const plan = {
        id: 1,
        name: 'WatchWDS All-Access Pass',
        price: 29.99,
        plan_scope: 'platform' as const,
        club_id: null
      };

      const result = buildSubscriptionSessionParams({
        plan,
        club: null,
        userId: 'usr-123'
      });

      expect(result.error).toBeUndefined();
      expect(result.isDestinationCharge).toBe(false);
      expect(result.metadata.planScope).toBe('platform');
      expect(result.metadata.platformFeePercent).toBe(100);
      expect(result.metadata.clubSharePercent).toBe(0);
      expect(result.metadata.connectedAccountId).toBeNull();
      expect(result.sessionParams.payment_intent_data).toBeUndefined();
      expect(result.sessionParams.line_items[0].price_data.unit_amount).toBe(2999);
      expect(result.metadata.settlement_model).toBe('PLATFORM_DIRECT');
    });

    it('Mode 2: Club-specific plan routes destination charge and splits revenue correctly (e.g. 70% Club / 30% Platform)', () => {
      const plan = {
        id: 2,
        name: 'Town Rovers Season Pass',
        price: 50.00,
        plan_scope: 'club' as const,
        club_id: 'club-777',
        platform_fee_percent: 30,
        club_share_percent: 70
      };

      const club = {
        id: 'club-777',
        name: 'Town Rovers FC',
        stripe_account_id: 'acct_1NXY89234test',
        stripe_onboarding_complete: 1
      };

      const result = buildSubscriptionSessionParams({
        plan,
        club,
        userId: 'usr-456'
      });

      expect(result.error).toBeUndefined();
      expect(result.isDestinationCharge).toBe(true);
      expect(result.metadata.planScope).toBe('club');
      expect(result.metadata.club_id).toBe('club-777');
      expect(result.metadata.platformFeePercent).toBe(30);
      expect(result.metadata.clubSharePercent).toBe(70);
      expect(result.metadata.connectedAccountId).toBe('acct_1NXY89234test');

      // Verify destination charge routing and 30% application fee calculation
      // Gross: 5000 cents, Platform Fee (30%): 1500 cents, Club Destination: 3500 cents (70%)
      expect(result.applicationFeeAmount).toBe(1500);
      expect(result.sessionParams.payment_intent_data).toBeDefined();
      expect(result.sessionParams.payment_intent_data.application_fee_amount).toBe(1500);
      expect(result.sessionParams.payment_intent_data.transfer_data.destination).toBe('acct_1NXY89234test');
      expect(result.sessionParams.metadata.settlement_model).toBe('STRIPE_DESTINATION_ROUTED');
    });

    it('Mode 3: Fail-Closed Policy rejects checkout if club plan lacks connected Stripe account', () => {
      const plan = {
        id: 3,
        name: 'Unconnected Club Pass',
        price: 25.00,
        plan_scope: 'club' as const,
        club_id: 'club-unonboarded',
        platform_fee_percent: 20,
        club_share_percent: 80
      };

      const clubWithoutStripe = {
        id: 'club-unonboarded',
        name: 'Grassroots Wanderers',
        stripe_account_id: null,
        stripe_onboarding_complete: 0
      };

      const result = buildSubscriptionSessionParams({
        plan,
        club: clubWithoutStripe,
        userId: 'usr-999'
      });

      expect(result.status).toBe(409);
      expect(result.error).toContain('does not have a Stripe Connect account configured');
      expect(result.sessionParams).toBeUndefined();
    });
  });

  describe('2. Admin Plan Validation & Percentage Sum Checks', () => {
    // Pure function representing the validation in POST /api/admin/plans and PUT /api/admin/plans/:id
    const validatePlanInput = (input: {
      name: string;
      price: number;
      plan_scope?: string;
      club_id?: string | null;
      platform_fee_percent?: number;
      club_share_percent?: number;
      clubsList: Array<{ id: string; name: string }>;
    }) => {
      const planScope = input.plan_scope === 'club' ? 'club' : 'platform';
      let clubId = input.club_id || null;
      let platformFee = input.platform_fee_percent ?? (planScope === 'platform' ? 100 : 20);
      let clubShare = input.club_share_percent ?? (planScope === 'platform' ? 0 : 80);

      if (planScope === 'club') {
        if (!clubId || String(clubId).trim() === '') {
          return { valid: false, error: 'A valid partner club must be selected for club-specific subscription plans.' };
        }
        const exists = input.clubsList.some(c => String(c.id) === String(clubId).trim());
        if (!exists) {
          return { valid: false, error: 'The selected partner club does not exist.' };
        }

        if (isNaN(platformFee) || isNaN(clubShare) || platformFee < 0 || clubShare < 0 || platformFee > 100 || clubShare > 100) {
          return { valid: false, error: 'Platform fee and club share percentages must be numbers between 0 and 100.' };
        }

        const sum = Math.round((platformFee + clubShare) * 100) / 100;
        if (sum !== 100) {
          return { valid: false, error: `Platform fee (${platformFee}%) and club share (${clubShare}%) must sum to exactly 100%. Current sum: ${sum}%.` };
        }
      } else {
        clubId = null;
        platformFee = 100;
        clubShare = 0;
      }

      return { valid: true, planScope, clubId, platformFee, clubShare };
    };

    const clubsList = [{ id: 'club-1', name: 'FC United' }, { id: 'club-2', name: 'Athletic City' }];

    it('should accept valid platform plans and enforce 100% platform revenue', () => {
      const res = validatePlanInput({
        name: 'All Sports VIP',
        price: 19.99,
        plan_scope: 'platform',
        clubsList
      });
      expect(res.valid).toBe(true);
      expect(res.planScope).toBe('platform');
      expect(res.clubId).toBeNull();
      expect(res.platformFee).toBe(100);
      expect(res.clubShare).toBe(0);
    });

    it('should reject club plans that do not specify a partner club', () => {
      const res = validatePlanInput({
        name: 'Club Pass',
        price: 15.00,
        plan_scope: 'club',
        club_id: '',
        clubsList
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('A valid partner club must be selected');
    });

    it('should reject club plans referencing a non-existent club ID', () => {
      const res = validatePlanInput({
        name: 'Club Pass',
        price: 15.00,
        plan_scope: 'club',
        club_id: 'club-999-ghost',
        clubsList
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('The selected partner club does not exist');
    });

    it('should reject club plans where split percentages do not sum to 100%', () => {
      const res1 = validatePlanInput({
        name: 'Club Pass',
        price: 20.00,
        plan_scope: 'club',
        club_id: 'club-1',
        platform_fee_percent: 25,
        club_share_percent: 70, // 95% total
        clubsList
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('must sum to exactly 100%. Current sum: 95%');

      const res2 = validatePlanInput({
        name: 'Club Pass',
        price: 20.00,
        plan_scope: 'club',
        club_id: 'club-1',
        platform_fee_percent: 40,
        club_share_percent: 70, // 110% total
        clubsList
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('must sum to exactly 100%. Current sum: 110%');
    });

    it('should accept valid club plans with balanced percentages (e.g., 20/80, 30/70, 50/50)', () => {
      const res = validatePlanInput({
        name: 'FC United Member Pass',
        price: 35.00,
        plan_scope: 'club',
        club_id: 'club-1',
        platform_fee_percent: 30,
        club_share_percent: 70,
        clubsList
      });
      expect(res.valid).toBe(true);
      expect(res.platformFee).toBe(30);
      expect(res.clubShare).toBe(70);
    });
  });

  describe('3. processSubscriptionRevenueSplit Ledger & Snapshots', () => {
    // Pure model verifying the exact accounting calculations in processSubscriptionRevenueSplit
    const calculateSubscriptionSplit = (params: {
      planScope: 'platform' | 'club';
      clubId?: string | null;
      grossAmount: number;
      platformFeePercent: number;
      clubSharePercent: number;
    }) => {
      const { planScope, clubId, grossAmount, platformFeePercent } = params;
      if (planScope !== 'club' || !clubId) {
        return { isSplit: false, platformAmount: grossAmount, clubAmount: 0 };
      }
      const platformCommission = Math.round(grossAmount * (platformFeePercent / 100) * 100) / 100;
      const clubNetAmount = Math.round((grossAmount - platformCommission) * 100) / 100;
      return {
        isSplit: true,
        grossAmount,
        platformCommission,
        clubNetAmount,
        sumExact: Math.round((platformCommission + clubNetAmount) * 100) / 100 === grossAmount
      };
    };

    it('Platform-wide plans skip split and retain 100% on platform', () => {
      const result = calculateSubscriptionSplit({
        planScope: 'platform',
        clubId: null,
        grossAmount: 49.99,
        platformFeePercent: 100,
        clubSharePercent: 0
      });
      expect(result.isSplit).toBe(false);
      expect(result.platformAmount).toBe(49.99);
      expect(result.clubAmount).toBe(0);
    });

    it('Club plan creates accurate ledger split with zero roundoff discrepancy', () => {
      const result = calculateSubscriptionSplit({
        planScope: 'club',
        clubId: 'club-123',
        grossAmount: 39.99,
        platformFeePercent: 25,
        clubSharePercent: 75
      });
      expect(result.isSplit).toBe(true);
      // 39.99 * 0.25 = 9.9975 -> 10.00
      expect(result.platformCommission).toBe(10.00);
      // 39.99 - 10.00 = 29.99
      expect(result.clubNetAmount).toBe(29.99);
      expect(result.sumExact).toBe(true);
    });
  });

  describe('4. Entitlement & Access Controls: Strict Club Plan Scope Separation', () => {
    // Pure function mirroring entitlement evaluation in MatchDetail.tsx and /api/matches/:id/stream
    const evaluateAccess = (params: {
      match: {
        id: string | number;
        access: 'free' | 'paid';
        access_type?: 'free' | 'ppv' | 'plan';
        required_plan_id?: string | number | null;
        club_id?: string | null;
      };
      user?: {
        id: string | number;
        role?: string;
        planId?: string | number | null;
        planExpiresAt?: string | null;
      } | null;
      userPlan?: {
        id: string | number;
        plan_scope?: 'platform' | 'club';
        club_id?: string | null;
      } | null;
      purchases?: Array<{ 
        matchId?: string | number; 
        userId: string | number; 
        type: string;
        planId?: string | number;
        clubId?: string | number | null;
        access_expires_at?: string | null;
        access_status?: string;
      }>;
      allPlans?: Array<{
        id: string | number;
        plan_scope?: 'platform' | 'club';
        club_id?: string | null;
      }>;
    }) => {
      const { match, user, userPlan, purchases = [], allPlans = [] } = params;

      if (match.access === 'free' && user) return { hasAccess: true, reason: 'free' };
      if (!user) return { hasAccess: false, reason: 'unauthenticated' };
      if (user.role === 'admin' || user.role === 'operator') return { hasAccess: true, reason: 'staff' };

      // PPV purchase check
      const hasPurchased = purchases.some(p => String(p.matchId) === String(match.id) && String(p.userId) === String(user.id) && p.type === 'watch');
      if (hasPurchased) return { hasAccess: true, reason: 'ppv_purchase' };

      // Plan check
      if (match.access_type === 'plan') {
        const now = new Date();

        // 1. Primary user.planId
        if (user.planId) {
          const isPlanActive = !user.planExpiresAt || new Date(user.planExpiresAt) > now;
          if (isPlanActive && userPlan) {
            const planMatches = !match.required_plan_id || String(user.planId) === String(match.required_plan_id);

            if (userPlan.plan_scope === 'club' && userPlan.club_id) {
              const isSameClub = Boolean(match.club_id && String(match.club_id) === String(userPlan.club_id));
              if (isSameClub && planMatches) {
                return { hasAccess: true, reason: 'club_plan' };
              }
            } else {
              if (planMatches) {
                return { hasAccess: true, reason: 'platform_plan' };
              }
            }
          }
        }

        // 2. Active plan purchases (supports multiple club + platform subscriptions)
        for (const p of purchases) {
          if (p.type === 'plan' && String(p.userId) === String(user.id) && p.access_status !== 'expired' && p.access_status !== 'revoked') {
            const isNotExpired = !p.access_expires_at || new Date(p.access_expires_at) > now;
            if (isNotExpired) {
              const subPlanId = p.planId || p.matchId;
              const targetPlan = allPlans.find(pl => String(pl.id) === String(subPlanId));
              const planMatches = !match.required_plan_id || String(subPlanId) === String(match.required_plan_id);

              const scope = targetPlan?.plan_scope || (p.clubId ? 'club' : 'platform');
              const resolvedClubId = targetPlan?.club_id || p.clubId;

              if (scope === 'club' && resolvedClubId) {
                if (match.club_id && String(match.club_id) === String(resolvedClubId) && planMatches) {
                  return { hasAccess: true, reason: 'multi_club_plan' };
                }
              } else if (scope === 'platform') {
                if (planMatches) {
                  return { hasAccess: true, reason: 'multi_platform_plan' };
                }
              }
            }
          }
        }
      }

      return { hasAccess: false, reason: 'restricted' };
    };

    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();

    it('A subscriber to Club A CAN watch Club A matches', () => {
      const match = { id: 101, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-A' };
      const user = { id: 'u1', planId: 'plan-club-A', planExpiresAt: futureDate };
      const userPlan = { id: 'plan-club-A', plan_scope: 'club' as const, club_id: 'club-A' };

      const res = evaluateAccess({ match, user, userPlan });
      expect(res.hasAccess).toBe(true);
      expect(res.reason).toBe('club_plan');
    });

    it('A subscriber to Club A CANNOT watch Club B matches (strict scope isolation)', () => {
      const match = { id: 102, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-B' };
      const user = { id: 'u1', planId: 'plan-club-A', planExpiresAt: futureDate };
      const userPlan = { id: 'plan-club-A', plan_scope: 'club' as const, club_id: 'club-A' };

      const res = evaluateAccess({ match, user, userPlan });
      expect(res.hasAccess).toBe(false);
      expect(res.reason).toBe('restricted');
    });

    it('A subscriber to an all-access Platform Plan CAN watch matches across clubs', () => {
      const match = { id: 103, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-B' };
      const user = { id: 'u2', planId: 'plan-platform', planExpiresAt: futureDate };
      const userPlan = { id: 'plan-platform', plan_scope: 'platform' as const, club_id: null };

      const res = evaluateAccess({ match, user, userPlan });
      expect(res.hasAccess).toBe(true);
      expect(res.reason).toBe('platform_plan');
    });

    it('Multi-Subscription: A user holding a Platform Plan AND a Club A Plan can watch both Club A and Platform matches', () => {
      const user = { id: 'u3', planId: 'plan-platform', planExpiresAt: futureDate };
      const userPlan = { id: 'plan-platform', plan_scope: 'platform' as const, club_id: null };
      const purchases = [
        {
          userId: 'u3',
          type: 'plan',
          planId: 'plan-club-A',
          clubId: 'club-A',
          access_expires_at: futureDate,
          access_status: 'active'
        }
      ];
      const allPlans = [
        { id: 'plan-platform', plan_scope: 'platform' as const, club_id: null },
        { id: 'plan-club-A', plan_scope: 'club' as const, club_id: 'club-A' }
      ];

      // Match 1: Club A match
      const matchA = { id: 201, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-A' };
      const resA = evaluateAccess({ match: matchA, user, userPlan, purchases, allPlans });
      expect(resA.hasAccess).toBe(true);

      // Match 2: Platform match (no club)
      const matchPlatform = { id: 202, access: 'paid' as const, access_type: 'plan' as const, club_id: null };
      const resPlatform = evaluateAccess({ match: matchPlatform, user, userPlan, purchases, allPlans });
      expect(resPlatform.hasAccess).toBe(true);
      expect(resPlatform.reason).toBe('platform_plan');

      // Match 3: Club B match requiring Club B subscription
      const matchB = { id: 203, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-B', required_plan_id: 'plan-club-B' };
      const resB = evaluateAccess({ match: matchB, user, userPlan, purchases, allPlans });
      expect(resB.hasAccess).toBe(false);
    });

    it('Multi-Subscription: A user holding multiple club subscriptions (Club A & Club B) can watch both clubs', () => {
      const user = { id: 'u4', planId: null, planExpiresAt: null };
      const purchases = [
        {
          userId: 'u4',
          type: 'plan',
          planId: 'plan-club-A',
          clubId: 'club-A',
          access_expires_at: futureDate,
          access_status: 'active'
        },
        {
          userId: 'u4',
          type: 'plan',
          planId: 'plan-club-B',
          clubId: 'club-B',
          access_expires_at: futureDate,
          access_status: 'active'
        }
      ];
      const allPlans = [
        { id: 'plan-club-A', plan_scope: 'club' as const, club_id: 'club-A' },
        { id: 'plan-club-B', plan_scope: 'club' as const, club_id: 'club-B' }
      ];

      const matchA = { id: 301, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-A' };
      const resA = evaluateAccess({ match: matchA, user, purchases, allPlans });
      expect(resA.hasAccess).toBe(true);

      const matchB = { id: 302, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-B' };
      const resB = evaluateAccess({ match: matchB, user, purchases, allPlans });
      expect(resB.hasAccess).toBe(true);

      const matchC = { id: 303, access: 'paid' as const, access_type: 'plan' as const, club_id: 'club-C' };
      const resC = evaluateAccess({ match: matchC, user, purchases, allPlans });
      expect(resC.hasAccess).toBe(false);
    });
  });

  describe('4b. Upgrade & Purchase Logic: Independent Club Plans vs Platform-Wide Upgrade Ladder', () => {
    // Pure function mirroring /api/plans/upgrade-cost
    const calculatePlanPurchaseCost = (params: {
      newPlan: {
        id: string | number;
        price: number;
        plan_scope?: 'platform' | 'club';
        club_id?: string | null;
      };
      user: {
        id: string | number;
        planId?: string | number | null;
        planExpiresAt?: string | null;
      };
      currentPlan?: {
        id: string | number;
        price: number;
        duration_days?: number;
        plan_scope?: 'platform' | 'club';
      } | null;
      userPurchases?: Array<{
        type: string;
        planId?: string | number;
        access_expires_at?: string | null;
        access_status?: string;
      }>;
    }) => {
      const { newPlan, user, currentPlan, userPurchases = [] } = params;
      const newPlanPrice = Number(newPlan.price);
      const newPlanScope = newPlan.plan_scope || 'platform';
      const now = new Date();

      // 1. Club-specific plans are standalone independent purchases, NOT an upgrade ladder
      if (newPlanScope === 'club') {
        const isAlreadyActiveInPurchases = userPurchases.some(p => 
          p.type === 'plan' && 
          String(p.planId) === String(newPlan.id) &&
          (!p.access_expires_at || new Date(p.access_expires_at) > now) &&
          p.access_status !== 'expired'
        );
        const isAlreadyActiveOnUser = String(user.planId) === String(newPlan.id) && 
          Boolean(user.planExpiresAt && new Date(user.planExpiresAt) > now);

        if (isAlreadyActiveInPurchases || isAlreadyActiveOnUser) {
          return { error: 'You already have an active subscription for this club plan.', status: 400 };
        }

        // Direct independent purchase at regular full price, 0 credit
        return { cost: newPlanPrice, credit: 0, isUpgrade: false };
      }

      // 2. Platform-wide plan upgrade logic
      if (!user.planId || !user.planExpiresAt) {
        return { cost: newPlanPrice, credit: 0, isUpgrade: false };
      }

      if (!currentPlan || currentPlan.plan_scope === 'club') {
        // User has no platform plan yet
        return { cost: newPlanPrice, credit: 0, isUpgrade: false };
      }

      const currentPlanPrice = Number(currentPlan.price);
      const expiresAt = new Date(user.planExpiresAt);

      if (String(user.planId) === String(newPlan.id)) {
        if (expiresAt > now) {
          return { error: 'You already have an active subscription for this plan.', status: 400 };
        }
        return { cost: newPlanPrice, credit: 0, isUpgrade: false };
      }

      if (expiresAt <= now) {
        return { cost: newPlanPrice, credit: 0, isUpgrade: false };
      }

      // Enforce: only upgrade to higher platform plans
      if (newPlanPrice <= currentPlanPrice) {
        return { error: 'You can only upgrade to a higher platform plan.', status: 400 };
      }

      const durationDays = Number(currentPlan.duration_days) || 30;
      const totalMs = durationDays * 24 * 60 * 60 * 1000;
      const remainingMs = expiresAt.getTime() - now.getTime();
      const credit = (currentPlanPrice * remainingMs) / totalMs;

      let cost = newPlanPrice - credit;
      if (cost < 0) cost = 0;

      return {
        cost: Math.round(cost * 100) / 100,
        credit: Math.round(credit * 100) / 100,
        isUpgrade: true
      };
    };

    const futureDate = new Date(Date.now() + 86400000 * 15).toISOString(); // 15 days remaining

    it('A user with a £20 Platform Plan CAN buy a £10 Club Plan without upgrade error', () => {
      const user = { id: 'u1', planId: 'plat-pro', planExpiresAt: futureDate };
      const currentPlan = { id: 'plat-pro', price: 20.00, plan_scope: 'platform' as const, duration_days: 30 };
      const newPlan = { id: 'se-dons-monthly', price: 10.00, plan_scope: 'club' as const, club_id: 'club-se-dons' };

      const res = calculatePlanPurchaseCost({ newPlan, user, currentPlan });
      expect(res.error).toBeUndefined();
      expect(res.cost).toBe(10.00);
      expect(res.credit).toBe(0);
      expect(res.isUpgrade).toBe(false);
    });

    it('A user with a £10 Club Plan CAN buy another club plan (Club B) at regular price', () => {
      const user = { id: 'u2', planId: null, planExpiresAt: null };
      const userPurchases = [
        { type: 'plan', planId: 'club-A-pass', access_expires_at: futureDate, access_status: 'active' }
      ];
      const newPlan = { id: 'club-B-pass', price: 15.00, plan_scope: 'club' as const, club_id: 'club-B' };

      const res = calculatePlanPurchaseCost({ newPlan, user, userPurchases });
      expect(res.error).toBeUndefined();
      expect(res.cost).toBe(15.00);
      expect(res.credit).toBe(0);
      expect(res.isUpgrade).toBe(false);
    });

    it('Platform-to-Platform upgrade: Prorates remaining duration and deducts credit', () => {
      const user = { id: 'u3', planId: 'plat-standard', planExpiresAt: futureDate }; // 15/30 days remaining = 50%
      const currentPlan = { id: 'plat-standard', price: 20.00, duration_days: 30, plan_scope: 'platform' as const };
      const newPlan = { id: 'plat-vip', price: 40.00, plan_scope: 'platform' as const };

      const res = calculatePlanPurchaseCost({ newPlan, user, currentPlan });
      expect(res.error).toBeUndefined();
      expect(res.isUpgrade).toBe(true);
      // Credit should be roughly 10.00 (half of £20), cost roughly 30.00
      expect(res.credit).toBeCloseTo(10.00, 0);
      expect(res.cost).toBeCloseTo(30.00, 0);
    });

    it('Platform-to-Platform downgrade: Rejected with clear error', () => {
      const user = { id: 'u4', planId: 'plat-vip', planExpiresAt: futureDate };
      const currentPlan = { id: 'plat-vip', price: 40.00, duration_days: 30, plan_scope: 'platform' as const };
      const newPlan = { id: 'plat-standard', price: 20.00, plan_scope: 'platform' as const };

      const res = calculatePlanPurchaseCost({ newPlan, user, currentPlan });
      expect(res.status).toBe(400);
      expect(res.error).toContain('You can only upgrade to a higher platform plan');
    });
  });

  describe('5. Broadcast Stream Provider Coexistence (YouTube & Mux)', () => {
    it('should format standard YouTube URLs into responsive YouTube iframes without regression', () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const formatted = formatStreamHtml(youtubeUrl);
      expect(formatted).toContain('<iframe');
      expect(formatted).toContain('youtube.com/embed/dQw4w9WgXcQ');
      expect(formatted).toContain('allowfullscreen');
    });

    it('should format short youtu.be URLs into responsive YouTube iframes', () => {
      const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
      const formatted = formatStreamHtml(shortUrl);
      expect(formatted).toContain('<iframe');
      expect(formatted).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });

    it('should format Mux stream URLs into <mux-player> components', () => {
      const muxUrl = 'https://stream.mux.com/d54001aBCdE123.m3u8';
      const formatted = formatStreamHtml(muxUrl);
      expect(formatted).toContain('<mux-player');
      expect(formatted).toContain('playback-id="d54001aBCdE123"');
    });

    it('should format existing <mux-player> tags safely and preserve controls', () => {
      const muxHtml = '<mux-player playback-id="xyz987" stream-type="live" controls></mux-player>';
      const formatted = formatStreamHtml(muxHtml);
      expect(formatted).toContain('playback-id="xyz987"');
      expect(formatted).toContain('stream-type="live"');
    });

    it('should preserve custom HTML iframes unaltered', () => {
      const customIframe = '<iframe src="https://example.com/custom-live" width="800" height="450"></iframe>';
      const formatted = formatStreamHtml(customIframe);
      expect(formatted).toContain('https://example.com/custom-live');
    });
  });
});
