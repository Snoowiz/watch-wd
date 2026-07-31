/**
 * MySQLAdapter — Drop-in replacement for FirebaseAdminWrapper
 * 
 * Provides the same .collection().doc().get/set/update/delete API
 * but backed by MySQL instead of Firestore.
 * 
 * This allows a gradual migration: server.ts code stays nearly identical,
 * only the import changes.
 */

import pool from './connection.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// ===== JSON settings tables (key-value pattern) =====
const KEY_VALUE_TABLES = new Set([
  'settings', 'payment_settings', 'email_settings', 'email_branding'
]);

// Tables where the primary key column is NOT `id`
const PK_MAP: Record<string, string> = {
  settings: 'key_name',
  payment_settings: 'key_name',
  email_settings: 'key_name',
  email_branding: 'key_name',
  email_templates: 'slug',
  email_template_analytics: 'slug',
  knowledge_base: 'id', // varchar pk
  transactions: 'id',   // varchar pk
};

function getPkColumn(table: string): string {
  return PK_MAP[table] || 'id';
}

function isKeyValueTable(table: string): boolean {
  return KEY_VALUE_TABLES.has(table);
}

/** Parse a value that might be JSON string or already an object */
function parseJson(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

/** For key-value tables, unwrap the `value` JSON column */
function unwrapKVRow(row: any): any {
  if (!row) return null;
  const val = row.value;
  return parseJson(val);
}

/** Build SET clause and values from a data object, skipping undefined */
function buildSetClause(data: Record<string, any>, table: string): { clause: string; values: any[] } {
  const snakeData: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      snakeData[camelToSnake(k, table)] = v;
    }
  }

  const parts: string[] = [];
  const values: any[] = [];
  for (const [col, val] of Object.entries(snakeData)) {
    parts.push(`\`${col}\` = ?`);
    values.push(serializeValue(val));
  }

  return { clause: parts.join(', '), values };
}

function camelToSnake(str: string, tableName?: string): string {
  if (str === 'content') {
    return tableName === 'comments' ? 'text' : 'content';
  }
  // Map of common camelCase -> snake_case overrides used in the app
  const overrides: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    userId: 'user_id',
    matchId: 'match_id',
    categoryId: 'category_id',
    topicId: 'topic_id',
    authorId: 'author_id',
    authorName: 'author_name',
    authorAvatar: 'author_avatar',
    authorRole: 'author_role',
    replyCount: 'reply_count',
    isPinned: 'is_pinned',
    isLocked: 'is_locked',
    isActive: 'is_active',
    isCustom: 'is_custom',
    isRead: 'is_read',
    planId: 'plan_id',
    operatorId: 'operator_id',
    creatorId: 'creator_id',
    embedPrice: 'embed_price',
    publishStatus: 'publish_status',
    accessType: 'access_type',
    ppvPrice: 'ppv_price',
    requiredPlanId: 'required_plan_id',
    scheduledDate: 'scheduled_date',
    liveCommenting: 'live_commenting',
    commentAlignment: 'comment_alignment',
    adSettings: 'ad_settings',
    startTime: 'start_time',
    activeDeviceId: 'active_device_id',
    subscribedMatches: 'subscribed_matches',
    subscribedCategories: 'subscribed_categories',
    durationDays: 'duration_days',
    variablesHint: 'variables_hint',
    templateId: 'template_id',
    versionNumber: 'version_number',
    createdBy: 'created_by',
    lastSentAt: 'last_sent_at',
    expiresAt: 'expires_at',
    planExpiresAt: 'plan_expires_at',
    keyName: 'key_name',
    featuredImage: 'featured_image',
    embedUrl: 'embed_url',
    readingTimeMinutes: 'reading_time_minutes',
    fromName: 'from_name',
    fromEmail: 'from_email',
    replyTo: 'reply_to',
    authUser: 'auth_user',
    authPass: 'auth_pass',
    apiKey: 'api_key',
    userName: 'user_name',
    userAvatar: 'user_avatar',
    username: 'user_name',
    avatar: 'user_avatar',
    timestamp: 'timestamp',
    likedBy: 'liked_by',
    clubId: 'club_id',
    stripeAccountId: 'stripe_account_id',
    stripeOnboardingComplete: 'stripe_onboarding_complete',
    contactEmail: 'contact_email',
    platformFeePercent: 'platform_fee_percent',
    clubSharePercent: 'club_share_percent',
    user_id: 'user_id',
    match_id: 'match_id',
    category_id: 'category_id',
    topic_id: 'topic_id',
    is_pinned: 'is_pinned',
    is_locked: 'is_locked',
    is_active: 'is_active',
    is_custom: 'is_custom',
    is_read: 'is_read',
    created_at: 'created_at',
    updated_at: 'updated_at',
    reply_count: 'reply_count',
  };
  return overrides[str] || str;
}

function snakeToCamel(str: string, tableName?: string): string {
  if (str === 'text') {
    return tableName === 'comments' ? 'content' : 'text';
  }
  const overrides: Record<string, string> = {
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    user_id: 'userId',
    match_id: 'matchId',
    category_id: 'categoryId',
    topic_id: 'topicId',
    author_id: 'authorId',
    author_name: 'authorName',
    author_avatar: 'authorAvatar',
    author_role: 'authorRole',
    reply_count: 'replyCount',
    is_pinned: 'isPinned',
    is_locked: 'isLocked',
    is_active: 'isActive',
    is_custom: 'isCustom',
    is_read: 'isRead',
    plan_id: 'planId',
    operator_id: 'operatorId',
    creator_id: 'creatorId',
    embed_price: 'embedPrice',
    publish_status: 'publishStatus',
    access_type: 'accessType',
    ppv_price: 'ppvPrice',
    required_plan_id: 'requiredPlanId',
    scheduled_date: 'scheduledDate',
    live_commenting: 'liveCommenting',
    comment_alignment: 'commentAlignment',
    ad_settings: 'adSettings',
    start_time: 'startTime',
    active_device_id: 'activeDeviceId',
    subscribed_matches: 'subscribedMatches',
    subscribed_categories: 'subscribedCategories',
    duration_days: 'durationDays',
    variables_hint: 'variablesHint',
    template_id: 'templateId',
    version_number: 'versionNumber',
    created_by: 'createdBy',
    last_sent_at: 'lastSentAt',
    expires_at: 'expiresAt',
    plan_expires_at: 'planExpiresAt',
    key_name: 'keyName',
    featured_image: 'featuredImage',
    embed_url: 'embedUrl',
    reading_time_minutes: 'readingTimeMinutes',
    from_name: 'fromName',
    from_email: 'fromEmail',
    reply_to: 'replyTo',
    auth_user: 'authUser',
    auth_pass: 'authPass',
    api_key: 'apiKey',
    user_name: 'username',
    user_avatar: 'avatar',
    timestamp: 'timestamp',
    liked_by: 'likedBy',
    club_id: 'clubId',
    stripe_account_id: 'stripeAccountId',
    stripe_onboarding_complete: 'stripeOnboardingComplete',
    contact_email: 'contactEmail',
    platform_fee_percent: 'platformFeePercent',
    club_share_percent: 'clubSharePercent',
  };
  return overrides[str] || str;
}

function serializeValue(val: any): any {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(val)) {
    return val.slice(0, 19).replace('T', ' ');
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}

// =============================================
// DocWrapper — mimics Firestore DocumentReference
// =============================================
class DocWrapper {
  constructor(public tableName: string, public id: string) {}

  get ref() { return this; }

  async get(): Promise<{ id: string; exists: boolean; ref: DocWrapper; data: () => any }> {
    const pk = getPkColumn(this.tableName);

    if (isKeyValueTable(this.tableName)) {
      const [rows] = await pool.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
      const arr = rows as RowDataPacket[];
      if (arr.length === 0) {
        return { id: this.id, exists: false, ref: this, data: () => null };
      }
      const unwrapped = unwrapKVRow(arr[0]);
      return { id: this.id, exists: true, ref: this, data: () => unwrapped };
    }

    const [rows] = await pool.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
    const arr = rows as RowDataPacket[];
    if (arr.length === 0) {
      return { id: this.id, exists: false, ref: this, data: () => null };
    }
    const row = { ...arr[0] };
    const mappedRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      let val = v;
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch {}
      }
      const camelKey = snakeToCamel(k, this.tableName);
      mappedRow[camelKey] = val;
      if (camelKey !== k) {
        mappedRow[k] = val;
      }
    }
    if (this.tableName === 'comments') {
      if (row.user_name !== undefined) {
        mappedRow.username = row.user_name;
        mappedRow.userName = row.user_name;
      }
      if (row.user_avatar !== undefined) {
        mappedRow.avatar = row.user_avatar;
        mappedRow.userAvatar = row.user_avatar;
      }
      if (row.text !== undefined) {
        mappedRow.content = row.text;
      }
      if (row.timestamp !== undefined) {
        mappedRow.timestamp = row.timestamp;
        mappedRow.createdAt = row.timestamp;
      }
    }
    return { id: this.id, exists: true, ref: this, data: () => mappedRow };
  }

  async set(data: any, _options?: any): Promise<void> {
    const pk = getPkColumn(this.tableName);

    if (isKeyValueTable(this.tableName)) {
      const jsonVal = JSON.stringify(data);
      await pool.execute(
        `INSERT INTO \`${this.tableName}\` (\`${pk}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [this.id, jsonVal, jsonVal]
      );
      return;
    }

    // For regular tables: UPSERT
    const allData = { ...data };
    const snakeData: Record<string, any> = {};
    for (const [k, v] of Object.entries(allData)) {
      snakeData[camelToSnake(k, this.tableName)] = v;
    }
    // Ensure the PK value is set
    const pkSnake = camelToSnake(pk, this.tableName);
    if (pk === 'id' && !snakeData[pkSnake]) snakeData[pkSnake] = this.id;
    if (pk === 'slug' && !snakeData[pkSnake]) snakeData[pkSnake] = this.id;

    const keys = Object.keys(snakeData);
    const vals = Object.values(snakeData).map(v => serializeValue(v));
    const placeholders = keys.map(() => '?').join(', ');
    const updateParts = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

    const sql = `INSERT INTO \`${this.tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateParts}`;
    await pool.execute(sql, vals);
  }

  async update(data: any): Promise<void> {
    const pk = getPkColumn(this.tableName);

    if (isKeyValueTable(this.tableName)) {
      // Merge update: read existing, merge, write back
      const [rows] = await pool.execute(`SELECT * FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
      const arr = rows as RowDataPacket[];
      let existing: any = {};
      if (arr.length > 0) {
        existing = unwrapKVRow(arr[0]) || {};
      }
      const merged = { ...existing, ...data };
      const jsonVal = JSON.stringify(merged);
      await pool.execute(
        `INSERT INTO \`${this.tableName}\` (\`${pk}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [this.id, jsonVal, jsonVal]
      );
      return;
    }

    const { clause, values } = buildSetClause(data, this.tableName);
    if (!clause) return;
    await pool.execute(`UPDATE \`${this.tableName}\` SET ${clause} WHERE \`${pk}\` = ?`, [...values, this.id]);
  }

  async delete(): Promise<void> {
    const pk = getPkColumn(this.tableName);
    await pool.execute(`DELETE FROM \`${this.tableName}\` WHERE \`${pk}\` = ?`, [this.id]);
  }
}

// =============================================
// CollectionWrapper — mimics Firestore CollectionReference
// =============================================
interface WhereClause { field: string; op: string; value: any; }
interface OrderClause { field: string; dir: string; }

class CollectionWrapper {
  private whereClauses: WhereClause[] = [];
  private orderClauses: OrderClause[] = [];
  private limitVal: number | null = null;

  constructor(public tableName: string) {}

  where(field: string, op: string, value: any): CollectionWrapper {
    const clone = this._clone();
    clone.whereClauses.push({ field: camelToSnake(field, this.tableName), op: mapOp(op), value });
    return clone;
  }

  orderBy(field: string, dir: string = 'asc'): CollectionWrapper {
    const clone = this._clone();
    clone.orderClauses.push({ field: camelToSnake(field, this.tableName), dir: dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC' });
    return clone;
  }

  limit(n: number): CollectionWrapper {
    const clone = this._clone();
    clone.limitVal = n;
    return clone;
  }

  async get(): Promise<{
    empty: boolean;
    size: number;
    docs: Array<{ id: string; ref: DocWrapper; exists: boolean; data: () => any }>;
  }> {
    const pk = getPkColumn(this.tableName);
    let sql = `SELECT * FROM \`${this.tableName}\``;
    const params: any[] = [];

    if (this.whereClauses.length > 0) {
      const conditions = this.whereClauses.map(w => {
        if (w.op === 'IN' && Array.isArray(w.value)) {
          const placeholders = w.value.map(() => '?').join(', ');
          params.push(...w.value);
          return `\`${w.field}\` IN (${placeholders})`;
        }
        params.push(w.value);
        return `\`${w.field}\` ${w.op} ?`;
      });
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (this.orderClauses.length > 0) {
      sql += ' ORDER BY ' + this.orderClauses.map(o => `\`${o.field}\` ${o.dir}`).join(', ');
    }

    if (this.limitVal) {
      sql += ` LIMIT ${this.limitVal}`;
    }

    const [rows] = await pool.execute(sql, params);
    const arr = rows as RowDataPacket[];

    const docs = arr.map(row => {
      const docId = String(row[pk] ?? row.id ?? '');
      const rowData = { ...row };
      const mappedRow: Record<string, any> = {};
      for (const [k, v] of Object.entries(rowData)) {
        let val = v;
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
          try { val = JSON.parse(val); } catch {}
        }
        const camelKey = snakeToCamel(k, this.tableName);
        mappedRow[camelKey] = val;
        if (camelKey !== k) {
          mappedRow[k] = val;
        }
      }
      if (this.tableName === 'comments') {
        if (rowData.user_name !== undefined) {
          mappedRow.username = rowData.user_name;
          mappedRow.userName = rowData.user_name;
        }
        if (rowData.user_avatar !== undefined) {
          mappedRow.avatar = rowData.user_avatar;
          mappedRow.userAvatar = rowData.user_avatar;
        }
        if (rowData.text !== undefined) {
          mappedRow.content = rowData.text;
        }
        if (rowData.timestamp !== undefined) {
          mappedRow.timestamp = rowData.timestamp;
          mappedRow.createdAt = rowData.timestamp;
        }
      }
      return {
        id: docId,
        ref: new DocWrapper(this.tableName, docId),
        exists: true,
        data: () => mappedRow,
      };
    });

    return { empty: docs.length === 0, size: docs.length, docs };
  }

  doc(id?: string): DocWrapper {
    if (id) return new DocWrapper(this.tableName, id);
    // Auto-generate an ID (similar to Firestore auto-ID)
    const autoId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
    return new DocWrapper(this.tableName, autoId);
  }

  async add(data: any): Promise<{ id: string; ref: DocWrapper }> {
    const pk = getPkColumn(this.tableName);
    const allData = { ...data };
    
    let generatedId = '';
    if (pk === 'id' && !allData.id) {
      generatedId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
      allData.id = generatedId;
    }

    const snakeData: Record<string, any> = {};
    for (const [k, v] of Object.entries(allData)) {
      snakeData[camelToSnake(k, this.tableName)] = v;
    }

    const keys = Object.keys(snakeData);
    const vals = Object.values(snakeData).map(v => serializeValue(v));
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO \`${this.tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, vals);
    
    // If we didn't generate an ID, fallback to what we passed or insertId (if auto_increment exists somewhere)
    const finalId = generatedId || allData.id || String((result as ResultSetHeader).insertId);
    return { id: finalId, ref: new DocWrapper(this.tableName, finalId) };
  }

  private _clone(): CollectionWrapper {
    const c = new CollectionWrapper(this.tableName);
    c.whereClauses = [...this.whereClauses];
    c.orderClauses = [...this.orderClauses];
    c.limitVal = this.limitVal;
    return c;
  }
}

function mapOp(firestoreOp: string): string {
  const map: Record<string, string> = {
    '==': '=',
    '!=': '!=',
    '<': '<',
    '<=': '<=',
    '>': '>',
    '>=': '>=',
    'in': 'IN',
    'array-contains': 'LIKE', // simplified
  };
  return map[firestoreOp] || '=';
}

// =============================================
// MySQLAdapter — Main export (replaces FirebaseAdminWrapper)
// =============================================
export class MySQLAdapter {
  collection(path: string): CollectionWrapper {
    return new CollectionWrapper(path);
  }
}

// Stub for admin.firestore.FieldValue / FieldPath compatibility
export const adminCompat = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
    },
    FieldPath: {
      documentId: () => 'id',
    },
  },
};

export default MySQLAdapter;
