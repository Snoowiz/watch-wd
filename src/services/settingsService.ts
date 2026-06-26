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
}

const defaultPages: PageSettings = {
  about: '<h1>About WatchWDS</h1><p>WatchWDS brings you the best of local and grassroots sports streaming. Our platform is dedicated to showcasing emerging talent, thrilling local matches, and the raw passion of grassroots sports.</p><p>We believe that every game matters. Whether it is a neighborhood tournament or a regional cup final, WatchWDS delivers high-quality live coverage straight to your device. Support local creators, join massive fan communities, and never miss a moment of the action.</p>',
  terms: '<h1>Terms of Use</h1><p>Welcome to WatchWDS. By accessing or using our platform, you agree to comply with and be bound by these Terms of Use.</p><h2>1. Acceptance of Terms</h2><p>By using WatchWDS to watch live streams, interact in forums, or support creators, you agree to these terms.</p><h2>2. User Content</h2><p>Users and creators are responsible for the content they broadcast and post. No abusive, illegal, or copyrighted material is permitted.</p><h2>3. Subscriptions and Payments</h2><p>All virtual wallets and digital payments processed through WatchWDS are final. Please consider before spending your balance to unlock premium streams.</p>',
  privacy: '<h1>Privacy Policy</h1><p>At WatchWDS, your privacy is our top priority. We collect minimal data necessary to provide a personalized grassroots sports streaming experience.</p><h2>1. Data We Collect</h2><p>We may collect account information, viewing history, and payment details to improve platform functionality and support local teams and creators.</p><h2>2. How We Use It</h2><p>We use your data to recommend relevant matches, maintain secure payments, and provide better quality services. We never sell your personal information to third parties.</p><h2>3. Your Rights</h2><p>You reserve the right to delete your account, request your data at any time, or modify your notification preferences through your settings.</p>'
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
  rejectText: 'Reject All'
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
  favicon: string;
  preloaderEnabled: boolean;
}

const defaultBranding: BrandingSettings = {
  platformName: 'WatchWDS',
  favicon: '/favicon.ico',
  preloaderEnabled: true
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
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

export const getFirebaseConfigSettings = () => fetchSetting<FirebaseConfigSettings>('firebase_config', defaultFirebaseConfig);
export const saveFirebaseConfigSettings = (settings: FirebaseConfigSettings) => saveSetting('firebase_config', settings);

