import { useEffect, useState } from 'react';
import { getCookieSettings, CookieSettings } from '../services/settingsService';
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  ConsentChoice,
  ConsentRecord,
  normaliseConsentVersion,
  readConsent,
  saveConsentChoice,
} from './consent';

// Cookie settings are fetched once per page load and shared by the banner,
// the preferences page and the analytics loader.
let cookieSettingsPromise: Promise<CookieSettings> | null = null;
export function loadCookieSettingsOnce(): Promise<CookieSettings> {
  if (!cookieSettingsPromise) cookieSettingsPromise = getCookieSettings();
  return cookieSettingsPromise;
}

export interface UseConsentResult {
  /** null until cookie settings have loaded */
  settings: CookieSettings | null;
  /** current, valid record; null = not decided (or still loading) */
  record: ConsentRecord | null;
  /** true once settings are loaded, so `record === null` really means undecided */
  ready: boolean;
  save: (choice: ConsentChoice) => ConsentRecord | null;
}

export function useConsent(): UseConsentResult {
  const [settings, setSettings] = useState<CookieSettings | null>(null);
  const [record, setRecord] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    let alive = true;
    loadCookieSettingsOnce().then((s) => {
      if (!alive) return;
      setSettings(s);
      setRecord(readConsent(normaliseConsentVersion(s?.consentVersion)));
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const version = normaliseConsentVersion(settings.consentVersion);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentRecord>).detail;
      setRecord(detail && detail.version >= version ? detail : readConsent(version));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) setRecord(readConsent(version));
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [settings]);

  const save = (choice: ConsentChoice) => {
    if (!settings) return null;
    return saveConsentChoice(choice, normaliseConsentVersion(settings.consentVersion));
  };

  return { settings, record, ready: !!settings, save };
}
