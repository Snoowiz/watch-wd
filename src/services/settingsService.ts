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
  about: '<h1>About WDSportz</h1><p>WDSportz brings you the best of local and grassroots sports streaming. Our platform is dedicated to showcasing emerging talent, thrilling local matches, and the raw passion of grassroots sports.</p><p>We believe that every game matters. Whether it is a neighborhood tournament or a regional cup final, WDSportz delivers high-quality live coverage straight to your device. Support local creators, join massive fan communities, and never miss a moment of the action.</p>',
  terms: '<h1>Terms of Use</h1><p>Welcome to WDSportz. By accessing or using our platform, you agree to comply with and be bound by these Terms of Use.</p><h2>1. Acceptance of Terms</h2><p>By using WDSportz to watch live streams, interact in forums, or support creators, you agree to these terms.</p><h2>2. User Content</h2><p>Users and creators are responsible for the content they broadcast and post. No abusive, illegal, or copyrighted material is permitted.</p><h2>3. Subscriptions and Payments</h2><p>All virtual wallets and digital payments processed through WDSportz are final. Please consider before spending your balance to unlock premium streams.</p>',
  privacy: '<h1>Privacy Policy</h1><p>At WDSportz, your privacy is our top priority. We collect minimal data necessary to provide a personalized grassroots sports streaming experience.</p><h2>1. Data We Collect</h2><p>We may collect account information, viewing history, and payment details to improve platform functionality and support local teams and creators.</p><h2>2. How We Use It</h2><p>We use your data to recommend relevant matches, maintain secure payments, and provide better quality services. We never sell your personal information to third parties.</p><h2>3. Your Rights</h2><p>You reserve the right to delete your account, request your data at any time, or modify your notification preferences through your settings.</p>'
};

const defaultSocial: SocialSettings = {
  facebook: 'https://www.facebook.com/WDSportz-Shop-103322221723158/',
  twitter: 'https://twitter.com/wdsportzshop?s=21',
  linkedin: 'https://www.linkedin.com/company/wdsportz/',
  youtube: 'https://www.youtube.com/channel/UCdGTpvqXAQB1dbvlZC8Qk2g',
  instagram: 'https://instagram.com/wdsportz_?igshid=z7rriim5lqi2',
  tiktok: 'https://tiktok.com/@wdsportz',
  rss: 'https://wdsportz.com/feed/'
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
}

const defaultBranding: BrandingSettings = {
  platformName: 'WDSportz',
  favicon: '/favicon.ico'
};

export const getBrandingSettings = async (): Promise<BrandingSettings> => {
  try {
    const docRef = doc(db, 'settings', 'branding');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as BrandingSettings;
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

