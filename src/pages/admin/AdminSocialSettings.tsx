import React, { useState, useEffect } from 'react';
import { getSocialSettings, saveSocialSettings, SocialSettings } from '../../services/settingsService';
import { CheckCircle } from 'lucide-react';

export function AdminSocialSettings() {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    getSocialSettings().then(d => setSettings(d));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await saveSocialSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6 text-left grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Leave URL blank to hide the social icon from the footer.</p>
      </div>
      {(Object.keys(settings) as Array<keyof SocialSettings>).map(platform => (
        <div key={platform}>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 capitalize">
            {platform} URL
          </label>
          <input 
            type="url"
            value={settings[platform]}
            onChange={(e) => {
              setSettings({ ...settings, [platform]: e.target.value });
              setIsSaved(false);
            }}
            placeholder={`https://${platform}.com/...`}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
          />
        </div>
      ))}
      <div className="md:col-span-2 flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Update Social Settings'}
        </button>
      </div>
    </div>
  );
}
