import fs from 'fs';
import { describe, expect, it } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  LEGACY_CONSENT_KEY,
  cookieDomainCandidates,
  isAnalyticsCookieName,
  isConsentGranted,
  normaliseConsentVersion,
  readConsent,
  writeConsent,
} from '../src/utils/consent';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = String(v); },
  };
}

const throwingStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

describe('consent helper', () => {
  it('no record: nothing is allowed', () => {
    const rec = readConsent(1, memoryStorage());
    expect(rec).toBeNull();
    expect(isConsentGranted(rec, 'analytics')).toBe(false);
    expect(isConsentGranted(rec, 'advertising')).toBe(false);
  });

  it('reject: analytics and advertising false', () => {
    const s = memoryStorage();
    writeConsent({ analytics: false, advertising: false }, 1, s);
    const rec = readConsent(1, s);
    expect(rec).not.toBeNull();
    expect(isConsentGranted(rec, 'analytics')).toBe(false);
    expect(isConsentGranted(rec, 'advertising')).toBe(false);
  });

  it('accept: analytics true, stored with the expected shape', () => {
    const s = memoryStorage();
    writeConsent({ analytics: true, advertising: true }, 3, s);
    const stored = JSON.parse(s.data[CONSENT_STORAGE_KEY]);
    expect(Object.keys(stored).sort()).toEqual(['advertising', 'analytics', 'decidedAt', 'version']);
    expect(stored.version).toBe(3);
    expect(isConsentGranted(readConsent(3, s), 'analytics')).toBe(true);
  });

  it('ignores the old watchwds-cookie-consent value', () => {
    for (const legacy of ['accepted', 'rejected']) {
      const s = memoryStorage({ [LEGACY_CONSENT_KEY]: legacy });
      expect(readConsent(1, s)).toBeNull();
    }
  });

  it('a consent version bump makes the visitor undecided again', () => {
    const s = memoryStorage();
    writeConsent({ analytics: true, advertising: false }, 1, s);
    expect(readConsent(1, s)).not.toBeNull();
    expect(readConsent(2, s)).toBeNull();
    expect(isConsentGranted(readConsent(2, s), 'analytics')).toBe(false);
  });

  it('treats malformed records as undecided and survives blocked storage', () => {
    for (const raw of ['{', '"accepted"', '{"analytics":"yes","advertising":false,"version":1,"decidedAt":"x"}', '{"analytics":true}']) {
      expect(readConsent(1, memoryStorage({ [CONSENT_STORAGE_KEY]: raw }))).toBeNull();
    }
    expect(readConsent(1, throwingStorage)).toBeNull();
    expect(() => writeConsent({ analytics: true, advertising: true }, 1, throwingStorage)).not.toThrow();
    expect(writeConsent({ analytics: true, advertising: true }, 1, throwingStorage).saved).toBe(false);
  });

  it('flags withdrawal only when analytics goes from on to off', () => {
    const s = memoryStorage();
    expect(writeConsent({ analytics: false, advertising: false }, 1, s).withdrewAnalytics).toBe(false);
    expect(writeConsent({ analytics: true, advertising: false }, 1, s).withdrewAnalytics).toBe(false);
    expect(writeConsent({ analytics: false, advertising: false }, 1, s).withdrewAnalytics).toBe(true);
    // Also after a version bump, when an old "on" record exists
    writeConsent({ analytics: true, advertising: false }, 1, s);
    expect(writeConsent({ analytics: false, advertising: false }, 2, s).withdrewAnalytics).toBe(true);
  });

  it('normalises the admin consent version', () => {
    expect(normaliseConsentVersion(undefined)).toBe(1);
    expect(normaliseConsentVersion('4')).toBe(4);
    expect(normaliseConsentVersion(0)).toBe(1);
    expect(normaliseConsentVersion('abc')).toBe(1);
  });

  it('identifies GA cookies and the domains to clear them on', () => {
    expect(['_ga', '_ga_ABC123', '_gid', '_gat'].every(isAnalyticsCookieName)).toBe(true);
    expect(['token', 'session', 'gid', '__stripe_mid'].some(isAnalyticsCookieName)).toBe(false);
    expect(cookieDomainCandidates('www.watchwds.com')).toEqual(['', '.www.watchwds.com', '.watchwds.com']);
    expect(cookieDomainCandidates('localhost')).toEqual(['']);
    expect(cookieDomainCandidates('127.0.0.1')).toEqual(['']);
  });
});

describe('analytics loading is consent-gated', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  it('server-rendered HTML no longer includes Google Analytics / GTM', () => {
    const start = server.indexOf('const metaTags = [');
    const end = server.indexOf("].filter(Boolean).join('\\n  ');", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const head = server.slice(start, end);
    expect(head).not.toMatch(/googletagmanager/i);
    expect(head).not.toMatch(/gtag\(/);
    expect(server).not.toMatch(/googletagmanager/i);
  });

  it('the client loader only runs after analytics consent', () => {
    const src = fs.readFileSync('src/components/SEOHeadManager.tsx', 'utf8');
    const guard = src.indexOf("if (!seoSettings || !isConsentGranted(record, 'analytics')) return;");
    expect(guard).toBeGreaterThan(0);
    const loads = [...src.matchAll(/googletagmanager\.com/g)].map((m) => m.index!);
    expect(loads.length).toBeGreaterThan(0);
    expect(loads.every((i) => i > guard)).toBe(true);
  });

  it('the banner no longer requests push permission', () => {
    const banner = fs.readFileSync('src/components/CookieBanner.tsx', 'utf8');
    expect(banner).not.toMatch(/requestNotificationPermission|Notification/);
    expect(banner).not.toContain(LEGACY_CONSENT_KEY);
  });
});
