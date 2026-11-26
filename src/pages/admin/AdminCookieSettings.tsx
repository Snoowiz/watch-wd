import React, { useState, useEffect } from 'react';
import { getCookieSettings, saveCookieSettings, CookieSettings } from '../../services/settingsService';
import { CheckCircle, Cookie } from 'lucide-react';

export function AdminCookieSettings() {
  const [settings, setSettings] = useState<CookieSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    getCookieSettings().then(d => setSettings(d));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await saveCookieSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  const update = (patch: Partial<CookieSettings>) => {
    setSettings({ ...settings, ...patch });
    setIsSaved(false);
  };
  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors';

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Enable Cookie Banner</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Show the cookie consent banner to new visitors.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={settings.enabled}
            onChange={(e) => {
              setSettings({ ...settings, enabled: e.target.checked });
              setIsSaved(false);
            }}
            className="sr-only peer" 
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-yellow-500"></div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          Cookie Message
        </label>
        <textarea 
          value={settings.message}
          onChange={(e) => {
            setSettings({ ...settings, message: e.target.value });
            setIsSaved(false);
          }}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors h-24"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Accept Button Text
          </label>
          <input 
            type="text"
            value={settings.acceptText}
            onChange={(e) => {
              setSettings({ ...settings, acceptText: e.target.value });
              setIsSaved(false);
            }}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Reject Button Text
          </label>
          <input 
            type="text"
            value={settings.rejectText}
            onChange={(e) => {
              setSettings({ ...settings, rejectText: e.target.value });
              setIsSaved(false);
            }}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          Manage Choices Button Text
        </label>
        <input
          type="text"
          value={settings.manageText ?? ''}
          placeholder="Manage choices"
          onChange={(e) => update({ manageText: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Preference Categories</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shown on the Cookie preferences page (/privacy/preferences). Essential is always on.</p>
        </div>
        {([
          ['essential', 'Essential'],
          ['analytics', 'Analytics'],
          ['advertising', 'Advertising'],
        ] as const).map(([cat, fallback]) => {
          const titleKey = `${cat}Title` as const;
          const descKey = `${cat}Description` as const;
          return (
            <div key={cat} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{fallback} Title</label>
                <input
                  type="text"
                  value={settings[titleKey] ?? ''}
                  placeholder={fallback}
                  onChange={(e) => update({ [titleKey]: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{fallback} Description</label>
                <textarea
                  value={settings[descKey] ?? ''}
                  onChange={(e) => update({ [descKey]: e.target.value })}
                  className={`${inputClass} h-20`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          Consent Version
        </label>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Raising this number asks every visitor to choose again (for example after the cookie list changes).
        </p>
        <input
          type="number"
          min={1}
          step={1}
          value={settings.consentVersion ?? 1}
          onChange={(e) => update({ consentVersion: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
          className={`${inputClass} max-w-[8rem]`}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 hover:bg-yellow-600 text-slate-900'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Update Cookie Settings'}
        </button>
      </div>
    </div>
  );
}
