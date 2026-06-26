import React, { useState, useEffect } from 'react';
import { FirebaseConfigSettings, getFirebaseConfigSettings, saveFirebaseConfigSettings } from '../../services/settingsService';
import { CheckCircle, Database } from 'lucide-react';

export function AdminFirebaseSettings() {
  const [settings, setSettings] = useState<FirebaseConfigSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getFirebaseConfigSettings()
      .then(data => {
        setSettings(data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaved(true);
    await saveFirebaseConfigSettings(settings);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (isLoading || !settings) return <div className="text-sm text-slate-500">Loading configuration...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm mb-6 border border-blue-100 dark:border-blue-800">
        <p className="font-bold mb-1">Firebase Configuration</p>
        <p>This configuration is used for Google Authentication and Push Notifications on the client side. Ensure all values match your Firebase Console project settings.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            apiKey
          </label>
          <input
            type="text"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="AIzaSy..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            authDomain
          </label>
          <input
            type="text"
            value={settings.authDomain}
            onChange={(e) => setSettings({ ...settings, authDomain: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="your-project.firebaseapp.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            projectId
          </label>
          <input
            type="text"
            value={settings.projectId}
            onChange={(e) => setSettings({ ...settings, projectId: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="your-project-id"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            storageBucket
          </label>
          <input
            type="text"
            value={settings.storageBucket}
            onChange={(e) => setSettings({ ...settings, storageBucket: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="your-project.appspot.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            messagingSenderId
          </label>
          <input
            type="text"
            value={settings.messagingSenderId}
            onChange={(e) => setSettings({ ...settings, messagingSenderId: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="123456789012"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            appId
          </label>
          <input
            type="text"
            value={settings.appId}
            onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="1:123456789012:web:abc123def456"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            measurementId (Optional)
          </label>
          <input
            type="text"
            value={settings.measurementId}
            onChange={(e) => setSettings({ ...settings, measurementId: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
            placeholder="G-ABC123DEF"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
            isSaved
              ? 'border-transparent bg-green-500 text-white'
              : 'border-transparent bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Firebase Configuration'}
        </button>
      </div>
    </div>
  );
}
