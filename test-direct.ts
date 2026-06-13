import "dotenv/config";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const fc = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(fc);
const db = getFirestore(app, fc.firestoreDatabaseId);

async function test() {
  const snap = await getDocs(collection(db, "features"));
  console.log(snap.docs.length);
}
test().catch(e => console.log("ERR", e.message));
