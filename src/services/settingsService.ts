export interface PageSettings {
  about: string;
  terms: string;
  privacy: string;
}

export interface SocialSettings {
  facebook: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  instagram: string;
  tiktok: string;
  rss: string;
}

export interface CookieSettings {
  enabled: boolean;
  message: string;
  acceptText: string;
  rejectText: string;
  // Added for granular consent (optional so older saved records keep working)
  manageText?: string;
  essentialTitle?: string;
  essentialDescription?: string;
  analyticsTitle?: string;
  analyticsDescription?: string;
  advertisingTitle?: string;
  advertisingDescription?: string;
  /** Raising this asks every visitor again. */
  consentVersion?: number;
}

const defaultPages: PageSettings = {
  about: '<h1>About WatchWDS</h1><p>WatchWDS brings you the best of local and grassroots sports streaming. Our platform is dedicated to showcasing emerging talent, thrilling local matches, and the raw passion of grassroots sports.</p><p>We believe that every game matters. Whether it is a neighborhood tournament or a regional cup final, WatchWDS delivers high-quality live coverage straight to your device. Support local creators, join massive fan communities, and never miss a moment of the action.</p>',
  terms: '<h1>Terms of Use</h1><p>This page is being updated.</p>',
  privacy: '<h1>Privacy Policy</h1><p>This page is being updated.</p>'
};

const defaultSocial: SocialSettings = {
  facebook: 'https://www.facebook.com/WatchWDS-Shop-103322221723158/',
  twitter: 'https://twitter.com/watchwdsshop?s=21',
  linkedin: 'https://www.linkedin.com/company/watchwds/',
  youtube: 'https://www.youtube.com/channel/UCdGTpvqXAQB1dbvlZC8Qk2g',
  instagram: 'https://instagram.com/watchwds_?igshid=z7rriim5lqi2',
  tiktok: 'https://tiktok.com/@watchwds',
  rss: 'https://watchwds.com/feed/'
};

const defaultCookie: CookieSettings = {
  enabled: true,
  message: 'We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking Accept All, you consent to our use of cookies.',
  acceptText: 'Accept All',
  rejectText: 'Reject All',
  manageText: 'Manage choices',
  essentialTitle: 'Essential',
  essentialDescription: 'Needed for the site to work, for example keeping you signed in and remembering this choice. Always on.',
  analyticsTitle: 'Analytics',
  analyticsDescription: 'Helps us understand how the site is used.',
  advertisingTitle: 'Advertising',
  advertisingDescription: 'Used to measure or personalise advertising.',
  consentVersion: 1
};

const fetchSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const res = await fetch(`/api/settings/${key}`);
    if (res.ok) {
      const data = await res.json();
      return { ...defaultValue, ...data };
    }
  } catch (error) {
    console.error(`Error fetching ${key} settings:`, error);
  }
  return defaultValue;
};

const saveSetting = async <T>(key: string, settings: T): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    await fetch(`/api/admin/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
  } catch (error) {
    console.error(`Error saving ${key} settings:`, error);
  }
};

export const getPageSettings = () => fetchSetting<PageSettings>('pages', defaultPages);
export const savePageSettings = (settings: PageSettings) => saveSetting('pages', settings);

export const getSocialSettings = () => fetchSetting<SocialSettings>('social', defaultSocial);
export const saveSocialSettings = (settings: SocialSettings) => saveSetting('social', settings);

export const getCookieSettings = () => fetchSetting<CookieSettings>('cookies', defaultCookie);
export const saveCookieSettings = (settings: CookieSettings) => saveSetting('cookies', settings);

export interface BrandingSettings {
  platformName: string;
  logoUrl?: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  favicon: string;
  preloaderEnabled: boolean;
  preloaderStyle?: 'bouncing-ball' | 'scanning-logo';
}

const defaultBranding: BrandingSettings = {
  platformName: 'WatchWDS',
  logoUrl: '',
  logoLightUrl: '',
  logoDarkUrl: '',
  favicon: '/favicon.ico',
  preloaderEnabled: true,
  preloaderStyle: 'bouncing-ball'
};

export const getBrandingSettings = () => fetchSetting<BrandingSettings>('branding', defaultBranding);
export const saveBrandingSettings = (settings: BrandingSettings) => saveSetting('branding', settings);

export interface GoogleAuthSettings {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const defaultGoogleAuth: GoogleAuthSettings = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google/callback` : 'https://watchwds.com/api/auth/google/callback'
};

export const getGoogleAuthSettings = async (): Promise<GoogleAuthSettings> => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/google-auth/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ...defaultGoogleAuth,
        ...data
      } as GoogleAuthSettings;
    }
  } catch (error) {
    console.error("Error fetching Google Auth settings:", error);
  }
  return defaultGoogleAuth;
};

export const saveGoogleAuthSettings = async (settings: GoogleAuthSettings): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    await fetch('/api/admin/google-auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
  } catch (error) {
    console.error("Error saving Google Auth settings:", error);
  }
};

export const getPublicGoogleAuthConfig = async (): Promise<{ enabled: boolean; clientId: string }> => {
  try {
    const res = await fetch('/api/auth/google/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("Error fetching public Google Auth config:", error);
  }
  return { enabled: false, clientId: '' };
};

export interface FirebaseConfigSettings {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

const defaultFirebaseConfig: FirebaseConfigSettings = {
  apiKey: "AIzaSyC6MuncgZP-yn3mdwjjk9syG9ffO4OXDYs",
  authDomain: "watch-wds.firebaseapp.com",
  projectId: "watch-wds",
  storageBucket: "watch-wds.firebasestorage.app",
  messagingSenderId: "337562835555",
  appId: "1:337562835555:web:5d32edc32d1d0652e0b656",
  measurementId: "G-M0G8P558DZ"
};

export const getFirebaseConfigSettings = () => fetchSetting<FirebaseConfigSettings>('firebase_config', defaultFirebaseConfig);
export const saveFirebaseConfigSettings = (settings: FirebaseConfigSettings) => saveSetting('firebase_config', settings);

