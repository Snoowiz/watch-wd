import React, { useState, useEffect } from 'react';
import {
  DollarSign, RefreshCw, CheckCircle, AlertCircle, Clock, Send,
  Settings, Building2, TrendingUp, ArrowUpRight, ShieldCheck,
  Zap, Filter, Search, ChevronRight, AlertTriangle, PlayCircle
} from 'lucide-react';

interface PayoutConfig {
  thresholdAmount: number;
  schedule: 'manual' | 'auto';
  autoFrequencyHours: number;
  currency: string;
  enabled: boolean;
  instantSplit?: boolean;
}

interface ClubBalance {
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubLogo: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: number | boolean;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalPaidOut: number;
  currency: string;
}

interface ClubEarning {
  id: string;
  clubId: string;
  matchId?: string;
  transactionId?: string;
  grossAmount: number;
  platformCommission: number;
  clubNetAmount: number;
  commissionRate: number;
  type: string;
  createdAt: string;
}

interface PayoutRecord {
  id: string;
  clubId: string;
  stripePayoutId?: string;
  stripeAccountId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  method: 'auto' | 'manual' | 'instant' | string;
  arrivalDate?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
}

export function AdminPayoutSettings() {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'earnings' | 'history'>('overview');
  const [config, setConfig] = useState<PayoutConfig>({
    thresholdAmount: 50,
    schedule: 'manual',
    autoFrequencyHours: 24,
    currency: 'GBP',
    enabled: true,
    instantSplit: false
  });
  const [balances, setBalances] = useState<ClubBalance[]>([]);
  const [earnings, setEarnings] = useState<ClubEarning[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [triggeringClubId, setTriggeringClubId] = useState<string | null>(null);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [configRes, balancesRes, earningsRes, payoutsRes] = await Promise.all([
        fetch('/api/admin/payout-settings', { headers }),
        fetch('/api/admin/club-balances', { headers }),
        fetch('/api/admin/club-earnings', { headers }),
        fetch('/api/admin/payouts', { headers })
      ]);

      if (configRes.ok) {
        const cData = await configRes.json();
        setConfig(cData);
      }
      if (balancesRes.ok) {
        const bData = await balancesRes.json();
        setBalances(Array.isArray(bData) ? bData : []);
      }
      if (earningsRes.ok) {
        const eData = await earningsRes.json();
        setEarnings(Array.isArray(eData) ? eData : []);
      }
      if (payoutsRes.ok) {
        const pData = await payoutsRes.json();
        setPayouts(Array.isArray(pData) ? pData : []);
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      setMessage({ text: err.message || 'Failed to load finance data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/payout-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout settings');
      setMessage({ text: 'Payout settings successfully saved.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update settings', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerSingle = async (clubId: string, force = false) => {
    setTriggeringClubId(clubId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/payouts/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ clubId, forceOverrideThreshold: force })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payout initiation failed');
      }
      setMessage({ text: `Payout triggered successfully! Payout ID: ${data.payoutId}`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Payout trigger failed', type: 'error' });
    } finally {
      setTriggeringClubId(null);
    }
  };

  const handleTriggerAll = async () => {
    if (!window.confirm(`Are you sure you want to trigger payouts for all clubs reaching the ${config.thresholdAmount} ${config.currency} threshold?`)) {
      return;
    }
    setTriggeringAll(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/payouts/trigger-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Batch payout trigger failed');
      }
      setMessage({ text: `Successfully triggered ${data.processed} eligible payout(s).`, type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Batch payout trigger failed', type: 'error' });
    } finally {
      setTriggeringAll(false);
    }
  };

  // Aggregated totals
  const totalAvailable = balances.reduce((acc, b) => acc + (Number(b.availableBalance) || 0), 0);
  const totalPending = balances.reduce((acc, b) => acc + (Number(b.pendingBalance) || 0), 0);
  const totalPaidOutAll = balances.reduce((acc, b) => acc + (Number(b.totalPaidOut) || 0), 0);
  const totalPlatformCommissions = earnings.reduce((acc, e) => acc + (Number(e.platformCommission) || 0), 0);
  const eligibleClubsCount = balances.filter(b => (Number(b.availableBalance) || 0) >= config.thresholdAmount).length;

  const filteredBalances = balances.filter(b =>
    (b.clubName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.clubId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-yellow-500" />
              Finance & Payout Settings
            </h1>
            {config.instantSplit && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3.5 h-3.5" /> Instant Split Active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control automated payout threshold, schedule intervals, and monitor accumulated partner club earnings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {eligibleClubsCount > 0 && (
            <button
              onClick={handleTriggerAll}
              disabled={triggeringAll}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-all shadow-emerald-600/20"
            >
              <Zap className="w-4 h-4" />
              {triggeringAll ? 'Processing...' : `Payout All Eligible (${eligibleClubsCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-yellow-500">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Accumulated Available</span>
            <Building2 className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{totalAvailable.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Across {balances.length} partner club{balances.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Transfers</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{totalPending.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            In-flight to connected accounts
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Paid Out</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{totalPaidOutAll.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            Successfully delivered to clubs
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Commission</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            £{totalPlatformCommissions.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            WatchWDS fee share retained
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Club Balances & Payout Control
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Payout Engine Settings
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'earnings'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Earnings Audit Ledger ({earnings.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Payout Logs ({payouts.length})
        </button>
      </div>

      {/* Tab: Overview (Club Balances Table) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search partner clubs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Current threshold: <strong className="text-slate-900 dark:text-white font-mono">£{config.thresholdAmount}</strong>
              <span className="mx-1">•</span>
              Schedule: <strong className="text-slate-900 dark:text-white capitalize">{config.schedule}</strong>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Partner Club</th>
                    <th className="px-6 py-4">Available Balance</th>
                    <th className="px-6 py-4">Pending Payout</th>
                    <th className="px-6 py-4">Total Earned</th>
                    <th className="px-6 py-4">Total Paid Out</th>
                    <th className="px-6 py-4">Stripe Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading && balances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-yellow-500" />
                        Loading club balances...
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No clubs found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((club) => {
                      const avail = Number(club.availableBalance) || 0;
                      const meetsThreshold = avail >= config.thresholdAmount;
                      const isConnected = !!(club.stripeAccountId && club.stripeOnboardingComplete);

                      return (
                        <tr key={club.clubId} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                {club.clubLogo ? (
                                  <img src={club.clubLogo} alt={club.clubName} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{club.clubName}</div>
                                <div className="text-xs text-slate-400 font-mono">{club.clubId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                                £{avail.toFixed(2)}
                              </span>
                              {config.instantSplit ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300">
                                  <Zap className="w-2.5 h-2.5" /> Instant Split
                                </span>
                              ) : meetsThreshold ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  Threshold Met
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  ({Math.round((avail / (config.thresholdAmount || 1)) * 100)}%)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                            £{(Number(club.pendingBalance) || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                            £{(Number(club.totalEarned) || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                            £{(Number(club.totalPaidOut) || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {isConnected ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" /> Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTriggerSingle(club.clubId, !meetsThreshold)}
                                disabled={triggeringClubId === club.clubId || avail <= 0 || !isConnected}
                                title={!isConnected ? "Stripe onboarding must be complete" : avail <= 0 ? "No available balance" : "Trigger Stripe Payout"}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  meetsThreshold && isConnected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100'
                                }`}
                              >
                                <Send className={`w-3.5 h-3.5 ${triggeringClubId === club.clubId ? 'animate-spin' : ''}`} />
                                {triggeringClubId === club.clubId ? 'Triggering...' : meetsThreshold ? 'Payout Now' : 'Manual Force'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-yellow-500" />
              Automated Payout Engine Settings
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure minimum earnings required before automatic Stripe payouts are triggered to clubs.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Split Mode Choice */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Revenue Split & Disbursement Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setConfig({ ...config, instantSplit: true })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    config.instantSplit
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Instant Split Mode
                    </div>
                    <input
                      type="radio"
                      checked={!!config.instantSplit}
                      onChange={() => setConfig({ ...config, instantSplit: true })}
                      className="text-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct split to clubs: on each PPV match payment, club net share is immediately transferred to their Stripe Connected Account with £0 threshold.
                  </p>
                </div>

                <div
                  onClick={() => setConfig({ ...config, instantSplit: false })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    !config.instantSplit
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Threshold Accumulation Mode
                    </div>
                    <input
                      type="radio"
                      checked={!config.instantSplit}
                      onChange={() => setConfig({ ...config, instantSplit: false })}
                      className="text-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Earnings accumulate in the club's available balance until reaching the minimum threshold (£), triggering automated or manual payouts.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payout Minimum Threshold (£)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">£</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={config.instantSplit}
                  value={config.instantSplit ? 0 : config.thresholdAmount}
                  onChange={e => setConfig({ ...config, thresholdAmount: Number(e.target.value) })}
                  className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-yellow-500 dark:text-white ${
                    config.instantSplit ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  required={!config.instantSplit}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {config.instantSplit
                  ? "Instant Split is enabled. Every payment is transferred directly to the connected account with £0 minimum threshold."
                  : "Clubs must accumulate at least this balance before auto-payout activates. Recommended: £50 or £100."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Execution Schedule
              </label>
              <select
                value={config.schedule}
                onChange={e => setConfig({ ...config, schedule: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-yellow-500 dark:text-white"
              >
                <option value="manual">Manual Approval Only (Admin Triggers On Demand)</option>
                <option value="auto">Automated Engine (Triggers Automatically When Threshold Met)</option>
              </select>
            </div>

            {config.schedule === 'auto' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Engine Check Frequency
                </label>
                <select
                  value={config.autoFrequencyHours}
                  onChange={e => setConfig({ ...config, autoFrequencyHours: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-yellow-500 dark:text-white"
                >
                  <option value={1}>Every 1 Hour</option>
                  <option value={6}>Every 6 Hours</option>
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours (Daily)</option>
                  <option value={168}>Weekly (Every 7 Days)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payout Currency
              </label>
              <select
                value={config.currency}
                onChange={e => setConfig({ ...config, currency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-yellow-500 dark:text-white"
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500 border-slate-300"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Enable Payout Engine System
                </span>
              </label>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Payout Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Earnings Ledger */}
      {activeTab === 'earnings' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Per-Transaction Commission Audit Ledger</h2>
              <p className="text-xs text-slate-400">Immediate platform split recorded upon Stripe checkout confirmation.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Club ID</th>
                  <th className="px-6 py-4">Match / Ref</th>
                  <th className="px-6 py-4">Gross Amount</th>
                  <th className="px-6 py-4">Commission Rate</th>
                  <th className="px-6 py-4">Platform Fee</th>
                  <th className="px-6 py-4">Club Net Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono text-xs">
                {earnings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-sans">
                      No club earnings recorded yet. Earnings appear as soon as PPV transactions complete.
                    </td>
                  </tr>
                ) : (
                  earnings.map(earn => (
                    <tr key={earn.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-3.5 text-slate-500">{new Date(earn.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">{earn.clubId}</td>
                      <td className="px-6 py-3.5 text-slate-500">#{earn.matchId || 'N/A'}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">£{Number(earn.grossAmount).toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-slate-400">{earn.commissionRate}%</td>
                      <td className="px-6 py-3.5 text-purple-600 dark:text-purple-400 font-bold">+£{Number(earn.platformCommission).toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold">+£{Number(earn.clubNetAmount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Payout Logs */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white">Stripe Payout Event Logs</h2>
            <p className="text-xs text-slate-400">Real-time status updates driven by Stripe payout.paid & payout.failed webhooks.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Club ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Stripe Payout Ref</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      No payouts recorded yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-3.5 text-slate-500">{new Date(po.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">{po.clubId}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        £{Number(po.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          po.method === 'instant'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
                            : po.method === 'manual'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {po.method === 'instant' && <Zap className="w-2.5 h-2.5" />}
                          {po.method || 'auto'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold capitalize ${
                          po.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : po.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}>
                          {po.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : po.status === 'failed' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-400">
                        {po.stripePayoutId || po.id}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {po.status === 'failed' ? (
                          <span className="text-red-500">{po.failureMessage || po.failureCode || 'Failed'}</span>
                        ) : po.arrivalDate ? (
                          <span>Est. Arrival: {new Date(po.arrivalDate).toLocaleDateString()}</span>
                        ) : (
                          'Processing'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
