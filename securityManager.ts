import { query, execute } from "./db/connection.js";
import crypto from "crypto";

export interface SecurityConfig {
  trusted_device_expiry_days: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  enable_suspicious_login_alerts: boolean;
  admin_ip_whitelist: string[];
  enforce_admin_ip_whitelist: boolean;
  enable_device_verification: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
  trusted_device_expiry_days: 60,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
  enable_suspicious_login_alerts: true,
  admin_ip_whitelist: [],
  enforce_admin_ip_whitelist: false,
  enable_device_verification: true,
};

// Simple in-memory cache for IP geolocations
const geoIpCache = new Map<string, { country: string; city: string; timestamp: number }>();

/**
  Extract real client IP address from express request
 */
export function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",");
    const clientIp = ips[0].trim();
    if (clientIp) return clientIp;
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
}

/**
  Parse User-Agent string into human readable format
 */
export function parseBrowserInfo(ua: string | undefined): string {
  if (!ua) return "Unknown Browser";

  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // OS detection
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Browser detection
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  return `${browser} on ${os}`;
}

/**
  Get approximate location details from IP
 */
export async function getLocationFromIp(ip: string): Promise<{ country: string; city: string; locationString: string }> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Local Network", city: "Localhost", locationString: "Local Network (Development)" };
  }

  // Check cache (1 hour expiration)
  const cached = geoIpCache.get(ip);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    const loc = [cached.city, cached.country].filter(Boolean).join(", ") || "Unknown Location";
    return { country: cached.country, city: cached.city, locationString: loc };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success") {
        const country = data.country || "Unknown Country";
        const city = data.city || "Unknown City";
        geoIpCache.set(ip, { country, city, timestamp: Date.now() });
        return { country, city, locationString: `${city}, ${country}` };
      }
    }
  } catch (err) {
    // Fail silently on geo API timeout/error
  }

  return { country: "Unknown Country", city: "Unknown City", locationString: "Unknown Location" };
}

/**
  Generate deterministic device fingerprint hash
 */
export function generateDeviceFingerprint(req: any, clientFingerprint?: string): string {
  if (clientFingerprint && clientFingerprint.length >= 8) {
    if (clientFingerprint.length === 64 && /^[0-9a-f]{64}$/i.test(clientFingerprint)) {
      return clientFingerprint.toLowerCase();
    }
    return crypto.createHash("sha256").update(clientFingerprint).digest("hex");
  }
  const ua = req.headers["user-agent"] || "";
  const acceptLang = req.headers["accept-language"] || "";
  const raw = `${ua}|${acceptLang}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
  Get security configuration from DB
 */
export async function getSecurityConfig(): Promise<SecurityConfig> {
  try {
    const rows = await query("SELECT `value` FROM `security_settings` WHERE `key_name` = 'config'");
    if (rows && rows.length > 0) {
      const val = typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
      return { ...DEFAULT_CONFIG, ...val };
    }
  } catch (e) {
    console.error("Failed to load security config:", e);
  }
  return DEFAULT_CONFIG;
}

/**
  Update security settings in DB
 */
export async function updateSecurityConfig(newConfig: Partial<SecurityConfig>): Promise<SecurityConfig> {
  const current = await getSecurityConfig();
  const merged = { ...current, ...newConfig };
  await execute(
    "INSERT INTO `security_settings` (`key_name`, `value`) VALUES ('config', ?) ON DUPLICATE KEY UPDATE `value` = ?",
    [JSON.stringify(merged), JSON.stringify(merged)]
  );
  return merged;
}

/**
  Check rate limit and lockout state for an email or IP address
 */
export async function checkRateLimit(email: string, ip: string): Promise<{ locked: boolean; remainingAttempts: number; lockoutMinutes: number }> {
  const config = await getSecurityConfig();
  const lockoutWindow = config.lockout_duration_minutes;
  const windowMs = lockoutWindow * 60 * 1000;
  const sinceDate = new Date(Date.now() - windowMs).toISOString().slice(0, 19).replace("T", " ");

  // Count failed attempts from this email or IP in window
  const rows = await query(
    "SELECT COUNT(*) as count FROM `login_attempts` WHERE (`email` = ? OR `ip_address` = ?) AND `success` = 0 AND `created_at` >= ?",
    [email, ip, sinceDate]
  );

  const failedCount = rows[0]?.count || 0;
  if (failedCount >= config.max_login_attempts) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockoutMinutes: lockoutWindow,
    };
  }

  return {
    locked: false,
    remainingAttempts: Math.max(0, config.max_login_attempts - failedCount),
    lockoutMinutes: lockoutWindow,
  };
}

/**
  Record a login attempt (success or failure)
 */
export async function recordLoginAttempt(email: string, ip: string, ua: string, success: boolean, reason: string = ""): Promise<void> {
  try {
    const id = "att_" + crypto.randomBytes(12).toString("hex");
    await execute(
      "INSERT INTO `login_attempts` (`id`, `email`, `ip_address`, `user_agent`, `success`, `reason`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [id, email, ip, ua, success ? 1 : 0, reason]
    );
  } catch (err) {
    console.error("Failed to record login attempt:", err);
  }
}

/**
  Check if a device is trusted for a user
 */
export async function isDeviceTrusted(
  userId: string | number,
  fingerprint: string,
  expiryDays: number
): Promise<{ trusted: boolean; deviceId?: string; reason?: string }> {
  try {
    const cutoffDate = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    
    const rows = await query(
      "SELECT * FROM `trusted_devices` WHERE `user_id` = ? AND `device_fingerprint` = ? AND `is_active` = 1 AND `last_used_at` >= ?",
      [String(userId), fingerprint, cutoffDate]
    );

    if (rows && rows.length > 0) {
      // Update last_used_at timestamp
      await execute("UPDATE `trusted_devices` SET `last_used_at` = NOW() WHERE `id` = ?", [rows[0].id]);
      return { trusted: true, deviceId: rows[0].id };
    }

    return { trusted: false, reason: "New or expired device" };
  } catch (e) {
    console.error("Error checking trusted device:", e);
    return { trusted: false, reason: "Database check error" };
  }
}

/**
  Detect high-risk login signals (different country, new browser, repeated failed attempts)
 */
export async function detectRiskSignals(
  userId: string | number,
  req: any,
  currentCountry: string,
  fingerprint: string
): Promise<{ highRisk: boolean; signals: string[] }> {
  const signals: string[] = [];

  try {
    // Check if user has previously logged in from a different country
    const countryRows = await query(
      "SELECT DISTINCT `country` FROM `trusted_devices` WHERE `user_id` = ? AND `country` != '' AND `country` != 'Unknown Country' AND `country` != 'Local Network'",
      [String(userId)]
    );

    if (countryRows && countryRows.length > 0 && currentCountry && currentCountry !== "Unknown Country" && currentCountry !== "Local Network") {
      const knownCountries = countryRows.map((r: any) => r.country);
      if (!knownCountries.includes(currentCountry)) {
        signals.push(`New login country detected: ${currentCountry} (previously seen: ${knownCountries.join(", ")})`);
      }
    }

    // Check failed attempts for this user in last 1 hour
    const failedRows = await query(
      "SELECT COUNT(*) as count FROM `login_attempts` WHERE `email` = (SELECT `email` FROM `users` WHERE `id` = ?) AND `success` = 0 AND `created_at` >= DATE_SUB(NOW(), INTERVAL 1 HOUR)",
      [String(userId)]
    );

    const recentFailures = failedRows[0]?.count || 0;
    if (recentFailures >= 3) {
      signals.push(`${recentFailures} failed login attempts in the past hour`);
    }

    // Check if user has any trusted devices at all
    const deviceCountRows = await query(
      "SELECT COUNT(*) as count FROM `trusted_devices` WHERE `user_id` = ? AND `is_active` = 1",
      [String(userId)]
    );
    if ((deviceCountRows[0]?.count || 0) === 0) {
      signals.push("First time logging in from this browser environment");
    }

  } catch (e) {
    console.error("Error detecting risk signals:", e);
  }

  return {
    highRisk: signals.length > 0,
    signals,
  };
}

/**
  Generate and store a 6-digit verification code
 */
export async function createVerificationCode(
  userId: string | number,
  fingerprint: string,
  ip: string,
  browserInfo: string,
  locationInfo: string
): Promise<{ codeId: string; code: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const id = "vc_" + crypto.randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "); // 10 mins

  // Invalidate previous unexpired codes for this user/device
  await execute(
    "UPDATE `verification_codes` SET `used` = 1 WHERE `user_id` = ? AND `used` = 0",
    [String(userId)]
  );

  await execute(
    "INSERT INTO `verification_codes` (`id`, `user_id`, `code`, `device_fingerprint`, `ip_address`, `browser_info`, `location_info`, `expires_at`, `used`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())",
    [id, String(userId), code, fingerprint, ip, browserInfo, locationInfo, expiresAt]
  );

  return { codeId: id, code };
}

/**
  Save or update a trusted device record cleanly
 */
export async function saveOrUpdateTrustedDevice(
  userId: string | number,
  fingerprint: string,
  deviceName: string,
  ip: string,
  country: string,
  city: string
): Promise<string> {
  const existing = await query(
    "SELECT `id` FROM `trusted_devices` WHERE `user_id` = ? AND `device_fingerprint` = ?",
    [String(userId), fingerprint]
  );

  if (existing && existing.length > 0) {
    const devId = existing[0].id;
    await execute(
      "UPDATE `trusted_devices` SET `is_active` = 1, `last_used_at` = NOW(), `ip_address` = ?, `country` = ?, `city` = ?, `device_name` = ? WHERE `id` = ?",
      [ip, country, city, deviceName, devId]
    );
    return devId;
  } else {
    const devId = "dev_" + crypto.randomBytes(12).toString("hex");
    await execute(
      "INSERT INTO `trusted_devices` (`id`, `user_id`, `device_fingerprint`, `device_name`, `ip_address`, `country`, `city`, `last_used_at`, `created_at`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)",
      [devId, String(userId), fingerprint, deviceName, ip, country, city]
    );
    return devId;
  }
}

/**
  Validate a verification code and mark device as trusted
 */
export async function verifyCodeAndTrustDevice(
  userId: string | number,
  code: string,
  fingerprint: string,
  deviceName: string,
  ip: string,
  country: string,
  city: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = await query(
      "SELECT * FROM `verification_codes` WHERE `user_id` = ? AND `code` = ? AND `used` = 0 AND `expires_at` > NOW() ORDER BY `created_at` DESC LIMIT 1",
      [String(userId), code.trim()]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: "Invalid or expired verification code" };
    }

    const codeRecord = rows[0];

    // Mark code as used
    await execute("UPDATE `verification_codes` SET `used` = 1 WHERE `id` = ?", [codeRecord.id]);

    // Save or update device as trusted
    await saveOrUpdateTrustedDevice(userId, fingerprint, deviceName, ip, country, city);

    return { success: true };
  } catch (e: any) {
    console.error("Error verifying code and trusting device:", e);
    return { success: false, error: e.message || "Verification failed" };
  }
}

/**
  Check IP Whitelist for admin accounts
 */
export async function isIpWhitelistedForAdmin(ip: string): Promise<boolean> {
  const config = await getSecurityConfig();
  if (!config.enforce_admin_ip_whitelist || !config.admin_ip_whitelist || config.admin_ip_whitelist.length === 0) {
    return true; // Whitelist not enforced or empty
  }

  return config.admin_ip_whitelist.some((allowedIp) => {
    const cleanAllowed = allowedIp.trim();
    if (cleanAllowed === ip) return true;
    if (cleanAllowed === "*" || cleanAllowed === "127.0.0.1" && (ip === "::1" || ip === "127.0.0.1")) return true;
    return false;
  });
}
