import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Manually instantiate Firestore with databaseId
const db = new Firestore({
  projectId: fbConfig.projectId,
  databaseId: fbConfig.firestoreDatabaseId,
});

async function run() {
  try {
    const snap = await db.collection('users').get();
    console.log('Admin Docs size:', snap.size);
    const docRef = await db.collection('users').add({email: "admin_tester@test.com"});
    console.log("Added doc", docRef.id);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
