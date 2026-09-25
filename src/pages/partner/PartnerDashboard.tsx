import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, DollarSign, Calendar, TrendingUp, CreditCard, 
  Play, ExternalLink, ShieldCheck, AlertCircle, Clock, 
  ArrowUpRight, CheckCircle2, ChevronRight, RefreshCw, Loader2,
  Tv, Eye
} from 'lucide-react';
import { useAuthStore } from '../../store';

interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  contactEmail: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean | number;
}

interface BalanceInfo {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid_out: number;
}

interface MatchItem {
  id: string;
  title?: string;
  home_team?: string;
  away_team?: string;
  date?: string;
  start_time?: string;
  status?: string;
  access?: string;
  access_type?: string;
  price?: number;
  ppv_price?: number;
  video_url?: string;
  stats?: {
    totalRevenue: number;
    totalNet: number;
    purchasesCount: number;
  };
}

interface EarningItem {
  id: string;
  match_id?: string;
  matchId?: string;
  gross_amount?: number;
  grossAmount?: number;
  platform_fee?: number;
  platformFee?: number;
  net_amount?: number;
  netAmount?: number;
  commission_rate?: number;
  commissionRate?: number;
  is_instant_split?: boolean | number;
  isInstantSplit?: boolean | number;
  stripe_transfer_id?: string;
  stripeTransferId?: string;
  created_at?: string;
  createdAt?: string;
}

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  destination_account_id?: string;
  destinationAccountId?: string;
  stripe_transfer_id?: string;
  stripeTransferId?: string;
  created_at?: string;
  createdAt?: string;
}

interface PolicyInfo {
  platform_fee_percent?: number;
  platformFeePercent?: number;
  club_share_percent?: number;
  clubSharePercent?: number;
}

export function PartnerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'earnings' | 'payouts' | 'policy'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [balance, setBalance] = useState<BalanceInfo>({ available_balance: 0, pending_balance: 0, total_earned: 0, total_paid_out: 0 });
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [policy, setPolicy] = useState<PolicyInfo | null>(null);

  // Authorization check
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'partner' && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [dashRes, matchesRes, earningsRes, payoutsRes, policyRes] = await Promise.all([
        fetch('/api/partner/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/partner/matches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/partner/earnings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/partner/payouts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/partner/revenue-policy', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setClub(d.club || null);
        if (d.balance) setBalance(d.balance);
      }
      if (matchesRes.ok) {
        const m = await matchesRes.json();
        setMatches(m.matches || []);
      }
      if (earningsRes.ok) {
        const e = await earningsRes.json();
        setEarnings(e.earnings || []);
      }
      if (payoutsRes.ok) {
        const p = await payoutsRes.json();
        setPayouts(p.payouts || []);
      }
      if (policyRes.ok) {
        const pol = await policyRes.json();
        setPolicy(pol.policy || null);
      }
    } catch (err) {
      console.error('Failed to load partner dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getMatchTitle = (m: MatchItem) => {
    if (m.title) return m.title;
    if (m.home_team && m.away_team) return `${m.home_team} vs ${m.away_team}`;
    return `Match #${m.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading Partner Club Portal...</p>
      </div>
    );
  }

  const isStripeConnected = Boolean(club?.stripeAccountId && Number(club?.stripeOnboardingComplete));
  const clubShare = policy?.club_share_percent ?? policy?.clubSharePercent ?? 80;
  const platformFee = policy?.platform_fee_percent ?? policy?.platformFeePercent ?? 20;

  return (
    <div className="min-h-screen pb-16 pt-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
              {club?.logo ? (
                <img src={club.logo} alt={club.name} className="w-full h-full object-contain rounded-xl" />
              ) : (
                <Building2 className="w-10 h-10 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{club?.name || 'Partner Club'}</h1>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Official Partner Portal
                </span>
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-1 flex items-center gap-2">
                <span>{club?.contactEmail || user?.email}</span>
                <span>•</span>
                <span>Revenue Share: {clubShare}% Club / {platformFee}% Platform</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all flex items-center gap-2 text-xs font-bold"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              {isStripeConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Stripe Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertCircle className="w-4 h-4" /> Stripe Connect Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'matches', label: `Assigned Matches (${matches.length})`, icon: Tv },
          { id: 'earnings', label: `Earnings (${earnings.length})`, icon: DollarSign },
          { id: 'payouts', label: `Payouts (${payouts.length})`, icon: CreditCard },
          { id: 'policy', label: 'Revenue Share Policy', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Available Balance</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                £{balance.available_balance.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pending: £{balance.pending_balance.toFixed(2)}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Total Earned (Net)</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                £{balance.total_earned.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Accumulated from PPV ticket sales</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Total Paid Out</span>
                <CreditCard className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                £{balance.total_paid_out.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{payouts.length} total payout transactions</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2 text-xs font-bold uppercase tracking-wider">
                <span>Assigned Matches</span>
                <Tv className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {matches.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Live, scheduled & on-demand</p>
            </div>
          </div>

          {/* Quick Match Performance & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Matches Preview */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-amber-500" /> Matches & Broadcast Performance
                </h3>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  View all ({matches.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No matches currently assigned to your club.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matches.slice(0, 4).map((m) => (
                    <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {getMatchTitle(m)}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{m.date || m.start_time ? new Date(m.date || m.start_time || '').toLocaleDateString() : 'Scheduled'}</span>
                          <span>•</span>
                          <span className="capitalize">{m.status || 'upcoming'}</span>
                          <span>•</span>
                          <span>PPV: £{Number(m.price || m.ppv_price || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +£{(m.stats?.totalNet || 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.stats?.purchasesCount || 0} purchases
                        </div>
                      </div>

                      <Link
                        to={`/match/${m.id}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" /> Stream
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue Policy & Stripe Status Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Revenue Split Terms
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs font-semibold mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Your Club Share:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{clubShare}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-3">
                    <span className="text-slate-500 dark:text-slate-400">Platform Commission:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{platformFee}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${clubShare}%` }} />
                    <div className="bg-violet-500 h-full" style={{ width: `${platformFee}%` }} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-indigo-500" /> Stripe Connect Status
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  {isStripeConnected ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Ready for Direct Payouts
                      </div>
                      <p className="text-slate-500 font-mono text-[11px] truncate">
                        Account: {club?.stripeAccountId}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertCircle className="w-4 h-4" /> Onboarding Incomplete
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Contact your platform administrator to receive the Stripe onboarding link for automated bank transfers.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATCHES */}
      {activeTab === 'matches' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Matches</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You have official partner broadcast access to watch and monitor these matches.
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No matches found for your club.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Match</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Access Type</th>
                    <th className="py-3 px-4">PPV Price</th>
                    <th className="py-3 px-4">Purchases</th>
                    <th className="py-3 px-4">Club Net Revenue</th>
                    <th className="py-3 px-4 text-right">Broadcast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {getMatchTitle(m)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {m.date || m.start_time ? new Date(m.date || m.start_time || '').toLocaleString() : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          m.status === 'live'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse'
                            : m.status === 'finished' || m.status === 'completed'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {m.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 uppercase font-bold text-slate-600 dark:text-slate-300">
                        {m.access_type || m.access || 'PPV'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        £{Number(m.price || m.ppv_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {m.stats?.purchasesCount || 0}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        £{(m.stats?.totalNet || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/match/${m.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" /> Watch
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EARNINGS */}
      {activeTab === 'earnings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Earnings Ledger</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed transaction records of every viewer PPV purchase and revenue split.
              </p>
            </div>
          </div>

          {earnings.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No earnings recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Match ID</th>
                    <th className="py-3 px-4">Gross Purchase</th>
                    <th className="py-3 px-4">Platform Fee</th>
                    <th className="py-3 px-4">Club Net Share</th>
                    <th className="py-3 px-4">Transfer Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {earnings.map((e) => {
                    const gross = Number(e.gross_amount ?? e.grossAmount ?? 0);
                    const fee = Number(e.platform_fee ?? e.platformFee ?? 0);
                    const net = Number(e.net_amount ?? e.netAmount ?? 0);
                    const isInstant = Boolean(e.is_instant_split ?? e.isInstantSplit);
                    const dateStr = e.created_at ?? e.createdAt;

                    return (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500">
                          {dateStr ? new Date(dateStr).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          #{e.match_id ?? e.matchId}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          £{gross.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          £{fee.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +£{net.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isInstant
                              ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400'
                              : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {isInstant ? 'Stripe Connect Instant Split' : 'Accumulated to Balance'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payout History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfers executed from platform balance to your designated bank account via Stripe Connect.
              </p>
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No payouts recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payout ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Destination Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payouts.map((p) => {
                    const dateStr = p.created_at ?? p.createdAt;
                    const dest = p.destination_account_id ?? p.destinationAccountId ?? club?.stripeAccountId ?? 'Direct';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500">
                          {dateStr ? new Date(dateStr).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          #{p.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          £{Number(p.amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            p.status === 'completed' || p.status === 'paid'
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          }`}>
                            {p.status || 'completed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {dest}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REVENUE POLICY */}
      {activeTab === 'policy' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Revenue Share Agreement</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            The revenue sharing percentage configured by the platform administrator for {club?.name || 'your club'}.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Club Share Percentage</h4>
                <p className="text-xs text-slate-400">Directly attributed to your club for every PPV ticket sold</p>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {clubShare}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Platform Commission</h4>
                <p className="text-xs text-slate-400">Platform operational fee, hosting, streaming, and payment processing</p>
              </div>
              <div className="text-2xl font-black text-violet-600 dark:text-violet-400 font-mono">
                {platformFee}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">Payment Settlement Note:</p>
              <p>
                When viewers purchase PPV access using Stripe destination charges, your share is transferred automatically to your Stripe account. For wallet or balance payments, earnings accumulate in your available balance and are settled during scheduled payouts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
