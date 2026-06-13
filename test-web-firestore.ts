import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const q = query(collection(db, 'users'), limit(1));
    const snap = await getDocs(q);
    console.log("Success! Docs:", snap.size);
  } catch (e) {
    console.error("Failed:", e);
  }
}
test();
