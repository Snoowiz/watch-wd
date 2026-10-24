import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getMessaging, Messaging } from 'firebase/messaging';

export const defaultFirebaseConfig = {
  apiKey: "AIzaSyC6MuncgZP-yn3mdwjjk9syG9ffO4OXDYs",
  authDomain: "watch-wds.firebaseapp.com",
  projectId: "watch-wds",
  storageBucket: "watch-wds.firebasestorage.app",
  messagingSenderId: "337562835555",
  appId: "1:337562835555:web:5d32edc32d1d0652e0b656",
  measurementId: "G-M0G8P558DZ"
};

// Immediate synchronous initialization so `auth` is NEVER null
let firebaseApp: FirebaseApp;
if (getApps().length > 0) {
  firebaseApp = getApp();
} else {
  firebaseApp = initializeApp(defaultFirebaseConfig);
}

export let auth: Auth = getAuth(firebaseApp);
export let messaging: Messaging | null = null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Try initializing messaging if supported in this browser
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(firebaseApp);
  } catch (e) {
    // Silently ignore if push messaging not permitted in iframe or insecure origin
  }
}

export const initializeFirebase = async (): Promise<void> => {
  try {
    const res = await fetch('/api/settings/firebase_config');
    if (!res.ok) return;

    const config = await res.json();
    if (config && config.apiKey && config.apiKey !== defaultFirebaseConfig.apiKey) {
      // Re-initialize with dynamic database settings if different from default
      const app = initializeApp(config, 'dynamic-app');
      auth = getAuth(app);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          messaging = getMessaging(app);
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (e) {
    console.error("Firebase dynamic config fetch warning:", e);
  }
};
