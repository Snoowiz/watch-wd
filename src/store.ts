import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'creator' | 'operator';
  points: number;
  avatar: string | null;
  status: string;
  phone?: string;
  dob?: string;
  gender?: string;
  planId?: number;
  verified?: boolean;
  creatorStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  channelName?: string;
  channelDescription?: string;
  subscribedChannels?: number[];
  subscribedMatches?: (string | number)[];
  subscribedCategories?: (string | number)[];
  createdAt: string;
}

export interface DownloadLink {
  id: number;
  creatorId: number | 'all';
  title: string;
  url: string;
  createdAt: string;
  downloadedBy: number[]; // Array of user IDs who downloaded it
}

export interface CreatorContent {
  id: number;
  creatorId: number;
  creatorName: string;
  title: string;
  slug: string;
  description: string; // Used for Embeds/Short Description
  content: string; // Used for Main Article Content
  thumbnail: string;
  url: string;
  type: 'youtube' | 'vimeo' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  price: number;
  access: 'free' | 'paid';
  categoryId: number;
  categories?: number[]; // Support for multiple categories if needed
  submittedAt: string;
  seo?: {
    keywords: string;
    metaDescription: string;
  };
  scheduledDate?: string;
  liveCommenting?: boolean;
  commentAlignment?: 'left' | 'center' | 'right';
}

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number | null;
  actor_name: string | null;
  actor_avatar: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface Activity {
  id: number;
  userId: number;
  type: 'login' | 'download' | 'submission' | 'purchase' | 'login_as';
  description: string;
  timestamp: string;
}

interface CreatorState {
  downloadLinks: DownloadLink[];
  creatorContent: CreatorContent[];
  activities: Activity[];
  addDownloadLink: (link: Omit<DownloadLink, 'id' | 'createdAt' | 'downloadedBy'>) => void;
  markAsDownloaded: (linkId: number, userId: number) => void;
  submitContent: (content: Omit<CreatorContent, 'id' | 'submittedAt' | 'status'>) => void;
  updateContentStatus: (id: number, status: CreatorContent['status'], reason?: string) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
}

export const useCreatorStore = create<CreatorState>()(
  persist(
    (set) => ({
      downloadLinks: [],
      creatorContent: [],
      activities: [],
      addDownloadLink: (link) => set((state) => ({
        downloadLinks: [
          ...state.downloadLinks,
          { ...link, id: Date.now(), createdAt: new Date().toISOString(), downloadedBy: [] }
        ]
      })),
      markAsDownloaded: (linkId, userId) => set((state) => ({
        downloadLinks: state.downloadLinks.map(l => 
          l.id === linkId ? { ...l, downloadedBy: [...new Set([...l.downloadedBy, userId])] } : l
        ),
        activities: [
          ...state.activities,
          { 
            id: Date.now() + 1, 
            userId, 
            type: 'download', 
            description: `Downloaded file: ${state.downloadLinks.find(dl => dl.id === linkId)?.title || 'Unknown'}`,
            timestamp: new Date().toISOString()
          }
        ]
      })),
      submitContent: (content) => set((state) => ({
        creatorContent: [
          ...state.creatorContent,
          { ...content, id: Date.now(), submittedAt: new Date().toISOString(), status: 'pending' }
        ],
        activities: [
          ...state.activities,
          { 
            id: Date.now() + 2, 
            userId: content.creatorId, 
            type: 'submission', 
            description: `Submitted content: ${content.title}`,
            timestamp: new Date().toISOString()
          }
        ]
      })),
      updateContentStatus: (id, status, reason) => set((state) => ({
        creatorContent: state.creatorContent.map(c => c.id === id ? { ...c, status, rejectionReason: reason } : c)
      })),
      addActivity: (activity) => set((state) => ({
        activities: [
          ...state.activities,
          { ...activity, id: Date.now(), timestamp: new Date().toISOString() }
        ]
      })),
    }),
    { name: 'creator-storage' }
  )
);

interface NotificationState {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: any) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  (set) => ({
    notifications: [],
    fetchNotifications: async () => {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') return;
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            set({ notifications: Array.isArray(data) ? data : [] });
          } else {
            console.debug('Failed to fetch notifications: Expected JSON but got', contentType);
          }
        }
      } catch (err) {
        // Safe logging of network/abort errors
        if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
          console.debug('Notification fetch error:', err.message);
        }
      }
    },
    markAsRead: async (id) => {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') return;
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n)
        }));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    },
    markAllAsRead: async () => {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') return;
      try {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, is_read: 1 }))
        }));
      } catch (err) {
        console.error('Failed to mark all notifications as read', err);
      }
    },
    addNotification: async (notification: any) => {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') return;
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(notification)
        });
        // We can just fetch them again to get the proper format
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            set({ notifications: Array.isArray(data) ? data : [] });
          }
        }
      } catch (err) {
        console.error('Failed to add notification', err);
      }
    }
  })
);

interface SavedMatchState {
  savedMatches: number[];
  fetchSavedMatches: () => Promise<void>;
  saveMatch: (matchId: number) => Promise<void>;
  unsaveMatch: (matchId: number) => Promise<void>;
}

export const useSavedMatchesStore = create<SavedMatchState>()(
  (set, get) => ({
    savedMatches: [],
    fetchSavedMatches: async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/saved-matches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            const numericData = Array.isArray(data) 
              ? data.map(val => Number(val)).filter(n => !isNaN(n)) 
              : [];
            set({ savedMatches: numericData });
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
          console.error('Saved matches fetch error:', err.message);
        }
      }
    },
    saveMatch: async (matchId) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await fetch(`/api/matches/${matchId}/save`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        set((state) => ({ savedMatches: [...state.savedMatches, matchId] }));
      } catch (err) {
        console.error('Failed to save match', err);
      }
    },
    unsaveMatch: async (matchId) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await fetch(`/api/matches/${matchId}/save`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        set((state) => ({ savedMatches: state.savedMatches.filter(id => id !== matchId) }));
      } catch (err) {
        console.error('Failed to pull saved match', err);
      }
    }
  })
);

interface AuthState {
  user: User | null;
  originalUser: User | null; // For "Log in as" functionality
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  isLogoutModalOpen: boolean;
  setLogoutModalOpen: (open: boolean) => void;
  loginAs: (user: User) => void;
  revertLoginAs: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  originalUser: null,
  token: localStorage.getItem('token'),
  isLogoutModalOpen: false,
  setLogoutModalOpen: (open) => set({ isLogoutModalOpen: open }),
  setAuth: (user, token) => {
    if (user && user.email === 'mayycutee1@gmail.com') {
      user.role = 'admin';
    }
    localStorage.setItem('token', token);
    set({ user, token });
  },
  updateUser: (updates) => set((state) => {
    if (state.user && state.user.email === 'mayycutee1@gmail.com') {
      updates.role = 'admin';
    }
    return { user: state.user ? { ...state.user, ...updates } : null };
  }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, originalUser: null, token: null });
  },
  loginAs: (user) => set((state) => ({
    originalUser: state.originalUser || state.user,
    user: user
  })),
  revertLoginAs: () => set((state) => ({
    user: state.originalUser,
    originalUser: null
  })),
}));

interface Feature {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: number;
}

interface FeatureState {
  features: Feature[];
  setFeatures: (features: Feature[]) => void;
  isFeatureActive: (slug: string) => boolean;
  toggleFeature: (slug: string) => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      features: [
        { id: 1, name: 'Wallet System', slug: 'wallet_system', description: 'Enable digital wallet for users to deposit and withdraw funds.', is_active: 1 },
        { id: 2, name: 'Live Betting', slug: 'live_betting', description: 'Allow users to place bets during live matches.', is_active: 1 },
        { id: 3, name: 'Referral Program', slug: 'referral_program', description: 'Reward users for inviting friends to the platform.', is_active: 0 },
        { id: 4, name: 'Dark Mode', slug: 'dark_mode', description: 'Allow users to switch between light and dark themes.', is_active: 1 },
      ],
      setFeatures: (features) => set({ features }),
      isFeatureActive: (slug) => {
        const features = get().features;
        if (!Array.isArray(features)) return false;
        const feature = features.find(f => f.slug === slug);
        return feature ? feature.is_active === 1 : false;
      },
      toggleFeature: (slug) => set((state) => ({
        features: state.features.map(f => 
          f.slug === slug ? { ...f, is_active: f.is_active === 1 ? 0 : 1 } : f
        )
      }))
    }),
    {
      name: 'feature-storage',
    }
  )
);

interface PaymentSettings {
  stripe: {
    publicKey: string;
    secretKey: string;
    isTestMode: boolean;
    enabled: boolean;
    merchantCurrency?: string;
  };
  paypal: {
    clientId: string;
    secret: string;
    isTestMode: boolean;
    enabled: boolean;
    merchantCurrency?: string;
  };
  paystack?: {
    publicKey: string;
    secretKey: string;
    isTestMode: boolean;
    enabled: boolean;
    merchantCurrency?: string;
  };
}

interface HomepageSettings {
  featuresSectionEnabled: boolean;
  latestNewsEnabled: boolean;
}

interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterHandle: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  robotsTxt: string;
}

interface SettingsState {
  currency: string;
  setCurrency: (currency: string) => void;
  pointsPerCurrencyUnit: number;
  setPointsPerCurrencyUnit: (points: number) => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  pointsUsages: string[];
  setPointsUsages: (usages: string[]) => void;
  paymentSettings: PaymentSettings;
  setPaymentSettings: (settings: PaymentSettings) => void;
  homepageSettings: HomepageSettings;
  setHomepageSettings: (settings: HomepageSettings) => void;
  seoSettings: SEOSettings;
  setSeoSettings: (settings: SEOSettings) => void;
  platformName: string;
  setPlatformName: (name: string) => void;
  favicon: string;
  setFavicon: (favicon: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'GBP',
      setCurrency: (currency) => set({ currency }),
      pointsPerCurrencyUnit: 100,
      setPointsPerCurrencyUnit: (points) => set({ pointsPerCurrencyUnit: points }),
      currencySymbol: '£',
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      pointsUsages: ['Unlocking Matches', 'Store'],
      setPointsUsages: (usages) => set({ pointsUsages: usages }),
      paymentSettings: {
        stripe: { publicKey: '', secretKey: '', isTestMode: true, enabled: false },
        paypal: { clientId: '', secret: '', isTestMode: true, enabled: false },
        paystack: { publicKey: '', secretKey: '', isTestMode: true, enabled: false },
      },
      setPaymentSettings: (settings) => set({ paymentSettings: settings }),
      homepageSettings: {
        featuresSectionEnabled: true,
        latestNewsEnabled: true
      },
      setHomepageSettings: (settings) => set({ homepageSettings: settings }),
      seoSettings: {
        metaTitle: 'WD Sportz - Live Sports Streaming',
        metaDescription: 'Watch live sports, follow your favorite creators, and join the community.',
        metaKeywords: 'sports, streaming, live matches, community',
        ogTitle: 'WD Sportz',
        ogDescription: 'Experience the best live sports streaming platform.',
        ogImage: '',
        twitterHandle: '@wdsportz',
        googleAnalyticsId: '',
        googleTagManagerId: '',
        robotsTxt: 'User-agent: *\nAllow: /'
      },
      setSeoSettings: (settings) => set({ seoSettings: settings }),
      platformName: 'WDSportz',
      setPlatformName: (name) => set({ platformName: name }),
      favicon: '/favicon.ico',
      setFavicon: (favicon) => set({ favicon: favicon }),
    }),
    {
      name: 'settings-storage',
    }
  )
);

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDarkMode: boolean;
  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      isDarkMode: false,
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      toggleDarkMode: () => set((state) => {
        const nextDark = !state.isDarkMode;
        return { isDarkMode: nextDark, theme: nextDark ? 'dark' : 'light' };
      }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

interface UsersState {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string | number, updates: Partial<User>) => void;
  deleteUser: (id: string | number) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updates) => set((state) => ({
    users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  deleteUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),
}));

export interface Advertisement {
  id: number;
  campaignName: string;
  status: 'active' | 'inactive';
  type: 'video' | 'html' | 'embed' | 'affiliate' | 'adsense';
  code: string;
  destinationUrl?: string;
  startDate?: string;
  endDate?: string;
  priority: number;
  weight: number;
  targetAll: boolean;
  targetMatches: number[];
  targetCategories: number[];
  targetLeagues: number[];
  targetClubs: number[];
  skipTimer: number; // 0 for no skip
}

export interface AdImpression {
  id: number;
  adId: number;
  matchId?: number;
  userId?: number;
  clicked: boolean;
  timestamp: string;
}

interface AdState {
  ads: Advertisement[];
  impressions: AdImpression[];
  adIntervalMinutes: number;
  setAdIntervalMinutes: (minutes: number) => void;
  addAd: (ad: Omit<Advertisement, 'id'>) => void;
  updateAd: (id: number, updates: Partial<Advertisement>) => void;
  deleteAd: (id: number) => void;
  recordImpression: (adId: number, matchId?: number, userId?: number) => void;
  recordClick: (impressionId: number) => void;
}

export const useAdStore = create<AdState>()(
  persist(
    (set) => ({
      ads: [],
      impressions: [],
      adIntervalMinutes: 15,
      setAdIntervalMinutes: (minutes) => set({ adIntervalMinutes: minutes }),
      addAd: (ad) => set((state) => ({ ads: [...state.ads, { ...ad, id: Date.now() }] })),
      updateAd: (id, updates) => set((state) => ({
        ads: state.ads.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      deleteAd: (id) => set((state) => ({
        ads: state.ads.filter(a => a.id !== id)
      })),
      recordImpression: (adId, matchId, userId) => set((state) => ({
        impressions: [...state.impressions, { id: Date.now(), adId, matchId, userId, clicked: false, timestamp: new Date().toISOString() }]
      })),
      recordClick: (impressionId) => set((state) => ({
        impressions: state.impressions.map(i => i.id === impressionId ? { ...i, clicked: true } : i)
      }))
    }),
    { name: 'ad-storage' }
  )
);

export interface Match {
  id: number;
  title: string;
  slug: string;
  date: string;
  price: number; // Price in points
  embedPrice: number; // Price for creators to embed
  status: 'upcoming' | 'live' | 'completed';
  publishStatus?: 'pending' | 'approved' | 'rejected'; // For creator uploaded videos
  creatorId?: number;
  thumbnail: string;
  content: string;
  description: string; // Supports embeds
  categories: number[];
  access: 'free' | 'paid';
  access_type?: 'free' | 'ppv' | 'plan'; 
  ppv_price?: number;
  required_plan_id?: number | null;
  seo: {
    keywords: string;
    metaDescription: string;
  };
  scheduledDate?: string;
  liveCommenting?: boolean;
  commentAlignment?: 'left' | 'center' | 'right';
  views?: number;
  adSettings?: {
    enabled: boolean;
    frequencyOverride?: number;
    campaignIds?: number[];
  };
}

interface MatchState {
  matches: Match[];
  addMatch: (match: Match) => void;
  setMatches: (matches: Match[]) => void;
  updateMatch: (id: number, updates: Partial<Match>) => void;
  deleteMatch: (id: number) => void;
  watchHistory: { userId: number; matchId: number; watchedAt: string; }[];
  addToWatchHistory: (userId: number, matchId: number) => void;
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      matches: [
        { 
          id: 1, 
          title: 'Championship Finals', 
          slug: 'championship-finals',
          date: '2026-04-15T18:00:00Z', 
          price: 50, 
          embedPrice: 500, 
          status: 'upcoming', 
          thumbnail: 'https://picsum.photos/seed/match1/800/450',
          content: '<p>The ultimate showdown of the season.</p>',
          description: 'Watch the finals live on WDSportz.',
          categories: [1],
          access: 'paid',
          seo: { keywords: 'finals, championship, football', metaDescription: 'Watch the Championship Finals live.' }
        },
        { 
          id: 2, 
          title: 'Semi-Finals Clash', 
          slug: 'semi-finals-clash',
          date: '2026-04-10T20:00:00Z', 
          price: 30, 
          embedPrice: 300, 
          status: 'upcoming', 
          thumbnail: 'https://picsum.photos/seed/match2/800/450',
          content: '<p>A battle for a spot in the finals.</p>',
          description: 'Semi-finals action you cannot miss.',
          categories: [1, 2],
          access: 'paid',
          seo: { keywords: 'semi-finals, clash', metaDescription: 'Semi-finals action live.' }
        },
      ],
      addMatch: (match) => set((state) => ({ matches: [match, ...state.matches] })),
      setMatches: (matches) => set({ matches }),
      updateMatch: (id, updates) => set((state) => ({
        matches: state.matches.map(m => String(m.id) === String(id) ? { ...m, ...updates } : m)
      })),
      deleteMatch: (id) => set((state) => ({
        matches: state.matches.filter(m => String(m.id) !== String(id))
      })),
      watchHistory: [],
      addToWatchHistory: (userId, matchId) => set((state) => {
        const filtered = state.watchHistory.filter(h => !(h.userId === userId && h.matchId === matchId));
        return {
          watchHistory: [{ userId, matchId, watchedAt: new Date().toISOString() }, ...filtered]
        };
      })
    }),
    { name: 'match-storage' }
  )
);

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface CategoryState {
  categories: Category[];
  addCategory: (category: Category) => void;
  updateCategory: (id: number, updates: Partial<Category>) => void;
  deleteCategory: (id: number) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: [
        { id: 1, name: 'Live Match', slug: 'live-match', description: 'Live sporting events' },
        { id: 2, name: 'Highlights', slug: 'highlights', description: 'Match highlights and replays' },
        { id: 3, name: 'Interviews', slug: 'interviews', description: 'Player and coach interviews' },
      ],
      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      })),
    }),
    { name: 'category-storage' }
  )
);

export interface Purchase {
  id: number;
  userId: number;
  matchId: number;
  amount: number;
  type: 'watch' | 'embed';
  date: string;
  code?: string; // The streaming code if type is 'embed'
}

export interface Transaction {
  id: number;
  userId: number;
  type: 'top_up' | 'purchase' | 'reward';
  amount: number;
  description: string;
  date: string;
}

interface PurchaseState {
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  fetchTransactions: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set) => ({
      purchases: [],
      addPurchase: (purchase) => set((state) => ({ purchases: [...state.purchases, purchase] })),
      transactions: [],
      addTransaction: (transaction) => set((state) => ({ 
        transactions: [{ ...transaction, id: Date.now(), date: new Date().toISOString() }, ...state.transactions] 
      })),
      fetchTransactions: async () => {
        try {
          const res = await fetch('/api/user/transactions', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            set({ transactions: Array.isArray(data.transactions) ? data.transactions : (Array.isArray(data) ? data : []) });
          }
        } catch (err) {
          console.error('Failed to fetch transactions', err);
        }
      }
    }),
    { name: 'purchase-storage' }
  )
);

export interface Task {
  id: number;
  title: string;
  description: string;
  points_reward: number;
  is_active: number;
}

interface TaskState {
  tasks: Task[];
  completedTasks: number[]; // Array of task IDs
  fetchTasks: () => Promise<void>;
  completeTask: (taskId: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>()(
  (set) => ({
    tasks: [],
    completedTasks: [],
    fetchTasks: async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          set({ 
            tasks: Array.isArray(data.tasks) ? data.tasks : [], 
            completedTasks: Array.isArray(data.completedTasks) ? data.completedTasks : [] 
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
          console.error('Failed to fetch tasks', err.message);
        }
      }
    },
    completeTask: async (taskId) => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`/api/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          set((state) => ({
            completedTasks: [...state.completedTasks, taskId]
          }));
          return data.pointsReward;
        }
      } catch (err) {
        console.error('Failed to complete task', err);
      }
    },
  })
);

export interface Comment {
  id: number;
  matchId: number;
  userId: number;
  username: string;
  avatar: string | null;
  content: string;
  likes: number;
  timestamp: string;
  parentId?: number;
}

interface CommentState {
  comments: Comment[];
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'likes'>) => void;
  likeComment: (id: number) => void;
  deleteComment: (id: number) => void;
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set) => ({
      comments: [],
      addComment: (comment) => set((state) => ({
        comments: [
          ...state.comments,
          {
            ...comment,
            id: Date.now(),
            timestamp: new Date().toISOString(),
            likes: 0,
          },
        ],
      })),
      likeComment: (id) => set((state) => ({
        comments: state.comments.map((c) =>
          c.id === id ? { ...c, likes: c.likes + 1 } : c
        ),
      })),
      deleteComment: (id) => set((state) => ({
        comments: state.comments.filter((c) => c.id !== id),
      })),
    }),
    { name: 'comment-storage' }
  )
);

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface BlogComment {
  id: number;
  postId: number;
  userId: number;
  userName: string;
  avatar?: string | null;
  content: string;
  createdAt: string;
  likes: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  authorId: number;
  categories: string[];
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  restricted: 'none' | 'login' | 'premium';
  seo: {
    keywords: string;
    description: string;
  };
  embedUrl?: string; // For audio, video, etc
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  readingTimeMinutes?: number;
}

interface BlogState {
  posts: BlogPost[];
  comments: BlogComment[];
  categories: BlogCategory[];
  addCategory: (category: Omit<BlogCategory, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<BlogCategory>) => void;
  deleteCategory: (id: string) => void;
  addPost: (post: Omit<BlogPost, 'id' | 'views' | 'likes' | 'updatedAt' | 'createdAt'> & { createdAt?: string }) => void;
  setPosts: (posts: BlogPost[]) => void;
  updatePost: (id: number, updates: Partial<BlogPost>) => void;
  deletePost: (id: number) => void;
  incrementViews: (id: number) => void;
  likePost: (id: number) => void;
  addComment: (comment: Omit<BlogComment, 'id' | 'createdAt' | 'likes'>) => void;
  likeComment: (id: number) => void;
}

export const useBlogStore = create<BlogState>()(
  persist(
    (set) => ({
      categories: [
        { id: '1', name: 'Technology', slug: 'technology', description: 'Tech related news' },
        { id: '2', name: 'Community', slug: 'community', description: 'Updates from the community' }
      ],
      posts: [
        {
          id: 1,
          title: 'The Future of Grassroots Sports Streaming',
          slug: 'future-of-grassroots-sports-streaming',
          content: '<p>Grassroots sports are entering a new era...</p><h2>Interactive Streaming</h2><p>Our new payload handles live statistics.</p>',
          excerpt: 'Discover how new streaming technologies are empowering local leagues and transforming fan engagement.',
          featuredImage: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
          authorId: 1,
          categories: ['Technology', 'Community'],
          tags: ['Streaming', 'Live', 'Updates'],
          status: 'published',
          restricted: 'none',
          seo: { keywords: 'streaming, grassroots, sports', description: 'Tech empowering local sports' },
          views: 1250,
          likes: 45,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          readingTimeMinutes: 5,
        }
      ],
      comments: [],
      addPost: (post) => set((state) => ({
        posts: [
          {
            ...post,
            id: Date.now(),
            views: 0,
            likes: 0,
            createdAt: post.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...state.posts
        ]
      })),
      setPosts: (posts) => set({ posts }),
      updatePost: (id, updates) => set((state) => ({
        posts: state.posts.map((p) => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
      })),
      deletePost: (id) => set((state) => ({
        posts: state.posts.filter((p) => p.id !== id)
      })),
      incrementViews: (id) => set((state) => ({
        posts: state.posts.map((p) => p.id === id ? { ...p, views: p.views + 1 } : p)
      })),
      likePost: (id) => set((state) => ({
        posts: state.posts.map((p) => p.id === id ? { ...p, likes: p.likes + 1 } : p)
      })),
      addComment: (comment) => set((state) => ({
        comments: [
          ...state.comments,
          {
            ...comment,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            likes: 0
          }
        ]
      })),
      likeComment: (id) => set((state) => ({
        comments: state.comments.map((c) => c.id === id ? { ...c, likes: c.likes + 1 } : c)
      })),
      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, { ...category, id: Math.random().toString(36).substring(7) }]
        })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          )
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id)
        }))
    }),
    { name: 'blog-storage' }
  )
);

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: string;
  size?: number;
  createdAt: string;
}

interface MediaState {
  media: MediaItem[];
  addMedia: (media: Omit<MediaItem, 'id' | 'createdAt'>) => void;
  updateMedia: (id: string, updates: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => void;
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      media: [],
      addMedia: (media) =>
        set((state) => ({
          media: [
            {
              ...media,
              id: Math.random().toString(36).substring(7),
              createdAt: new Date().toISOString()
            },
            ...state.media
          ]
        })),
      updateMedia: (id, updates) =>
        set((state) => ({
          media: state.media.map(m => m.id === id ? { ...m, ...updates } : m)
        })),
      deleteMedia: (id) =>
        set((state) => ({
          media: state.media.filter(m => m.id !== id)
        }))
    }),
    { name: 'media-storage' }
  )
);

export interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  buttonText: string;
  isActive: boolean;
}

export interface SliderGroup {
  id: string;
  name: string;
  shortcode: string;
  autoSlide: boolean;
  interval: number; // in seconds
  slides: Slide[];
}

interface SliderState {
  sliders: SliderGroup[];
  setSliders: (sliders: SliderGroup[]) => void;
  addSlider: (slider: Omit<SliderGroup, 'id' | 'shortcode'>) => void;
  updateSlider: (id: string, slider: Partial<SliderGroup>) => void;
  deleteSlider: (id: string) => void;
}

export const useSliderStore = create<SliderState>()(
  persist(
    (set) => ({
      sliders: [
        {
          id: 'default-hero',
          name: 'Homepage Hero',
          shortcode: '[slider id="default-hero"]',
          autoSlide: true,
          interval: 5,
          slides: [
            {
              id: 'slide-1',
              title: 'Grassroots Sports, Live & Direct.',
              subtitle: 'WDSportz brings you the best of local and grassroots sports streaming.',
              image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
              link: '/matches',
              buttonText: 'Watch Now',
              isActive: true,
            }
          ]
        }
      ],
      setSliders: (sliders) => set({ sliders }),
      addSlider: (slider) =>
        set((state) => {
          const id = Math.random().toString(36).substring(7);
          return {
            sliders: [...state.sliders, { ...slider, id, shortcode: `[slider id="${id}"]` }]
          };
        }),
      updateSlider: (id, updates) =>
        set((state) => ({
          sliders: state.sliders.map((s) => (s.id === id ? { ...s, ...updates } : s))
        })),
      deleteSlider: (id) =>
        set((state) => ({
          sliders: state.sliders.filter((s) => s.id !== id)
        }))
    }),
    { name: 'slider-storage' }
  )
);
