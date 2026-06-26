import React, { useEffect, useState } from 'react';
import { useAuthStore, useSettingsStore } from '../store';
import { Check, Shield } from 'lucide-react';
import { AddFundsModal } from '../components/AddFundsModal';
import { useNavigate, useLocation } from 'react-router-dom';

export function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const { currencySymbol } = useSettingsStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { fromMatchSlug?: string; matchId?: any } | null;

  const [checkoutData, setCheckoutData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => setPlans(data.filter((p: any) => p.is_active !== 0)));
  }, []);

  const currentPlan = user?.planId ? plans.find(p => String(p.id) === String(user.planId)) : null;
  const isPlanActive = user?.planExpiresAt && new Date(user.planExpiresAt) > new Date();

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      navigate('/login', { state: { from: '/plans' } });
      return;
    }

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
        alert(data.error || 'Unable to process upgrade request.');
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
      alert('Error fetching upgrade details. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Unlock premium coverage, exclusive matches, and ad-free viewing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => {
          const isCurrentActive = isPlanActive && String(user?.planId) === String(plan.id);
          const isDowngrade = isPlanActive && currentPlan && Number(plan.price) <= Number(currentPlan.price) && !isCurrentActive;
          
          return (
            <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 relative flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm h-10">{plan.description}</p>
              </div>
              
              <div className="mb-8 font-black text-5xl text-slate-900 dark:text-white">
                {currencySymbol}{plan.price}
                <span className="text-lg text-slate-500 font-bold ml-2">/ {plan.duration_days} days</span>
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                className={`w-full py-4 rounded-xl font-bold text-lg mb-8 transition-all ${
                  isCurrentActive || isDowngrade
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-500/30'
                }`}
                disabled={isCurrentActive || isDowngrade}
              >
                {isCurrentActive ? 'Active Plan' : isDowngrade ? 'Cannot Downgrade' : (isPlanActive ? 'Upgrade Plan' : 'Subscribe Now')}
              </button>

              <ul className="space-y-4 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Access to exclusive matches</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Ad-free streaming</span>
                </li>
              </ul>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className="col-span-1 md:col-span-3 text-center py-20 text-slate-500">
            No plans available at the moment.
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
