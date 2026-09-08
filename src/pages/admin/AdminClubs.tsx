import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, Plus, Edit3, Trash2, Save, X, CheckCircle, XCircle, 
  DollarSign, Link as LinkIcon, Mail, Loader2, Percent, Shield,
  ExternalLink, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import { MediaPickerModal } from '../../components/MediaPickerModal';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  contactEmail: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean | number;
  isActive: boolean | number;
  is_active?: boolean | number;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | number;
  contact_email?: string | null;
}

interface RevenuePolicy {
  id: string;
  clubId: string;
  club_id?: string;
  platformFeePercent: number;
  platform_fee_percent?: number;
  clubSharePercent: number;
  club_share_percent?: number;
  isActive: boolean | number;
  is_active?: boolean | number;
}

export function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [policies, setPolicies] = useState<RevenuePolicy[]>([]);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formStripeId, setFormStripeId] = useState('');
  const [formStripeComplete, setFormStripeComplete] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [formPlatformFee, setFormPlatformFee] = useState(20);
  const [formClubShare, setFormClubShare] = useState(80);

  const token = localStorage.getItem('token');

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const [clubsRes, policiesRes, balancesRes] = await Promise.all([
        fetch('/api/admin/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/revenue-policies', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/club-balances', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(Array.isArray(data) ? data : []);
      }
      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(Array.isArray(data) ? data : []);
      }
      if (balancesRes.ok) {
        const bData = await balancesRes.json();
        const bMap: Record<string, any> = {};
        if (Array.isArray(bData)) {
          bData.forEach((b: any) => { bMap[b.clubId] = b; });
        }
        setBalances(bMap);
      }
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClubs(); }, []);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormLogo('');
    setFormStripeId('');
    setFormStripeComplete(false);
    setFormActive(true);
    setFormPlatformFee(20);
    setFormClubShare(80);
    setEditingClub(null);
    setShowForm(false);
  };

  const openEditForm = (club: Club) => {
    setEditingClub(club);
    setFormName(club.name || '');
    setFormEmail(club.contactEmail || club.contact_email || '');
    setFormLogo(club.logo || '');
    setFormStripeId(club.stripeAccountId || club.stripe_account_id || '');
    setFormStripeComplete(!!(club.stripeOnboardingComplete || club.stripe_onboarding_complete));
    setFormActive(!!(club.isActive ?? club.is_active ?? true));

    const policy = policies.find(p => String(p.clubId || p.club_id) === String(club.id));
    if (policy) {
      setFormPlatformFee(Number(policy.platformFeePercent || policy.platform_fee_percent || 20));
      setFormClubShare(Number(policy.clubSharePercent || policy.club_share_percent || 80));
    } else {
      setFormPlatformFee(20);
      setFormClubShare(80);
    }
    setShowForm(true);
  };

  const handlePlatformFeeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setFormPlatformFee(clamped);
    setFormClubShare(100 - clamped);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingClub) {
        // Update club
        await fetch(`/api/admin/clubs/${editingClub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: formName,
            contactEmail: formEmail,
            logo: formLogo,
            stripeAccountId: formStripeId,
            stripeOnboardingComplete: formStripeComplete,
            isActive: formActive,
            platformFeePercent: formPlatformFee,
            clubSharePercent: formClubShare,
          })
        });
        // Update or create revenue policy
        const policy = policies.find(p => String(p.clubId || p.club_id) === String(editingClub.id));
        if (policy) {
          await fetch(`/api/admin/revenue-policies/${policy.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              platformFeePercent: formPlatformFee,
              clubSharePercent: formClubShare,
            })
          });
        } else {
          await fetch('/api/admin/revenue-policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              clubId: editingClub.id,
              platformFeePercent: formPlatformFee,
              clubSharePercent: formClubShare,
            })
          });
        }
      } else {
        // Create new club (policy auto-created server-side)
        await fetch('/api/admin/clubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: formName,
            contactEmail: formEmail,
            logo: formLogo,
            stripeAccountId: formStripeId,
            stripeOnboardingComplete: formStripeComplete,
            isActive: formActive,
            platformFeePercent: formPlatformFee,
            clubSharePercent: formClubShare,
          })
        });
      }
      resetForm();
      await fetchClubs();
    } catch (err) {
      console.error('Failed to save club:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this club and its revenue policy?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/clubs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchClubs();
    } catch (err) {
      console.error('Failed to delete club:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getClubPolicy = (clubId: string): RevenuePolicy | undefined => {
    return policies.find(p => String(p.clubId || p.club_id) === String(clubId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Partner Clubs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage partner clubs, Stripe Connected Accounts, and PPV revenue splits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/finance"
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <DollarSign className="w-4 h-4" />
            Finance & Payouts
          </Link>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Club
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-xl p-5 border border-violet-200 dark:border-violet-500/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-violet-900 dark:text-violet-300">How Revenue Splits Work</h4>
            <p className="text-xs text-violet-700 dark:text-violet-400 mt-1 leading-relaxed">
              When a PPV match is assigned to a club, the payment is routed via Stripe Connect. The <strong>Platform Fee</strong> is kept by WatchWDS,
              and the <strong>Club Share</strong> is automatically transferred to the club's Stripe Connected Account. Both values must total 100%.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingClub ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingClub ? 'Edit Club' : 'New Partner Club'}
            </h3>
            <button onClick={resetForm} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Club Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Grassroots FC"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                />
              </div>
              {/* Contact Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="club@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                </div>
              </div>
              {/* Logo Selection (Platform Media System) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Club Logo
                </label>
                <div className="flex items-center gap-3">
                  {/* Logo Preview */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {formLogo ? (
                      <img src={formLogo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="url"
                          value={formLogo}
                          onChange={(e) => setFormLogo(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Pick / Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Stripe Connected Account ID */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Stripe Connected Account ID
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formStripeId}
                    onChange={(e) => setFormStripeId(e.target.value)}
                    placeholder="acct_XXXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Revenue Split */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-violet-500" />
                Revenue Split Configuration
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formPlatformFee}
                    onChange={(e) => handlePlatformFeeChange(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Retained by WatchWDS</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Club Share (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formClubShare}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white transition-colors cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Transferred to club's Stripe account</p>
                </div>
              </div>
              {/* Visual Split Bar */}
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300 rounded-l-full"
                  style={{ width: `${formPlatformFee}%` }}
                />
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300 rounded-r-full"
                  style={{ width: `${formClubShare}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-violet-600 dark:text-violet-400">Platform: {formPlatformFee}%</span>
                <span className="text-emerald-600 dark:text-emerald-400">Club: {formClubShare}%</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formStripeComplete}
                    onChange={(e) => setFormStripeComplete(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-500" />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Stripe Onboarding Complete</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500" />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Active</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingClub ? 'Update Club' : 'Create Club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clubs List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Partner Clubs Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Add your first partner club to enable PPV revenue splitting.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Club
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {clubs.map(club => {
            const policy = getClubPolicy(club.id);
            const active = !!(club.isActive ?? club.is_active ?? true);
            const stripeId = club.stripeAccountId || club.stripe_account_id;
            const stripeOk = !!(club.stripeOnboardingComplete || club.stripe_onboarding_complete);
            const platformFee = policy ? Number(policy.platformFeePercent || policy.platform_fee_percent || 20) : 20;
            const clubShare = policy ? Number(policy.clubSharePercent || policy.club_share_percent || 80) : 80;

            return (
              <div
                key={club.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all hover:shadow-md ${
                  active ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-500/30 opacity-70'
                }`}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden border border-violet-200 dark:border-violet-500/30">
                    {club.logo ? (
                      <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-6 h-6 text-violet-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{club.name}</h3>
                      {active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Inactive</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {(club.contactEmail || club.contact_email) && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {club.contactEmail || club.contact_email}
                        </span>
                      )}
                      {stripeId ? (
                        <span className="flex items-center gap-1 font-mono">
                          {stripeOk ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )}
                          {stripeId.substring(0, 20)}{stripeId.length > 20 ? '...' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertCircle className="w-3 h-3" /> No Stripe account
                        </span>
                      )}
                    </div>

                    {/* Onboarding Trigger Button */}
                    <div className="mt-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/clubs/${club.id}/onboarding-link`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (data.url) {
                              window.open(data.url, '_blank');
                            } else {
                              alert(data.error || 'Failed to generate Stripe onboarding link');
                            }
                          } catch (err: any) {
                            alert(err.message || 'Error generating onboarding link');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 px-3 py-1 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {stripeId ? 'Resume Stripe Onboarding' : 'Start Stripe Express Onboarding'}
                      </button>
                    </div>

                    {/* Revenue Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex max-w-xs">
                        <div className="bg-violet-500 rounded-l-full" style={{ width: `${platformFee}%` }} />
                        <div className="bg-emerald-500 rounded-r-full" style={{ width: `${clubShare}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        Platform {platformFee}% / Club {clubShare}%
                      </span>
                    </div>

                    {/* Club Balance & Payout Status */}
                    {balances[club.id] && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Available Balance:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            £{(Number(balances[club.id].availableBalance) || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Pending:</span>
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            £{(Number(balances[club.id].pendingBalance) || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Total Paid:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            £{(Number(balances[club.id].totalPaidOut) || 0).toFixed(2)}
                          </span>
                        </div>
                        <Link
                          to="/admin/finance"
                          className="text-violet-600 dark:text-violet-400 font-bold hover:underline ml-auto flex items-center gap-1 text-[11px]"
                        >
                          Payout Engine &rarr;
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditForm(club)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(club.id)}
                      disabled={deletingId === club.id}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {deletingId === club.id ? (
                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => setFormLogo(url)}
        title="Select Partner Club Logo"
      />
    </div>
  );
}
