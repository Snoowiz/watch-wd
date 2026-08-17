import React, { useState, useEffect } from 'react';
import { useAdStore, Advertisement, useMatchStore, useCategoryStore } from '../../store';
import { Plus, Edit2, Trash2, X, Play, Image as ImageIcon, Code, Link as LinkIcon, Save, Settings, BarChart2 } from 'lucide-react';

export function AdManager() {
  const { ads = [], addAd, updateAd, deleteAd, adIntervalMinutes = 15, setAdIntervalMinutes, impressions = [] } = useAdStore();
  const { matches = [] } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [type, setType] = useState<'video' | 'html' | 'embed' | 'affiliate' | 'adsense'>('html');
  const [code, setCode] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState(1);
  const [weight, setWeight] = useState(1);
  const [targetAll, setTargetAll] = useState(true);
  const [targetMatches, setTargetMatches] = useState<number[]>([]);
  const [targetCategories, setTargetCategories] = useState<number[]>([]);
  const [skipTimer, setSkipTimer] = useState(5);

  const [activeTab, setActiveTab] = useState<'campaigns' | 'analytics'>('campaigns');
  const [tempInterval, setTempInterval] = useState(adIntervalMinutes);

  useEffect(() => {
    setTempInterval(adIntervalMinutes);
  }, [adIntervalMinutes]);

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleDeleteAdClick = (ad: Advertisement) => {
    setConfirmModal({
      show: true,
      title: 'Delete Campaign',
      message: `Are you sure you want to delete the campaign "${ad.campaignName}"? This action is permanent and cannot be undone.`,
      onConfirm: () => {
        deleteAd(ad.id);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleUpdateIntervalConf = () => {
    setConfirmModal({
      show: true,
      title: 'Update Rotation Settings',
      message: `Are you sure you want to change the global ad rotation interval to ${tempInterval} ${tempInterval === 1 ? 'minute' : 'minutes'}? This will affect how often ad overlays trigger for all free users.`,
      onConfirm: () => {
        setAdIntervalMinutes(tempInterval);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const resetForm = () => {
    setCampaignName(''); setStatus('active'); setType('html'); setCode(''); setDestinationUrl('');
    setStartDate(''); setEndDate(''); setPriority(1); setWeight(1); setTargetAll(true);
    setTargetMatches([]); setTargetCategories([]); setSkipTimer(5);
    setIsAdding(false); setEditingAd(null);
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setCampaignName(ad.campaignName); setStatus(ad.status); setType(ad.type); setCode(ad.code);
    setDestinationUrl(ad.destinationUrl || ''); setStartDate(ad.startDate || ''); setEndDate(ad.endDate || '');
    setPriority(ad.priority || 1); setWeight(ad.weight || 1); setTargetAll(ad.targetAll ?? true);
    setTargetMatches(ad.targetMatches || []); setTargetCategories(ad.targetCategories || []);
    setSkipTimer(ad.skipTimer || 0);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code; // In a real environment, sanitize code on the server or use DOMPurify
    const payload = {
      campaignName, status, type, code: cleanCode, destinationUrl, startDate, endDate, priority, weight,
      targetAll, targetMatches, targetCategories, targetLeagues: [], targetClubs: [], skipTimer
    };
    if (editingAd) updateAd(editingAd.id, payload);
    else addAd(payload);
    resetForm();
  };

  const getAdIcon = (t: string) => {
    switch (t) {
      case 'video': return <Play className="w-4 h-4" />;
      case 'html': return <Code className="w-4 h-4" />;
      case 'adsense': return <BarChart2 className="w-4 h-4" />;
      default: return <LinkIcon className="w-4 h-4" />;
    }
  };
  
  const safeAds = ads || [];
  const safeImpressions = impressions || [];
  const totalImpressions = safeImpressions.length;
  const totalClicks = safeImpressions.filter(i => i.clicked).length;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const estRevenue = (totalImpressions * 0.015 + totalClicks * 0.50).toFixed(2); // Estimated ad revenue

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Monetization</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage ad campaigns and view performance</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Campaign
        </button>
      </div>
      
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-6 py-3 font-medium text-sm transition ${activeTab === 'campaigns' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Campaigns
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-medium text-sm transition ${activeTab === 'analytics' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'campaigns' ? (
        <>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pr-16 bg-gradient-to-r from-red-500 text-transparent bg-clip-text h-[1rem]">Global Rotation Settings</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Interval (Minutes):</label>
                <input
                  type="number"
                  value={tempInterval}
                  onChange={(e) => setTempInterval(Number(e.target.value))}
                  className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  min="1"
                />
              </div>
              {tempInterval !== adIntervalMinutes && (
                <button
                  type="button"
                  onClick={handleUpdateIntervalConf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg transition font-semibold"
                >
                  Apply Change
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Sets how often the ad overlay triggers for free viewers globally. Can be overridden in match settings.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500">
                  <th className="p-4">Campaign Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Stats</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {safeAds.map(ad => {
                  const imps = safeImpressions.filter(i => i.adId === ad.id);
                  const clicks = imps.filter(i => i.clicked).length;
                  return (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{ad.campaignName}</div>
                        <div className="text-xs text-slate-500">{ad.targetAll ? 'All Matches' : 'Specific Targets'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 capitalize">
                          {getAdIcon(ad.type)} {ad.type}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${ad.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {ad.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                        {imps.length} imps / {clicks} clicks
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(ad)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteAdClick(ad)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {safeAds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">No campaigns found. Create one to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Impressions</h4>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalImpressions}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Clicks</h4>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalClicks}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Avg CTR</h4>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{avgCTR}%</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10">
              <h4 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">Est. Revenue</h4>
              <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-300">${estRevenue}</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">Campaign Performance</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500">
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Impressions</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">CTR</th>
                  <th className="p-4">Est. Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {safeAds.map(ad => {
                  const imps = safeImpressions.filter(i => i.adId === ad.id);
                  const clicks = imps.filter(i => i.clicked).length;
                  const c_imps = imps.length;
                  const ctr = c_imps > 0 ? ((clicks / c_imps) * 100).toFixed(2) : '0.00';
                  const rev = (c_imps * 0.015 + clicks * 0.50).toFixed(2);
                  return (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-sm">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">{ad.campaignName}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{c_imps}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{clicks}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{ctr}%</td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">${rev}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-start pt-10 pb-10 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-3xl shadow-xl relative border border-slate-200 dark:border-slate-700 my-auto">
            <button onClick={resetForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 pr-8">
              {editingAd ? 'Edit Campaign' : 'Create Campaign'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Campaign Name</label>
                  <input type="text" required value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as 'active'|'inactive')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="html">HTML Ad</option>
                    <option value="embed">Custom Embed (iframe)</option>
                    <option value="video">Video URL (mp4)</option>
                    <option value="affiliate">Affiliate Banner</option>
                    <option value="adsense">AdSense Snippet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination URL (Optional)</label>
                  <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Code / Source</label>
                <textarea 
                  required 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  rows={6}
                  placeholder={type === 'video' ? 'https://example.com/video.mp4' : '<div>...</div> or <script>...'}
                  className="w-full bg-slate-900 text-green-400 font-mono border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Skip Timer (s)</label>
                  <select value={skipTimer} onChange={(e) => setSkipTimer(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value={0}>No Skip</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Run across all matches</span>
                </label>
                
                {!targetAll && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Matches</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {matches.map(m => (
                          <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={targetMatches.includes(m.id)} onChange={(e) => setTargetMatches(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{m.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Categories</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {categories.map(c => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={targetCategories.includes(c.id)} onChange={(e) => setTargetCategories(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={resetForm} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
                <button type="submit" className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                  <Save className="w-5 h-5" /> Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-55 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all duration-300">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
