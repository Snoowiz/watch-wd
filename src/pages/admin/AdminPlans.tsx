import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Save, CreditCard, Tag, Loader2, 
  Building2, Globe, Percent, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle
} from 'lucide-react';
import { useCategoryStore, useSettingsStore, Plan } from '../../store';
import { useUIStore } from '../../store/uiStore';

interface ClubItem {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
  stripeAccountId?: string | null;
  stripe_account_id?: string | null;
  stripeOnboardingComplete?: boolean | number;
  stripe_onboarding_complete?: boolean | number;
  isActive?: boolean | number;
  is_active?: boolean | number;
}

interface RevenuePolicyItem {
  id: string;
  clubId: string;
  club_id?: string;
  platformFeePercent: number;
  platform_fee_percent?: number;
  clubSharePercent: number;
  club_share_percent?: number;
}

export function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [policies, setPolicies] = useState<RevenuePolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { categories } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const { showConfirm, addToast, updateToast } = useUIStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_days: 30,
    categories: [] as string[],
    is_active: 1,
    plan_scope: 'platform' as 'platform' | 'club',
    club_id: '' as string,
    platform_fee_percent: 20,
    club_share_percent: 80
  });

  const token = localStorage.getItem('token');

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClubsAndPolicies = async () => {
    try {
      const [clubsRes, policiesRes] = await Promise.all([
        fetch('/api/admin/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/revenue-policies', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(Array.isArray(data) ? data : []);
      }
      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching clubs/policies for plans:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchClubsAndPolicies();
  }, []);

  const selectedClub = clubs.find(c => String(c.id) === String(formData.club_id));
  const hasStripeAccount = Boolean(selectedClub?.stripeAccountId || selectedClub?.stripe_account_id);
  const isStripeOnboarded = Boolean(
    selectedClub && (
      selectedClub.stripeOnboardingComplete || 
      selectedClub.stripe_onboarding_complete
    )
  );

  const percentageTotal = Number(formData.platform_fee_percent || 0) + Number(formData.club_share_percent || 0);
  const isPercentageValid = formData.plan_scope === 'platform' || Math.round(percentageTotal * 100) / 100 === 100;

  const handleScopeChange = (newScope: 'platform' | 'club') => {
    if (newScope === 'platform') {
      setFormData(prev => ({
        ...prev,
        plan_scope: 'platform',
        club_id: '',
        platform_fee_percent: 100,
        club_share_percent: 0
      }));
    } else {
      // Club-specific
      const defaultClub = clubs.length > 0 ? String(clubs[0].id) : '';
      let initialPlatformFee = 20;
      let initialClubShare = 80;

      if (defaultClub) {
        const pol = policies.find(p => String(p.clubId || p.club_id) === String(defaultClub));
        if (pol) {
          initialPlatformFee = Number(pol.platformFeePercent || pol.platform_fee_percent || 20);
          initialClubShare = Number(pol.clubSharePercent || pol.club_share_percent || (100 - initialPlatformFee));
        }
      }

      setFormData(prev => ({
        ...prev,
        plan_scope: 'club',
        club_id: defaultClub,
        platform_fee_percent: initialPlatformFee,
        club_share_percent: initialClubShare
      }));
    }
  };

  const handleClubChange = (clubId: string) => {
    const pol = policies.find(p => String(p.clubId || p.club_id) === String(clubId));
    let newPlatformFee = 20;
    let newClubShare = 80;
    if (pol) {
      newPlatformFee = Number(pol.platformFeePercent || pol.platform_fee_percent || 20);
      newClubShare = Number(pol.clubSharePercent || pol.club_share_percent || (100 - newPlatformFee));
    }
    setFormData(prev => ({
      ...prev,
      club_id: clubId,
      platform_fee_percent: newPlatformFee,
      club_share_percent: newClubShare
    }));
  };

  const handleSave = async () => {
    if (formData.plan_scope === 'club') {
      if (!formData.club_id) {
        addToast('Please select a partner club for this club-specific plan.', 'error');
        return;
      }
      if (!isPercentageValid) {
        addToast(`Revenue split percentages must total exactly 100% (currently ${percentageTotal}%).`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = addToast(editingId ? 'Saving plan changes...' : 'Creating subscription plan...', 'loading');
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans';
      
      const payload = {
        ...formData,
        plan_scope: formData.plan_scope,
        club_id: formData.plan_scope === 'club' ? formData.club_id : null,
        platform_fee_percent: formData.plan_scope === 'club' ? Number(formData.platform_fee_percent) : 100,
        club_share_percent: formData.plan_scope === 'club' ? Number(formData.club_share_percent) : 0
      };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPlans();
        setIsAdding(false);
        setEditingId(null);
        updateToast(toastId, { message: 'Plan saved successfully!', type: 'success' });
      } else {
        updateToast(toastId, { message: data.error || 'Failed to save plan changes.', type: 'error' });
      }
    } catch (err: any) {
      console.error('Save failed', err);
      updateToast(toastId, { message: err.message || 'Failed to save plan changes.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const plan = plans.find((p) => p.id === id);
    const planName = plan ? plan.name : 'this plan';

    showConfirm({
      title: 'Delete Subscription Plan?',
      message: `Are you sure you want to permanently delete subscription plan "${planName}"? Users on this plan will be affected.`,
      confirmText: 'Delete Plan',
      cancelText: 'Keep Plan',
      isDanger: true,
      onConfirm: async () => {
        const toastId = addToast('Deleting plan...', 'loading');
        try {
          const res = await fetch(`/api/admin/plans/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            fetchPlans();
            updateToast(toastId, { message: 'Plan deleted successfully!', type: 'success' });
          } else {
            updateToast(toastId, { message: 'Failed to delete plan.', type: 'error' });
          }
        } catch (err) {
          console.error('Delete failed', err);
          updateToast(toastId, { message: 'Failed to delete plan.', type: 'error' });
        }
      }
    });
  };

  const startEdit = (plan: Plan) => {
    let parsedCategories = [];
    try {
      parsedCategories = JSON.parse(plan.categories) || [];
    } catch (e) {}

    const scope = (plan.plan_scope || (plan as any).planScope || 'platform') as 'platform' | 'club';
    const cId = plan.club_id || (plan as any).clubId || '';
    const fee = plan.platform_fee_percent != null ? Number(plan.platform_fee_percent) : (scope === 'platform' ? 100 : 20);
    const share = plan.club_share_percent != null ? Number(plan.club_share_percent) : (scope === 'platform' ? 0 : 80);

    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration_days: plan.duration_days,
      categories: parsedCategories,
      is_active: plan.is_active,
      plan_scope: scope,
      club_id: String(cId),
      platform_fee_percent: fee,
      club_share_percent: share
    });
    setEditingId(plan.id);
    setIsAdding(false);
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const cats = [...prev.categories];
      if (cats.includes(categoryId)) {
        return { ...prev, categories: cats.filter(c => c !== categoryId) };
      } else {
        return { ...prev, categories: [...cats, categoryId] };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Subscription & Membership Plans
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure platform-wide and club-specific subscription tiers with automated Stripe Connect revenue sharing
          </p>
        </div>
        <button 
          onClick={() => { 
            setIsAdding(true); 
            setEditingId(null); 
            setFormData({ 
              name: '', 
              description: '', 
              price: 0, 
              duration_days: 30, 
              categories: [], 
              is_active: 1,
              plan_scope: 'platform',
              club_id: '',
              platform_fee_percent: 100,
              club_share_percent: 0
            }); 
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" /> New Plan
        </button>
      </div>

      {/* Editor Modal / Panel */}
      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set plan scope, duration, pricing, and revenue distribution parameters
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              formData.plan_scope === 'club' 
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
            }`}>
              {formData.plan_scope === 'club' ? 'Club Specific' : 'Platform Wide'}
            </span>
          </div>

          <div className="space-y-6">
            {/* Step 1: Scope Selection Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Plan Scope & Coverage
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleScopeChange('platform')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
                    formData.plan_scope === 'platform'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${formData.plan_scope === 'platform' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Platform-Wide Subscription</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Grants access to all platform broadcasts according to category permissions. 100% of revenue goes to platform.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeChange('club')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${
                    formData.plan_scope === 'club'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${formData.plan_scope === 'club' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Partner Club Subscription</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Restricted to a single club's content. Automatically shares subscription revenue with the club via Stripe Connect.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Club Selection & Revenue Sharing (Conditional) */}
            {formData.plan_scope === 'club' && (
              <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                  <span>Partner Club Assignment & Revenue Split Configuration</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Club Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Select Partner Club *
                    </label>
                    <select
                      value={formData.club_id}
                      onChange={(e) => handleClubChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm font-medium focus:border-amber-500 outline-none text-slate-900 dark:text-white"
                    >
                      <option value="" disabled>Select a partner club...</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {!(c.isActive ?? c.is_active ?? true) ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Stripe Status Indicator Badge */}
                    {selectedClub && (
                      <div className="pt-2">
                        {isStripeOnboarded ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Stripe Connect Active — Instant Destination Charges & Direct Payouts Ready
                          </div>
                        ) : hasStripeAccount ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Stripe Incomplete — Connect account linked ({selectedClub.stripeAccountId}) but onboarding pending
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            No Stripe Account — Partner has not onboarded with Stripe Connect
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Split Percentages */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Platform Fee %</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formData.platform_fee_percent}%</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formData.platform_fee_percent}
                          onChange={(e) => {
                            const fee = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setFormData(prev => ({
                              ...prev,
                              platform_fee_percent: fee,
                              club_share_percent: 100 - fee
                            }));
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Club Share %</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{formData.club_share_percent}%</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formData.club_share_percent}
                          onChange={(e) => {
                            const share = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setFormData(prev => ({
                              ...prev,
                              club_share_percent: share,
                              platform_fee_percent: 100 - share
                            }));
                          }}
                          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-semibold focus:border-amber-500 outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Percentage Total Progress / Status */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className={isPercentageValid ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1' : 'text-rose-600 dark:text-rose-400 flex items-center gap-1'}>
                          {isPercentageValid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Split Valid: 100% Total
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" /> Total is {percentageTotal}%. Must equal exactly 100%
                            </>
                          )}
                        </span>
                        <span className="text-slate-400">{formData.platform_fee_percent}% Platform / {formData.club_share_percent}% Club</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-indigo-600 h-full transition-all" 
                          style={{ width: `${Math.min(100, formData.platform_fee_percent)}%` }} 
                          title={`Platform: ${formData.platform_fee_percent}%`}
                        />
                        <div 
                          className="bg-amber-500 h-full transition-all" 
                          style={{ width: `${Math.min(100, formData.club_share_percent)}%` }} 
                          title={`Club: ${formData.club_share_percent}%`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Plan Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Plan Name *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g., Rovers FC Match Pass or Season VIP Pass"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Duration (Days) *</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                  placeholder="Brief description of perks and match entitlements..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Price ({currencySymbol}) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm font-semibold focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: Number(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                >
                  <option value={1}>Active — Visible to Users</option>
                  <option value={0}>Inactive — Hidden from Catalog</option>
                </select>
              </div>

              {/* Categories */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Allowed Categories</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory('all')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${formData.categories.includes('all') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                  >
                    All Content
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id.toString())}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${formData.categories.includes(c.id.toString()) && !formData.categories.includes('all') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                      disabled={formData.categories.includes('all')}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">If "All Content" is selected, categorization applies to everything.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button 
                type="button"
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !isPercentageValid || (formData.plan_scope === 'club' && !formData.club_id)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSubmitting ? 'Saving Plan...' : editingId ? 'Update Subscription Plan' : 'Create Subscription Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 gap-4">
        {plans.map(plan => {
          let cats: string[] = [];
          try { cats = JSON.parse(plan.categories); } catch (e) {}

          const scope = (plan.plan_scope || (plan as any).planScope || 'platform') as 'platform' | 'club';
          const assignedClub = clubs.find(c => String(c.id) === String(plan.club_id || (plan as any).clubId));
          const isClubOnboarded = Boolean(
            assignedClub && (assignedClub.stripeOnboardingComplete || assignedClub.stripe_onboarding_complete)
          );

          return (
            <div 
              key={plan.id} 
              className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                scope === 'club' 
                  ? 'border-amber-200/80 dark:border-amber-900/40' 
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                  
                  {/* Scope Badge */}
                  {scope === 'club' ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      <Building2 className="w-3 h-3" />
                      Club Plan: {assignedClub?.name || `Club #${plan.club_id}`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                      <Globe className="w-3 h-3" />
                      Platform Wide
                    </span>
                  )}

                  {/* Revenue Split Tag */}
                  {scope === 'club' && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      <Percent className="w-3 h-3 text-amber-500" />
                      Split: {plan.club_share_percent ?? 80}% Club / {plan.platform_fee_percent ?? 20}% Platform
                    </span>
                  )}

                  {/* Stripe Status Tag for Club Plans */}
                  {scope === 'club' && assignedClub && (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-semibold ${
                      isClubOnboarded 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}>
                      {isClubOnboarded ? '✓ Stripe Active' : '⚠ Stripe Pending'}
                    </span>
                  )}

                  {plan.is_active === 0 && (
                    <span className="bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{plan.description || 'No description provided.'}</p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> {currencySymbol}{plan.price.toFixed(2)} / {plan.duration_days} days
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> 
                    {cats.includes('all') ? 'All Categories' : cats.length > 0 ? `${cats.length} Categories` : 'No categories configured'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button 
                  onClick={() => startEdit(plan)} 
                  className="p-2.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                  title="Edit Plan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(plan.id)} 
                  className="p-2.5 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && !isLoading && (
          <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No subscription plans created yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Create platform-wide or club-specific membership plans with custom pricing and duration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
