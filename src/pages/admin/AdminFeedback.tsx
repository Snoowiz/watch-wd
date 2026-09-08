import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Star, Search, Filter, RefreshCw, Send, CheckCircle2,
  Clock, AlertCircle, Trash2, Mail, ExternalLink, ShieldCheck,
  ChevronRight, ArrowUpDown, UserCheck, UserX, Settings, BarChart2,
  Sliders, Plus, X, Eye, ThumbsUp, MessageCircle, AlertTriangle, Monitor,
  Sparkles, Check, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store';

interface FeedbackItem {
  id: string;
  userId: string | null;
  username: string | null;
  userEmail: string | null;
  isGuest: boolean;
  rating: number;
  ratingLabel: string;
  category: string;
  feedbackText: string;
  pageUrl: string | null;
  deviceInfo: string | null;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'archived';
  adminNotes: string | null;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  id: string;
  feedbackId: string;
  adminId: string | null;
  adminName: string;
  responseText: string;
  emailSent: boolean;
  createdAt: string;
}

interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  csatPercentage: number;
  ratingCounts: Record<number, number>;
  statusCounts: Record<string, number>;
  categoryBreakdown: { category: string; count: number }[];
  userTypeBreakdown: { registered: number; guest: number };
}

interface FeedbackConfig {
  enabled: boolean;
  allow_guest: boolean;
  trigger_type: 'delay' | 'page_count' | 'manual_only';
  trigger_delay_seconds: number;
  pages_before_prompt: number;
  cooldown_days_after_submit: number;
  cooldown_days_after_dismiss: number;
  cooldown_days_after_later: number;
  categories: string[];
  notify_admin_email: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'New', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  reviewed: { label: 'Reviewed', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  in_progress: { label: 'In Progress', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
};

export const AdminFeedback: React.FC = () => {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'feedback' | 'settings'>('feedback');

  // Feedback list & filtering state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUserType, setSelectedUserType] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Detail drawer / modal state
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Response composer
  const [responseText, setResponseText] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [isSendingResponse, setIsSendingResponse] = useState<boolean>(false);
  const [responseSuccessMsg, setResponseSuccessMsg] = useState<string>('');
  const [responseErrMsg, setResponseErrMsg] = useState<string>('');

  // Settings tab state
  const [config, setConfig] = useState<FeedbackConfig | null>(null);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string>('');
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  // Fetch feedback items
  const fetchFeedback = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: selectedStatus,
        rating: selectedRating,
        category: selectedCategory,
        user_type: selectedUserType,
        search: searchQuery
      });

      const res = await fetch(`/api/admin/feedback?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data.feedback || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedStatus, selectedRating, selectedCategory, selectedUserType, searchQuery]);

  // Fetch feedback statistics
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/feedback/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/feedback-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch feedback settings:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchFeedback();
    fetchStats();
    fetchSettings();
  }, [fetchFeedback, fetchStats, fetchSettings]);

  // Open feedback detail drawer
  const handleOpenDetail = async (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setAdminNotes(item.adminNotes || '');
    setResponseText('');
    setResponseSuccessMsg('');
    setResponseErrMsg('');
    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
        if (data.feedback) {
          setSelectedFeedback(data.feedback);
          setAdminNotes(data.feedback.adminNotes || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch feedback details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Update feedback status
  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    if (!token) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes })
      });

      if (res.ok) {
        setFeedbackList(prev =>
          prev.map(f => (f.id === feedbackId ? { ...f, status: newStatus as any, adminNotes } : f))
        );
        if (selectedFeedback && selectedFeedback.id === feedbackId) {
          setSelectedFeedback({ ...selectedFeedback, status: newStatus as any, adminNotes });
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!token || !selectedFeedback) return;
    try {
      await fetch(`/api/admin/feedback/${selectedFeedback.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ admin_notes: adminNotes })
      });
      setSelectedFeedback({ ...selectedFeedback, adminNotes });
      setFeedbackList(prev =>
        prev.map(f => (f.id === selectedFeedback.id ? { ...f, adminNotes } : f))
      );
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  // Send admin response
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFeedback || !responseText.trim()) return;

    setIsSendingResponse(true);
    setResponseSuccessMsg('');
    setResponseErrMsg('');

    try {
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          response_text: responseText.trim(),
          send_email: sendEmail && Boolean(selectedFeedback.userEmail)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send response');
      }

      setResponseSuccessMsg(data.message || 'Response recorded successfully');
      setResponseText('');

      if (data.response) {
        setResponses(prev => [...prev, data.response]);
      }

      // Refresh item state
      const updatedStatus = selectedFeedback.status === 'new' ? 'reviewed' : selectedFeedback.status;
      setSelectedFeedback({
        ...selectedFeedback,
        status: updatedStatus,
        responseCount: (selectedFeedback.responseCount || 0) + 1
      });

      setFeedbackList(prev =>
        prev.map(f =>
          f.id === selectedFeedback.id
            ? { ...f, status: updatedStatus, responseCount: (f.responseCount || 0) + 1 }
            : f
        )
      );

      fetchStats();
    } catch (err: any) {
      setResponseErrMsg(err.message || 'Failed to dispatch response');
    } finally {
      setIsSendingResponse(false);
    }
  };

  // Delete feedback
  const handleDeleteFeedback = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this feedback and its response history? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setFeedbackList(prev => prev.filter(f => f.id !== id));
        if (selectedFeedback && selectedFeedback.id === id) {
          setSelectedFeedback(null);
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !config) return;

    setSavingSettings(true);
    setSettingsSuccessMsg('');

    try {
      const res = await fetch('/api/admin/feedback-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        setSettingsSuccessMsg('Feedback settings saved successfully!');
        setTimeout(() => setSettingsSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryInput.trim() || !config) return;
    const trimmed = newCategoryInput.trim();
    if (!config.categories.includes(trimmed)) {
      setConfig({
        ...config,
        categories: [...config.categories, trimmed]
      });
    }
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (!config) return;
    setConfig({
      ...config,
      categories: config.categories.filter(c => c !== catToRemove)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
              User Voice & CSAT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-yellow-500" />
            Feedback & Reviews Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor real-time user ratings, CSAT satisfaction scores, troubleshoot viewer complaints, and reply directly via email.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'feedback'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-yellow-500" />
            Feedback Submissions
            {totalCount > 0 && (
              <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {totalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 text-yellow-500" />
            Popup & Cooldown Settings
          </button>
        </div>
      </div>

      {activeTab === 'feedback' ? (
        <>
          {/* Top Analytics Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Submissions */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Total Reviews</span>
                  <MessageCircle className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats.totalCount.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">{stats.userTypeBreakdown.registered} Registered</span>
                  <span>&bull;</span>
                  <span>{stats.userTypeBreakdown.guest} Guests</span>
                </div>
              </div>

              {/* Card 2: Average Rating */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>Average Rating</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {stats.averageRating > 0 ? stats.averageRating : '—'}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.0</span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(stats.averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Card 3: CSAT Percentage */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>CSAT Score</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats.csatPercentage}%
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Percentage of 4 & 5-star positive ratings
                </p>
              </div>

              {/* Card 4: Action Required */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>New & Pending</span>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-amber-500">
                  {stats.statusCounts.new || 0}
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{stats.statusCounts.in_progress || 0} in progress</span>
                  <span>&bull;</span>
                  <span>{stats.statusCounts.resolved || 0} resolved</span>
                </div>
              </div>
            </div>
          )}

          {/* Rating Breakdown & Filter Toolbar */}
          {stats && stats.totalCount > 0 && (
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 rounded-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Rating Distribution
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = stats.ratingCounts[stars] || 0;
                  const pct = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0;
                  return (
                    <button
                      key={stars}
                      onClick={() => setSelectedRating(selectedRating === String(stars) ? 'all' : String(stars))}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedRating === String(stars)
                          ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <span>{stars}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        </span>
                        <span className="text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search feedback text, usernames, emails, or pages..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-yellow-500 dark:text-white"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {['all', 'new', 'reviewed', 'in_progress', 'resolved', 'archived'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatus(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                      selectedStatus === st
                        ? 'bg-yellow-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All Statuses' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional dropdown filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {/* Category selector */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Categories</option>
                {config?.categories?.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* User type selector */}
              <select
                value={selectedUserType}
                onChange={(e) => {
                  setSelectedUserType(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Users (Registered & Guest)</option>
                <option value="registered">Registered Members Only</option>
                <option value="guest">Guest / Anonymous Only</option>
              </select>

              {/* Rating selector */}
              <select
                value={selectedRating}
                onChange={(e) => {
                  setSelectedRating(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Star Ratings</option>
                <option value="5">5 Stars (Excellent)</option>
                <option value="4">4 Stars (Good)</option>
                <option value="3">3 Stars (Average)</option>
                <option value="2">2 Stars (Poor)</option>
                <option value="1">1 Star (Terrible)</option>
              </select>

              {(selectedStatus !== 'all' || selectedRating !== 'all' || selectedCategory !== 'all' || selectedUserType !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedRating('all');
                    setSelectedCategory('all');
                    setSelectedUserType('all');
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-semibold ml-auto"
                >
                  Reset Filters
                </button>
              )}

              <button
                onClick={() => {
                  fetchFeedback();
                  fetchStats();
                }}
                className="text-xs p-1.5 text-slate-400 hover:text-slate-200 ml-auto flex items-center gap-1"
                title="Refresh feed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Feedback Items Feed */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
              <p className="text-sm font-medium">Loading user feedback...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No feedback submissions found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No user submissions match your current filters. Try changing or clearing filters to view more items.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all shadow-sm group"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      {/* Left: User Info & Stars */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Avatar / Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          item.isGuest
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                            : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        }`}>
                          {item.isGuest ? (
                            <UserX className="w-5 h-5 text-slate-400" />
                          ) : (
                            <span>{(item.username || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        {/* Title, rating, user badge */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {item.username || 'Anonymous User'}
                            </span>
                            {item.isGuest ? (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                Guest
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> Member
                              </span>
                            )}

                            {item.userEmail && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {item.userEmail}
                              </span>
                            )}
                          </div>

                          {/* Stars and Category Chip */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center text-yellow-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              ))}
                              <span className="ml-1.5 font-bold text-slate-700 dark:text-slate-300">
                                {item.ratingLabel}
                              </span>
                            </div>

                            <span className="text-slate-300 dark:text-slate-600">&bull;</span>

                            <span className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-600/50">
                              {item.category}
                            </span>

                            {item.pageUrl && (
                              <span className="text-slate-400 text-[11px] truncate max-w-[200px]" title={item.pageUrl}>
                                Page: {item.pageUrl}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status badge & Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                        {/* Status badge */}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </span>

                        {/* Responses pill */}
                        {item.responseCount > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {item.responseCount}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Feedback Text Body */}
                    <div className="mt-3 pl-0 md:pl-13 text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{item.feedbackText}"
                    </div>

                    {/* Footer / Quick Actions */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-3 text-slate-400">
                        {item.deviceInfo && (
                          <span className="flex items-center gap-1 text-[11px]" title={item.deviceInfo}>
                            <Monitor className="w-3.5 h-3.5" />
                            Diagnostics recorded
                          </span>
                        )}
                        {item.adminNotes && (
                          <span className="text-amber-500 dark:text-amber-400 font-medium text-[11px]">
                            Internal Notes Added
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Respond</span>
                        </button>

                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Showing page {page} of {totalPages} ({totalCount} total entries)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Settings Tab */
        config && (
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-6 max-w-4xl shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-yellow-500" />
                Feedback Popup & Trigger Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fine-tune display timing, cooldown thresholds, and notification settings so the prompt is never disruptive to users.
              </p>
            </div>

            {settingsSuccessMsg && (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            {/* General Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Enable Feedback System</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Controls whether users see the popup and floating launcher on the website.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-5 h-5 accent-yellow-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Allow Guest Feedback</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Permit unauthenticated guests to submit feedback and optionally provide their email.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.allow_guest}
                  onChange={(e) => setConfig({ ...config, allow_guest: e.target.checked })}
                  className="w-5 h-5 accent-yellow-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Admin Email Notifications</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Dispatch an automatic SMTP alert to administrators whenever a new feedback review is received.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.notify_admin_email}
                  onChange={(e) => setConfig({ ...config, notify_admin_email: e.target.checked })}
                  className="w-5 h-5 accent-yellow-500 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Trigger Mode */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Automatic Trigger Condition
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'delay', title: 'Time Delay', desc: 'Display popup after N seconds on the platform' },
                  { id: 'page_count', title: 'Page Navigation', desc: 'Display popup after user visits N pages' },
                  { id: 'manual_only', title: 'Manual Only', desc: 'Only appear when user clicks the floating button' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
                      config.trigger_type === item.id
                        ? 'bg-yellow-500/10 border-yellow-500 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{item.title}</span>
                      <input
                        type="radio"
                        name="trigger_type"
                        checked={config.trigger_type === item.id}
                        onChange={() => setConfig({ ...config, trigger_type: item.id as any })}
                        className="accent-yellow-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Delay and Page Count Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Trigger Delay (Seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={config.trigger_delay_seconds}
                  onChange={(e) => setConfig({ ...config, trigger_delay_seconds: parseInt(e.target.value) || 15 })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                />
                <span className="text-[11px] text-slate-500">Wait time before prompt if using Time Delay mode</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pages Before Prompt
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.pages_before_prompt}
                  onChange={(e) => setConfig({ ...config, pages_before_prompt: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                />
                <span className="text-[11px] text-slate-500">Number of views before prompt if using Page Navigation mode</span>
              </div>
            </div>

            {/* Cooldown Periods */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                User Cooldown Durations (Days)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    After Feedback Submitted
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={config.cooldown_days_after_submit}
                    onChange={(e) => setConfig({ ...config, cooldown_days_after_submit: parseInt(e.target.value) || 30 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[11px] text-slate-500">Default: 30 days</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    After "Maybe Later"
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={config.cooldown_days_after_later}
                    onChange={(e) => setConfig({ ...config, cooldown_days_after_later: parseInt(e.target.value) || 7 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[11px] text-slate-500">Default: 7 days</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    After Dismissed (Close 'X')
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={config.cooldown_days_after_dismiss}
                    onChange={(e) => setConfig({ ...config, cooldown_days_after_dismiss: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[11px] text-slate-500">Default: 1 day</span>
                </div>
              </div>
            </div>

            {/* Categories Management */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Configurable Feedback Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {config.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add category input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="New category name (e.g., Audio Quality)..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-500 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-yellow-500 hover:text-slate-950 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Category
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="submit"
                disabled={savingSettings}
                className="py-2.5 px-6 rounded-xl font-bold text-sm bg-yellow-500 hover:bg-yellow-400 text-slate-900 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingSettings ? 'Saving Settings...' : 'Save Feedback Settings'}
              </button>
            </div>
          </form>
        )
      )}

      {/* Detail & Response Drawer */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full">
                  Feedback #{selectedFeedback.id.slice(-6)}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedFeedback.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* User Profile Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base ${
                    selectedFeedback.isGuest
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                  }`}>
                    {selectedFeedback.isGuest ? (
                      <UserX className="w-5 h-5" />
                    ) : (
                      <span>{(selectedFeedback.username || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedFeedback.username || 'Anonymous Guest'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {selectedFeedback.userEmail ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-yellow-500" />
                          <span>{selectedFeedback.userEmail}</span>
                        </>
                      ) : (
                        <span>No email provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-400">Status:</label>
                  <select
                    value={selectedFeedback.status}
                    disabled={isUpdatingStatus}
                    onChange={(e) => handleStatusChange(selectedFeedback.id, e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Rating & Submission Overview */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Review Summary</div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${
                            s <= selectedFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                      <span className="ml-2 font-bold text-sm text-slate-800 dark:text-slate-200">
                        {selectedFeedback.ratingLabel} ({selectedFeedback.rating}/5)
                      </span>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20">
                      {selectedFeedback.category}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    "{selectedFeedback.feedbackText}"
                  </div>
                </div>
              </div>

              {/* Technical Telemetry & Context */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnostic Context</div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Page Submitted:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{selectedFeedback.pageUrl || 'N/A'}</span>
                  </div>
                  {selectedFeedback.deviceInfo && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                      <span className="text-slate-500 shrink-0">Client Telemetry:</span>
                      <span className="font-mono text-[11px] text-slate-400 text-right truncate max-w-xs">
                        {selectedFeedback.deviceInfo}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Internal Private Admin Notes
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="text-xs font-bold text-yellow-500 hover:text-yellow-400"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add private staff notes (e.g., Contacted user, checked CDN logs, ticket #492)..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>

              {/* Responses History Thread */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Response History</span>
                  <span className="text-slate-500">{responses.length} message(s)</span>
                </div>

                {responses.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    No responses have been dispatched to this user yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {responses.map((resp) => (
                      <div
                        key={resp.id}
                        className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {resp.adminName}
                          </span>
                          <div className="flex items-center gap-2">
                            {resp.emailSent ? (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Email Dispatched
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Internal Log</span>
                            )}
                            <span className="text-slate-400">
                              {new Date(resp.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {resp.responseText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleSendResponse} className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-yellow-500" />
                    Compose Official Response
                  </label>
                  {selectedFeedback.userEmail && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="accent-yellow-500 rounded"
                      />
                      <span>Send email via SMTP</span>
                    </label>
                  )}
                </div>

                {responseSuccessMsg && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{responseSuccessMsg}</span>
                  </div>
                )}

                {responseErrMsg && (
                  <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{responseErrMsg}</span>
                  </div>
                )}

                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={`Write your response to ${selectedFeedback.username || 'this user'}. If email is enabled, it will be formatted nicely with their original rating & feedback.`}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-yellow-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Signing as: <strong className="text-slate-300">{user?.name || 'WatchWDS Support'}</strong>
                  </span>

                  <button
                    type="submit"
                    disabled={isSendingResponse || !responseText.trim()}
                    className="py-2.5 px-5 rounded-xl font-bold text-xs bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingResponse ? 'Sending...' : 'Send Response'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
