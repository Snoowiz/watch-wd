import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';
import { useAuthStore, useCreatorStore, useNotificationStore, useCategoryStore, useSettingsStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { 
  Plus, Check, X, FileText, Upload, AlertCircle, Video, Clock,
  Globe, Layout, Type, Tag, Lock, Calendar, MessageSquare, 
  Image as ImageIcon, DollarSign, Eye, Code, Save, Loader2
} from 'lucide-react';
import { MediaPicker } from '../../components/MediaPicker';
import { compressImage } from '../../lib/imageCompressor';

export function StudioDashboard() {
  const { user } = useAuthStore();
  const { creatorContent = [], submitContent, downloadLinks = [], markAsDownloaded, activities = [] } = useCreatorStore();
  const { notifications = [] } = useNotificationStore();
  const { categories = [] } = useCategoryStore();
  const { currencySymbol, currency } = useSettingsStore();
  
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast, updateToast, showConfirm } = useUIStore();
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '', // Main article content (Rich Text)
    description: '', // This will hold the Video URL / Short Desc
    thumbnail: '',
    price: 50,
    access: 'free' as 'free' | 'paid',
    selectedCategories: [1] as number[],
    seo: {
      keywords: '',
      metaDescription: ''
    },
    scheduledDate: '',
    publishMode: 'now' as 'now' | 'scheduled',
    liveCommenting: true,
    commentAlignment: 'center' as 'left' | 'center' | 'right'
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title) {
      setFormData(prev => ({
        ...prev,
        slug: prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
    }
  }, [formData.title]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  if (!user || user.role !== 'creator') return <div className="p-8">Access restricted to creators.</div>;

  const myContent = creatorContent.filter(c => c.creatorId === user.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      addToast('Please enter a title for your submission.', 'error');
      return;
    }

    setIsSaving(true);
    const toastId = addToast('Submitting content for review...', 'loading');
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      let finalThumbnail = formData.thumbnail;
      if (formData.thumbnail && formData.thumbnail.startsWith('data:image/')) {
        finalThumbnail = await compressImage(formData.thumbnail);
      }

      submitContent({ 
        creatorId: user.id, 
        creatorName: user.channelName || user.name, 
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content: formData.content,
        description: formData.description, // Video URL / Short Desc
        url: formData.description, // Mapping to url for compatibility
        thumbnail: finalThumbnail || 'https://picsum.photos/seed/default/800/450',
        price: formData.access === 'free' ? 0 : formData.price,
        access: formData.access,
        categoryId: formData.selectedCategories[0] || 1,
        categories: formData.selectedCategories,
        type: 'youtube', // Default type
        seo: formData.seo,
        scheduledDate: formData.publishMode === 'now' ? '' : formData.scheduledDate,
        liveCommenting: formData.liveCommenting,
        commentAlignment: formData.commentAlignment
      });
      
      // Reset form
      setFormData({ 
        title: '', slug: '', content: '', description: '', thumbnail: '', 
        price: 50, access: 'free', selectedCategories: [1],
        seo: { keywords: '', metaDescription: '' },
        scheduledDate: '', publishMode: 'now',
        liveCommenting: true, commentAlignment: 'center'
      });
      
      setShowSubmissionForm(false);
      updateToast(toastId, { message: 'Content submitted successfully!', type: 'success' });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error submitting content:', err);
      updateToast(toastId, { message: 'Failed to submit content.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (catId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(catId) 
        ? prev.selectedCategories.filter(id => id !== catId)
        : [...prev.selectedCategories, catId]
    }));
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-none lg:shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{user.channelName || 'Creator'} Studio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your channel, submissions, and raw files.</p>
        </div>
        <button 
          onClick={() => setShowSubmissionForm(!showSubmissionForm)}
          className="bg-indigo-600 dark:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-none"
        >
          {showSubmissionForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showSubmissionForm ? 'Cancel' : 'Post Match'}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Check className="w-10 h-10 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Submission Sent!</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Your post would be reviewed and published as soon as it meets the website guides.
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Awesome
              </button>
           </div>
        </div>
      )}

      {showSubmissionForm && (
        <div className="min-h-screen pb-20 animate-in fade-in slide-in-from-top-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-8">
              {/* Title & Slug */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter match title..."
                  className="w-full bg-transparent border-none text-4xl font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 p-0"
                />
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                  <Globe className="w-4 h-4" />
                  <span>Permalink:</span>
                  <span className="text-slate-400">https://watchwds.com/matches/</span>
                  <input 
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                    onBlur={() => setFormData(prev => ({ ...prev, slug: prev.slug.replace(/(^-|-$)/g, '').replace(/-+/g, '-') }))}
                    className="bg-transparent border-none p-0 text-indigo-500 font-medium focus:ring-0 w-auto min-w-[100px]"
                  />
                </div>
              </div>

              {/* Rich Text Editor - Match Content */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden prose-editor">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-indigo-500" />
                   <h3 className="font-bold text-slate-900 dark:text-white">Match Content</h3>
                </div>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(val) => setFormData({...formData, content: val})}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Write the full match detail/article here..."
                />
              </div>

              {/* Video URL & Short Description */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <Code className="w-5 h-5 text-indigo-500" />
                  <h2>Embeds Code</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[200px] flex">
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full h-full min-h-[200px] p-4 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                      placeholder='Paste your embed code here (e.g., <iframe src="..."></iframe>)...'
                    />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                    {formData.description ? (
                      <div className="w-full h-full overflow-y-auto custom-scrollbar [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.description) }} />
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <Globe className="w-5 h-5 text-green-500" />
                  <h2>SEO Settings</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Focus Keywords</label>
                    <input 
                      type="text"
                      value={formData.seo.keywords}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, keywords: e.target.value}})}
                      placeholder="e.g., football, live match, grassroots"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Meta Description</label>
                    <textarea 
                      value={formData.seo.metaDescription}
                      onChange={(e) => setFormData({...formData, seo: {...formData.seo, metaDescription: e.target.value}})}
                      placeholder="Brief summary for search results..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              {/* Publish Button Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                 <button 
                   onClick={handleSubmit} 
                   className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black py-4 rounded-xl transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2 group active:scale-95"
                 >
                   <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                   Publish Match
                 </button>
                 <p className="text-[10px] text-slate-500 text-center mt-3 font-bold uppercase tracking-wider">Submits for review</p>
              </div>

              {/* Thumbnail Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ImageIcon className="w-5 h-5 text-yellow-500" />
                  <h3>Match Thumbnail</h3>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full relative aspect-video rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center p-4 bg-slate-50 dark:bg-slate-900/50"
                >
                  {formData.thumbnail ? (
                    <>
                      <img src={formData.thumbnail} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
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

              {/* Access Control */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Lock className="w-5 h-5 text-indigo-500" />
                  <h3>Access Control</h3>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, access: 'free'})}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.access === 'free' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Free
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, access: 'paid'})}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.access === 'paid' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    Paid
                  </button>
                </div>

                {formData.access === 'paid' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price ({currencySymbol})</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Tag className="w-5 h-5 text-green-500" />
                  <h3>Categories</h3>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg cursor-pointer transition-colors group">
                      <input 
                        type="checkbox"
                        checked={formData.selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scheduling */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-48">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, publishMode: 'now'})}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.publishMode === 'now' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Now
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, publishMode: 'scheduled'})}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.publishMode === 'scheduled' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Scheduled
                    </button>
                  </div>
                </div>

                {formData.publishMode === 'scheduled' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Match Date & Time</label>
                    <input 
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Live Commenting */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
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
                      checked={formData.liveCommenting}
                      onChange={(e) => setFormData({...formData, liveCommenting: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
                
                {formData.liveCommenting && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comment Alignment</label>
                    <select 
                      value={formData.commentAlignment}
                      onChange={(e) => setFormData({...formData, commentAlignment: e.target.value as any})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMediaPicker && (
        <MediaPicker 
          onSelect={(url) => { setFormData({...formData, thumbnail: url}); setShowMediaPicker(false); }} 
          onClose={() => setShowMediaPicker(false)} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-none lg:shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
             <Video className="w-6 h-6 text-indigo-500" />
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Submissions</h2>
          </div>
          
          <div className="space-y-4">
            {myContent.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">No submissions yet.</div>
            ) : myContent.map(content => (
              <div key={content.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <img src={content.thumbnail || null} alt={content.title} className="w-20 h-14 object-cover rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{content.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      content.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 
                      content.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                    }`}>
                      {content.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(content.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-none lg:shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
             <Clock className="w-6 h-6 text-indigo-500" />
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">Activity Feed</h2>
          </div>
          
          <div className="space-y-4">
             {activities.filter(a => a.userId === user.id).length === 0 ? (
               <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">No recent activity.</div>
             ) : activities.filter(a => a.userId === user.id).slice().reverse().map(activity => (
               <div key={activity.id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
               </div>
             ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-none lg:shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
             <FileText className="w-6 h-6 text-indigo-500" />
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shared Files</h2>
          </div>
          
          <div className="space-y-4">
            {downloadLinks.filter(l => l.creatorId === user.id || l.creatorId === 'all').length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">No raw files shared yet.</div>
            ) : downloadLinks.filter(l => l.creatorId === user.id || l.creatorId === 'all').map(link => (
              <div key={link.id} className="border border-slate-100 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{link.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Shared on {new Date(link.createdAt).toLocaleDateString()}</p>
                </div>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={() => markAsDownloaded(link.id, user.id)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

