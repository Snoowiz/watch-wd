import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';

export let auth: Auth | null = null;
export let messaging: Messaging | null = null;
export const googleProvider = new GoogleAuthProvider();

export const initializeFirebase = async (): Promise<void> => {
  if (getApps().length > 0) return; // already initialized
  
  try {
    const res = await fetch('/api/settings/firebase_config');
    if (!res.ok) return;
    
    const config = await res.json();
    if (config && config.apiKey) {
      const app = initializeApp(config);
      auth = getAuth(app);
      
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          messaging = getMessaging(app);
        } catch (e) {
          console.warn('Firebase Messaging not supported or blocked in this environment:', e);
        }
      }
    }
  } catch (e) {
    console.error("Firebase config fetch failed", e);
  }
};
