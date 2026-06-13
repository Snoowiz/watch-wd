import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export const getPageSettings = async (): Promise<PageSettings> => {
  try {
    const docRef = doc(db, 'settings', 'pages');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PageSettings;
    }
  } catch (error) {
    console.error("Error fetching page settings:", error);
  }
  return defaultPages;
};

export const savePageSettings = async (settings: PageSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'pages');
  await setDoc(docRef, settings, { merge: true });
};

export const getSocialSettings = async (): Promise<SocialSettings> => {
  try {
    const docRef = doc(db, 'settings', 'social');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SocialSettings;
    }
  } catch (error) {
    console.error("Error fetching social settings:", error);
  }
  return defaultSocial;
};

export const saveSocialSettings = async (settings: SocialSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'social');
  await setDoc(docRef, settings, { merge: true });
};

export const getCookieSettings = async (): Promise<CookieSettings> => {
  try {
    const docRef = doc(db, 'settings', 'cookies');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as CookieSettings;
    }
  } catch (error) {
    console.error("Error fetching cookie settings:", error);
  }
  return defaultCookie;
};

export const saveCookieSettings = async (settings: CookieSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'cookies');
  await setDoc(docRef, settings, { merge: true });
};

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

export const getBrandingSettings = async (): Promise<BrandingSettings> => {
  try {
    const docRef = doc(db, 'settings', 'branding');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...defaultBranding,
        ...data
      } as BrandingSettings;
    }
  } catch (error) {
    console.error("Error fetching branding settings:", error);
  }
  return defaultBranding;
};

export const saveBrandingSettings = async (settings: BrandingSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'branding');
  await setDoc(docRef, settings, { merge: true });
};

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
    const docRef = doc(db, 'settings', 'google_auth');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
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
  const docRef = doc(db, 'settings', 'google_auth');
  await setDoc(docRef, settings, { merge: true });
};

