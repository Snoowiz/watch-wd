import React, { useState } from 'react';
import { useBlogStore, BlogPost } from '../../store';
import { stripHtml } from '../../utils';
import { useUIStore } from '../../store/uiStore';
import { Plus, Edit, Trash2, Search, Filter, Eye, Calendar, Clock, Share2, Tag as TagIcon, X, ExternalLink, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaPicker } from '../../components/MediaPicker';

export function AdminBlogPosts() {
  const { posts = [], categories: allCategories = [], addPost, updatePost, deletePost, setPosts } = useBlogStore();
  const { showConfirm, addToast, updateToast } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    categories: [] as string[],
    tags: [] as string[],
    status: 'draft' as BlogPost['status'],
    scheduledDate: '',
    restricted: 'none' as BlogPost['restricted'],
    seoKeywords: [] as string[],
    seoDescription: '',
    embedUrl: '',
    readingTimeMinutes: 5,
    createdAt: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (newKeyword && !formData.seoKeywords.includes(newKeyword)) {
        setFormData(prev => ({ ...prev, seoKeywords: [...prev.seoKeywords, newKeyword] }));
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (kwToRemove: string) => {
    setFormData(prev => ({ ...prev, seoKeywords: prev.seoKeywords.filter(kw => kw !== kwToRemove) }));
  };

  const handleCategoryToggle = (categorySlug: string) => {
    setFormData(prev => {
      const isSelected = prev.categories.includes(categorySlug);
      if (isSelected) {
        return { ...prev, categories: prev.categories.filter(c => c !== categorySlug) };
      } else {
        return { ...prev, categories: [...prev.categories, categorySlug] };
      }
    });
  };

  const handlePostDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPostIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handlePostDragEnd = (e: React.DragEvent) => {
    setDraggedPostIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handlePostDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handlePostDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPostIndex === null || draggedPostIndex === targetIndex) return;

    // Get actual source and target post objects from filteredPosts
    const sourcePost = filteredPosts[draggedPostIndex];
    const targetPost = filteredPosts[targetIndex];

    const allPosts = [...posts];
    const sIndex = allPosts.findIndex(p => p.id === sourcePost.id);
    const tIndex = allPosts.findIndex(p => p.id === targetPost.id);

    if (sIndex !== -1 && tIndex !== -1) {
      const [moved] = allPosts.splice(sIndex, 1);
      allPosts.splice(tIndex, 0, moved);
      setPosts(allPosts);
      addToast('Posts order rearranged!', 'success');
    }
    setDraggedPostIndex(null);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = (post.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (post.slug || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate clean excerpt using stripHtml
    let finalExcerpt = stripHtml(formData.excerpt);
    if (!finalExcerpt) {
      // Stripping HTML tags and entities to generate a clean text excerpt from rich text content
      const strippedContent = stripHtml(formData.content);
      finalExcerpt = strippedContent.slice(0, 160);
      if (strippedContent.length > 160) {
        finalExcerpt += '...';
      }
    }

    const postData = {
      title: formData.title,
      slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content: formData.content,
      excerpt: finalExcerpt,
      featuredImage: formData.featuredImage,
      authorId: 1, // Assume admin user id 1
      categories: formData.categories,
      tags: formData.tags,
      status: formData.status,
      scheduledDate: formData.scheduledDate,
      restricted: formData.restricted,
      seo: {
        keywords: formData.seoKeywords.join(', '),
        description: formData.seoDescription || finalExcerpt.slice(0, 150)
      },
      embedUrl: formData.embedUrl,
      readingTimeMinutes: formData.readingTimeMinutes,
      ...(formData.createdAt ? { createdAt: new Date(formData.createdAt).toISOString() } : {})
    };

    if (isEditing) {
      updatePost(isEditing, postData);
    } else {
      addPost(postData);
    }
    
    setShowForm(false);
    setIsEditing(null);
    setFormData({
      title: '', slug: '', content: '', excerpt: '', featuredImage: '',
      categories: [], tags: [], status: 'draft', scheduledDate: '', restricted: 'none',
      seoKeywords: [], seoDescription: '', embedUrl: '', readingTimeMinutes: 5, createdAt: ''
    });
    setTagInput('');
    setKeywordInput('');
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      categories: post.categories,
      tags: post.tags,
      status: post.status,
      scheduledDate: post.scheduledDate || '',
      restricted: post.restricted,
      seoKeywords: post.seo.keywords ? post.seo.keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
      seoDescription: post.seo.description,
      embedUrl: post.embedUrl || '',
      readingTimeMinutes: post.readingTimeMinutes || 5,
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString().slice(0, 16) : '',
    });
    setIsEditing(post.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Blog Management</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Create and manage content for the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog/categories"
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm active:scale-95"
          >
            <TagIcon className="w-5 h-5" />
            Categories
          </Link>
          <button
            onClick={() => { setShowForm(!showForm); setIsEditing(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg active:scale-95"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? 'Cancel' : 'New Post'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column (Main Content - approx 75%) */}
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white lg:text-lg lg:font-bold"
                  placeholder="Enter Post Title"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Excerpt</label>
                  <span className="text-xs text-indigo-500 font-medium">Automatically generate from content if not provided</span>
                </div>
                <textarea
                  value={formData.excerpt}
                  onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none"
                  placeholder="Summarize your post in a few compelling sentences..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Content (Rich Text)</label>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden prose-editor">
                  <ReactQuill
                    theme="snow"
                    value={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
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
              </div>

              {/* SEO and Extra Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs border-b border-slate-200 dark:border-slate-700 pb-2">SEO & Metadata</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keywords (Press Enter)</label>
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2 text-slate-900 dark:text-white">
                      {formData.seoKeywords.map(kw => (
                        <span key={kw} className="flex items-center gap-1 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs">
                          {kw}
                          <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-amber-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                        placeholder="Add keyword..."
                        className="flex-1 min-w-[100px] bg-transparent outline-none text-xs p-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SEO Description</label>
                    <input
                      type="text"
                      value={formData.seoDescription}
                      onChange={e => setFormData({ ...formData, seoDescription: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Embed URL (Audio/Video Option)</label>
                    <input
                      type="url"
                      value={formData.embedUrl}
                      onChange={e => setFormData({ ...formData, embedUrl: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Sidebar - approx 25%) */}
            <div className="w-full lg:w-[320px] shrink-0 space-y-6">
              
              {/* Publish Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">Publish</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                  {formData.status === 'scheduled' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Publish Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visibility Restriction</label>
                    <select
                      value={formData.restricted}
                      onChange={e => setFormData({ ...formData, restricted: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="none">Public</option>
                      <option value="login">Logged In Only</option>
                      <option value="premium">Premium Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Read Time (Mins)</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.readingTimeMinutes}
                      onChange={e => setFormData({ ...formData, readingTimeMinutes: parseInt(e.target.value) || 5 })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Creation / Publish Date</label>
                    <input
                      type="datetime-local"
                      value={formData.createdAt}
                      onChange={e => setFormData({ ...formData, createdAt: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Optionally override the creation date. If left blank, the creation date is perfectly preserved.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
                  >
                    {isEditing ? 'Save Changes' : 'Publish Post'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="w-full py-2.5 rounded-lg font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Categories Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">Categories</h3>
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {allCategories.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No categories found. Manage them in <Link to="/admin/blog/categories" className="text-indigo-500 hover:underline">Categories</Link>.</p>
                  ) : (
                    <div className="space-y-2">
                      {allCategories.map(category => (
                        <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(category.slug)}
                            onChange={() => handleCategoryToggle(category.slug)}
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/admin/blog/categories" className="inline-block mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  + Add New Category
                </Link>
              </div>

              {/* Tags Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">Tags</h3>
                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2 text-slate-900 dark:text-white transition-colors focus-within:border-indigo-500">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded text-xs border border-indigo-100 dark:border-indigo-800">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-amber-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag and press enter..."
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-xs p-1"
                  />
                </div>
              </div>

              {/* Featured Image Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">Featured Image</h3>
                
                {formData.featuredImage ? (
                  <div className="space-y-3">
                    <img src={formData.featuredImage} alt="Featured Preview" className="w-full max-h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, featuredImage: '' })}
                      className="w-full text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove image
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="w-full aspesct-video bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-bold">Set featured image</span>
                  </button>
                )}
                <input type="hidden" required value={formData.featuredImage} />
              </div>

            </div>
          </form>

          {showMediaPicker && (
            <MediaPicker
               onSelect={(url) => {
                 setFormData(prev => ({ ...prev, featuredImage: url }));
                 setShowMediaPicker(false);
               }}
               onClose={() => setShowMediaPicker(false)}
            />
          )}
        </div>
      )}

      {/* Posts List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border rounded-lg transition-colors ${statusFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Filter className="w-4 h-4" />
              {statusFilter === 'all' ? 'Filter' : statusFilter ? `Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}` : 'Filter'}
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</div>
                  {['all', 'published', 'draft', 'scheduled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status as any); setShowFilterMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      {status === 'all' ? 'All Posts' : status ? status.charAt(0).toUpperCase() + status.slice(1) : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Categories</th>
                <th className="px-6 py-4">Metrics</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredPosts.map((post, index) => (
                <tr 
                  key={post.id} 
                  draggable
                  onDragStart={(e) => handlePostDragStart(e, index)}
                  onDragEnd={handlePostDragEnd}
                  onDragOver={(e) => handlePostDragOver(e, index)}
                  onDrop={(e) => handlePostDrop(e, index)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150 ${draggedPostIndex === index ? 'opacity-30 bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-indigo-500' : ''}`}
                >
                  <td className="px-6 py-4 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <GripVertical className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                        <img src={post.featuredImage || null} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{post.title}</div>
                        <div className="text-xs text-slate-500">/{post.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                      post.status === 'scheduled' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {post.status}
                    </span>
                    {post.restricted !== 'none' && (
                      <span className="ml-2 text-[10px] bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                        {post.restricted}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.categories.map(c => (
                        <span key={c} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1" title="Views"><Eye className="w-3 h-3" /> {post.views}</span>
                      <span className="flex items-center gap-1" title="Likes">❤️ {post.likes}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">
                    {format(new Date(post.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/blog/${post.slug}`}
                        target="_blank"
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="View Live"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Edit Post"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          showConfirm({
                            title: 'Delete Blog Post?',
                            message: `Are you sure you want to delete post "${post.title}"? This action cannot be undone.`,
                            confirmText: 'Delete',
                            cancelText: 'Keep Post',
                            isDanger: true,
                            onConfirm: async () => {
                              const toastId = addToast('Deleting blog post...', 'loading');
                              try {
                                await new Promise((resolve) => setTimeout(resolve, 805));
                                deletePost(post.id);
                                updateToast(toastId, { message: 'Blog post deleted successfully!', type: 'success' });
                              } catch (err) {
                                updateToast(toastId, { message: 'Failed to delete blog post.', type: 'error' });
                              }
                            }
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPosts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No posts found. Create your first blog post!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
