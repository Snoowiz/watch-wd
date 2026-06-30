import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatchStore, useCategoryStore, useSettingsStore, Match, useAdStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { 
  Save, X, Image as ImageIcon, Globe, Lock, DollarSign, 
  Calendar, Tag, ChevronRight, Bold, Italic, List, Link as LinkIcon,
  Eye, Code, Layout, Type, Plus, MessageSquare, Clock, Loader2
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaPicker } from '../../components/MediaPicker';
import { compressImage } from '../../lib/imageCompressor';

export function NewMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches = [], addMatch, updateMatch } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { currency } = useSettingsStore();
  
  const isEditing = !!id;
  const existingMatch = isEditing ? matches.find(m => String(m.id) === String(id)) : null;

  const [title, setTitle] = useState(existingMatch?.title || '');
  const [slug, setSlug] = useState(existingMatch?.slug || '');
  const [content, setContent] = useState(existingMatch?.content || '');
  const [description, setDescription] = useState(existingMatch?.description || '');
  const [thumbnail, setThumbnail] = useState(existingMatch?.thumbnail || '');
  const [status, setStatus] = useState<Match['status']>(existingMatch?.status || 'upcoming');
  const [accessType, setAccessType] = useState<'free' | 'ppv' | 'plan'>(existingMatch?.access_type || 'free');
  const [ppvPrice, setPpvPrice] = useState(existingMatch?.ppv_price || 50);
  const [requiredPlanId, setRequiredPlanId] = useState<number | null>(existingMatch?.required_plan_id || null);
  const [plans, setPlans] = useState<any[]>([]);

  const [adSettingsEnabled, setAdSettingsEnabled] = useState(existingMatch?.adSettings?.enabled ?? true);
  const [adFrequencyOverride, setAdFrequencyOverride] = useState(existingMatch?.adSettings?.frequencyOverride || '');
  const [adCampaignIds, setAdCampaignIds] = useState<number[]>(existingMatch?.adSettings?.campaignIds || []);

  const { ads = [] } = useAdStore();

  useEffect(() => {
    // Fetch plans
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error);
  }, []);
  const [selectedCategories, setSelectedCategories] = useState<any[]>((existingMatch?.categories || []).map((c: any) => Number(c)));
  const [seo, setSeo] = useState(existingMatch?.seo || { keywords: '', metaDescription: '' });
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>(existingMatch?.scheduledDate ? 'scheduled' : 'now');
  const [scheduledDate, setScheduledDate] = useState(existingMatch?.scheduledDate || '');
  const [customDate, setCustomDate] = useState(existingMatch?.date ? new Date(existingMatch.date).toISOString().slice(0, 16) : '');
  const [liveCommenting, setLiveCommenting] = useState(existingMatch?.liveCommenting ?? true);
  const [commentAlignment, setCommentAlignment] = useState<'left' | 'center' | 'right'>(existingMatch?.commentAlignment || 'center');
  
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast, updateToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [title]);

  const handleSave = async () => {
    if (!title || !slug) {
      addToast('Please fill in the title and slug.', 'error');
      return;
    }

    setIsSaving(true);
    const toastId = addToast(isEditing ? 'Updating match...' : 'Creating match...', 'loading');

    try {
      // Simulate brief latency for high-quality feel of the spinner
      await new Promise((resolve) => setTimeout(resolve, 800));

      let finalDate;
      if (isEditing) {
        finalDate = customDate ? new Date(customDate).toISOString() : (existingMatch?.date || new Date().toISOString());
      } else {
        finalDate = customDate ? new Date(customDate).toISOString() : (publishMode === 'now' ? new Date().toISOString() : (scheduledDate || new Date().toISOString()));
      }

      let finalThumbnail = thumbnail;
      if (thumbnail && thumbnail.startsWith('data:image/')) {
        finalThumbnail = await compressImage(thumbnail);
      }

      const matchData: Match = {
        id: isEditing ? Number(id) : Date.now(),
        title,
        slug,
        date: finalDate,
        price: accessType === 'ppv' ? ppvPrice : 0, // Fallback for old stores
        access_type: accessType,
        ppv_price: ppvPrice,
        required_plan_id: requiredPlanId,
        embedPrice: ppvPrice * 10, // Default multiplier
        status,
        thumbnail: finalThumbnail || 'https://picsum.photos/seed/default/800/450',
        content,
        description,
        categories: selectedCategories,
        access: accessType === 'free' ? 'free' : 'paid',
        seo,
        scheduledDate: publishMode === 'now' ? '' : scheduledDate,
        liveCommenting,
        commentAlignment,
        adSettings: {
          enabled: adSettingsEnabled,
          frequencyOverride: adFrequencyOverride ? Number(adFrequencyOverride) : undefined,
          campaignIds: adCampaignIds,
        }
      };

      if (isEditing) {
        await updateMatch(Number(id), matchData);
        // Re-fetch matches to ensure store has the latest data from DB
        await useMatchStore.getState().fetchMatches();
        updateToast(toastId, { message: 'Match updated successfully!', type: 'success' });
      } else {
        addMatch(matchData);
        updateToast(toastId, { message: 'Match published successfully!', type: 'success' });
      }

      navigate('/admin/matches');
    } catch (err) {
      console.error('Failed to save match:', err);
      updateToast(toastId, { message: 'Failed to save match. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (catId: any) => {
    const numId = Number(catId);
    setSelectedCategories(prev => 
      prev.some(id => Number(id) === numId) ? prev.filter(id => Number(id) !== numId) : [...prev, numId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/matches')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Match' : 'New Match'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2"
          >
            {isPreviewMode ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreviewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-70 text-slate-900 font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving 
              ? (isEditing ? 'Updating...' : 'Publishing...') 
              : (isEditing ? 'Update Match' : 'Post Match')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Title & Slug */}
          <div className="space-y-4">
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter match title..."
              className="w-full bg-transparent border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-4xl font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
            />
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <Globe className="w-4 h-4" />
              <span>Permalink:</span>
              <span className="text-slate-400">https://watchwds.com/matches/</span>
              <input 
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                onBlur={() => setSlug(prev => prev.replace(/(^-|-$)/g, '').replace(/-+/g, '-'))}
                className="bg-transparent border-none p-0 text-indigo-500 font-medium focus:ring-0 w-auto min-w-[100px]"
              />
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden prose-editor">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                  [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                  ['link', 'image', 'video'],
                  ['clean']
                ],
              }}
            />
          </div>

          {/* Description & Embeds */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Code className="w-5 h-5 text-indigo-500" />
              <h2>Embeds Code</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[200px] flex">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-full min-h-[200px] p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                  placeholder='Paste your embed code here (e.g., <iframe src="..."></iframe>)...'
                />
              </div>
              <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                {description ? (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg" dangerouslySetInnerHTML={{ __html: description }} />
                ) : (
                  <>
                    <Eye className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Embed Preview</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Globe className="w-5 h-5 text-green-500" />
              <h2>SEO Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Focus Keywords</label>
                <input 
                  type="text"
                  value={seo.keywords}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  placeholder="e.g., football, live match, grassroots"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Meta Description</label>
                <textarea 
                  value={seo.metaDescription}
                  onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
                  placeholder="Brief summary for search results..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Thumbnail Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <ImageIcon className="w-5 h-5 text-yellow-500" />
              <h3>Match Thumbnail</h3>
            </div>
            
            <button
              onClick={() => setShowMediaPicker(true)}
              className="w-full relative aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center p-4"
            >
              {thumbnail ? (
                <>
                  <img src={thumbnail} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-xs font-bold">Change Image</p>
                  </div>
                </>
              ) : (
                <>
                  <Plus className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Drag & drop or click to upload<br/>(16:9 Aspect Ratio)</p>
                </>
              )}
            </button>
          </div>

          {/* Access & Pricing */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Lock className="w-5 h-5 text-indigo-500" />
              <h3>Access Control</h3>
            </div>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button 
                onClick={() => setAccessType('free')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accessType === 'free' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Free
              </button>
              <button 
                onClick={() => {
                  if (accessType === 'free') setAccessType('ppv');
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accessType !== 'free' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Paid
              </button>
            </div>

            {accessType !== 'free' && (
              <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => setAccessType('ppv')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accessType === 'ppv' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Pay-Per-View
                </button>
                <button 
                  onClick={() => setAccessType('plan')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accessType === 'plan' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Plan / Subscription
                </button>
              </div>
            )}

            {accessType === 'ppv' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (Requires one-time payment for access)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="number"
                      step="0.01"
                      value={ppvPrice}
                      onChange={(e) => setPpvPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Entering a custom PPV amount means users without a covering plan must pay this amount.
                  </p>
                </div>
              </div>
            )}

            {accessType === 'plan' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Plan</label>
                  <select
                    value={requiredPlanId || ''}
                    onChange={(e) => setRequiredPlanId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                  >
                     <option value="" disabled>Select a plan...</option>
                     {plans.map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Tag className="w-5 h-5 text-green-500" />
              <h3>Categories</h3>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg cursor-pointer transition-colors group">
                  <input 
                    type="checkbox"
                    checked={selectedCategories.some(id => Number(id) === Number(cat.id))}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                </label>
              ))}
            </div>
            <button 
              onClick={() => navigate('/admin/categories')}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add New Category
            </button>
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-48">
                <button 
                  onClick={() => setPublishMode('now')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${publishMode === 'now' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Now
                </button>
                <button 
                  onClick={() => setPublishMode('scheduled')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${publishMode === 'scheduled' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Scheduled
                </button>
              </div>
            </div>

            {publishMode === 'scheduled' ? (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Match Date & Time</label>
                <input 
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-500/20 animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                 </div>
                 <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 leading-tight">
                    Match will be published immediately with current time.
                 </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live Now</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Original Creation / Match Date</label>
              <input 
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
              />
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                Customize the timestamp displayed to users. If left untouched during edits, the original date is perfectly preserved.
              </p>
            </div>
          </div>

          {/* Commenting Settings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <MessageSquare className="w-5 h-5 text-pink-500" />
              <h3>Live Commenting</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Enable Comments</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={liveCommenting}
                  onChange={(e) => setLiveCommenting(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-yellow-500"></div>
              </label>
            </div>
            
            {liveCommenting && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comment Alignment</label>
                <select 
                  value={commentAlignment}
                  onChange={(e) => setCommentAlignment(e.target.value as 'left' | 'center' | 'right')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <h3>Advertisement Settings</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Enable Ads for Free Viewers</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={adSettingsEnabled}
                  onChange={(e) => setAdSettingsEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            {adSettingsEnabled && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Frequency Override (Minutes)</label>
                  <input
                    type="number"
                    value={adFrequencyOverride}
                    onChange={(e) => setAdFrequencyOverride(e.target.value)}
                    placeholder="Global settings used by default"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-colors placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Campaign Overrides (Optional)</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {ads.filter(a => a.status === 'active').map(ad => (
                      <label key={ad.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adCampaignIds.includes(ad.id)}
                          onChange={(e) => setAdCampaignIds(prev =>
                            e.target.checked ? [...prev, ad.id] : prev.filter(id => id !== ad.id)
                          )}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{ad.campaignName}</span>
                      </label>
                    ))}
                    {ads.filter(a => a.status === 'active').length === 0 && (
                      <p className="text-sm text-slate-500">No active campaigns available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMediaPicker && (
        <MediaPicker
            onSelect={(url) => {
              setThumbnail(url);
              setShowMediaPicker(false);
            }}
            onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
