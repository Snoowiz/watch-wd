import React, { useState, useEffect } from 'react';
import { getPageSettings, savePageSettings, PageSettings } from '../../services/settingsService';
import { CheckCircle } from 'lucide-react';

export function AdminPagesSettings() {
  const [settings, setSettings] = useState<PageSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'terms' | 'privacy'>('about');
  
  useEffect(() => {
    getPageSettings().then(d => setSettings(d));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await savePageSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6 text-left">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button 
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2 font-bold ${activeTab === 'about' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >About Us</button>
        <button 
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 font-bold ${activeTab === 'terms' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >Terms of Use</button>
        <button 
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 font-bold ${activeTab === 'privacy' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >Privacy Policy</button>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          {activeTab === 'about' && "About Us Content (HTML supported)"}
          {activeTab === 'terms' && "Terms of Use Content (HTML supported)"}
          {activeTab === 'privacy' && "Privacy Policy Content (HTML supported)"}
        </label>
        <textarea 
          value={settings[activeTab]}
          onChange={(e) => {
            setSettings({ ...settings, [activeTab]: e.target.value });
            setIsSaved(false);
          }}
          className="w-full h-96 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Update Page'}
        </button>
      </div>
    </div>
  );
}
