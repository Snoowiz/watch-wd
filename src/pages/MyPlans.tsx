import React, { useEffect, useState } from 'react';
import { useAuthStore, useSettingsStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, CreditCard, AlertCircle, ArrowUpCircle, CheckCircle } from 'lucide-react';

export function MyPlans() {
  const { user } = useAuthStore();
  const { currencySymbol } = useSettingsStore();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetch('/api/plans')
      .then(r => r.json())
      .then(data => {
        setPlans(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentPlan = user?.planId ? plans.find(p => String(p.id) === String(user.planId)) : null;
  const isPlanActive = user?.planExpiresAt && new Date(user.planExpiresAt) > new Date();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">My Subscriptions</h1>
        <p className="text-slate-500">Manage your active plans and billing history.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-yellow-500" />
          Active Plan
        </h2>

        {isPlanActive && currentPlan ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{currentPlan.name}</h3>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                {currentPlan.description}
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" />
                Expires on: <span className="font-bold text-slate-900 dark:text-white">{new Date(user.planExpiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="text-right mb-2">
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {currencySymbol}{currentPlan.price}
                </div>
                <div className="text-sm text-slate-500">/ {currentPlan.duration_days} days</div>
              </div>
              <Link 
                to="/plans"
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/30 text-center flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
                Upgrade Plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Subscription</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              {currentPlan 
                ? "Your previous subscription has expired. Renew your plan to regain access to premium content." 
                : "You don't have any active subscription plans. Subscribe to unlock premium matches and features."}
            </p>
            <Link 
              to="/plans"
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-yellow-500/30"
            >
              View Available Plans
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Available Upgrades</h2>
        <div className="space-y-4">
          {plans.filter(p => p.is_active !== 0 && (!isPlanActive || !currentPlan || Number(p.price) > Number(currentPlan.price))).length > 0 ? (
            plans.filter(p => p.is_active !== 0 && (!isPlanActive || !currentPlan || Number(p.price) > Number(currentPlan.price))).map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-yellow-500/50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                  <p className="text-sm text-slate-500">{plan.duration_days} Days Access</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-900 dark:text-white">{currencySymbol}{plan.price}</span>
                  <Link 
                    to="/plans"
                    className="text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 px-4 py-2 rounded-lg transition-colors"
                  >
                    Upgrade
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">You are currently on the highest tier plan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
