import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json'; // using the one at the root

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const messaging = (() => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn('Firebase Messaging not supported or blocked in this environment:', e);
  }
  return null;
})();
export const googleProvider = new GoogleAuthProvider();
