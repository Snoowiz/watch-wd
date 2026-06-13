import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const db = getFirestore(app, fbConfig.firestoreDatabaseId);

async function run() {
  try {
    const coll = collection(db, 'users');
    const snap = await getDocs(coll);
    console.log('Docs size:', snap.size);
    const d = await addDoc(coll, {email: 'test@admin.com'});
    console.log('Added:', d.id);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
run();
