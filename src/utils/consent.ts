/**
 * Cookie / tracking consent record.
 *
 * Stored in localStorage under CONSENT_STORAGE_KEY as
 *   { version, analytics, advertising, decidedAt }
 *
 * - No record, an unreadable record, or a record made under an older `consentVersion`
 *   (admin-controlled, Admin > Settings > Cookie Banner) means "not decided": nothing
 *   consent-requiring may load and the banner asks again.
 * - The legacy key `watchwds-cookie-consent` is deliberately ignored, so everyone is asked again.
 */

export const CONSENT_STORAGE_KEY = 'watchwds-consent-v1';
export const LEGACY_CONSENT_KEY = 'watchwds-cookie-consent';
/** Fired on window after the record changes (same tab). */
export const CONSENT_CHANGED_EVENT = 'watchwds:consent-changed';

export type ConsentCategory = 'analytics' | 'advertising';

export interface ConsentRecord {
  version: number;
  analytics: boolean;
  advertising: boolean;
  decidedAt: string;
}

export interface ConsentChoice {
  analytics: boolean;
  advertising: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Normalises the admin-configured version; anything invalid counts as 1. */
export function normaliseConsentVersion(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Parses a stored value. Returns null for anything that is not a valid record. */
export function parseConsentRecord(raw: string | null | undefined): ConsentRecord | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (
      !o || typeof o !== 'object' ||
      typeof o.analytics !== 'boolean' || typeof o.advertising !== 'boolean' ||
      typeof o.decidedAt !== 'string' || !Number.isFinite(Number(o.version))
    ) return null;
    return { version: Number(o.version), analytics: o.analytics, advertising: o.advertising, decidedAt: o.decidedAt };
  } catch {
    return null;
  }
}

/** The stored record regardless of version (used to detect withdrawal). */
export function readStoredConsent(storage: StorageLike | null = defaultStorage()): ConsentRecord | null {
  try {
    return parseConsentRecord(storage?.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The record if it is valid for the current consent version, otherwise null (= undecided). */
export function readConsent(currentVersion: number, storage: StorageLike | null = defaultStorage()): ConsentRecord | null {
  const rec = readStoredConsent(storage);
  if (!rec) return null;
  return rec.version < normaliseConsentVersion(currentVersion) ? null : rec;
}

/** True only when a current, explicit choice allows the category. */
export function isConsentGranted(record: ConsentRecord | null, category: ConsentCategory): boolean {
  return !!record && record[category] === true;
}

export function buildConsentRecord(choice: ConsentChoice, currentVersion: number, now: Date = new Date()): ConsentRecord {
  return {
    version: normaliseConsentVersion(currentVersion),
    analytics: choice.analytics === true,
    advertising: choice.advertising === true,
    decidedAt: now.toISOString(),
  };
}

/** True when analytics was on in the previous stored record and is off in the new one. */
export function isAnalyticsWithdrawal(previous: ConsentRecord | null, next: ConsentRecord): boolean {
  return !!previous && previous.analytics === true && next.analytics === false;
}

/** Writes the record. Returns it, plus whether analytics consent was withdrawn by this save. */
export function writeConsent(
  choice: ConsentChoice,
  currentVersion: number,
  storage: StorageLike | null = defaultStorage(),
): { record: ConsentRecord; withdrewAnalytics: boolean; saved: boolean } {
  const previous = readStoredConsent(storage);
  const record = buildConsentRecord(choice, currentVersion);
  let saved = false;
  try {
    storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    saved = !!storage;
  } catch {
    saved = false;
  }
  return { record, withdrewAnalytics: isAnalyticsWithdrawal(previous, record), saved };
}

/** Cookie names set by Google Analytics on the first-party domain. */
export function isAnalyticsCookieName(name: string): boolean {
  return name.startsWith('_ga') || name === '_gid';
}

/** Domains to try when deleting a cookie: host-only, then each parent domain (".example.com"). */
export function cookieDomainCandidates(hostname: string): string[] {
  const parts = hostname.split('.').filter(Boolean);
  const out: string[] = [''];
  if (parts.length < 2 || /^\d+$/.test(parts[parts.length - 1])) return out; // localhost / IP
  for (let i = 0; i <= parts.length - 2; i++) out.push('.' + parts.slice(i).join('.'));
  return out;
}

/** Deletes first-party _ga* and _gid cookies for this site. */
export function clearAnalyticsCookies(doc: Document = document): string[] {
  const removed: string[] = [];
  try {
    const names = doc.cookie
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter((n) => n && isAnalyticsCookieName(n));
    const host = doc.location?.hostname || '';
    for (const name of names) {
      for (const domain of cookieDomainCandidates(host)) {
        doc.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
      }
      removed.push(name);
    }
  } catch {
    // cookie access blocked: nothing to remove
  }
  return removed;
}

/**
 * Saves a choice from the banner or the preferences page and applies it:
 * notifies listeners (scripts load on opt-in), and on analytics withdrawal deletes
 * GA cookies and reloads so already-running scripts stop.
 */
export function saveConsentChoice(choice: ConsentChoice, currentVersion: number): ConsentRecord {
  const { record, withdrewAnalytics } = writeConsent(choice, currentVersion);
  if (typeof window === 'undefined') return record;
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
  } catch {
    // ignore
  }
  if (withdrewAnalytics) {
    clearAnalyticsCookies();
    window.location.reload();
  }
  return record;
}
