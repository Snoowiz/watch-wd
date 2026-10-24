import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseAdminApp: admin.app.App | null = null;

const SERVICE_ACCOUNT_FILE = path.join(process.cwd(), 'data', 'secure_settings', 'firebase_service_account.json');

export function getFirebaseAdmin(): admin.app.App | null {
  if (firebaseAdminApp) return firebaseAdminApp;
  if (admin.apps.length > 0 && admin.apps[0]) {
    firebaseAdminApp = admin.apps[0];
    return firebaseAdminApp;
  }

  let serviceAccount: any = null;

  // 1. Try reading from secure file storage
  try {
    if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
      const fileContent = fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf8');
      if (fileContent.trim()) {
        serviceAccount = JSON.parse(fileContent);
      }
    }
  } catch (err: any) {
    console.warn('[FirebaseAdmin] Could not read service account from file:', err.message);
  }

  // 2. Try environment variable fallback if file is missing
  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (_) {}
  }

  // 3. Initialize Firebase Admin SDK
  try {
    if (serviceAccount && serviceAccount.private_key) {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || "watch-wds"
      });
      console.log(`[FirebaseAdmin] Successfully initialized Firebase Admin SDK for project ${serviceAccount.project_id}`);
    } else {
      console.warn('[FirebaseAdmin] No service account found in secure storage or environment.');
    }
  } catch (initErr: any) {
    if (admin.apps.length > 0 && admin.apps[0]) {
      firebaseAdminApp = admin.apps[0];
    } else {
      console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', initErr.message);
    }
  }

  return firebaseAdminApp;
}

export async function verifyFirebaseIdToken(token: string): Promise<{ email?: string; name?: string; picture?: string; uid?: string } | null> {
  if (!token) return null;
  try {
    const app = getFirebaseAdmin();
    if (!app) return null;
    const decoded = await app.auth().verifyIdToken(token);
    return {
      email: decoded.email,
      name: decoded.name || (decoded as any).displayName || '',
      picture: decoded.picture || (decoded as any).photoURL || '',
      uid: decoded.uid
    };
  } catch (err: any) {
    // If token verification with Firebase fails, return null so caller can attempt fallbacks
    return null;
  }
}
