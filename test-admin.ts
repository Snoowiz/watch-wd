import fs from 'fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

try {
  const appAdmin = initializeApp({ 
    credential: applicationDefault(),
    projectId: fbConfig.projectId 
  });
  const db = getFirestore(appAdmin, fbConfig.firestoreDatabaseId || "(default)");

  async function test() {
    try {
      const snap = await db.collection("users").limit(1).get();
      console.log("SUCCESS, Docs:", snap.size);
    } catch (e: any) {
      console.error("ERROR 1:", e.message);
    }
  }

  test();
} catch (err: any) {
  console.error("INIT ERROR:", err.message);
}
