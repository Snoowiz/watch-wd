import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore, useSettingsStore, usePurchaseStore } from '../store';
import { useUIStore } from '../store/uiStore';
import { Check, Shield, Globe, Building2, Sparkles, AlertCircle } from 'lucide-react';
import { AddFundsModal } from '../components/AddFundsModal';
import { useNavigate, useLocation } from 'react-router-dom';

export function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'platform' | 'club'>('all');
  const { currencySymbol } = useSettingsStore();
  const { user } = useAuthStore();
  const { purchases, fetchPurchases } = usePurchaseStore();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { fromMatchSlug?: string; matchId?: any } | null;

  const [checkoutData, setCheckoutData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => setPlans(data.filter((p: any) => p.is_active !== 0)))
      .catch(() => {});

    if (user) {
      fetchPurchases().catch(() => {});
    }
  }, [user]);

  // Determine all currently active plan IDs held by the user
  const activePlanIds = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();

    // 1. Primary user plan (if not expired)
    if (user?.planId && (!user.planExpiresAt || new Date(user.planExpiresAt) > now)) {
      set.add(String(user.planId));
    }

    // 2. Multi-plan subscriptions from purchases collection
    for (const p of purchases) {
      if (p.type === 'plan' && String(p.userId) === String(user?.id) && p.access_status !== 'expired' && p.access_status !== 'revoked') {
        if (!p.access_expires_at || new Date(p.access_expires_at) > now) {
          const pid = p.planId || (p as any).plan_id || p.matchId;
          if (pid) set.add(String(pid));
        }
      }
    }

    return set;
  }, [user, purchases]);

  // Find user's active platform-wide plan (if any)
  const currentPlatformPlan = useMemo(() => {
    if (!user?.planId) return null;
    const isPlanActive = !user.planExpiresAt || new Date(user.planExpiresAt) > new Date();
    if (!isPlanActive) return null;
    const p = plans.find(pl => String(pl.id) === String(user.planId));
    return (p && (p.plan_scope === 'platform' || !p.plan_scope)) ? p : null;
  }, [user, plans]);

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      navigate('/login', { state: { from: '/plans' } });
      return;
    }

    const isCurrentActive = activePlanIds.has(String(plan.id));
    if (isCurrentActive) {
      useUIStore.getState().addToast('You already have an active subscription for this plan.', 'info');
      return;
    }

    const isClubPlan = plan.plan_scope === 'club';

    // 1. Club-specific plans: Direct standalone purchase at regular price.
    // Never subject to platform plan downgrade/upgrade blocks!
    if (isClubPlan) {
      setCheckoutData({
        amount: Number(plan.price),
        type: 'plan',
        metadata: { 
          planId: plan.id, 
          creditApplied: 0,
          matchId: state?.matchId || null,
          fromMatchSlug: state?.fromMatchSlug || null
        }
      });
      return;
    }

    // 2. Platform-wide plan: If user already has an active platform plan, calculate prorated upgrade
    if (currentPlatformPlan) {
      try {
        const res = await fetch('/api/plans/upgrade-cost', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ planId: plan.id })
        });
        const data = await res.json();
        if (!res.ok) {
          useUIStore.getState().addToast(data.error || 'Unable to process upgrade request.', 'error');
          return;
        }

        setCheckoutData({
          amount: data.cost,
          type: 'plan',
          metadata: { 
            planId: plan.id, 
            creditApplied: data.credit,
            matchId: state?.matchId || null,
            fromMatchSlug: state?.fromMatchSlug || null
          }
        });
      } catch (err) {
        useUIStore.getState().addToast('Error fetching upgrade details. Please try again.', 'error');
      }
    } else {
      // Direct initial purchase of platform plan
      setCheckoutData({
        amount: Number(plan.price),
        type: 'plan',
        metadata: { 
          planId: plan.id, 
          creditApplied: 0,
          matchId: state?.matchId || null,
          fromMatchSlug: state?.fromMatchSlug || null
        }
      });
    }
  };

  const hasClubPlans = plans.some(p => p.plan_scope === 'club');
  const hasPlatformPlans = plans.some(p => p.plan_scope !== 'club');

  const filteredPlans = useMemo(() => {
    if (selectedFilter === 'platform') {
      return plans.filter(p => p.plan_scope !== 'club');
    }
    if (selectedFilter === 'club') {
      return plans.filter(p => p.plan_scope === 'club');
    }
    return plans;
  }, [plans, selectedFilter]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold uppercase tracking-wider mb-4 border border-yellow-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Flexible Passes & Club Memberships
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Unlock all-access platform passes or subscribe directly to individual partner clubs to support your team.
        </p>
      </div>

      {/* Filter Tabs if both platform and club passes exist */}
      {hasClubPlans && hasPlatformPlans && (
        <div className="flex justify-center mb-10">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex gap-1 shadow-inner">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Passes ({plans.length})
            </button>
            <button
              onClick={() => setSelectedFilter('platform')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedFilter === 'platform'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4 text-amber-500" />
              Platform All-Access
            </button>
            <button
              onClick={() => setSelectedFilter('club')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedFilter === 'club'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-500" />
              Club Partner Passes
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map(plan => {
          const isCurrentActive = activePlanIds.has(String(plan.id));
          const isClubPlan = plan.plan_scope === 'club';
          const isPlatformPlan = !isClubPlan;

          // Downgrade rules ONLY apply between two platform-wide plans
          const isDowngrade = isPlatformPlan && currentPlatformPlan && Number(plan.price) <= Number(currentPlatformPlan.price) && !isCurrentActive;
          const isUpgrade = isPlatformPlan && currentPlatformPlan && Number(plan.price) > Number(currentPlatformPlan.price);

          const buttonLabel = isCurrentActive 
            ? 'Active Plan' 
            : isDowngrade 
              ? 'Cannot Downgrade' 
              : isUpgrade 
                ? 'Upgrade Plan' 
                : 'Subscribe Now';

          const isDisabled = isCurrentActive || isDowngrade;

          return (
            <div 
              key={plan.id} 
              className={`bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border relative flex flex-col transition-all duration-200 ${
                isCurrentActive 
                  ? 'border-emerald-500/50 shadow-emerald-500/10 dark:border-emerald-500/40 ring-2 ring-emerald-500/20' 
                  : isClubPlan
                    ? 'border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700/60'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700/60'
              }`}
            >
              {/* Plan Scope & Status Badges */}
              <div className="flex items-center justify-between mb-4">
                {isClubPlan ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                    <Building2 className="w-3.5 h-3.5" />
                    {plan.club_name ? `${plan.club_name} Pass` : 'Club Pass'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    <Globe className="w-3.5 h-3.5" />
                    All-Access Platform
                  </span>
                )}

                {isCurrentActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Active
                  </span>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  {plan.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm min-h-[40px] leading-relaxed">
                  {plan.description || (isClubPlan ? `Exclusive match pass for ${plan.club_name || 'club matches'}.` : 'Full access to all platform broadcasts and replays.')}
                </p>
              </div>
              
              <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-baseline">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currencySymbol}{plan.price}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-bold ml-2 text-sm">
                    / {plan.duration_days} days
                  </span>
                </div>
                {isUpgrade && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                    *Prorated credit from your current platform plan will be applied at checkout.
                  </p>
                )}
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isDisabled}
                className={`w-full py-4 rounded-2xl font-bold text-base mb-8 transition-all duration-200 flex items-center justify-center gap-2 ${
                  isCurrentActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 cursor-default font-extrabold'
                    : isDowngrade
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      : isClubPlan
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
                        : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/25 active:scale-[0.98]'
                }`}
              >
                {isCurrentActive && <Check className="w-5 h-5" />}
                {buttonLabel}
              </button>

              <ul className="space-y-3.5 flex-1 text-sm">
                <li className="flex items-start gap-3">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isClubPlan ? 'text-indigo-500' : 'text-emerald-500'}`} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {isClubPlan 
                      ? `Access to all ${plan.club_name || 'club'} broadcast matches` 
                      : 'Access to all platform-wide exclusive matches'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isClubPlan ? 'text-indigo-500' : 'text-emerald-500'}`} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    High definition & ad-free streaming
                  </span>
                </li>
                {isClubPlan && (
                  <li className="flex items-start gap-3">
                    <Shield className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Direct revenue share supporting {plan.club_name || 'the club'}
                    </span>
                  </li>
                )}
                {!isClubPlan && (
                  <li className="flex items-start gap-3">
                    <Globe className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Platform replay archives & multi-camera views
                    </span>
                  </li>
                )}
              </ul>
            </div>
          );
        })}

        {filteredPlans.length === 0 && (
          <div className="col-span-1 md:col-span-3 text-center py-20 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              No plans available in this category at the moment.
            </p>
          </div>
        )}
      </div>

      {checkoutData && (
        <AddFundsModal
          isOpen={true}
          onClose={() => setCheckoutData(null)}
          directCheckoutAmount={checkoutData.amount}
          directCheckoutType={checkoutData.type}
          directCheckoutMetadata={checkoutData.metadata}
        />
      )}
    </div>
  );
}
