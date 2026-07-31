import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore, useFeatureStore, useSettingsStore, useThemeStore, useUsersStore, useMatchStore, usePurchaseStore, useBlogStore, useCommentStore, useCreatorStore } from '../store';
import { Navigate, Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Settings, Video, Shield, Activity, Plus, Search, Moon, Sun, Bell,
  Calendar, TrendingUp, DollarSign, Euro, PoundSterling, BarChart2, MessageSquare, Briefcase,
  MapPin, CheckCircle, Clock, LogOut, LayoutDashboard, Menu, X, Sliders, Eye, User, Newspaper, Image, Mail, Gift, CreditCard, Zap,
  UserPlus, Award, PlayCircle, Ban, Trash2, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';

import { AdminMatches } from './admin/AdminMatches';
import { NewMatch } from './admin/NewMatch';
import { Categories } from './admin/Categories';
import { AdminClubs } from './admin/AdminClubs';

import { AdminCreators } from './admin/AdminCreators';
import { CreatorDetail } from './admin/CreatorDetail';

import { AdminBlogPosts } from './admin/AdminBlogPosts';
import { AdminBlogCategories } from './admin/AdminBlogCategories';
import { AdminMedia } from './admin/AdminMedia';
import { AdminSettings } from './admin/AdminSettings';
import { AdminTransactions } from './admin/AdminTransactions';
import { AdminTasks } from './admin/AdminTasks';
import { AdminPlans } from './admin/AdminPlans';
import { AdManager } from './admin/AdManager';
import { StudioManagement } from './admin/StudioManagement';
import { EmailManagement } from './admin/EmailManagement';
import { CacheManagement } from './admin/CacheManagement';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { Image as ImageIcon } from 'lucide-react';

export function AdminDashboard() {
  const { user, setLogoutModalOpen } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { users = [], setUsers } = useUsersStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              setUsers(data);
            }
          })
          .catch(console.error);
      }
    }
  }, [user]);

  // Dynamic search data
  const searchData = [
    ...users.map(u => ({
      id: `user-${u.id}`,
      type: 'user',
      title: u.name || 'Unknown User',
      subtitle: u.email || 'No email',
      icon: Users,
      path: '/admin/users'
    })),
    { id: 'match-402', type: 'match', title: 'Match #402', subtitle: 'Arena A - Completed', icon: Video, path: '/admin/matches' },
    { id: 'match-403', type: 'match', title: 'Match #403', subtitle: 'Arena B - Live', icon: Video, path: '/admin/matches' },
    { id: 'feature-1', type: 'feature', title: 'Wallet System', subtitle: 'Feature Toggle', icon: Settings, path: '/admin/features' },
  ];

  const filteredResults = searchData.filter(item =>
    (item.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (item.subtitle || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/matches', icon: Video, label: 'Matches' },
    { path: '/admin/media', icon: ImageIcon, label: 'Media' },
    { path: '/admin/blog', icon: Newspaper, label: 'Blog' },
    { path: '/admin/plans', icon: CreditCard, label: 'Subscriptions' },
    { path: '/admin/clubs', icon: Building2, label: 'Partner Clubs' },
    { path: '/admin/ads', icon: DollarSign, label: 'Ad Manager' },
    { path: '/admin/tasks', icon: Gift, label: 'Missions' },
    { path: '/admin/creators', icon: Briefcase, label: 'Creators' },
    { path: '/admin/studio', icon: Video, label: 'Studio Manager' },
    { path: '/admin/email-system', icon: Mail, label: 'Email System' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
    { path: '/admin/transactions', icon: DollarSign, label: 'Transactions' },
    { path: '/admin/cache', icon: Zap, label: 'Performance Cache' },
  ];

  const handleLogout = () => {
    setLogoutModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-white font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-20 flex items-center px-8 border-b border-slate-200 dark:border-slate-700 shrink-0 justify-between">
          <div>
            <div className="text-2xl font-black tracking-tighter">
              <span className="text-slate-900 dark:text-white">Watch</span>
              <span className="text-yellow-500">WDS</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-0.5">Admin Console</div>
          </div>
          <button className="lg:hidden text-slate-500 dark:text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 shrink-0">
          <button
            onClick={() => navigate('/admin/matches/new')}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Match
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                    ? 'bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white shadow-sm relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-yellow-500 before:rounded-r-full'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-yellow-500' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0 space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden sm:block w-48 md:w-96 z-50">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search matches, users, or data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
              />

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  {filteredResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto py-2">
                      {filteredResults.map((result) => {
                        const Icon = result.icon;
                        return (
                          <Link
                            key={`${result.type}-${result.id}`}
                            to={result.path}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={() => {
                              setSearchQuery('');
                              setIsSearchFocused(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{result.title}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="View Site">
              <Eye className="w-5 h-5" />
            </Link>
            <button onClick={toggleDarkMode} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <NotificationDropdown />
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            <div className="relative">
              <button
                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{user.role}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-lg">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isAdminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { setIsAdminDropdownOpen(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<AdminOverview />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/creators" element={<AdminCreators />} />
              <Route path="/creators/:id" element={<CreatorDetail />} />
              <Route path="/media" element={<AdminMedia />} />
              <Route path="/blog" element={<AdminBlogPosts />} />
              <Route path="/blog/categories" element={<AdminBlogCategories />} />
              <Route path="/matches" element={<AdminMatches />} />
              <Route path="/matches/new" element={<NewMatch />} />
              <Route path="/matches/:id/edit" element={<NewMatch />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/features" element={<AdminFeatures />} />
              <Route path="/tasks" element={<AdminTasks />} />
              <Route path="/plans" element={<AdminPlans />} />
              <Route path="/clubs" element={<AdminClubs />} />
              <Route path="/ads" element={<AdManager />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/transactions" element={<AdminTransactions />} />
              <Route path="/email-system" element={<EmailManagement />} />
              <Route path="/studio" element={<StudioManagement />} />
              <Route path="/cache" element={<CacheManagement />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminOverview() {
  const { currency, currencySymbol } = useSettingsStore();
  const { users = [] } = useUsersStore();
  const { matches = [] } = useMatchStore();
  const { posts = [] } = useBlogStore();
  const { comments = [] } = useCommentStore();

  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchTxns = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/transactions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error('Failed to fetch admin dashboard overview transactions:', err);
      }
    };
    fetchTxns();
  }, []);

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'USD': default: return '$';
    }
  };

  const getCurrencyIcon = (curr: string) => {
    switch (curr) {
      case 'EUR': return Euro;
      case 'GBP': return PoundSterling;
      case 'USD': default: return DollarSign;
    }
  };

  // Calculate statistics dynamically
  const totalUsers = users.length;
  const newUsersCount = users.filter(u => new Date(u.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || Math.floor(totalUsers * 0.1) || 1;

  const liveCount = matches.filter(m => m.status === 'live').length;
  const upcomingCount = matches.filter(m => m.status === 'upcoming').length;
  const activeMatchesCount = matches.length;

  // Revenue calculates the total amount of completed gateway transactions on the platform
  const completedTxns = transactions.filter(t => t.status === 'completed' || t.status === 'success');
  const totalRevenue = completedTxns
    .filter(t => ['top_up', 'watch', 'embed', 'plan'].includes(t.type))
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const contentPurchases = completedTxns.filter(t => ['watch', 'embed', 'plan'].includes(t.type));
  const purchasesCount = contentPurchases.length;

  // Engagement starts at 84 and scales with the number of matches views and registered users
  const totalMatchViews = matches.reduce((acc, m) => acc + (m.views || 0), 0);
  const totalBlogViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalViews = totalMatchViews + totalBlogViews;

  const baseEngagement = 84;
  const engagementValue = Math.min(99, Math.max(50, baseEngagement + (totalViews > 0 ? Math.min(10, Math.floor(totalViews / 500)) : 0) + (comments.length > 0 ? Math.min(5, Math.floor(comments.length / 5)) : 0)));

  const stats = [
    { label: 'Total Users', value: totalUsers.toLocaleString(), trend: '+12%', icon: Users, color: 'border-l-yellow-500', subtitle: `${newUsersCount} logged this week` },
    { label: 'Active Matches', value: activeMatchesCount.toString(), trend: '+5%', icon: Video, color: 'border-l-green-500', subtitle: `${liveCount} broadcasting now` },
    { label: 'Total Revenue', value: `${getCurrencySymbol(currency)}${totalRevenue.toLocaleString()}`, trend: '+18%', icon: getCurrencyIcon(currency), color: 'border-l-yellow-500', subtitle: `${purchasesCount} live purchase(s)` },
    { label: 'Engagement Index', value: `${engagementValue}%`, trend: '+2%', icon: Activity, color: 'border-l-blue-500', subtitle: `${totalViews.toLocaleString()} platform views` },
  ];

  const recentUsers = users.slice(-3).reverse().map(u => ({
    name: u.name,
    email: u.email,
    role: u.role.toUpperCase(),
    time: 'Just now',
    roleColor: u.role === 'admin' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
      u.role === 'creator' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
        u.role === 'operator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }));

  // Top Performing Content Calculators
  const mostWatchedMatch = useMemo(() => {
    return matches.length > 0 ? [...matches].sort((a, b) => (b.views || 0) - (a.views || 0))[0] : null;
  }, [matches]);

  const mostEngagingMatch = useMemo(() => {
    if (matches.length === 0) return null;
    return matches.map(m => {
      const matchComments = comments.filter(c => c.matchId === m.id).length;
      return { ...m, commentCount: matchComments };
    }).sort((a, b) => b.commentCount - a.commentCount)[0];
  }, [matches, comments]);

  const mostViewedBlog = useMemo(() => {
    return posts.length > 0 ? [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))[0] : null;
  }, [posts]);

  const mostActiveUser = useMemo(() => {
    if (users.length === 0) return null;
    return [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0];
  }, [users]);

  // Views Over Time chart data
  const viewsChartData = useMemo(() => [
    { name: 'Jan', matches: Math.floor(totalMatchViews * 0.1), blogs: Math.floor(totalBlogViews * 0.12) },
    { name: 'Feb', matches: Math.floor(totalMatchViews * 0.15), blogs: Math.floor(totalBlogViews * 0.18) },
    { name: 'Mar', matches: Math.floor(totalMatchViews * 0.2), blogs: Math.floor(totalBlogViews * 0.15) },
    { name: 'Apr', matches: Math.floor(totalMatchViews * 0.25), blogs: Math.floor(totalBlogViews * 0.22) },
    { name: 'May', matches: Math.floor(totalMatchViews * 0.3), blogs: Math.floor(totalBlogViews * 0.33) },
  ], [totalMatchViews, totalBlogViews]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            Dashboard Hub
            <span className="text-xs bg-yellow-500/10 text-yellow-500 py-1 px-2.5 rounded-full font-bold uppercase tracking-widest border border-yellow-500/20">
              Live Overview
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Welcome back to Watch WDS base of operations. Here is a real-time summary of today's engagement metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
          <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
          <span>Last checked: Just now</span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm border-l-4 ${stat.color} hover:shadow-md transition-all duration-300 hover:translate-y-[-1px]`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/60 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  {stat.trend}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">{stat.subtitle}</div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visualization + Spotlights Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* CHARTS CONTAINER (Left Column) */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wider">Audience & Reach Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Comparing monthly views of premium interactive matches vs platform articles.</p>
              </div>
              <div className="flex gap-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded-sm" /> Match Streaming</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-purple-500 rounded-sm" /> Blog Journalism</span>
              </div>
            </div>

            <div className="h-80 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsChartData}>
                  <defs>
                    <linearGradient id="matchesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blogsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      background: '#1e293b',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Area type="monotone" dataKey="matches" name="Match Views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#matchesGrad)" />
                  <Area type="monotone" dataKey="blogs" name="Blog Views" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#blogsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health Status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-emerald-500" />
                Operational Telemetry
              </h3>
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                  <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-400 uppercase tracking-wider">Web API Engine</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Active</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                  <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-400 uppercase tracking-wider">Caching Layers</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Level 1/2/3 Active</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse shrink-0"></div>
                  <div className="min-w-0 flex-1 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-400 uppercase tracking-wider">Lite DB Replication</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Operational</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top User Spotlight */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Top User Spotlight
                </h3>
              </div>
              {mostActiveUser ? (
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                    {mostActiveUser.avatar ? (
                      <img src={mostActiveUser.avatar} alt={mostActiveUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-black bg-yellow-500/10 text-yellow-500">
                        {(mostActiveUser.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{mostActiveUser.name}</div>
                    <div className="text-[11px] font-mono font-medium text-yellow-500 mt-0.5">{currencySymbol}{(mostActiveUser.balance || 0).toLocaleString()} Wallet Balance</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono">No users found in database.</p>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT SPOTLIGHT BEN-TO GRID (Right Column) */}
        <div className="space-y-6 sm:space-y-8">

          {/* Top Video Match */}
          <div className="bg-indigo-600 dark:bg-indigo-950/40 rounded-2xl p-6 border border-indigo-500/35 text-white shadow-sm flex flex-col justify-between h-[155px] hover:scale-[1.01] transition-transform">
            <h3 className="font-bold text-indigo-100 text-xs uppercase tracking-wider flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-indigo-300" />
              Most Watched Broadcast
            </h3>
            {mostWatchedMatch ? (
              <div className="mt-3">
                <h4 className="text-lg font-black tracking-tight line-clamp-1">{mostWatchedMatch.title}</h4>
                <div className="flex items-center justify-between text-xs mt-3">
                  <span className="text-indigo-200 font-mono">{new Date(mostWatchedMatch.date).toLocaleDateString()}</span>
                  <span className="font-mono font-bold flex items-center gap-1.5 bg-indigo-500/50 px-2.5 py-1 rounded-lg">
                    <Eye className="w-3.5 h-3.5" /> {(mostWatchedMatch.views || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-indigo-200 font-mono mt-2">No active viewership recorded.</p>
            )}
          </div>

          {/* Top Engaging Match */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-[155px] hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Audience Engagement High
            </h3>
            {mostEngagingMatch ? (
              <div className="mt-3">
                <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">{mostEngagingMatch.title}</h4>
                <div className="flex items-center justify-between text-xs mt-3">
                  <span className="text-slate-400 font-mono flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-md">
                    Comments: <span className="text-emerald-500 font-black">{(mostEngagingMatch as any).commentCount || 0}</span>
                  </span>
                  <span className="font-mono text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {(mostEngagingMatch.views || 0).toLocaleString()} views
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-mono mt-2">No comment stream recorded.</p>
            )}
          </div>

          {/* Top Popular Article */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-[155px] hover:border-slate-350 dark:hover:border-slate-600 transition-colors">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-purple-500" />
              Highest Read Article
            </h3>
            {mostViewedBlog ? (
              <div className="mt-3">
                <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">{mostViewedBlog.title}</h4>
                <div className="flex items-center justify-between text-xs mt-3">
                  <span className="text-slate-405 font-mono truncate max-w-[120px]">{mostViewedBlog.excerpt || 'Sports update'}</span>
                  <span className="font-mono font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-lg shrink-0">
                    <Eye className="w-3.5 h-3.5" /> {(mostViewedBlog.views || 0).toLocaleString()} views
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-mono mt-2">No article views reported.</p>
            )}
          </div>

        </div>
      </div>

      {/* Admin Tools Grid */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-yellow-500" />
          Interactive Operator Terminals
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link to="/admin/users" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-[2px] group block">
            <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Role Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Assign permissions, roles, and review custom admin details.</p>
          </Link>
          <Link to="/admin/creators" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-[2px] group block">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Venue Operators</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Audit system venue managers, locations, and streams broadcast.</p>
          </Link>
          <Link to="/admin/cache" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-[2px] group block">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Cache & TTL Engine</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Warm, invalidate, or monitor caching response performance latency.</p>
          </Link>
        </div>
      </div>

      {/* Auditing and Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 border-t border-slate-200 dark:border-slate-800 pt-8">

        {/* Recent Signup Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-500" />
                Latest Registrations
              </h2>
              <Link to="/admin/users" className="text-xs font-bold text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 font-mono">
                View Accounts →
              </Link>
            </div>
            <div className="space-y-2">
              {recentUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{u.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${u.roleColor} hidden sm:block`}>{u.role}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{u.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action center required & feeds */}
        <div className="space-y-6 sm:space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Moderate Queue</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400 dark:text-slate-505" />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Unapproved Feedback</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-xs font-mono">0 Queue</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-400 dark:text-slate-505" />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Creator Requests</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-xs font-mono">0 Queue</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400 dark:text-slate-505" />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Operator Approvals</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-xs font-mono">0 Queue</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Feed Activities</h2>
              <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500 animate-pulse" />
            </div>
            <div className="relative pl-4 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"></div>
                <div className="font-bold text-sm text-slate-900 dark:text-white text-xs">Live Telemetry Synchronized</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Origin and multi-layer cache pop simulator matches.</div>
                <div className="text-[9px] font-bold text-slate-400 mt-1 font-mono">10:45 AM</div>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-350 dark:border-slate-600"></div>
                <div className="font-bold text-sm text-slate-900 dark:text-white text-xs">Match Feed Updated</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Final metrics successfully calculated from active streams.</div>
                <div className="text-[9px] font-bold text-slate-400 mt-1 font-mono">09:12 AM</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function AdminUsers() {
  const { users = [], updateUser, deleteUser } = useUsersStore();
  const [editingUser, setEditingUser] = useState<any>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [userToConfirmAction, setUserToConfirmAction] = useState<{ user: any, action: 'ban' | 'unban' | 'delete' } | null>(null);

  const handleToggleBan = async (user: any) => {
    setUserToConfirmAction({
      user,
      action: user.status === 'banned' ? 'unban' : 'ban'
    });
  };

  const handleDeleteUser = async (user: any) => {
    setUserToConfirmAction({ user, action: 'delete' });
  };

  const confirmAction = async () => {
    if (!userToConfirmAction) return;
    const { user, action } = userToConfirmAction;

    if (action === 'ban' || action === 'unban') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${user.id}/${action}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          updateUser(user.id, { status: action === 'ban' ? 'banned' : 'active' });
        }
      } catch (e) { console.error('Failed to toggle ban status'); }
    } else if (action === 'delete') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          deleteUser(user.id);
        }
      } catch (e) { console.error('Failed to delete user'); }
    }

    setUserToConfirmAction(null);
  };


  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "ID,Name,Email,Role,Status,Balance\n"
      + users.map(u => `${u.id},${u.name},${u.email},${u.role},${u.status},${u.balance || 0}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "watchwds_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingUser({ ...editingUser, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/users/${editingUser.id}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          status: editingUser.status,
          balance: editingUser.balance || 0,
          verified: editingUser.verified
        })
      });
      // Also update local state
      updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        status: editingUser.status,
        balance: editingUser.balance || 0,
        verified: editingUser.verified,
        avatar: editingUser.avatar
      });
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Users</h1>
        <button
          onClick={handleExportData}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded-xl transition-colors self-start sm:self-auto"
        >
          Export Data
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 shrink-0 overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          (u.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {u.name}
                          {u.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                        u.role === 'creator' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                          u.role === 'operator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${u.status === 'active' ? 'text-green-600 dark:text-green-400' :
                        u.status === 'suspended' ? 'text-orange-600 dark:text-orange-400' :
                          u.status === 'banned' ? 'text-red-600 dark:text-red-400' :
                            'text-slate-500 dark:text-slate-400'
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' :
                          u.status === 'suspended' ? 'bg-orange-500' :
                            u.status === 'banned' ? 'bg-red-500' :
                              'bg-slate-400'
                        }`}></div>
                      {u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : ''}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleBan(u)}
                        className={`${u.status === 'banned' ? 'text-green-500 hover:text-green-600' : 'text-orange-500 hover:text-orange-600'} transition-colors`}
                        title={u.status === 'banned' ? 'Unban User' : 'Ban User'}
                      >
                        {u.status === 'banned' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit User Account</h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-6">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {editingUser.avatar ? (
                    <img src={editingUser.avatar} alt={editingUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Wallet Balance</label>
                <input
                  type="number"
                  value={editingUser.balance || 0}
                  onChange={(e) => setEditingUser({ ...editingUser, balance: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={editingUser.verified || false}
                  onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })}
                  className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="verified" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Verified User
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => alert(`Message sent to ${editingUser.email}`)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 px-4 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <MessageSquare className="w-5 h-5" /> Send Message
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-3 shrink-0">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {userToConfirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 pb-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${userToConfirmAction.action === 'delete' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'}`}>
                {userToConfirmAction.action === 'delete' ? <Trash2 className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {userToConfirmAction.action === 'delete' ? 'Delete User?' :
                  userToConfirmAction.action === 'ban' ? 'Ban User?' : 'Unban User?'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Are you sure you want to {userToConfirmAction.action} <strong>{userToConfirmAction.user.name}</strong>?
                {userToConfirmAction.action === 'delete' && ' This action cannot be undone.'}
              </p>
            </div>
            <div className="p-6 pt-4 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setUserToConfirmAction(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 font-bold rounded-xl transition-colors text-white ${userToConfirmAction.action === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function AdminFeatures() {
  const { features, toggleFeature } = useFeatureStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feature Toggles</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {features.map((feature) => (
            <div key={feature.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white capitalize">{feature.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {feature.description}
                </p>
              </div>
              <button
                onClick={() => toggleFeature(feature.slug)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${feature.is_active === 1 ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feature.is_active === 1 ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
