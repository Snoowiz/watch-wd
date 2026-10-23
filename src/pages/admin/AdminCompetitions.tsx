import React, { useState, useEffect } from 'react';
import { 
  Trophy, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, 
  Loader2, Image as ImageIcon, Video, Calendar, Shield, Save, X
} from 'lucide-react';
import { useCompetitionStore, Competition } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { MediaPickerModal } from '../../components/MediaPickerModal';

export function AdminCompetitions() {
  const { 
    competitions, 
    isLoading, 
    fetchCompetitions, 
    addCompetition, 
    updateCompetition, 
    deleteCompetition 
  } = useCompetitionStore();
  
  const { addToast, updateToast, showConfirm } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [season, setSeason] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const openCreateModal = () => {
    setEditingComp(null);
    setName('');
    setSlug('');
    setDescription('');
    setLogo('');
    setSeason('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Competition) => {
    setEditingComp(comp);
    setName(comp.name || '');
    setSlug(comp.slug || '');
    setDescription(comp.description || '');
    setLogo(comp.logo || '');
    setSeason(comp.season || '');
    setIsActive(comp.is_active === 1 || comp.is_active === true);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingComp) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter a competition name.', 'error');
      return;
    }

    setIsSubmitting(true);
    const toastId = addToast(editingComp ? 'Updating competition...' : 'Creating competition...', 'loading');

    try {
      const payload: Partial<Competition> = {
        name: name.trim(),
        slug: (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description.trim() || null,
        logo: logo.trim() || null,
        season: season.trim() || null,
        is_active: isActive ? 1 : 0
      };

      if (editingComp) {
        const ok = await updateCompetition(editingComp.id, payload);
        if (ok) {
          updateToast(toastId, { message: 'Competition updated successfully!', type: 'success' });
          setIsModalOpen(false);
        } else {
          updateToast(toastId, { message: 'Failed to update competition.', type: 'error' });
        }
      } else {
        const result = await addCompetition(payload);
        if (result) {
          updateToast(toastId, { message: 'Competition created successfully!', type: 'success' });
          setIsModalOpen(false);
        } else {
          updateToast(toastId, { message: 'Failed to create competition.', type: 'error' });
        }
      }
    } catch (err: any) {
      console.error('Save competition error:', err);
      updateToast(toastId, { message: err.message || 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (comp: Competition) => {
    const currentStatus = comp.is_active === 1 || comp.is_active === true;
    const newStatus = !currentStatus;
    const ok = await updateCompetition(comp.id, { is_active: newStatus ? 1 : 0 });
    if (ok) {
      addToast(`Competition ${newStatus ? 'activated' : 'deactivated'}.`, 'success');
    }
  };

  const handleDelete = (comp: Competition) => {
    showConfirm({
      title: 'Delete Competition',
      message: `Are you sure you want to delete "${comp.name}"? Associated matches will remain safe and their competition assignment will be cleared.`,
      onConfirm: async () => {
        const toastId = addToast('Deleting competition...', 'loading');
        const ok = await deleteCompetition(comp.id);
        if (ok) {
          updateToast(toastId, { message: 'Competition deleted safely.', type: 'success' });
        } else {
          updateToast(toastId, { message: 'Failed to delete competition.', type: 'error' });
        }
      }
    });
  };

  const filteredCompetitions = competitions.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || 
           (c.slug || '').toLowerCase().includes(q) ||
           (c.season || '').toLowerCase().includes(q);
  });

  const activeCount = competitions.filter(c => c.is_active === 1 || c.is_active === true).length;
  const totalMatchesLinked = competitions.reduce((sum, c) => sum + (Number(c.match_count) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Competitions</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Create and organize leagues, cups, and tournaments independently of match categories.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95"
          id="btn-new-competition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          New Competition
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Competitions</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{competitions.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Competitions</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matches Linked</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{totalMatchesLinked}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search competitions or season..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
            id="input-search-competitions"
          />
        </div>

        <div className="text-xs font-bold text-slate-400">
          Showing {filteredCompetitions.length} of {competitions.length} competitions
        </div>
      </div>

      {/* Competitions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-2" />
            <p className="text-sm font-bold">Loading competitions...</p>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No competitions found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first tournament, league, or cup to organize your matches.'}
            </p>
            {!searchQuery && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-yellow-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-yellow-400 shadow transition-all"
              >
                Create Competition
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Competition</th>
                  <th className="py-4 px-6">Slug</th>
                  <th className="py-4 px-6">Season</th>
                  <th className="py-4 px-6">Matches</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
                {filteredCompetitions.map((comp) => {
                  const isActiveStatus = comp.is_active === 1 || comp.is_active === true;
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            {comp.logo ? (
                              <img src={comp.logo} alt={comp.name} className="w-full h-full object-cover" />
                            ) : (
                              <Trophy className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{comp.name}</div>
                            {comp.description && (
                              <p className="text-xs text-slate-400 truncate max-w-xs">{comp.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                        /{comp.slug}
                      </td>

                      <td className="py-4 px-6">
                        {comp.season ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {comp.season}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {comp.match_count || 0} {Number(comp.match_count) === 1 ? 'match' : 'matches'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStatus(comp)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            isActiveStatus
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {isActiveStatus ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(comp)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Edit Competition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(comp)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Competition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Competition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingComp ? 'Edit Competition' : 'New Competition'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingComp ? 'Update competition details and status.' : 'Add a tournament, cup, or league for matches.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Competition Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grassroots Premier League"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    placeholder="grassroots-premier-league"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Season (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026/2027"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Logo / Badge Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or select from media"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-yellow-500" />
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Short overview about the tournament or league..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="comp-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500/20 border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="comp-is-active" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Active (available for match assignment and public filtering)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingComp ? 'Update Competition' : 'Create Competition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setLogo(url);
            setShowMediaPicker(false);
          }}
          title="Select Competition Logo"
        />
      )}
    </div>
  );
}
