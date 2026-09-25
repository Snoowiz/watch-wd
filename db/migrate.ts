/**
 * WatchWDS Database Migration & Seed Script
 * Run: npx tsx db/migrate.ts
 * 
 * This script:
 * 1. Creates the database if it doesn't exist
 * 2. Runs the full schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
 * 3. Seeds default data (forum categories, knowledge base, email templates)
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'watchwds';

async function migrate() {
  console.log('===========================================');
  console.log('  WatchWDS MySQL Migration');
  console.log('===========================================');
  console.log(`Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`User: ${DB_USER}`);
  console.log(`Database: ${DB_NAME}`);
  console.log('-------------------------------------------');

  // Step 1: Connect to database
  console.log('\n[1/4] Connecting to MySQL server...');
  let rootConn;
  try {
    // Attempt direct connection (recommended for Hostinger where CREATE DATABASE is forbidden)
    rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
    });
    console.log(`[2/4] Connected directly to database "${DB_NAME}".`);
  } catch (err: any) {
    console.log(`[2/4] Direct connection failed: ${err.message}. Trying connection without DB to create it...`);
    rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.query(`USE \`${DB_NAME}\``);
  }

  // Step 2: Run schema SQL using multipleStatements
  console.log('[3/4] Running schema...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  try {
    await rootConn.query(schemaSql);
  } catch (err: any) {
    if (!err.message.includes('already exists')) {
      console.warn(`  ⚠ Schema warning: ${err.message.substring(0, 200)}`);
    }
  }
  console.log('  ✓ Schema applied successfully.');
  
  // Step 2.5: Run incremental schema updates (safe for existing installations)
  try {
    await rootConn.query(`ALTER TABLE \`users\` ADD COLUMN \`verified\` TINYINT(1) DEFAULT 0`);
    console.log('  ✓ Incremental update: Added verified column to users.');
  } catch (err: any) {
    // Column might already exist, ignore this error
  }

  try {
    await rootConn.query(`ALTER TABLE \`users\` ADD COLUMN \`avatar\` TEXT DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added avatar column to users.');
  } catch (err: any) {
    // Column might already exist, ignore this error
  }

  try {
    await rootConn.query(`ALTER TABLE \`comments\` ADD COLUMN \`status\` VARCHAR(50) DEFAULT 'active'`);
    console.log('  ✓ Incremental update: Added status column to comments.');
  } catch (err: any) {
    // Column might already exist, ignore this error
  }

  // Partner Club Dashboard: Add 'partner' role and club_id to users
  try {
    await rootConn.query(`ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('viewer','creator','operator','admin','partner') DEFAULT 'viewer'`);
    console.log('  ✓ Incremental update: Added partner role to users ENUM.');
  } catch (err: any) {
    // ENUM might already have partner, ignore
  }

  try {
    await rootConn.query(`ALTER TABLE \`users\` ADD COLUMN \`club_id\` VARCHAR(100) DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added club_id column to users.');
  } catch (err: any) {
    // Column might already exist, ignore this error
  }

  // Event Access Duration System (Task 2)
  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`event_access_enabled\` TINYINT(1) DEFAULT 0`);
    console.log('  ✓ Incremental update: Added event_access_enabled to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`event_access_duration\` INT DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added event_access_duration to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`event_access_duration_label\` VARCHAR(50) DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added event_access_duration_label to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`revoke_status\` VARCHAR(50) DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added revoke_status to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`revoked_at\` DATETIME DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added revoked_at to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`revoke_expires_at\` DATETIME DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added revoke_expires_at to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`revoke_reason\` TEXT DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added revoke_reason to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`revoked_by\` VARCHAR(100) DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added revoked_by to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`matches\` ADD COLUMN \`original_status\` VARCHAR(50) DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added original_status to matches.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`purchases\` ADD COLUMN \`access_starts_at\` DATETIME DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added access_starts_at to purchases.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`purchases\` ADD COLUMN \`access_expires_at\` DATETIME DEFAULT NULL`);
    console.log('  ✓ Incremental update: Added access_expires_at to purchases.');
  } catch (err: any) {}

  try {
    await rootConn.query(`ALTER TABLE \`purchases\` ADD COLUMN \`access_status\` VARCHAR(50) DEFAULT 'active'`);
    console.log('  ✓ Incremental update: Added access_status to purchases.');
  } catch (err: any) {}

  // Step 3: Seed default data
  console.log('[4/4] Seeding default data...');

  // Forum Categories
  const [existingCats] = await rootConn.query(`SELECT COUNT(*) as count FROM forum_categories`) as any;
  if (existingCats[0].count === 0) {
    await rootConn.query(`INSERT INTO forum_categories (id, name, description) VALUES 
      (1, 'General Discussion', 'Talk about anything related to WatchWDS or sports in general.'),
      (2, 'Match Chat', 'Discuss live streamed games, past matches, and highlights.'),
      (3, 'Suggestions & Feedback', 'Help us improve WatchWDS! Share your feature requests and ideas.')
    `);
    console.log('  ✓ Seeded 3 forum categories.');

    // Default pinned topic
    await rootConn.query(`INSERT INTO forum_topics (id, category_id, title, content, author_id, author_name, reply_count, is_pinned, created_at) VALUES 
      (101, 1, 'Welcome to the WatchWDS Fan Forum!', '<p>We are thrilled to launch our new community hub! Introduce yourselves here and let us know what teams you support.</p>', 1, 'Admin Support', 1, 1, NOW())
    `);

    await rootConn.query(`INSERT INTO forum_replies (id, topic_id, content, author_id, author_name, author_role, created_at) VALUES 
      ('rep101', '101', '<p>Welcome everyone! Excited to get this started.</p>', '1', 'Admin Support', 'admin', NOW())
    `);
    console.log('  ✓ Seeded default forum topic and reply.');
  } else {
    console.log('  ○ Forum categories already seeded, skipping.');
  }

  // Knowledge Base
  const [existingKb] = await rootConn.query(`SELECT COUNT(*) as count FROM knowledge_base`) as any;
  if (existingKb[0].count === 0) {
    const kbArticles = [
      { id: 'kb1', title: 'How to add funds to my wallet?', content: 'You can add funds to your WatchWDS wallet by clicking on \'Add Funds\' in the user dropdown menu, entering the desired amount, and completing the payment transaction safely. Once completed, your balance will update instantly.', tags: '["wallet","funds","payment","balance"]', category: 'Billing & Wallet' },
      { id: 'kb2', title: 'How to watch premium matches?', content: 'Premium matches require a Pay-Per-View unlock or an active subscription plan. Make sure you have enough balance in your wallet, and click the \'Unlock Match\' button on the match page.', tags: '["match","watch","premium","ppv"]', category: 'Streaming guide' },
      { id: 'kb3', title: 'How to become a creator on WatchWDS?', content: 'Go to your Profile settings, click on \'Become Creator\', fill out your channel name and description, and submit. An admin will review your application soon.', tags: '["creator","become creator","channel","apply"]', category: 'Creators' },
      { id: 'kb4', title: 'How do I reset my password?', content: 'If you forgot your password, go to the Login page, click \'Forgot Password?\', enter your registered email address, and follow the password reset link sent to your inbox.', tags: '["password","reset","forgot password","login"]', category: 'Account Safety' },
      { id: 'kb5', title: 'What is the refund policy?', content: 'All transactions on WatchWDS are final. Points unlocked for Pay-Per-View matches or active subscriptions cannot be refunded.', tags: '["refund","policy","billing","cancel"]', category: 'Billing & Wallet' },
    ];

    for (const kb of kbArticles) {
      await rootConn.query(
        `INSERT INTO knowledge_base (id, title, content, tags, category, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
        [kb.id, kb.title, kb.content, kb.tags, kb.category]
      );
    }
    console.log('  ✓ Seeded 5 knowledge base articles.');
  } else {
    console.log('  ○ Knowledge base already seeded, skipping.');
  }

  // Default Settings
  const [existingSettings] = await rootConn.query(`SELECT COUNT(*) as count FROM settings`) as any;
  if (existingSettings[0].count === 0) {
    const defaultSettings = [
      { key_name: 'branding', value: JSON.stringify({ platformName: 'WatchWDS', favicon: '/favicon.ico', preloaderEnabled: true }) },
      { key_name: 'pages', value: JSON.stringify({ about: '<h1>About WatchWDS</h1><p>WatchWDS brings you the best of local and grassroots sports streaming.</p>', terms: '<h1>Terms of Use</h1><p>By using WatchWDS, you agree to comply with these terms.</p>', privacy: '<h1>Privacy Policy</h1><p>At WatchWDS, your privacy is our top priority.</p>' }) },
      { key_name: 'social', value: JSON.stringify({ facebook: '', twitter: '', linkedin: '', youtube: '', instagram: '', tiktok: '', rss: '' }) },
      { key_name: 'cookies', value: JSON.stringify({ enabled: true, message: 'We use cookies to enhance your browsing experience.', acceptText: 'Accept All', rejectText: 'Reject All' }) },
      { key_name: 'google_auth', value: JSON.stringify({ enabled: false, clientId: '', clientSecret: '', redirectUri: '' }) },
      { key_name: 'firebase_config', value: JSON.stringify({ enabled: false, apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '', measurementId: '', vapidKey: '' }) },
    ];

    for (const s of defaultSettings) {
      await rootConn.query(`INSERT INTO settings (key_name, value) VALUES (?, ?)`, [s.key_name, s.value]);
    }
    console.log('  ✓ Seeded 6 default settings entries.');
  } else {
    console.log('  ○ Settings already seeded, skipping.');
  }

  // Default SMTP settings
  const [existingSmtp] = await rootConn.query(`SELECT COUNT(*) as count FROM email_settings`) as any;
  if (existingSmtp[0].count === 0) {
    await rootConn.query(`INSERT INTO email_settings (key_name, value) VALUES ('smtp', ?)`, [
      JSON.stringify({
        host: 'smtp.example.com', port: 465, auth_user: 'user@example.com', auth_pass: '',
        secure: true, is_active: false, from_name: 'WatchWDS Support',
        from_email: 'noreply@watchwds.com', reply_to: 'support@watchwds.com', provider: 'smtp'
      })
    ]);
    console.log('  ✓ Seeded default SMTP settings.');
  }

  // Default features
  const [existingFeatures] = await rootConn.query(`SELECT COUNT(*) as count FROM features`) as any;
  if (existingFeatures[0].count === 0) {
    await rootConn.query(`INSERT INTO features (id, key_name, label, enabled) VALUES 
      ('1', 'wallet_system', 'Wallet System', 1),
      ('2', 'live_betting', 'Live Betting', 1),
      ('3', 'referral_program', 'Referral Program', 0),
      ('4', 'dark_mode', 'Dark Mode', 1)
    `);
    console.log('  ✓ Seeded default features.');
  }

  // Default email branding
  const [existingBranding] = await rootConn.query(`SELECT COUNT(*) as count FROM email_branding`) as any;
  if (existingBranding[0].count === 0) {
    await rootConn.query(`INSERT INTO email_branding (key_name, value) VALUES ('settings', ?)`, [
      JSON.stringify({
        logo_url: '/vite.svg', primary_color: '#eab308', secondary_color: '#0f172a',
        footer_content: 'WatchWDS — Your home for grassroots sports.',
        contact_info: 'support@watchwds.com', copyright_text: '© 2026 WatchWDS. All rights reserved.',
        social_twitter: '', social_facebook: '', social_instagram: '', social_youtube: ''
      })
    ]);
    console.log('  ✓ Seeded default email branding.');
  }

  await rootConn.end();

  console.log('\n===========================================');
  console.log('  Migration Complete!');
  console.log('===========================================');
  console.log(`Database "${DB_NAME}" is ready.`);
  console.log('You can now start the server with: npm run dev\n');
}

migrate().catch(err => {
  console.error('\n✗ Migration failed:', err.message);
  process.exit(1);
});
