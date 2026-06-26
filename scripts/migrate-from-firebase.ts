import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import pool from '../db/connection.js';

// Read config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

function camelToSnake(str: string): string {
  const overrides: Record<string, string> = {
    createdAt: 'created_at', updatedAt: 'updated_at', userId: 'user_id',
    matchId: 'match_id', categoryId: 'category_id', topicId: 'topic_id',
    authorId: 'author_id', authorName: 'author_name', authorAvatar: 'author_avatar',
    authorRole: 'author_role', replyCount: 'reply_count', isPinned: 'is_pinned',
    isLocked: 'is_locked', isActive: 'is_active', isCustom: 'is_custom',
    isRead: 'is_read', planId: 'plan_id', operatorId: 'operator_id',
    creatorId: 'creator_id', embedPrice: 'embed_price', publishStatus: 'publish_status',
    accessType: 'access_type', ppvPrice: 'ppv_price', requiredPlanId: 'required_plan_id',
    scheduledDate: 'scheduled_date', liveCommenting: 'live_commenting',
    commentAlignment: 'comment_alignment', donationGoal: 'donation_goal',
    donationRaised: 'donation_raised', overlayOpacity: 'overlay_opacity',
    overlayColor: 'overlay_color', embedUrl: 'embed_url',
    homeTeam: 'home_team', awayTeam: 'away_team',
    walletBalance: 'wallet_balance', isBanned: 'is_banned',
    paymentMethodId: 'payment_method_id', amount: 'amount', currency: 'currency',
    status: 'status'
  };
  if (overrides[str]) return overrides[str];
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function serializeValue(val: any): any {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    return val.slice(0, 19).replace('T', ' ');
  }
  if (typeof val === 'object') {
    if (val.toDate && typeof val.toDate === 'function') {
      return val.toDate().toISOString().slice(0, 19).replace('T', ' ');
    }
    // Handle DocumentReference
    if (val.type === 'document' || (typeof val.path === 'string' && val.id)) {
      return val.id;
    }
    // Handle raw timestamp
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
    }
    return JSON.stringify(val);
  }
  return val;
}

async function migrateCollection(collectionName: string, mysqlTable: string, isJson: boolean = false, isStringId: boolean = false) {
  console.log(`Migrating ${collectionName} -> ${mysqlTable}...`);
  const snap = await getDocs(collection(firestore, collectionName));
  
  if (snap.empty) {
    console.log(`- Collection ${collectionName} is empty. Skipping.`);
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;
    
    try {
      if (isJson) {
        // e.g. settings table
        await pool.execute(
          `INSERT INTO \`${mysqlTable}\` (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?`,
          [id, JSON.stringify(data), JSON.stringify(data)]
        );
      } else {
        const rowData: Record<string, any> = isStringId ? { id } : { id: Number(id) || id };
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'id') {
            rowData[camelToSnake(key)] = serializeValue(value);
          }
        }
        
        const cols = Object.keys(rowData);
        const placeholders = cols.map(() => '?').join(', ');
        const updates = cols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
        const values = cols.map(c => rowData[c]);
        
        const sql = `INSERT INTO \`${mysqlTable}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
        await pool.execute(sql, values);
      }
    } catch (e: any) {
      console.warn(`  - Failed to insert ${collectionName} doc ${id}: ${e.message}`);
    }
  }
  
  console.log(`- Migrated ${snap.size} documents in ${collectionName}.`);
}

async function run() {
  console.log('Starting migration from Firebase to MySQL...');
  
  await migrateCollection('users', 'users', false, true); // id might be string originally or auto increment
  await migrateCollection('matches', 'matches', false, true);
  await migrateCollection('settings', 'settings', true);
  await migrateCollection('comments', 'comments', false, true);
  await migrateCollection('forum_topics', 'forum_topics', false, true);
  await migrateCollection('forum_categories', 'forum_categories', false, true);
  await migrateCollection('blog_posts', 'blog_posts', false, true);
  await migrateCollection('blog_categories', 'blog_categories', false, true);
  await migrateCollection('creators', 'creators', false, true);
  await migrateCollection('transactions', 'transactions', false, true);
  await migrateCollection('support_tickets', 'support_tickets', false, true);
  await migrateCollection('saved_matches', 'saved_matches', false, true);
  
  console.log('Migration completed successfully!');
  process.exit(0);
}

run().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
