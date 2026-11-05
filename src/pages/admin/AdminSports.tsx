import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, 
  Loader2, Save, X, Users, User, Shield, Clock, HelpCircle, AlertCircle
} from 'lucide-react';
import { useSportStore, Sport, useMatchStore, DEFAULT_PLATFORM_SPORTS } from '../../store';
import { useUIStore } from '../../store/uiStore';

export function AdminSports() {
  const { sports, isLoading, fetchSports, addSport, updateSport, deleteSport } = useSportStore();
  const { matches = [], fetchMatches } = useMatchStore();
  const { addToast, updateToast, showConfirm } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [participantType, setParticipantType] = useState<'teams' | 'players_or_pairs' | 'combatants'>('teams');
  const [slot1Label, setSlot1Label] = useState('Home team');
  const [slot1Placeholder, setSlot1Placeholder] = useState('');
  const [slot2Label, setSlot2Label] = useState('Away team');
  const [slot2Placeholder, setSlot2Placeholder] = useState('');
  const [competitionLabel, setCompetitionLabel] = useState('Competition');
  const [timeLabel, setTimeLabel] = useState('Kick-off time');
  const [requiresClub, setRequiresClub] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchSports();
    fetchMatches();
  }, [fetchSports, fetchMatches]);

  const openCreateModal = () => {
    setEditingSport(null);
    setName('');
    setSlug('');
    setDescription('');
    setParticipantType('teams');
    setSlot1Label('Home team');
    setSlot1Placeholder('e.g. Manchester Red');
    setSlot2Label('Away team');
    setSlot2Placeholder('e.g. London Blue');
    setCompetitionLabel('Competition');
    setTimeLabel('Kick-off time');
    setRequiresClub(false);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (sport: Sport) => {
    setEditingSport(sport);
    setName(sport.name);
    setSlug(sport.slug);
    setDescription(sport.description || '');
    setParticipantType(sport.participant_type || 'teams');
    setSlot1Label(sport.slot1_label || 'Home team');
    setSlot1Placeholder(sport.slot1_placeholder || '');
    setSlot2Label(sport.slot2_label || 'Away team');
    setSlot2Placeholder(sport.slot2_placeholder || '');
    setCompetitionLabel(sport.competition_label || 'Competition');
    setTimeLabel(sport.time_label || 'Start time');
    setRequiresClub(Boolean(sport.requires_club));
    setIsActive(sport.is_active === 1 || sport.is_active === true);
    setIsModalOpen(true);
  };

  const handleParticipantTypeChange = (type: 'teams' | 'players_or_pairs' | 'combatants') => {
    setParticipantType(type);
    if (type === 'players_or_pairs') {
      setSlot1Label('Player or pair 1');
      setSlot1Placeholder('e.g. C. Alcaraz or Salisbury / Ram');
      setSlot2Label('Player or pair 2');
      setSlot2Placeholder('e.g. J. Sinner or Koolhof / Mektic');
      setCompetitionLabel('Tournament');
      setTimeLabel('Start time');
      setRequiresClub(false);
    } else if (type === 'combatants') {
      setSlot1Label('Fighter 1');
      setSlot1Placeholder('e.g. Tyson Fury');
      setSlot2Label('Fighter 2');
      setSlot2Placeholder('e.g. Oleksandr Usyk');
      setCompetitionLabel('Card / Event');
      setTimeLabel('Ring-walk time');
      setRequiresClub(false);
    } else {
      // Teams
      setSlot1Label('Home team');
      setSlot1Placeholder('e.g. Boston Green');
      setSlot2Label('Away team');
      setSlot2Placeholder('e.g. Los Angeles Gold');
      setCompetitionLabel('Competition');
      setTimeLabel('Kick-off time');
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingSport) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      addToast('Sport name and slug are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    const toastId = addToast(editingSport ? 'Updating sport...' : 'Creating sport...', 'loading');

    try {
      const payload: Partial<Sport> = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: description.trim() || null,
        participant_type: participantType,
        slot1_label: slot1Label.trim() || 'Home team',
        slot1_placeholder: slot1Placeholder.trim() || '',
        slot2_label: slot2Label.trim() || 'Away team',
        slot2_placeholder: slot2Placeholder.trim() || '',
        competition_label: competitionLabel.trim() || 'Competition',
        time_label: timeLabel.trim() || 'Start time',
        requires_club: requiresClub ? 1 : 0,
        is_active: isActive ? 1 : 0
      };

      if (editingSport) {
        const ok = await updateSport(editingSport.id, payload);
        if (ok) {
          updateToast(toastId, { message: 'Sport updated successfully!', type: 'success' });
          setIsModalOpen(false);
        } else {
          updateToast(toastId, { message: 'Failed to update sport.', type: 'error' });
        }
      } else {
        const ok = await addSport(payload);
        if (ok) {
          updateToast(toastId, { message: 'Sport created successfully!', type: 'success' });
          setIsModalOpen(false);
        } else {
          updateToast(toastId, { message: 'Failed to create sport.', type: 'error' });
        }
      }
    } catch (err: any) {
      updateToast(toastId, { message: err.message || 'An error occurred.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sport: Sport) => {
    const currentActive = sport.is_active === 1 || sport.is_active === true;
    const ok = await updateSport(sport.id, { is_active: currentActive ? 0 : 1 });
    if (ok) {
      addToast(`Sport ${currentActive ? 'deactivated' : 'activated'} successfully.`, 'success');
    }
  };

  const handleDelete = (sport: Sport) => {
    showConfirm({
      title: 'Delete Sport',
      message: `Are you sure you want to delete "${sport.name}"? If existing events reference this sport, it will be deactivated rather than deleted to protect event history.`,
      onConfirm: async () => {
        const toastId = addToast('Deleting sport...', 'loading');
        const ok = await deleteSport(sport.id);
        if (ok) {
          updateToast(toastId, { message: 'Sport deleted or deactivated safely.', type: 'success' });
        } else {
          updateToast(toastId, { message: 'Failed to delete sport.', type: 'error' });
        }
      }
    });
  };

  // Compute how many events reference each sport
  const sportEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    matches.forEach(m => {
      const sp = (m.sport || 'football').toLowerCase();
      counts[sp] = (counts[sp] || 0) + 1;
    });
    return counts;
  }, [matches]);

  const effectiveSports = useMemo(() => {
    if (sports && sports.length > 0) return sports;
    return DEFAULT_PLATFORM_SPORTS;
  }, [sports]);

  const filteredSports = useMemo(() => {
    return effectiveSports.filter(s => {
      if (filterActive === 'active' && !(s.is_active === 1 || s.is_active === true)) return false;
      if (filterActive === 'inactive' && (s.is_active === 1 || s.is_active === true)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q);
    });
  }, [effectiveSports, searchQuery, filterActive]);

  const activeCount = effectiveSports.filter(s => s.is_active === 1 || s.is_active === true).length;
  const totalEventsLinked = Object.values(sportEventCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sports Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Configure dynamic sporting disciplines, participant field schemas, and competition labels without code modifications.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95"
          id="btn-new-sport"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          New Sport
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sports</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{effectiveSports.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sports</p>
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Events Linked</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{totalEventsLinked}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="w-6 h-6" />
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
            placeholder="Search sports by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all"
            id="input-search-sports"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterActive === 'all'
                ? 'bg-yellow-500 text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({effectiveSports.length})
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterActive === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterActive === 'inactive'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Inactive ({effectiveSports.length - activeCount})
          </button>
        </div>
      </div>

      {/* Sports Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mb-2" />
            <p className="text-sm font-bold">Loading sports...</p>
          </div>
        ) : filteredSports.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No sports found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create a sport discipline to start organizing your sporting events.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sport</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Participant Model</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Slot Labels</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Competition / Time</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Events</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredSports.map(sport => {
                  const isActiveSport = sport.is_active === 1 || sport.is_active === true;
                  const eventCount = sportEventCounts[(sport.id || sport.slug).toLowerCase()] || 0;

                  return (
                    <tr key={sport.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-black">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {sport.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {sport.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {sport.participant_type === 'players_or_pairs' ? (
                            <>
                              <User className="w-3.5 h-3.5 text-emerald-500" />
                              Players / Pairs
                            </>
                          ) : sport.participant_type === 'combatants' ? (
                            <>
                              <Shield className="w-3.5 h-3.5 text-rose-500" />
                              Combatants
                            </>
                          ) : (
                            <>
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              Teams
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div><span className="text-slate-400">1:</span> {sport.slot1_label || 'Home team'}</div>
                        <div><span className="text-slate-400">2:</span> {sport.slot2_label || 'Away team'}</div>
                      </td>

                      <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="truncate max-w-[140px]">{sport.competition_label || 'Competition'}</div>
                        <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {sport.time_label || 'Start time'}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                          {eventCount}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(sport)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            isActiveSport
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                          }`}
                        >
                          {isActiveSport ? (
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

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(sport)}
                            className="p-2 text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
                            title="Edit Sport"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sport)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete Sport"
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

      {/* Create / Edit Sport Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingSport ? 'Edit Sport' : 'New Sport'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingSport ? 'Update sport definition, participant model, and labels.' : 'Define a new sporting discipline for events.'}
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

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Sport Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rugby Union, Boxing, Golf"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Identifier Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rugby-union"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of this sport discipline..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 resize-none"
                />
              </div>

              {/* Participant Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Participant Structure
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'teams', label: 'Teams', desc: 'Home vs Away clubs/franchises' },
                    { id: 'players_or_pairs', label: 'Players / Pairs', desc: 'Singles or doubles pairings' },
                    { id: 'combatants', label: 'Combatants', desc: 'Fighters / Title card bouts' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleParticipantTypeChange(item.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        participantType === item.id
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot 1 & 2 Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Slot 1 Label
                  </label>
                  <input
                    type="text"
                    required
                    value={slot1Label}
                    onChange={(e) => setSlot1Label(e.target.value)}
                    placeholder="e.g. Home team, Fighter 1"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Slot 2 Label
                  </label>
                  <input
                    type="text"
                    required
                    value={slot2Label}
                    onChange={(e) => setSlot2Label(e.target.value)}
                    placeholder="e.g. Away team, Fighter 2"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Competition & Time Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Competition / Tournament Label
                  </label>
                  <input
                    type="text"
                    required
                    value={competitionLabel}
                    onChange={(e) => setCompetitionLabel(e.target.value)}
                    placeholder="e.g. Competition, Tournament, Event Card"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Time Field Label
                  </label>
                  <input
                    type="text"
                    required
                    value={timeLabel}
                    onChange={(e) => setTimeLabel(e.target.value)}
                    placeholder="e.g. Kick-off time, Start time, Tip-off time"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Active Sport</div>
                    <div className="text-xs text-slate-400">Show this sport in event creation popups and discovery filters.</div>
                  </div>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-sm font-bold shadow-md shadow-yellow-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingSport ? 'Update Sport' : 'Create Sport'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

