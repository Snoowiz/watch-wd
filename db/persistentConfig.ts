import fs from 'fs';
import path from 'path';
import pool from './connection.js';
import type { RowDataPacket } from 'mysql2/promise';
import { cacheEngine } from '../src/utils/cacheManager.js';

const SECURE_DIR = path.join(process.cwd(), 'data', 'secure_settings');

function ensureDirectoryExists(): void {
  try {
    if (!fs.existsSync(SECURE_DIR)) {
      fs.mkdirSync(SECURE_DIR, { recursive: true });
    }
  } catch (err: any) {
    console.error('[PersistentConfig] Failed to create secure storage directory:', err.message);
  }
}

export function isMaskedSecret(val: any): boolean {
  if (typeof val !== 'string') return false;
  return val.includes('••••') || val.includes('****');
}

export function sanitizeKey(key: any): string {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/[^\x21-\x7E]/g, '').replace(/^["']|["']$/g, '').trim();
}

export function maskSecret(val: string): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.length <= 10) return '••••••••';
  return trimmed.substring(0, 8) + '••••••••' + trimmed.substring(trimmed.length - 4);
}

function getFilePath(collection: string, docId: string): string {
  return path.join(SECURE_DIR, `${collection}_${docId}.json`);
}

function readFromFile<T = any>(collection: string, docId: string): T | null {
  try {
    const filePath = getFilePath(collection, docId);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content && content.trim()) {
        return JSON.parse(content) as T;
      }
    }
  } catch (err: any) {
    console.warn(`[PersistentConfig] Error reading file backup for ${collection}/${docId}:`, err.message);
  }
  return null;
}

function writeToFile(collection: string, docId: string, data: any): void {
  try {
    ensureDirectoryExists();
    const filePath = getFilePath(collection, docId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err: any) {
    console.error(`[PersistentConfig] Error writing file backup for ${collection}/${docId}:`, err.message);
  }
}

/**
 * Get document from MySQL with automated failover and self-healing from persistent file storage.
 */
export async function getSecureDocument<T = any>(collection: string, docId: string, pkColumn: string = 'key_name'): Promise<T | null> {
  let dbData: T | null = null;
  let fileData: T | null = readFromFile<T>(collection, docId);

  try {
    const [rows] = await pool.execute(
      `SELECT \`value\` FROM \`${collection}\` WHERE \`${pkColumn}\` = ?`,
      [docId]
    );
    const arr = rows as RowDataPacket[];
    if (arr.length > 0 && arr[0].value) {
      const val = arr[0].value;
      dbData = typeof val === 'string' ? JSON.parse(val) : val;
    }
  } catch (err: any) {
    console.warn(`[PersistentConfig] DB read warning for ${collection}/${docId}:`, err.message);
  }

  // Self-healing: if MySQL is missing the document but persistent file backup exists, restore to MySQL!
  if (!dbData && fileData) {
    console.log(`[PersistentConfig] Restoring ${collection}/${docId} from persistent server-side file mirror...`);
    try {
      const jsonVal = JSON.stringify(fileData);
      await pool.execute(
        `INSERT INTO \`${collection}\` (\`${pkColumn}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
        [docId, jsonVal, jsonVal]
      );
      cacheEngine.invalidateCollection(collection);
    } catch (restoreErr: any) {
      console.error(`[PersistentConfig] Failed to auto-restore to DB:`, restoreErr.message);
    }
    return fileData;
  }

  // If DB data exists, make sure file mirror is in sync
  if (dbData) {
    // If DB data has a masked secret where fileData has the real unmasked secret, repair DB!
    if (collection === 'payment_settings' && docId === 'gateway' && fileData) {
      const dbObj = dbData as any;
      const fileObj = fileData as any;
      let repaired = false;

      if (dbObj.stripe?.secretKey && isMaskedSecret(dbObj.stripe.secretKey) && fileObj.stripe?.secretKey && !isMaskedSecret(fileObj.stripe.secretKey)) {
        dbObj.stripe.secretKey = fileObj.stripe.secretKey;
        repaired = true;
      }
      if (dbObj.paypal?.secret && isMaskedSecret(dbObj.paypal.secret) && fileObj.paypal?.secret && !isMaskedSecret(fileObj.paypal.secret)) {
        dbObj.paypal.secret = fileObj.paypal.secret;
        repaired = true;
      }
      if (dbObj.paystack?.secretKey && isMaskedSecret(dbObj.paystack.secretKey) && fileObj.paystack?.secretKey && !isMaskedSecret(fileObj.paystack.secretKey)) {
        dbObj.paystack.secretKey = fileObj.paystack.secretKey;
        repaired = true;
      }

      if (repaired) {
        try {
          const jsonVal = JSON.stringify(dbObj);
          await pool.execute(
            `INSERT INTO \`${collection}\` (\`${pkColumn}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
            [docId, jsonVal, jsonVal]
          );
        } catch (_) {}
      }
    } else if (collection === 'mux_settings' && docId === 'config' && fileData) {
      const dbObj = dbData as any;
      const fileObj = fileData as any;
      let repaired = false;

      if (dbObj.tokenSecret && isMaskedSecret(dbObj.tokenSecret) && fileObj.tokenSecret && !isMaskedSecret(fileObj.tokenSecret)) {
        dbObj.tokenSecret = fileObj.tokenSecret;
        repaired = true;
      }
      if (dbObj.webhookSecret && isMaskedSecret(dbObj.webhookSecret) && fileObj.webhookSecret && !isMaskedSecret(fileObj.webhookSecret)) {
        dbObj.webhookSecret = fileObj.webhookSecret;
        repaired = true;
      }
      if (dbObj.signingPrivateKey && isMaskedSecret(dbObj.signingPrivateKey) && fileObj.signingPrivateKey && !isMaskedSecret(fileObj.signingPrivateKey)) {
        dbObj.signingPrivateKey = fileObj.signingPrivateKey;
        repaired = true;
      }

      if (repaired) {
        try {
          const jsonVal = JSON.stringify(dbObj);
          await pool.execute(
            `INSERT INTO \`${collection}\` (\`${pkColumn}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
            [docId, jsonVal, jsonVal]
          );
        } catch (_) {}
      }
    }

    // Mirror to file if missing or if file didn't exist
    if (!fileData) {
      writeToFile(collection, docId, dbData);
    }
    return dbData;
  }

  return fileData;
}

/**
 * Save document persistently to both MySQL and persistent file storage.
 */
export async function saveSecureDocument(
  collection: string,
  docId: string,
  data: any,
  pkColumn: string = 'key_name'
): Promise<void> {
  // Write to MySQL
  const jsonVal = JSON.stringify(data);
  await pool.execute(
    `INSERT INTO \`${collection}\` (\`${pkColumn}\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\` = ?`,
    [docId, jsonVal, jsonVal]
  );

  // Mirror to persistent server-side file
  writeToFile(collection, docId, data);

  // Purge all multi-layer caches
  cacheEngine.invalidateCollection(collection);
}

// ============================================================================
// PAYMENT GATEWAY SETTINGS MANAGEMENT
// ============================================================================

export interface StripeGatewayConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  isTestMode: boolean;
  merchantCurrency?: string;
  webhookSecret?: string;
}

export interface PaypalGatewayConfig {
  enabled: boolean;
  clientId: string;
  secret: string;
  secretKey?: string;
  isTestMode: boolean;
  merchantCurrency?: string;
}

export interface PaystackGatewayConfig {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  isTestMode: boolean;
  merchantCurrency?: string;
}

export interface PaymentGatewaySettings {
  stripe: StripeGatewayConfig;
  paypal: PaypalGatewayConfig;
  paystack: PaystackGatewayConfig;
}

const DEFAULT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
  stripe: {
    enabled: false,
    publicKey: '',
    secretKey: '',
    isTestMode: true,
    merchantCurrency: 'GBP',
    webhookSecret: '',
  },
  paypal: {
    enabled: false,
    clientId: '',
    secret: '',
    secretKey: '',
    isTestMode: true,
    merchantCurrency: 'GBP',
  },
  paystack: {
    enabled: false,
    publicKey: '',
    secretKey: '',
    isTestMode: true,
    merchantCurrency: 'NGN',
  },
};

/**
 * Retrieve the active, unmasked payment gateway settings.
 * Prioritizes admin-saved configuration in MySQL/persistent storage;
 * falls back to process.env only if no admin key was saved.
 */
export async function getPaymentGatewaySettings(): Promise<PaymentGatewaySettings> {
  const raw = await getSecureDocument<any>('payment_settings', 'gateway', 'key_name');

  const stripeSecretFromEnv = sanitizeKey(process.env.STRIPE_SECRET_KEY || '');
  const stripePublicFromEnv = sanitizeKey(process.env.STRIPE_PUBLIC_KEY || '');
  const stripeWebhookFromEnv = sanitizeKey(process.env.STRIPE_WEBHOOK_SECRET || '');

  const stripeData = raw?.stripe || {};
  const paypalData = raw?.paypal || {};
  const paystackData = raw?.paystack || {};

  // Clean and sanitize keys
  const stripeSecret = sanitizeKey(
    (!isMaskedSecret(stripeData.secretKey) && stripeData.secretKey) ? stripeData.secretKey : stripeSecretFromEnv
  );
  const stripePublic = sanitizeKey(stripeData.publicKey || stripePublicFromEnv);
  const stripeWebhook = sanitizeKey(
    (!isMaskedSecret(stripeData.webhookSecret) && stripeData.webhookSecret) ? stripeData.webhookSecret : stripeWebhookFromEnv
  );

  const paypalSecret = sanitizeKey(
    (!isMaskedSecret(paypalData.secret) && paypalData.secret) ||
    (!isMaskedSecret(paypalData.secretKey) && paypalData.secretKey) ||
    process.env.PAYPAL_SECRET || ''
  );
  const paypalClient = sanitizeKey(paypalData.clientId || process.env.PAYPAL_CLIENT_ID || '');

  const paystackSecret = sanitizeKey(
    (!isMaskedSecret(paystackData.secretKey) && paystackData.secretKey) || process.env.PAYSTACK_SECRET_KEY || ''
  );
  const paystackPublic = sanitizeKey(paystackData.publicKey || process.env.PAYSTACK_PUBLIC_KEY || '');

  return {
    stripe: {
      enabled: Boolean(stripeData.enabled),
      publicKey: stripePublic,
      secretKey: stripeSecret,
      isTestMode: stripeData.isTestMode !== false,
      merchantCurrency: (stripeData.merchantCurrency || 'GBP').toUpperCase(),
      webhookSecret: stripeWebhook,
    },
    paypal: {
      enabled: Boolean(paypalData.enabled),
      clientId: paypalClient,
      secret: paypalSecret,
      secretKey: paypalSecret,
      isTestMode: paypalData.isTestMode !== false,
      merchantCurrency: (paypalData.merchantCurrency || 'GBP').toUpperCase(),
    },
    paystack: {
      enabled: Boolean(paystackData.enabled),
      publicKey: paystackPublic,
      secretKey: paystackSecret,
      isTestMode: paystackData.isTestMode !== false,
      merchantCurrency: (paystackData.merchantCurrency || 'NGN').toUpperCase(),
    },
  };
}

/**
 * Save updated payment gateway settings securely.
 * - Protects against masked secret overwrites (`••••••••`).
 * - Validates against `mk_` key identifiers.
 * - Sanitizes all keys.
 * - Atomically persists to MySQL and `data/secure_settings/payment_settings_gateway.json`.
 * - Flushes cache layers.
 */
export async function savePaymentGatewaySettings(incoming: Partial<PaymentGatewaySettings>): Promise<PaymentGatewaySettings> {
  const existing = await getPaymentGatewaySettings();

  const stripeIncoming = incoming.stripe || ({} as any);
  const paypalIncoming = incoming.paypal || ({} as any);
  const paystackIncoming = incoming.paystack || ({} as any);

  // Validate Stripe Secret Key
  const rawStripeSecret = typeof stripeIncoming.secretKey === 'string' ? stripeIncoming.secretKey.trim() : '';
  if (rawStripeSecret.startsWith('mk_')) {
    throw new Error(
      "Invalid Stripe Secret Key: An API Key Identifier (starts with 'mk_') was entered. Please enter your actual Stripe Secret Key (starts with 'sk_test_', 'sk_live_', or 'rk_') from the Stripe Dashboard."
    );
  }

  // Preserve existing secrets if incoming is masked or empty
  let finalStripeSecret = existing.stripe.secretKey;
  if (rawStripeSecret && !isMaskedSecret(rawStripeSecret)) {
    finalStripeSecret = sanitizeKey(rawStripeSecret);
  }

  let finalStripeWebhook = existing.stripe.webhookSecret || '';
  const rawWebhook = typeof stripeIncoming.webhookSecret === 'string' ? stripeIncoming.webhookSecret.trim() : '';
  if (rawWebhook && !isMaskedSecret(rawWebhook)) {
    finalStripeWebhook = sanitizeKey(rawWebhook);
  }

  const rawPaypalSecret = typeof paypalIncoming.secret === 'string' ? paypalIncoming.secret.trim() : (typeof paypalIncoming.secretKey === 'string' ? paypalIncoming.secretKey.trim() : '');
  let finalPaypalSecret = existing.paypal.secret;
  if (rawPaypalSecret && !isMaskedSecret(rawPaypalSecret)) {
    finalPaypalSecret = sanitizeKey(rawPaypalSecret);
  }

  const rawPaystackSecret = typeof paystackIncoming.secretKey === 'string' ? paystackIncoming.secretKey.trim() : '';
  let finalPaystackSecret = existing.paystack.secretKey;
  if (rawPaystackSecret && !isMaskedSecret(rawPaystackSecret)) {
    finalPaystackSecret = sanitizeKey(rawPaystackSecret);
  }

  const merged: PaymentGatewaySettings = {
    stripe: {
      enabled: stripeIncoming.enabled !== undefined ? Boolean(stripeIncoming.enabled) : existing.stripe.enabled,
      publicKey: stripeIncoming.publicKey !== undefined ? sanitizeKey(stripeIncoming.publicKey) : existing.stripe.publicKey,
      secretKey: finalStripeSecret,
      isTestMode: stripeIncoming.isTestMode !== undefined ? Boolean(stripeIncoming.isTestMode) : existing.stripe.isTestMode,
      merchantCurrency: (stripeIncoming.merchantCurrency || existing.stripe.merchantCurrency || 'GBP').toUpperCase(),
      webhookSecret: finalStripeWebhook,
    },
    paypal: {
      enabled: paypalIncoming.enabled !== undefined ? Boolean(paypalIncoming.enabled) : existing.paypal.enabled,
      clientId: paypalIncoming.clientId !== undefined ? sanitizeKey(paypalIncoming.clientId) : existing.paypal.clientId,
      secret: finalPaypalSecret,
      secretKey: finalPaypalSecret,
      isTestMode: paypalIncoming.isTestMode !== undefined ? Boolean(paypalIncoming.isTestMode) : existing.paypal.isTestMode,
      merchantCurrency: (paypalIncoming.merchantCurrency || existing.paypal.merchantCurrency || 'GBP').toUpperCase(),
    },
    paystack: {
      enabled: paystackIncoming.enabled !== undefined ? Boolean(paystackIncoming.enabled) : existing.paystack.enabled,
      publicKey: paystackIncoming.publicKey !== undefined ? sanitizeKey(paystackIncoming.publicKey) : existing.paystack.publicKey,
      secretKey: finalPaystackSecret,
      isTestMode: paystackIncoming.isTestMode !== undefined ? Boolean(paystackIncoming.isTestMode) : existing.paystack.isTestMode,
      merchantCurrency: (paystackIncoming.merchantCurrency || existing.paystack.merchantCurrency || 'NGN').toUpperCase(),
    },
  };

  await saveSecureDocument('payment_settings', 'gateway', merged, 'key_name');
  return merged;
}

/**
 * Return masked representation of gateway settings safe for rendering in admin UI.
 */
export async function getAdminPaymentSettings(): Promise<any> {
  const settings = await getPaymentGatewaySettings();
  return {
    stripe: {
      enabled: settings.stripe.enabled,
      publicKey: settings.stripe.publicKey,
      secretKey: settings.stripe.secretKey ? maskSecret(settings.stripe.secretKey) : '',
      hasSecretKey: Boolean(settings.stripe.secretKey),
      isTestMode: settings.stripe.isTestMode,
      merchantCurrency: settings.stripe.merchantCurrency,
      webhookSecret: settings.stripe.webhookSecret ? maskSecret(settings.stripe.webhookSecret) : '',
    },
    paypal: {
      enabled: settings.paypal.enabled,
      clientId: settings.paypal.clientId,
      secret: settings.paypal.secret ? maskSecret(settings.paypal.secret) : '',
      secretKey: settings.paypal.secret ? maskSecret(settings.paypal.secret) : '',
      hasSecret: Boolean(settings.paypal.secret),
      isTestMode: settings.paypal.isTestMode,
      merchantCurrency: settings.paypal.merchantCurrency,
    },
    paystack: {
      enabled: settings.paystack.enabled,
      publicKey: settings.paystack.publicKey,
      secretKey: settings.paystack.secretKey ? maskSecret(settings.paystack.secretKey) : '',
      hasSecretKey: Boolean(settings.paystack.secretKey),
      isTestMode: settings.paystack.isTestMode,
      merchantCurrency: settings.paystack.merchantCurrency,
    },
  };
}

/**
 * Return public, safe representation of gateway settings for client checkout UI.
 */
export async function getPublicPaymentSettings(): Promise<any> {
  const settings = await getPaymentGatewaySettings();
  return {
    stripe: {
      enabled: settings.stripe.enabled,
      publicKey: settings.stripe.publicKey,
      isTestMode: settings.stripe.isTestMode,
      merchantCurrency: settings.stripe.merchantCurrency,
    },
    paypal: {
      enabled: settings.paypal.enabled,
      clientId: settings.paypal.clientId,
      isTestMode: settings.paypal.isTestMode,
      merchantCurrency: settings.paypal.merchantCurrency,
    },
    paystack: {
      enabled: settings.paystack.enabled,
      publicKey: settings.paystack.publicKey,
      isTestMode: settings.paystack.isTestMode,
      merchantCurrency: settings.paystack.merchantCurrency,
    },
  };
}

// ============================================================================
// MUX STREAMING, WATERMARK & SIGNED PLAYBACK SETTINGS
// ============================================================================

export interface MuxWatermarkConfig {
  enabled: boolean;
  disabled?: boolean;
  mode: 'mux_burn_in' | 'player_overlay';
  url: string;
  vertical_align: 'top' | 'middle' | 'bottom';
  vertical_margin: string;
  horizontal_align: 'left' | 'center' | 'right';
  horizontal_margin: string;
  width: string;
  opacity: string;
}

export interface MuxPlatformSettings {
  tokenId: string;
  tokenSecret: string;
  webhookSecret: string;
  rtmpIngestUrl: string;
  signingKeyId: string;
  signingPrivateKey: string;
  defaultPlaybackPolicy: 'public' | 'signed';
  requireSignedForPaidEvents: boolean;
  allowPartnerSelfProvision: boolean;
  defaultTestMode: boolean;
  defaultMaxSessionMinutes: number;
  maxConcurrentStreamsPerClub: number;
  defaultWatermark: MuxWatermarkConfig;
}

export const DEFAULT_MUX_WATERMARK_CONFIG: MuxWatermarkConfig = {
  enabled: false,
  mode: 'mux_burn_in',
  url: '',
  vertical_align: 'top',
  vertical_margin: '4%',
  horizontal_align: 'right',
  horizontal_margin: '4%',
  width: '14%',
  opacity: '85%',
};

function sanitizeSizeMetric(raw: any, fallback: string): string {
  const s = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? `${raw}%` : '';
  if (!s) return fallback;
  if (/^\d+(?:\.\d+)?(?:px|%)$/i.test(s)) return s;
  if (/^\d+(?:\.\d+)?$/.test(s)) return `${s}%`;
  return fallback;
}

export function sanitizePrivateKey(raw: any): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function normalizeWatermarkConfig(input?: any): MuxWatermarkConfig {
  let parsed = input;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }
  const src = parsed && typeof parsed === 'object' ? parsed : {};
  const vAlign = src.vertical_align || src.verticalAlign;
  const hAlign = src.horizontal_align || src.horizontalAlign;
  const mode = src.mode === 'player_overlay' ? 'player_overlay' : 'mux_burn_in';
  const rawUrl = typeof src.url === 'string' ? src.url.trim().slice(0, 2048) : '';

  return {
    enabled: Boolean(src.enabled),
    ...(!src.enabled && src.disabled === true ? { disabled: true } : {}),
    mode,
    url: rawUrl,
    vertical_align: vAlign === 'middle' || vAlign === 'bottom' || vAlign === 'top' ? vAlign : DEFAULT_MUX_WATERMARK_CONFIG.vertical_align,
    vertical_margin: sanitizeSizeMetric(src.vertical_margin ?? src.verticalMargin, DEFAULT_MUX_WATERMARK_CONFIG.vertical_margin),
    horizontal_align: hAlign === 'left' || hAlign === 'center' || hAlign === 'right' ? hAlign : DEFAULT_MUX_WATERMARK_CONFIG.horizontal_align,
    horizontal_margin: sanitizeSizeMetric(src.horizontal_margin ?? src.horizontalMargin, DEFAULT_MUX_WATERMARK_CONFIG.horizontal_margin),
    width: sanitizeSizeMetric(src.width, DEFAULT_MUX_WATERMARK_CONFIG.width),
    opacity: sanitizeSizeMetric(src.opacity, DEFAULT_MUX_WATERMARK_CONFIG.opacity),
  };
}

let cachedMuxPlatformSettings: MuxPlatformSettings | null = null;

export function getCachedMuxPlatformSettings(): MuxPlatformSettings | null {
  return cachedMuxPlatformSettings;
}

export function setCachedMuxPlatformSettingsForTest(settings: MuxPlatformSettings | null): void {
  cachedMuxPlatformSettings = settings;
}

function getDefaultMuxSettingsFromEnv(): MuxPlatformSettings {
  return {
    tokenId: sanitizeKey(process.env.MUX_TOKEN_ID || ''),
    tokenSecret: sanitizeKey(process.env.MUX_TOKEN_SECRET || ''),
    webhookSecret: sanitizeKey(process.env.MUX_WEBHOOK_SECRET || ''),
    rtmpIngestUrl: sanitizeKey(process.env.MUX_RTMP_INGEST_URL || '') || 'rtmps://global-live.mux.com:443/app',
    signingKeyId: sanitizeKey(process.env.MUX_SIGNING_KEY_ID || ''),
    signingPrivateKey: sanitizePrivateKey(process.env.MUX_SIGNING_PRIVATE_KEY || process.env.MUX_PRIVATE_KEY || ''),
    defaultPlaybackPolicy: 'public',
    requireSignedForPaidEvents: false,
    allowPartnerSelfProvision: true,
    defaultTestMode: false,
    defaultMaxSessionMinutes: 240,
    maxConcurrentStreamsPerClub: 1,
    defaultWatermark: { ...DEFAULT_MUX_WATERMARK_CONFIG },
  };
}

/**
 * Retrieve Mux Platform Settings with persistent DB + file-mirror healing and env fallback.
 */
export async function getMuxPlatformSettings(): Promise<MuxPlatformSettings> {
  const envDefaults = getDefaultMuxSettingsFromEnv();
  const doc = await getSecureDocument<Partial<MuxPlatformSettings>>('mux_settings', 'config', 'key_name');

  const merged: MuxPlatformSettings = {
    tokenId: sanitizeKey(doc?.tokenId) || envDefaults.tokenId,
    tokenSecret: sanitizeKey(doc?.tokenSecret) || envDefaults.tokenSecret,
    webhookSecret: sanitizeKey(doc?.webhookSecret) || envDefaults.webhookSecret,
    rtmpIngestUrl: sanitizeKey(doc?.rtmpIngestUrl) || envDefaults.rtmpIngestUrl,
    signingKeyId: sanitizeKey(doc?.signingKeyId) || envDefaults.signingKeyId,
    signingPrivateKey: sanitizePrivateKey(doc?.signingPrivateKey) || envDefaults.signingPrivateKey,
    defaultPlaybackPolicy: doc?.defaultPlaybackPolicy === 'signed' ? 'signed' : 'public',
    requireSignedForPaidEvents: Boolean(doc?.requireSignedForPaidEvents),
    allowPartnerSelfProvision: doc?.allowPartnerSelfProvision !== undefined ? Boolean(doc.allowPartnerSelfProvision) : envDefaults.allowPartnerSelfProvision,
    defaultTestMode: Boolean(doc?.defaultTestMode),
    defaultMaxSessionMinutes: Math.max(15, Math.min(1440, Number(doc?.defaultMaxSessionMinutes) || envDefaults.defaultMaxSessionMinutes)),
    maxConcurrentStreamsPerClub: 1,
    defaultWatermark: normalizeWatermarkConfig(doc?.defaultWatermark),
  };

  cachedMuxPlatformSettings = merged;
  return merged;
}

/**
 * Save Mux Platform Settings safely, protecting stored secrets when masked values are submitted.
 */
export async function saveMuxPlatformSettings(incoming: Partial<MuxPlatformSettings> | any): Promise<MuxPlatformSettings> {
  const existing = await getMuxPlatformSettings();
  const body = incoming && typeof incoming === 'object' ? incoming : {};

  let finalTokenSecret = existing.tokenSecret;
  if (typeof body.tokenSecret === 'string' && body.tokenSecret.trim() && !isMaskedSecret(body.tokenSecret)) {
    finalTokenSecret = sanitizeKey(body.tokenSecret);
  }

  let finalWebhookSecret = existing.webhookSecret;
  if (typeof body.webhookSecret === 'string' && body.webhookSecret.trim() && !isMaskedSecret(body.webhookSecret)) {
    finalWebhookSecret = sanitizeKey(body.webhookSecret);
  }

  let finalSigningPrivateKey = existing.signingPrivateKey;
  if (typeof body.signingPrivateKey === 'string' && body.signingPrivateKey.trim() && !isMaskedSecret(body.signingPrivateKey)) {
    finalSigningPrivateKey = sanitizePrivateKey(body.signingPrivateKey);
  }

  const rawMaxMins = body.defaultMaxSessionMinutes !== undefined ? Number(body.defaultMaxSessionMinutes) : existing.defaultMaxSessionMinutes;

  const merged: MuxPlatformSettings = {
    tokenId: body.tokenId !== undefined ? sanitizeKey(body.tokenId) : existing.tokenId,
    tokenSecret: finalTokenSecret,
    webhookSecret: finalWebhookSecret,
    rtmpIngestUrl: (body.rtmpIngestUrl !== undefined ? sanitizeKey(body.rtmpIngestUrl) : existing.rtmpIngestUrl) || 'rtmps://global-live.mux.com:443/app',
    signingKeyId: body.signingKeyId !== undefined ? sanitizeKey(body.signingKeyId) : existing.signingKeyId,
    signingPrivateKey: finalSigningPrivateKey,
    defaultPlaybackPolicy: body.defaultPlaybackPolicy === 'signed' ? 'signed' : (body.defaultPlaybackPolicy === 'public' ? 'public' : existing.defaultPlaybackPolicy),
    requireSignedForPaidEvents: body.requireSignedForPaidEvents !== undefined ? Boolean(body.requireSignedForPaidEvents) : existing.requireSignedForPaidEvents,
    allowPartnerSelfProvision: body.allowPartnerSelfProvision !== undefined ? Boolean(body.allowPartnerSelfProvision) : existing.allowPartnerSelfProvision,
    defaultTestMode: body.defaultTestMode !== undefined ? Boolean(body.defaultTestMode) : existing.defaultTestMode,
    defaultMaxSessionMinutes: Math.max(15, Math.min(1440, Number.isFinite(rawMaxMins) ? rawMaxMins : 240)),
    maxConcurrentStreamsPerClub: 1,
    defaultWatermark: body.defaultWatermark !== undefined ? normalizeWatermarkConfig(body.defaultWatermark) : existing.defaultWatermark,
  };

  await saveSecureDocument('mux_settings', 'config', merged, 'key_name');
  cachedMuxPlatformSettings = merged;
  return merged;
}

/**
 * Masked representation of Mux Platform Settings safe for admin UI rendering.
 */
export async function getAdminMuxSettings(): Promise<any> {
  const s = await getMuxPlatformSettings();
  return {
    tokenId: s.tokenId,
    tokenSecret: s.tokenSecret ? maskSecret(s.tokenSecret) : '',
    hasTokenSecret: Boolean(s.tokenSecret),
    webhookSecret: s.webhookSecret ? maskSecret(s.webhookSecret) : '',
    hasWebhookSecret: Boolean(s.webhookSecret),
    rtmpIngestUrl: s.rtmpIngestUrl,
    signingKeyId: s.signingKeyId,
    signingPrivateKey: s.signingPrivateKey ? maskSecret(s.signingPrivateKey.replace(/\s+/g, '')) : '',
    hasSigningPrivateKey: Boolean(s.signingPrivateKey),
    isApiConfigured: Boolean(s.tokenId && s.tokenSecret),
    isWebhookConfigured: Boolean(s.webhookSecret),
    isSigningConfigured: Boolean(s.signingKeyId && s.signingPrivateKey),
    defaultPlaybackPolicy: s.defaultPlaybackPolicy,
    requireSignedForPaidEvents: s.requireSignedForPaidEvents,
    allowPartnerSelfProvision: s.allowPartnerSelfProvision,
    defaultTestMode: s.defaultTestMode,
    defaultMaxSessionMinutes: s.defaultMaxSessionMinutes,
    maxConcurrentStreamsPerClub: s.maxConcurrentStreamsPerClub,
    defaultWatermark: s.defaultWatermark,
  };
}
