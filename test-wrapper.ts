import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, orderBy, limit } from 'firebase/firestore';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const firestoreClient = getFirestore(app, fbConfig.firestoreDatabaseId);

class FirebaseAdminWrapper {
  collection(path: string) {
    return new CollectionWrapper(path);
  }
}

class CollectionWrapper {
  constructor(public path: string, private queryConstraints: any[] = []) {}

  where(field: string, op: any, value: any) {
    return new CollectionWrapper(this.path, [...this.queryConstraints, where(field, op, value)]);
  }

  orderBy(field: string, dir: any = 'asc') {
    return new CollectionWrapper(this.path, [...this.queryConstraints, orderBy(field, dir)]);
  }
  
  limit(n: number) {
    return new CollectionWrapper(this.path, [...this.queryConstraints, limit(n)]);
  }

  async get() {
    const q = query(collection(firestoreClient, this.path), ...this.queryConstraints);
    const snap = await getDocs(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map(d => ({
        id: d.id,
        ref: new DocWrapper(this.path, d.id),
        exists: d.exists(),
        data: () => d.data()
      }))
    };
  }

  doc(id?: string) {
    if (id) return new DocWrapper(this.path, id);
    const d = doc(collection(firestoreClient, this.path));
    return new DocWrapper(this.path, d.id);
  }

  async add(data: any) {
    const ref = await addDoc(collection(firestoreClient, this.path), data);
    return new DocWrapper(this.path, ref.id);
  }
}

class DocWrapper {
  constructor(public path: string, public id: string) {}

  get ref() { return this; }

  async get() {
    const d = doc(firestoreClient, this.path, this.id);
    const snap = await getDoc(d);
    return {
      id: snap.id,
      exists: snap.exists(),
      ref: this,
      data: () => snap.data()
    };
  }

  async set(data: any, options?: any) {
    await setDoc(doc(firestoreClient, this.path, this.id), data, options);
  }

  async update(data: any) {
    await updateDoc(doc(firestoreClient, this.path, this.id), data);
  }

  async delete() {
    await deleteDoc(doc(firestoreClient, this.path, this.id));
  }
}

const db = new FirebaseAdminWrapper();

async function test() {
  const snap = await db.collection('users').limit(1).get();
  console.log("Docs:", snap.size);
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
