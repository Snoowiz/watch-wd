import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, Gift, Save, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store';
import { useUIStore } from '../../store/uiStore';

interface Task {
  id: number;
  title: string;
  description: string;
  points_reward: number;
  is_active: number;
}

export function AdminTasks() {
  const { currencySymbol } = useSettingsStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showConfirm, addToast, updateToast } = useUIStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    points_reward: 0,
    is_active: 1
  });

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/admin/tasks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : (Array.isArray(data.tasks) ? data.tasks : []));
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
        console.error('Failed to fetch tasks', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSave = async (id?: number) => {
    setIsSubmitting(true);
    const toastId = addToast(id ? 'Saving task changes...' : 'Creating new task...', 'loading');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/tasks/${id}` : '/api/admin/tasks';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchTasks();
        setIsEditing(null);
        setIsAdding(false);
        setFormData({ title: '', description: '', points_reward: 0, is_active: 1 });
        updateToast(toastId, { message: 'Task saved successfully!', type: 'success' });
      } else {
        updateToast(toastId, { message: 'Failed to save task changes.', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to save task', err);
      updateToast(toastId, { message: 'Failed to save task changes.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    const taskTitle = task ? task.title : 'this task';

    showConfirm({
      title: 'Delete Task?',
      message: `Are you sure you want to delete task "${taskTitle}"? Completing this task will no longer reward funds.`,
      confirmText: 'Delete Task',
      cancelText: 'Keep Task',
      isDanger: true,
      onConfirm: async () => {
        const toastId = addToast('Deleting task...', 'loading');
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const res = await fetch(`/api/admin/tasks/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            setTasks(tasks.filter(t => t.id !== id));
            updateToast(toastId, { message: 'Task deleted successfully!', type: 'success' });
          } else {
            updateToast(toastId, { message: 'Failed to delete task.', type: 'error' });
          }
        } catch (err) {
          console.error('Failed to delete task', err);
          updateToast(toastId, { message: 'Failed to delete task.', type: 'error' });
        }
      }
    });
  };

  const startEdit = (task: Task) => {
    setIsEditing(task.id);
    setFormData({
      title: task.title,
      description: task.description,
      points_reward: task.points_reward,
      is_active: task.is_active
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Wallet Missions (Tasks)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage tasks that users can complete to earn {currencySymbol}</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setFormData({ title: '', description: '', points_reward: 0, is_active: 1 }); }}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> New Task
        </button>
      </div>

      {(isAdding || isEditing !== null) && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-yellow-500 shadow-lg animate-in zoom-in-95">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {isAdding ? 'Create New Task' : 'Edit Task'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Task Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 outline-none transition-all"
                placeholder="e.g., Complete Profile"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Reward Amount</label>
              <div className="relative">
                <Gift className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="number" 
                  value={formData.points_reward}
                  onChange={(e) => setFormData({...formData, points_reward: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 outline-none transition-all min-h-[80px]"
                placeholder="Tell users what they need to do..."
              />
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="task_active"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
              />
              <label htmlFor="task_active" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Is Active
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => { setIsEditing(null); setIsAdding(false); }}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleSave(isEditing || undefined)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-75 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? 'Saving Task...' : 'Save Task'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mission</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reward</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-900 dark:text-white">{task.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{task.description}</div>
                </td>
                <td className="p-4">
                  <span className="font-bold text-yellow-600 dark:text-yellow-500">+{currencySymbol}{task.points_reward}</span>
                </td>
                <td className="p-4">
                  {task.is_active ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <XCircle className="w-3.5 h-3.5" /> Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button 
                    onClick={() => startEdit(task)}
                    className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                    title="Edit Task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No tasks created yet. Start by creating one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
