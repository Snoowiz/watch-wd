import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore, useCategoryStore, useSettingsStore, useCommentStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { 
  Plus, Search, Video, Edit2, Trash2, ExternalLink, 
  Calendar, Lock, Globe, Tag, MoreVertical, Eye,
  CheckCircle, Clock, AlertCircle, GripVertical,
  MessageSquare, ShieldAlert, Check, X, AlertTriangle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function AdminMatches() {
  const navigate = useNavigate();
  const { matches = [], deleteMatch, updateMatch, setMatches } = useMatchStore();
  const { categories = [] } = useCategoryStore();
  const { currencySymbol } = useSettingsStore();
  const { addToast, updateToast } = useUIStore();
  
  // Comments store integration
  const { comments = [], fetchAllComments, updateComment, deleteComment } = useCommentStore();

  const [activeTab, setActiveTab] = useState<'matches' | 'comments'>('matches');
  
  // Matches search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<any>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Comments search/filter
  const [commentSearchQuery, setCommentSearchQuery] = useState('');
  const [commentStatusFilter, setCommentStatusFilter] = useState<'all' | 'active' | 'spam'>('all');
  const [commentDeleteConfirmId, setCommentDeleteConfirmId] = useState<any>(null);
  
  // Inline edit state
  const [editingComment, setEditingComment] = useState<any>(null);
  const [editText, setEditText] = useState('');

  // Fetch comments when comments tab is selected
  React.useEffect(() => {
    if (activeTab === 'comments') {
      fetchAllComments();
    }
  }, [activeTab]);

  const filteredMatches = matches.filter(m => {
    const matchesSearch = (m.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
                         (m.slug || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus || (filterStatus === 'upcoming' && m.publishStatus === 'pending');
    return matchesSearch && matchesStatus;
  });

  const filteredComments = comments.filter(c => {
    const matchesSearch = (c.content || '').toLowerCase().includes((commentSearchQuery || '').toLowerCase()) ||
                          (c.username || '').toLowerCase().includes((commentSearchQuery || '').toLowerCase());
    const matchesStatus = commentStatusFilter === 'all' ||
                          (commentStatusFilter === 'active' && c.status !== 'spam') ||
                          (commentStatusFilter === 'spam' && c.status === 'spam');
    return matchesSearch && matchesStatus;
  });

  const getMatchTitle = (matchId: any) => {
    if (String(matchId).startsWith('blog_')) {
      const blogId = String(matchId).replace('blog_', '');
      return `Blog Post #${blogId}`;
    }
    const match = matches.find(m => String(m.id) === String(matchId));
    return match ? match.title : `Match #${matchId}`;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const sourceMatch = filteredMatches[draggedIndex];
    const targetMatch = filteredMatches[targetIndex];

    const allMatches = [...matches];
    const sIndex = allMatches.findIndex(m => m.id === sourceMatch.id);
    const tIndex = allMatches.findIndex(m => m.id === targetMatch.id);

    if (sIndex !== -1 && tIndex !== -1) {
      const [moved] = allMatches.splice(sIndex, 1);
      allMatches.splice(tIndex, 0, moved);
      setMatches(allMatches);
      addToast('Matches order rearranged!', 'success');
    }
    setDraggedIndex(null);
  };

  const handleDelete = (id: any) => {
    setDeleteConfirmId(id);
  };

  const handleApprove = async (id: number) => {
    const toastId = addToast('Approving match...', 'loading');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateMatch(id, { publishStatus: 'approved' });
      updateToast(toastId, { message: 'Match approved and published!', type: 'success' });
    } catch (error) {
      updateToast(toastId, { message: 'Failed to approve match.', type: 'error' });
    }
  };

  const handleReject = async (id: number) => {
    const toastId = addToast('Rejecting match...', 'loading');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateMatch(id, { publishStatus: 'rejected' });
      updateToast(toastId, { message: 'Match request rejected.', type: 'success' });
    } catch (error) {
      updateToast(toastId, { message: 'Failed to reject match.', type: 'error' });
    }
  };

  const handleToggleSpam = async (comment: any) => {
    const newStatus = comment.status === 'spam' ? 'active' : 'spam';
    const toastId = addToast(newStatus === 'spam' ? 'Marking as spam...' : 'Approving comment...', 'loading');
    try {
      await updateComment(comment.id, { status: newStatus });
      updateToast(toastId, { message: newStatus === 'spam' ? 'Comment marked as spam!' : 'Comment approved!', type: 'success' });
    } catch (error) {
      updateToast(toastId, { message: 'Failed to update comment status.', type: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingComment) return;
    const toastId = addToast('Updating comment...', 'loading');
    try {
      await updateComment(editingComment.id, { content: editText });
      setEditingComment(null);
      updateToast(toastId, { message: 'Comment updated successfully!', type: 'success' });
    } catch (error) {
      updateToast(toastId, { message: 'Failed to update comment.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Match Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create, edit, and schedule broadcasts, or moderate user comments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin/categories')}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-6 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Tag className="w-5 h-5" />
            Categories
          </button>
          <button 
            onClick={() => navigate('/admin/matches/new')}
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Match
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3.5 px-2 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'matches'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Match List
          </div>
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-3.5 px-2 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'comments'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comment Moderation
          </div>
        </button>
      </div>

      {activeTab === 'matches' ? (
        <>
          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matches by title or slug..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
              />
            </div>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              {(['all', 'upcoming', 'live', 'completed'] as const).map((status) => (
                <button 
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${filterStatus === status ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Match List Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 w-10"></th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Match Info</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categories</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredMatches.map((match, index) => (
                    <tr 
                      key={match.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-150 group ${draggedIndex === index ? 'opacity-30 bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-indigo-500' : ''}`}
                    >
                      <td className="p-4 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <GripVertical className="w-4 h-4 mx-auto" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0">
                            <img src={match.thumbnail || null} alt={match.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white">{match.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">/{match.slug}</code>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(match.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            match.status === 'live' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 animate-pulse' :
                            match.status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                            {match.status}
                          </span>
                          {match.publishStatus && (
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                               match.publishStatus === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                               match.publishStatus === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                               'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                             }`}>
                               {match.publishStatus}
                             </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${match.access === 'free' ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {match.access === 'free' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {match.access === 'free' ? 'Free' : 'Paid'}
                          </span>
                          {match.access === 'paid' && (
                            <span className="text-[10px] font-bold text-slate-400">{currencySymbol}{match.price}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {match.categories?.map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            return cat ? (
                              <span key={catId} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded">
                                {cat.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {match.publishStatus === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(match.id)}
                                className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-lg transition-colors font-bold text-xs"
                                title="Approve"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReject(match.id)}
                                className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-lg transition-colors font-bold text-xs"
                                title="Reject"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={() => navigate(`/matches/${match.slug}`)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                            title="View Live"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/matches/${match.id}/edit`)}
                            className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(match.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMatches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Video className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No matches found</p>
                          <button 
                            onClick={() => navigate('/admin/matches/new')}
                            className="mt-4 text-yellow-500 font-bold text-sm hover:text-yellow-400 transition-colors"
                          >
                            Create your first match
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Comments Filter & Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col md:flex-row gap-4 animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={commentSearchQuery}
                onChange={(e) => setCommentSearchQuery(e.target.value)}
                placeholder="Search comments by text content, author username..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
              />
            </div>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl shrink-0">
              {(['all', 'active', 'spam'] as const).map((status) => (
                <button 
                  key={status}
                  onClick={() => setCommentStatusFilter(status)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${commentStatusFilter === status ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {status === 'active' ? 'Approved' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Comments Moderation Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-48">Author</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-48">Match/Post</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comment Text</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">Posted At</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredComments.map((comment) => (
                    <tr 
                      key={comment.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all duration-150"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {comment.avatar ? (
                              <img src={comment.avatar} alt={comment.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                                {(comment.username || 'U').charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              {comment.username}
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded capitalize">
                              {comment.role || 'user'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                          {getMatchTitle(comment.matchId)}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap max-w-lg line-clamp-2">
                          {comment.content}
                        </p>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(comment.timestamp).toLocaleDateString()}
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          comment.status === 'spam'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {comment.status === 'spam' ? 'Spam' : 'Approved'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingComment(comment);
                              setEditText(comment.content);
                            }}
                            className="p-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg transition-colors"
                            title="Edit Comment Text"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleSpam(comment)}
                            className={`p-1.5 rounded-lg transition-colors font-bold text-xs ${
                              comment.status === 'spam'
                                ? 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500'
                                : 'hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-500'
                            }`}
                            title={comment.status === 'spam' ? "Approve Comment" : "Mark as Spam"}
                          >
                            {comment.status === 'spam' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <ShieldAlert className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setCommentDeleteConfirmId(comment.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 rounded-lg transition-colors"
                            title="Delete Comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredComments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <MessageSquare className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No comments found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Match Deletion Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 overflow-hidden z-10"
              id="delete-confirm-dialog"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3.5 rounded-full mb-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Match?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Are you sure you want to permanently delete "{matches.find(m => String(m.id) === String(deleteConfirmId))?.title || 'this match'}"? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors text-sm active:scale-95 cursor-pointer"
                  >
                    Keep Match
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = deleteConfirmId;
                      setDeleteConfirmId(null);
                      const toastId = addToast('Deleting match...', 'loading');
                      try {
                        await new Promise((resolve) => setTimeout(resolve, 800));
                        deleteMatch(id);
                        updateToast(toastId, { message: 'Match deleted successfully!', type: 'success' });
                      } catch (error) {
                        updateToast(toastId, { message: 'Failed to delete match.', type: 'error' });
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-yellow-500/20 cursor-pointer"
                  >
                    Delete Match
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comment Deletion Confirmation Modal */}
      <AnimatePresence>
        {commentDeleteConfirmId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentDeleteConfirmId(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-3.5 rounded-full mb-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Comment?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Are you sure you want to permanently delete this comment? This action cannot be undone and will remove it from the platform.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setCommentDeleteConfirmId(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors text-sm active:scale-95 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = commentDeleteConfirmId;
                      setCommentDeleteConfirmId(null);
                      const toastId = addToast('Deleting comment...', 'loading');
                      try {
                        await deleteComment(id);
                        updateToast(toastId, { message: 'Comment deleted successfully!', type: 'success' });
                      } catch (error) {
                        updateToast(toastId, { message: 'Failed to delete comment.', type: 'error' });
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-yellow-500/20 cursor-pointer"
                  >
                    Delete Comment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comment Edit Modal */}
      <AnimatePresence>
        {editingComment !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingComment(null)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Comment</h3>
                <button 
                  onClick={() => setEditingComment(null)}
                  className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Author
                  </label>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {editingComment.username} ({editingComment.role || 'user'})
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Comment Content
                  </label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                    placeholder="Enter comment content..."
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingComment(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors text-sm active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-yellow-500/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
