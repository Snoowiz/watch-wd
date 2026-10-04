import React, { useState, useEffect } from 'react';
import { useCategoryStore } from '../../store';
import { Plus, Trash2, Edit2, X, Save, Tag, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, fetchCategories } = useCategoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      setErrorMsg('Category name and slug are required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      if (editingId) {
        const res = await updateCategory(editingId, formData);
        if (res.success) {
          setEditingId(null);
          setFormData({ name: '', slug: '', description: '' });
          setSuccessMsg('Category updated successfully!');
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setErrorMsg(res.error || 'Failed to update category');
        }
      } else {
        const res = await addCategory(formData);
        if (res.success) {
          setIsAdding(false);
          setFormData({ name: '', slug: '', description: '' });
          setSuccessMsg('Category created successfully!');
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setErrorMsg(res.error || 'Failed to create category');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!window.confirm('Are you sure you want to delete this category? Matches linked to it will not be deleted.')) return;
    setErrorMsg(null);
    const res = await deleteCategory(id);
    if (res.success) {
      setSuccessMsg('Category deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to delete category');
    }
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setIsAdding(false);
    setErrorMsg(null);
  };

  const filteredCategories = categories.filter(c => 
    (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (c.slug || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Match Categories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize your matches with custom categories.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', slug: '', description: '' }); }}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Form Area */}
        {(isAdding || editingId) && (
          <div className="lg:col-span-4 space-y-6 animate-in fade-in slide-in-from-left-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Category' : 'New Category'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({ 
                        ...formData, 
                        name, 
                        slug: editingId ? formData.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                      });
                    }}
                    placeholder="e.g., Live Match"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Slug</label>
                  <input 
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., live-match"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden prose-editor">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(val) => setFormData({ ...formData, description: val })}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline'],
                          ['link']
                        ],
                      }}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : (editingId ? 'Update Category' : 'Save Category')}
              </button>
            </div>
          </div>
        )}

        {/* List Area */}
        <div className={(isAdding || editingId) ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Slug</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                            <Tag className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{cat.slug}</code>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">{cat.description || 'No description'}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEdit(cat)}
                            className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Tag className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No categories found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
