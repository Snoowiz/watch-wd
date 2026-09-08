import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GoogleAuthSettings } from './services/settingsService';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'creator' | 'operator';
  balance: number;
  avatar: string | null;
  status: string;
  phone?: string;
  phoneNumber?: string;
  dob?: string;
  gender?: string;
  onboardingCompleted?: boolean;
  onboarding_completed?: boolean | number;
  userAvatar?: string | null;
  planId?: number;
  planExpiresAt?: string;
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
    localStorage.setItem('token', token);
    set({ user, token });
  },
  updateUser: (updates) => set((state) => {
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

export type BlockType = 
  | 'hero_slider'
  | 'featured_broadcasts'
  | 'live_matches'
  | 'upcoming_matches'
  | 'completed_matches'
  | 'latest_blogs'
  | 'competitions'
  | 'clubs'
  | 'ads'
  | 'features_grid'
  | 'spacer'
  | 'custom_text';

export interface HomepageBlockFilter {
  categoryIds?: number[];
  clubIds?: string[];
  status?: ('upcoming' | 'live' | 'completed')[];
  access?: ('free' | 'paid')[];
  dateRange?: { start?: string; end?: string };
}

export interface HomepageBlock {
  id: string;
  type: BlockType;
  enabled: boolean;
  title: string;
  subtitle?: string;
  layout: 'carousel' | 'grid' | 'list' | 'slider';
  sortBy: 'latest' | 'popular' | 'most_commented' | 'custom';
  maxItems: number;
  filters?: HomepageBlockFilter;
  showViewAll?: boolean;
  viewAllUrl?: string;
  config?: Record<string, any>;
}

export interface HomepageBuilderConfig {
  blocks: HomepageBlock[];
  draftBlocks?: HomepageBlock[];
  status: 'published' | 'draft';
  publishedAt?: string | null;
  updatedAt: string;
  version: number;
}

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageBlock[] = [
  {
    id: "block-hero",
    type: "hero_slider",
    enabled: true,
    title: "Hero Banner",
    layout: "slider",
    sortBy: "latest",
    maxItems: 5,
    filters: {},
    config: { sliderId: "default-hero" }
  },
  {
    id: "block-featured",
    type: "featured_broadcasts",
    enabled: true,
    title: "Featured Broadcasts",
    subtitle: "Don't miss the most anticipated upcoming matches.",
    layout: "carousel",
    sortBy: "latest",
    maxItems: 9,
    showViewAll: true,
    viewAllUrl: "/matches",
    filters: {}
  },
  {
    id: "block-blogs",
    type: "latest_blogs",
    enabled: true,
    title: "Latest from the Blog",
    subtitle: "Insights, news, and updates",
    layout: "carousel",
    sortBy: "latest",
    maxItems: 6,
    showViewAll: true,
    viewAllUrl: "/blog",
    filters: {}
  },
  {
    id: "block-features",
    type: "features_grid",
    enabled: true,
    title: "Platform Features",
    layout: "grid",
    sortBy: "latest",
    maxItems: 3,
    filters: {}
  }
];

interface HomepageSettings {
  featuresSectionEnabled: boolean;
  latestNewsEnabled: boolean;
}

export interface PerPageSEOConfig {
  id: string;
  path: string;
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  jsonLdSchema?: string;
}

export interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterHandle: string;
  twitterCardType?: 'summary' | 'summary_large_image';
  googleAnalyticsId: string;
  googleTagManagerId: string;
  robotsTxt: string;
  allowIndexing?: boolean;
  canonicalBaseUrl?: string;
  googleVerification?: string;
  bingVerification?: string;
  yandexVerification?: string;
  pinterestVerification?: string;
  baiduVerification?: string;
  customHeadHtml?: string;
  organizationName?: string;
  organizationLogo?: string;
  organizationType?: string;
  sitemapPriority?: string;
  sitemapChangeFreq?: string;
  sitemapExcludeRoutes?: string[];
}

export interface BlogSettings {
  enabled: boolean;
}

export interface WalletSettings {
  enabled: boolean;
}

interface SettingsState {
  currency: string;
  setCurrency: (currency: string) => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;
  paymentSettings: PaymentSettings;
  setPaymentSettings: (settings: PaymentSettings) => void;
  fetchPaymentSettings: () => Promise<void>;
  homepageSettings: HomepageSettings;
  setHomepageSettings: (settings: HomepageSettings) => void;
  seoSettings: SEOSettings;
  setSeoSettings: (settings: SEOSettings) => void;
  perPageSeo: PerPageSEOConfig[];
  setPerPageSeo: (pages: PerPageSEOConfig[]) => void;
  fetchPerPageSeo: () => Promise<void>;
  platformName: string;
  setPlatformName: (name: string) => void;
  logoUrl: string;
  setLogoUrl: (logoUrl: string) => void;
  favicon: string;
  setFavicon: (favicon: string) => void;
  preloaderEnabled: boolean;
  setPreloaderEnabled: (enabled: boolean) => void;
  googleAuthSettings: GoogleAuthSettings;
  setGoogleAuthSettings: (settings: GoogleAuthSettings) => void;
  blogSettings: BlogSettings;
  setBlogSettings: (settings: BlogSettings) => void;
  walletSettings: WalletSettings;
  setWalletSettings: (settings: WalletSettings) => void;
  captchaEnabled: boolean;
  setCaptchaEnabled: (enabled: boolean) => void;
  captchaTolerance: number;
  setCaptchaTolerance: (tolerance: number) => void;
  fetchSettings: () => Promise<void>;
}

const saveSettingHelper = (key: string, value: any) => {
  fetch(`/api/admin/settings/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(value)
  }).catch(console.error);
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  currency: 'GBP',
  setCurrency: (currency) => {
    const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    set({ currency, currencySymbol: symbol });
    saveSettingHelper('currency', { currency, symbol });
  },
  currencySymbol: '£',
  setCurrencySymbol: (symbol) => {
    set({ currencySymbol: symbol });
    saveSettingHelper('currency', { currency: get().currency, symbol });
  },
  paymentSettings: {
    stripe: { publicKey: '', secretKey: '', isTestMode: true, enabled: false },
    paypal: { clientId: '', secret: '', isTestMode: true, enabled: false },
    paystack: { publicKey: '', secretKey: '', isTestMode: true, enabled: false },
  },
  setPaymentSettings: (settings) => {
    set({ paymentSettings: settings });
    fetch('/api/admin/payment/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(settings)
    }).catch(console.error);
  },
  fetchPaymentSettings: async () => {
    try {
      const res = await fetch('/api/payment/settings');
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          paymentSettings: {
            stripe: { ...state.paymentSettings.stripe, ...data.stripe },
            paypal: { ...state.paymentSettings.paypal, ...data.paypal },
            paystack: { ...state.paymentSettings.paystack, ...data.paystack },
          }
        }));
      }
    } catch (err) {
      console.error("Failed to fetch payment settings:", err);
    }
  },
  homepageSettings: {
    featuresSectionEnabled: true,
    latestNewsEnabled: true
  },
  setHomepageSettings: (settings) => {
    set({ homepageSettings: settings });
    saveSettingHelper('homepage', settings);
  },
  seoSettings: {
    metaTitle: 'Watch WDS - Live Sports Streaming',
    metaDescription: 'Watch live sports, follow your favorite creators, and join the community.',
    metaKeywords: 'sports, streaming, live matches, community',
    ogTitle: 'Watch WDS',
    ogDescription: 'Experience the best live sports streaming platform.',
    ogImage: '',
    twitterHandle: '@watchwds',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    robotsTxt: 'User-agent: *\nAllow: /'
  },
  setSeoSettings: (settings) => {
    set({ seoSettings: settings });
    saveSettingHelper('seo', settings);
  },
  perPageSeo: [],
  setPerPageSeo: (pages) => set({ perPageSeo: pages }),
  fetchPerPageSeo: async () => {
    try {
      const res = await fetch('/api/seo/per-page');
      if (res.ok) {
        const data = await res.json();
        set({ perPageSeo: data });
      }
    } catch (err) {
      console.error("Failed to fetch per-page SEO:", err);
    }
  },
  platformName: 'WatchWDS',
  setPlatformName: (name) => {
    set({ platformName: name });
    saveSettingHelper('branding', { platformName: name, logoUrl: get().logoUrl, favicon: get().favicon, preloaderEnabled: get().preloaderEnabled });
  },
  logoUrl: '',
  setLogoUrl: (logoUrl) => {
    set({ logoUrl });
    saveSettingHelper('branding', { platformName: get().platformName, logoUrl, favicon: get().favicon, preloaderEnabled: get().preloaderEnabled });
  },
  favicon: '/favicon.ico',
  setFavicon: (favicon) => {
    set({ favicon });
    saveSettingHelper('branding', { platformName: get().platformName, logoUrl: get().logoUrl, favicon, preloaderEnabled: get().preloaderEnabled });
  },
  preloaderEnabled: true,
  setPreloaderEnabled: (enabled) => {
    set({ preloaderEnabled: enabled });
    saveSettingHelper('branding', { platformName: get().platformName, logoUrl: get().logoUrl, favicon: get().favicon, preloaderEnabled: enabled });
  },
  googleAuthSettings: {
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  },
  setGoogleAuthSettings: (settings) => {
    set({ googleAuthSettings: settings });
    fetch('/api/admin/google-auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(settings)
    }).catch(console.error);
  },
  blogSettings: {
    enabled: false
  },
  setBlogSettings: (settings) => {
    set({ blogSettings: settings });
    saveSettingHelper('blog', settings);
  },
  walletSettings: {
    enabled: true
  },
  setWalletSettings: (settings) => {
    set({ walletSettings: settings });
    saveSettingHelper('wallet', settings);
    try {
      useFeatureStore.getState().setFeatures(
        useFeatureStore.getState().features.map(f =>
          f.slug === 'wallet_system' ? { ...f, is_active: settings.enabled ? 1 : 0 } : f
        )
      );
    } catch (e) {}
  },
  captchaEnabled: false,
  captchaTolerance: 25,
  setCaptchaEnabled: (enabled) => {
    set({ captchaEnabled: enabled });
    saveSettingHelper('captcha', { enabled, tolerance: get().captchaTolerance });
  },
  setCaptchaTolerance: (tolerance) => {
    set({ captchaTolerance: tolerance });
    saveSettingHelper('captcha', { enabled: get().captchaEnabled, tolerance });
  },
  fetchSettings: async () => {
    try {
      const brandingRes = await fetch('/api/settings/branding');
      if (brandingRes.ok) {
        const data = await brandingRes.json();
        set({
          platformName: data.platformName !== undefined ? data.platformName : 'WatchWDS',
          logoUrl: data.logoUrl || '',
          favicon: data.favicon || '/favicon.ico',
          preloaderEnabled: data.preloaderEnabled !== false
        });
      }
      const seoRes = await fetch('/api/settings/seo');
      if (seoRes.ok) {
        const data = await seoRes.json();
        set({ seoSettings: { ...get().seoSettings, ...data } });
      }
      const homeRes = await fetch('/api/settings/homepage');
      if (homeRes.ok) {
        const data = await homeRes.json();
        set({ homepageSettings: { ...get().homepageSettings, ...data } });
      }
      const currencyRes = await fetch('/api/settings/currency');
      if (currencyRes.ok) {
        const data = await currencyRes.json();
        set({
          currency: data.currency || 'GBP',
          currencySymbol: data.symbol || '£'
        });
      }
      const googleRes = await fetch('/api/auth/google/config');
      if (googleRes.ok) {
        const data = await googleRes.json();
        set({
          googleAuthSettings: {
            enabled: data.enabled || false,
            clientId: data.clientId || '',
            clientSecret: '',
            redirectUri: ''
          }
        });
      }
      const blogRes = await fetch('/api/settings/blog');
      if (blogRes.ok) {
        const data = await blogRes.json();
        set({ blogSettings: { enabled: data.enabled === true } });
      }
      const walletRes = await fetch('/api/settings/wallet');
      if (walletRes.ok) {
        const data = await walletRes.json();
        const isWalletEnabled = data.enabled !== false;
        set({ walletSettings: { enabled: isWalletEnabled } });
        try {
          useFeatureStore.getState().setFeatures(
            useFeatureStore.getState().features.map(f =>
              f.slug === 'wallet_system' ? { ...f, is_active: isWalletEnabled ? 1 : 0 } : f
            )
          );
        } catch (e) {}
      }
      const captchaRes = await fetch('/api/captcha/status');
      if (captchaRes.ok) {
        const data = await captchaRes.json();
        set({ 
          captchaEnabled: data.enabled === true,
          captchaTolerance: typeof data.tolerance === 'number' ? data.tolerance : 25
        });
      }
      get().fetchPerPageSeo();
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }
}));

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
  fetchAds: () => Promise<void>;
  setAdIntervalMinutes: (minutes: number) => void;
  addAd: (ad: Omit<Advertisement, 'id'>) => Promise<void>;
  updateAd: (id: number, updates: Partial<Advertisement>) => Promise<void>;
  deleteAd: (id: number) => Promise<void>;
  recordImpression: (adId: number, matchId?: number, userId?: number) => Promise<void>;
  recordClick: (impressionId: number) => Promise<void>;
}

export const useAdStore = create<AdState>()(
  persist(
    (set, get) => ({
      ads: [],
      impressions: [],
      adIntervalMinutes: 15,
      fetchAds: async () => {
        try {
          const resAds = await fetch('/api/ads');
          if (resAds.ok) {
            const data = await resAds.json();
            set({ ads: data });
          }
          const token = localStorage.getItem('token');
          if (token) {
            const resImp = await fetch('/api/admin/ad-impressions', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resImp.ok) {
              const data = await resImp.json();
              set({ impressions: data });
            }
          }
        } catch (err) {
          console.error('Failed to fetch ads', err);
        }
      },
      setAdIntervalMinutes: (minutes) => set({ adIntervalMinutes: minutes }),
      addAd: async (ad) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(ad)
          });
          if (res.ok) {
            const data = await res.json();
            set((state) => ({ ads: [...state.ads, data] }));
          }
        } catch (err) {
          console.error('Failed to add ad', err);
        }
      },
      updateAd: async (id, updates) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch(`/api/admin/ads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates)
          });
          if (res.ok) {
            set((state) => ({
              ads: state.ads.map(a => String(a.id) === String(id) ? { ...a, ...updates } : a)
            }));
          }
        } catch (err) {
          console.error('Failed to update ad', err);
        }
      },
      deleteAd: async (id) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch(`/api/admin/ads/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            set((state) => ({
              ads: state.ads.filter(a => String(a.id) !== String(id))
            }));
          }
        } catch (err) {
          console.error('Failed to delete ad', err);
        }
      },
      recordImpression: async (adId, matchId, userId) => {
        try {
          const res = await fetch('/api/ads/impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adId, matchId, userId })
          });
          if (res.ok) {
            const data = await res.json();
            set((state) => ({
              impressions: [...state.impressions, { id: data.id, adId, matchId, userId, clicked: false, timestamp: new Date().toISOString() }]
            }));
          }
        } catch (err) {
          console.error('Failed to record impression', err);
        }
      },
      recordClick: async (impressionId) => {
        try {
          const res = await fetch(`/api/ads/click/${impressionId}`, {
            method: 'POST'
          });
          if (res.ok) {
            set((state) => ({
              impressions: state.impressions.map(i => String(i.id) === String(impressionId) ? { ...i, clicked: true } : i)
            }));
          }
        } catch (err) {
          console.error('Failed to record click', err);
        }
      }
    }),
    { 
      name: 'ad-storage',
      partialize: (state) => ({ adIntervalMinutes: state.adIntervalMinutes })
    }
  )
);

export interface Match {
  id: number;
  title: string;
  slug: string;
  date: string;
  price: number;
  embedPrice: number; // Price for creators to embed
  status: 'upcoming' | 'live' | 'completed';
  publishStatus?: 'pending' | 'approved' | 'rejected' | 'published' | 'draft' | 'scheduled'; // For creator uploaded videos
  creatorId?: number;
  thumbnail: string;
  content: string;
  description: string; // Supports embeds
  categories: number[];
  access: 'free' | 'paid';
  access_type?: 'free' | 'ppv' | 'plan'; 
  ppv_price?: number;
  required_plan_id?: string | number | null;
  club_id?: string | null;
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
  duration?: number; // Duration in minutes, defaults to 120
  reminder_sent_10m?: boolean | number;
}

interface MatchState {
  matches: Match[];
  addMatch: (match: Match) => Promise<void>;
  setMatches: (matches: Match[]) => void;
  updateMatch: (id: number, updates: Partial<Match>) => Promise<void>;
  deleteMatch: (id: number) => Promise<void>;
  fetchMatches: () => Promise<void>;
  watchHistory: { userId: number; matchId: number; watchedAt: string; }[];
  addToWatchHistory: (userId: number, matchId: number) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  fetchMatches: async () => {
    try {
      const res = await fetch('/api/matches', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        set({ matches: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      console.error('Failed to fetch matches', err);
    }
  },
  addMatch: async (match) => {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(match)
      });
      if (res.ok) {
        const savedMatch = await res.json();
        // Since backend might return { id: '...' }, construct savedMatch correctly
        const newMatch = { ...match, id: savedMatch.id || match.id };
        set((state) => ({ matches: [newMatch, ...state.matches] }));
      }
    } catch (err) {
      console.error('Failed to add match', err);
    }
  },
  setMatches: (matches) => set({ matches }),
  updateMatch: async (id, updates) => {
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          matches: state.matches.map(m => String(m.id) === String(id) ? { ...m, ...updates } : m)
        }));
      }
    } catch (err) {
      console.error('Failed to update match', err);
    }
  },
  deleteMatch: async (id) => {
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        set((state) => ({
          matches: state.matches.filter(m => String(m.id) !== String(id))
        }));
      }
    } catch (err) {
      console.error('Failed to delete match', err);
    }
  },
  watchHistory: [],
  addToWatchHistory: (userId, matchId) => set((state) => {
    const filtered = state.watchHistory.filter(h => !(h.userId === userId && h.matchId === matchId));
    return {
      watchHistory: [{ userId, matchId, watchedAt: new Date().toISOString() }, ...filtered]
    };
  })
}));

export interface Category {
  id: any;
  name: string;
  slug: string;
  description: string;
}

interface CategoryState {
  categories: Category[];
  addCategory: (category: any) => Promise<void>;
  updateCategory: (id: any, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: any) => Promise<void>;
  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  fetchCategories: async () => {
    try {
      const res = await fetch('/api/match-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          set({ categories: data });
        }
      }
    } catch (err) {
      console.error('Failed to fetch match categories', err);
    }
  },
  addCategory: async (category) => {
    try {
      const res = await fetch('/api/admin/match-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(category)
      });
      if (res.ok) {
        const data = await res.json();
        set({ categories: [...get().categories, { ...category, id: data.id }] });
      }
    } catch (err) {
      console.error('Failed to save match category', err);
    }
  },
  updateCategory: async (id, updates) => {
    try {
      const res = await fetch(`/api/admin/match-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set({ categories: get().categories.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c) });
      }
    } catch (err) {
      console.error('Failed to save match category', err);
    }
  },
  deleteCategory: async (id) => {
    try {
      const res = await fetch(`/api/admin/match-categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        set({ categories: get().categories.filter(c => String(c.id) !== String(id)) });
      }
    } catch (err) {
      console.error('Failed to delete match category', err);
    }
  },
}));

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
  fetchPurchases: () => Promise<void>;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  fetchTransactions: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>()(
  (set) => ({
    purchases: [],
    addPurchase: (purchase) => set((state) => ({ purchases: [...state.purchases, purchase] })),
    fetchPurchases: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/user/purchases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          set({ purchases: Array.isArray(data) ? data : [] });
        }
      } catch (err) {
        console.error('Failed to fetch purchases', err);
      }
    },
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
  })
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
  status?: string;
  role?: string;
}

interface CommentState {
  comments: Comment[];
  addComment: (comment: Omit<Comment, 'id' | 'timestamp' | 'likes'>) => Promise<void>;
  likeComment: (id: number) => Promise<void>;
  deleteComment: (id: number) => Promise<void>;
  updateComment: (id: number | string, updates: Partial<Comment>) => Promise<void>;
  fetchComments: (matchId: number | string) => Promise<void>;
  fetchAllComments: () => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  fetchComments: async (matchId) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/comments`);
      if (res.ok) {
        const data = await res.json();
        set((state) => {
          const otherComments = state.comments.filter(c => String(c.matchId) !== String(matchId));
          const newComments = Array.isArray(data) ? data : [];
          return { comments: [...otherComments, ...newComments] };
        });
      }
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  },
  fetchAllComments: async () => {
    try {
      const res = await fetch('/api/comments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ comments: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      console.error('Failed to fetch all comments', err);
    }
  },
  addComment: async (comment) => {
    try {
      const res = await fetch(`/api/matches/${comment.matchId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(comment)
      });
      if (res.ok) {
        const saved = await res.json();
        set((state) => ({ comments: [...state.comments, saved] }));
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  },
  likeComment: async (id) => {
    try {
      const res = await fetch(`/api/comments/${id}/like`, { method: 'POST' });
      if (res.ok) {
        set((state) => ({
          comments: state.comments.map((c) =>
            String(c.id) === String(id) ? { ...c, likes: c.likes + 1 } : c
          ),
        }));
      }
    } catch (err) {
      console.error('Failed to like comment', err);
    }
  },
  updateComment: async (id, updates) => {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          comments: state.comments.map((c) =>
            String(c.id) === String(id) ? { ...c, ...updates } : c
          ),
        }));
      }
    } catch (err) {
      console.error('Failed to update comment', err);
    }
  },
  deleteComment: async (id) => {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        set((state) => ({
          comments: state.comments.filter((c) => String(c.id) !== String(id))
        }));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  }
}));

export interface BlogCategory {
  id: any;
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
  fetchPosts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchComments: (postId: number) => Promise<void>;
  addCategory: (category: Omit<BlogCategory, 'id'>) => Promise<void>;
  updateCategory: (id: any, updates: Partial<BlogCategory>) => Promise<void>;
  deleteCategory: (id: any) => Promise<void>;
  addPost: (post: Omit<BlogPost, 'id' | 'views' | 'likes' | 'updatedAt' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  setPosts: (posts: BlogPost[]) => void;
  updatePost: (id: number, updates: Partial<BlogPost>) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  incrementViews: (id: number) => Promise<void>;
  likePost: (id: number) => Promise<void>;
  addComment: (comment: Omit<BlogComment, 'id' | 'createdAt' | 'likes'>) => Promise<void>;
  likeComment: (id: number) => Promise<void>;
}

export const useBlogStore = create<BlogState>((set, get) => ({
  posts: [],
  comments: [],
  categories: [],
  fetchPosts: async () => {
    try {
      const res = await fetch('/api/blog/posts');
      if (res.ok) {
        const data = await res.json();
        set({ posts: Array.isArray(data) ? data : [] });
      }
    } catch (err) {
      console.error('Failed to fetch blog posts', err);
    }
  },
  fetchCategories: async () => {
    try {
      const res = await fetch('/api/blog-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          set({ categories: data });
        }
      }
    } catch (err) {
      console.error('Failed to fetch blog categories', err);
    }
  },
  fetchComments: async (postId) => {
    try {
      const res = await fetch(`/api/blog/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        set((state) => {
          const otherComments = state.comments.filter(c => String(c.postId) !== String(postId));
          const newComments = Array.isArray(data) ? data.map((c: any) => ({ ...c, postId })) : [];
          return { comments: [...otherComments, ...newComments] };
        });
      }
    } catch (err) {
      console.error('Failed to fetch blog comments', err);
    }
  },
  addPost: async (post) => {
    try {
      const res = await fetch('/api/blog/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(post)
      });
      if (res.ok) {
        const savedPost = await res.json();
        set((state) => ({ posts: [savedPost, ...state.posts] }));
      }
    } catch (err) {
      console.error('Failed to add blog post', err);
    }
  },
  setPosts: (posts) => set({ posts }),
  updatePost: async (id, updates) => {
    try {
      const res = await fetch(`/api/blog/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          posts: state.posts.map((p) => String(p.id) === String(id) ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
        }));
      }
    } catch (err) {
      console.error('Failed to update blog post', err);
    }
  },
  deletePost: async (id) => {
    try {
      const res = await fetch(`/api/blog/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        set((state) => ({
          posts: state.posts.filter((p) => String(p.id) !== String(id))
        }));
      }
    } catch (err) {
      console.error('Failed to delete blog post', err);
    }
  },
  incrementViews: async (id) => {
    try {
      const res = await fetch(`/api/blog/posts/${id}/view`, { method: 'POST' });
      if (res.ok) {
        set((state) => ({
          posts: state.posts.map((p) => String(p.id) === String(id) ? { ...p, views: (p.views || 0) + 1 } : p)
        }));
      }
    } catch (err) {
      console.error('Failed to increment view count', err);
    }
  },
  likePost: async (id) => {
    try {
      const res = await fetch(`/api/blog/posts/${id}/like`, { method: 'POST' });
      if (res.ok) {
        set((state) => ({
          posts: state.posts.map((p) => String(p.id) === String(id) ? { ...p, likes: (p.likes || 0) + 1 } : p)
        }));
      }
    } catch (err) {
      console.error('Failed to like blog post', err);
    }
  },
  addComment: async (comment) => {
    try {
      const res = await fetch(`/api/blog/posts/${comment.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(comment)
      });
      if (res.ok) {
        const savedComment = await res.json();
        const normalizedComment = { ...savedComment, postId: comment.postId };
        set((state) => ({ comments: [...state.comments, normalizedComment] }));
      }
    } catch (err) {
      console.error('Failed to add blog comment', err);
    }
  },
  likeComment: async (id) => {
    try {
      const res = await fetch(`/api/comments/${id}/like`, { method: 'POST' });
      if (res.ok) {
        set((state) => ({
          comments: state.comments.map((c) => String(c.id) === String(id) ? { ...c, likes: (c.likes || 0) + 1 } : c)
        }));
      }
    } catch (err) {
      console.error('Failed to like comment', err);
    }
  },
  addCategory: async (category) => {
    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(category)
      });
      if (res.ok) {
        const data = await res.json();
        set({ categories: [...get().categories, { ...category, id: data.id }] });
      }
    } catch (err) {
      console.error('Failed to save blog category', err);
    }
  },
  updateCategory: async (id, updates) => {
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set({ categories: get().categories.map((c) => String(c.id) === String(id) ? { ...c, ...updates } : c) });
      }
    } catch (err) {
      console.error('Failed to save blog category', err);
    }
  },
  deleteCategory: async (id) => {
    try {
      const res = await fetch(`/api/admin/blog-categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        set({ categories: get().categories.filter((c) => String(c.id) !== String(id)) });
      }
    } catch (err) {
      console.error('Failed to delete blog category', err);
    }
  }
}));

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
  isLoading: boolean;
  fetchSliders: () => Promise<void>;
  setSliders: (sliders: SliderGroup[]) => void;
  addSlider: (slider: Omit<SliderGroup, 'id' | 'shortcode'>) => void;
  updateSlider: (id: string, slider: Partial<SliderGroup>) => void;
  deleteSlider: (id: string) => void;
  saveSlidersToDatabase: () => Promise<boolean>;
}

const syncSlidersToBackend = async (sliders: SliderGroup[]) => {
  const token = localStorage.getItem('token');
  if (!token || token === 'undefined' || token === 'null') return;
  try {
    await fetch('/api/admin/sliders', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sliders })
    });
  } catch (err) {
    console.error('Failed to sync sliders to database:', err);
  }
};

export const useSliderStore = create<SliderState>()(
  persist(
    (set, get) => ({
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
              subtitle: 'WatchWDS brings you the best of local and grassroots sports streaming.',
              image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
              link: '/matches',
              buttonText: 'Watch Now',
              isActive: true,
            }
          ]
        }
      ],
      isLoading: false,
      fetchSliders: async () => {
        try {
          set({ isLoading: true });
          const res = await fetch('/api/sliders');
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.sliders) && data.sliders.length > 0) {
              set({ sliders: data.sliders, isLoading: false });
              return;
            }
          }
          set({ isLoading: false });
        } catch (err) {
          console.error('Failed to fetch sliders from database:', err);
          set({ isLoading: false });
        }
      },
      setSliders: (sliders) => {
        set({ sliders });
        syncSlidersToBackend(sliders);
      },
      addSlider: (slider) => {
        const id = Math.random().toString(36).substring(7);
        const newSliders = [
          ...get().sliders,
          { ...slider, id, shortcode: `[slider id="${id}"]` }
        ];
        set({ sliders: newSliders });
        syncSlidersToBackend(newSliders);
      },
      updateSlider: (id, updates) => {
        const newSliders = get().sliders.map((s) => (s.id === id ? { ...s, ...updates } : s));
        set({ sliders: newSliders });
        syncSlidersToBackend(newSliders);
      },
      deleteSlider: (id) => {
        const newSliders = get().sliders.filter((s) => s.id !== id);
        set({ sliders: newSliders });
        syncSlidersToBackend(newSliders);
      },
      saveSlidersToDatabase: async () => {
        const token = localStorage.getItem('token');
        if (!token) return false;
        try {
          const res = await fetch('/api/admin/sliders', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ sliders: get().sliders })
          });
          return res.ok;
        } catch (err) {
          console.error('Failed to save sliders to database:', err);
          return false;
        }
      }
    }),
    { name: 'slider-storage' }
  )
);

export function createDefaultBlock(type: BlockType): HomepageBlock {
  const id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  switch (type) {
    case 'hero_slider':
      return {
        id,
        type,
        enabled: true,
        title: 'Hero Banner',
        layout: 'slider',
        sortBy: 'latest',
        maxItems: 5,
        filters: {},
        config: { sliderId: 'default-hero' }
      };
    case 'featured_broadcasts':
      return {
        id,
        type,
        enabled: true,
        title: 'Featured Broadcasts',
        subtitle: "Don't miss the most anticipated upcoming matches.",
        layout: 'carousel',
        sortBy: 'latest',
        maxItems: 9,
        showViewAll: true,
        viewAllUrl: '/matches',
        filters: {}
      };
    case 'live_matches':
      return {
        id,
        type,
        enabled: true,
        title: 'Live Matches',
        subtitle: 'Watch matches streaming live right now',
        layout: 'carousel',
        sortBy: 'latest',
        maxItems: 6,
        showViewAll: true,
        viewAllUrl: '/matches',
        filters: { status: ['live'] }
      };
    case 'upcoming_matches':
      return {
        id,
        type,
        enabled: true,
        title: 'Upcoming Matches',
        subtitle: 'Schedule of upcoming games and streams',
        layout: 'carousel',
        sortBy: 'latest',
        maxItems: 8,
        showViewAll: true,
        viewAllUrl: '/matches',
        filters: { status: ['upcoming'] }
      };
    case 'completed_matches':
      return {
        id,
        type,
        enabled: true,
        title: 'Replays & Highlights',
        subtitle: 'Catch up on full match recordings and replays',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 6,
        showViewAll: true,
        viewAllUrl: '/matches',
        filters: { status: ['completed'] }
      };
    case 'latest_blogs':
      return {
        id,
        type,
        enabled: true,
        title: 'Latest from the Blog',
        subtitle: 'Insights, news, and updates',
        layout: 'carousel',
        sortBy: 'latest',
        maxItems: 6,
        showViewAll: true,
        viewAllUrl: '/blog',
        filters: {}
      };
    case 'competitions':
      return {
        id,
        type,
        enabled: true,
        title: 'Top Competitions',
        subtitle: 'Explore matches across our featured leagues and tournaments',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 6,
        showViewAll: true,
        viewAllUrl: '/matches',
        filters: {}
      };
    case 'clubs':
      return {
        id,
        type,
        enabled: true,
        title: 'Partner Clubs',
        subtitle: 'Official club channels and live streams',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 8,
        showViewAll: true,
        viewAllUrl: '/clubs',
        filters: {}
      };
    case 'ads':
      return {
        id,
        type,
        enabled: true,
        title: 'Sponsored',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 1,
        filters: {},
        config: {
          bannerImageUrl: '',
          targetUrl: '',
          altText: 'Advertisement',
          targetBlank: true
        }
      };
    case 'features_grid':
      return {
        id,
        type,
        enabled: true,
        title: 'Platform Features',
        subtitle: 'Everything you need to follow your favorite sports',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 3,
        filters: {}
      };
    case 'spacer':
      return {
        id,
        type,
        enabled: true,
        title: 'Divider',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 1,
        filters: {},
        config: { height: 'md', showDivider: true }
      };
    case 'custom_text':
      return {
        id,
        type,
        enabled: true,
        title: 'Welcome to WatchWDS',
        subtitle: 'The Home of Grassroots and Professional Live Sports',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 1,
        filters: {},
        config: {
          content: 'Watch live matches, support your club with pay-per-view access, or subscribe to team packages for uninterrupted streaming anywhere, anytime.',
          buttonText: 'Browse All Matches',
          buttonUrl: '/matches',
          alignment: 'center'
        }
      };
    default:
      return {
        id,
        type,
        enabled: true,
        title: 'Content Section',
        layout: 'grid',
        sortBy: 'latest',
        maxItems: 6,
        filters: {}
      };
  }
}

export interface HomepageBuilderStore {
  config: HomepageBuilderConfig | null;
  draftBlocks: HomepageBlock[];
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  fetchConfig: (previewDraft?: boolean) => Promise<void>;
  fetchAdminConfig: () => Promise<void>;
  saveDraft: () => Promise<boolean>;
  publish: () => Promise<boolean>;
  setDraftBlocks: (blocks: HomepageBlock[]) => void;
  reorderBlocks: (oldIndex: number, newIndex: number) => void;
  updateBlock: (blockId: string, updates: Partial<HomepageBlock>) => void;
  toggleBlock: (blockId: string) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  resetToDefault: () => void;
}

export const useHomepageBuilderStore = create<HomepageBuilderStore>()((set, get) => ({
  config: null,
  draftBlocks: DEFAULT_HOMEPAGE_BLOCKS,
  isLoading: false,
  isSaving: false,
  isDirty: false,

  fetchConfig: async (previewDraft = false) => {
    set({ isLoading: true });
    try {
      const url = `/api/homepage-builder${previewDraft ? '?preview=draft' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: HomepageBuilderConfig = await res.json();
        set({
          config: data,
          draftBlocks: data.blocks && data.blocks.length > 0 ? data.blocks : DEFAULT_HOMEPAGE_BLOCKS,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to fetch homepage builder config:', err);
      set({ isLoading: false });
    }
  },

  fetchAdminConfig: async () => {
    set({ isLoading: true });
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/homepage-builder', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const activeBlocks = data.draftBlocks && data.draftBlocks.length > 0 
          ? data.draftBlocks 
          : (data.blocks && data.blocks.length > 0 ? data.blocks : DEFAULT_HOMEPAGE_BLOCKS);
        set({
          config: data,
          draftBlocks: activeBlocks,
          isLoading: false,
          isDirty: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to fetch admin homepage builder config:', err);
      set({ isLoading: false });
    }
  },

  saveDraft: async () => {
    set({ isSaving: true });
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isSaving: false });
      return false;
    }
    try {
      const res = await fetch('/api/admin/homepage-builder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          draftBlocks: get().draftBlocks,
          status: 'draft'
        })
      });
      if (res.ok) {
        const data = await res.json();
        set({
          config: data,
          isSaving: false,
          isDirty: false
        });
        return true;
      }
      set({ isSaving: false });
      return false;
    } catch (err) {
      console.error('Failed to save draft homepage layout:', err);
      set({ isSaving: false });
      return false;
    }
  },

  publish: async () => {
    set({ isSaving: true });
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isSaving: false });
      return false;
    }
    try {
      const res = await fetch('/api/admin/homepage-builder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          blocks: get().draftBlocks,
          draftBlocks: get().draftBlocks,
          status: 'published',
          publishNow: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        set({
          config: data,
          isSaving: false,
          isDirty: false
        });
        return true;
      }
      set({ isSaving: false });
      return false;
    } catch (err) {
      console.error('Failed to publish homepage layout:', err);
      set({ isSaving: false });
      return false;
    }
  },

  setDraftBlocks: (blocks) => {
    set({ draftBlocks: blocks, isDirty: true });
  },

  reorderBlocks: (oldIndex, newIndex) => {
    const list = [...get().draftBlocks];
    const [moved] = list.splice(oldIndex, 1);
    list.splice(newIndex, 0, moved);
    set({ draftBlocks: list, isDirty: true });
  },

  updateBlock: (blockId, updates) => {
    const list = get().draftBlocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b));
    set({ draftBlocks: list, isDirty: true });
  },

  toggleBlock: (blockId) => {
    const list = get().draftBlocks.map((b) => (b.id === blockId ? { ...b, enabled: !b.enabled } : b));
    set({ draftBlocks: list, isDirty: true });
  },

  addBlock: (type) => {
    const newBlock = createDefaultBlock(type);
    set({ draftBlocks: [...get().draftBlocks, newBlock], isDirty: true });
  },

  removeBlock: (blockId) => {
    set({ draftBlocks: get().draftBlocks.filter((b) => b.id !== blockId), isDirty: true });
  },

  duplicateBlock: (blockId) => {
    const block = get().draftBlocks.find((b) => b.id === blockId);
    if (!block) return;
    const duplicated: HomepageBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${block.title} (Copy)`
    };
    const index = get().draftBlocks.findIndex((b) => b.id === blockId);
    const list = [...get().draftBlocks];
    list.splice(index + 1, 0, duplicated);
    set({ draftBlocks: list, isDirty: true });
  },

  resetToDefault: () => {
    set({ draftBlocks: DEFAULT_HOMEPAGE_BLOCKS, isDirty: true });
  }
}));
