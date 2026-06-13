import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = admin.initializeApp({
  projectId: serviceAccount.projectId,
});

const db = getFirestore(app, serviceAccount.firestoreDatabaseId);

async function run() {
  try {
    const snap = await db.collection('users').limit(1).get();
    console.log('Docs found:', snap.size);
  } catch (e: any) {
    console.error('Error:', e);
  }
}
run();
