const Database = require('better-sqlite3');
const db = new Database('watchwds.db');

try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch(e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN dob TEXT');
} catch(e) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN gender TEXT');
} catch(e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    avatar TEXT,
    points INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    active_device_id TEXT,
    phone TEXT,
    dob TEXT,
    gender TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO users_temp SELECT id, email, password, name, role, avatar, points, status, active_device_id, phone, dob, gender, created_at FROM users;
  DROP TABLE users;
  ALTER TABLE users_temp RENAME TO users;
`);

console.log("Migration done");

