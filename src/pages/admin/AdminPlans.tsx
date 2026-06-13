import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, CreditCard, Tag, Loader2 } from 'lucide-react';
import { useCategoryStore, useSettingsStore } from '../../store';
import { useUIStore } from '../../store/uiStore';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  categories: string; // JSON array of category IDs
  is_active: number;
}

export function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { categories } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const { showConfirm, addToast, updateToast } = useUIStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_days: 30,
    categories: [] as string[],
    is_active: 1
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    const toastId = addToast(editingId ? 'Saving plan changes...' : 'Creating subscription plan...', 'loading');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchPlans();
        setIsAdding(false);
        setEditingId(null);
        updateToast(toastId, { message: 'Plan saved successfully!', type: 'success' });
      } else {
        updateToast(toastId, { message: 'Failed to save plan changes.', type: 'error' });
      }
    } catch (err) {
      console.error('Save failed', err);
      updateToast(toastId, { message: 'Failed to save plan changes.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const plan = plans.find((p) => p.id === id);
    const planName = plan ? plan.name : 'this plan';

    showConfirm({
      title: 'Delete Subscription Plan?',
      message: `Are you sure you want to permanently delete subscription plan "${planName}"? Users on this plan will be affected.`,
      confirmText: 'Delete Plan',
      cancelText: 'Keep Plan',
      isDanger: true,
      onConfirm: async () => {
        const toastId = addToast('Deleting plan...', 'loading');
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const res = await fetch(`/api/admin/plans/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            fetchPlans();
            updateToast(toastId, { message: 'Plan deleted successfully!', type: 'success' });
          } else {
            updateToast(toastId, { message: 'Failed to delete plan.', type: 'error' });
          }
        } catch (err) {
          console.error('Delete failed', err);
          updateToast(toastId, { message: 'Failed to delete plan.', type: 'error' });
        }
      }
    });
  };

  const startEdit = (plan: Plan) => {
    let parsedCategories = [];
    try {
      parsedCategories = JSON.parse(plan.categories) || [];
    } catch (e) {}

    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration_days: plan.duration_days,
      categories: parsedCategories,
      is_active: plan.is_active
    });
    setEditingId(plan.id);
    setIsAdding(false);
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const cats = [...prev.categories];
      if (cats.includes(categoryId)) {
        return { ...prev, categories: cats.filter(c => c !== categoryId) };
      } else {
        return { ...prev, categories: [...cats, categoryId] };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage access plans for paid content</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', description: '', price: 0, duration_days: 30, categories: [], is_active: 1 }); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" /> New Plan
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-lg mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Edit Plan' : 'Create New Plan'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Plan Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                placeholder="e.g., Premium Pass"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Duration (Days)</label>
              <input 
                type="number" 
                value={formData.duration_days}
                onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
              <input 
                type="text" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                placeholder="Brief description of benefits..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Price</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Allowed Categories</label>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => toggleCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${formData.categories.includes('all') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                >
                  All Content
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id.toString())}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${formData.categories.includes(c.id.toString()) && !formData.categories.includes('all') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                    disabled={formData.categories.includes('all')}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">If "All Content" is selected, categorization applies to everything.</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {plans.map(plan => {
          let cats: string[] = [];
          try { cats = JSON.parse(plan.categories); } catch (e) {}

          return (
            <div key={plan.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                  {plan.is_active === 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-bold">Inactive</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> {currencySymbol}{plan.price.toFixed(2)} / {plan.duration_days} days
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> 
                    {cats.includes('all') ? 'All Categories' : cats.length > 0 ? `${cats.length} Categories` : 'None'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(plan)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(plan.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {plans.length === 0 && !isLoading && (
          <div className="text-center p-8 text-slate-500">No plans created yet.</div>
        )}
      </div>
    </div>
  );
}
