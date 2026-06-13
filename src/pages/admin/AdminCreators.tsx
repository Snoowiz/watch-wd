import React, { useState } from 'react';
import { useUsersStore, useAuthStore, useCreatorStore, useNotificationStore, DownloadLink, CreatorContent } from '../../store';
import { 
  User, CheckCircle, X, Clock, LogIn, Send, ExternalLink, 
  FileDown, History, MoreVertical, Search, Filter, Download,
  Check, AlertCircle, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminCreators() {
  const navigate = useNavigate();
  const { users = [], updateUser } = useUsersStore();
  const { loginAs } = useAuthStore();
  const { downloadLinks = [], addDownloadLink, creatorContent = [], updateContentStatus, addActivity } = useCreatorStore();
  const { addNotification } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSendLinkModalOpen, setIsSendLinkModalOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | 'all'>('all');
  const [linkData, setLinkData] = useState({ title: '', url: '' });

  const creators = users.filter(u => 
    (u.role === 'creator' || u.creatorStatus === 'approved' || u.creatorStatus === 'pending') &&
    ((u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingSubmissions = creatorContent.filter(c => c.status === 'pending');

  const handleApprove = (id: number) => {
    updateUser(id, { role: 'creator', creatorStatus: 'approved' });
  };

  const handleReject = (id: number) => {
    updateUser(id, { creatorStatus: 'rejected' });
  };

  const handleLoginAs = (creator: any) => {
    loginAs(creator);
    addActivity({
      userId: creator.id,
      type: 'login_as',
      description: `Admin logged in as ${creator.name}`
    });
    navigate('/');
  };

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData.title || !linkData.url) return;

    addDownloadLink({
      creatorId: selectedCreatorId,
      title: linkData.title,
      url: linkData.url
    });

    setIsSendLinkModalOpen(false);
    setLinkData({ title: '', url: '' });
    
    addNotification({
       userId: selectedCreatorId === 'all' ? undefined : selectedCreatorId,
       type: 'system',
       title: 'New File Received',
       message: `Admin sent a new file: ${linkData.title}`,
       link: '/creator/studio'
    });
  };

  const handleApproveContent = (content: CreatorContent) => {
    updateContentStatus(content.id, 'approved');
    addNotification({
      userId: content.creatorId,
      type: 'system',
      title: 'Content Approved',
      message: `Your content "${content.title}" has been approved.`,
    });
  };

  const handleRejectContent = (content: CreatorContent) => {
    updateContentStatus(content.id, 'rejected');
    addNotification({
      userId: content.creatorId,
      type: 'system',
      title: 'Content Rejected',
      message: `Your content "${content.title}" was rejected.`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Creators Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Oversee creator activities, content, and downloads.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedCreatorId('all');
            setIsSendLinkModalOpen(true);
          }}
          className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <Send className="w-5 h-5" />
          Send Download Link
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Creators</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{creators.filter(p => p.role === 'creator').length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Pending Apps</div>
          <div className="text-3xl font-black text-orange-500">{creators.filter(p => p.creatorStatus === 'pending').length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Content Submissions</div>
          <div className="text-3xl font-black text-blue-500">{pendingSubmissions.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Active Links</div>
          <div className="text-3xl font-black text-green-500">{downloadLinks.length}</div>
        </div>
      </div>

      {/* Content Review Section */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-900/30 shadow-sm overflow-hidden">
          <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-900/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-orange-900 dark:text-orange-400">Content Pending Review ({pendingSubmissions.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {pendingSubmissions.map(content => (
              <div key={content.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{content.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span>By {content.creatorName}</span>
                    <span>•</span>
                    <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                      View Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleRejectContent(content)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Reject"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleApproveContent(content)}
                    className="bg-green-500 hover:bg-green-400 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creators List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Creator Directory</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search creators..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Creator</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {creators.map((creator) => (
                <tr key={creator.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {creator.avatar ? (
                          <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {creator.name}
                          {creator.verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{creator.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {creator.creatorStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    ) : creator.creatorStatus === 'approved' || creator.role === 'creator' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        <X className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {creator.creatorStatus === 'pending' ? (
                        <>
                          <button 
                            onClick={() => handleApprove(creator.id)}
                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(creator.id)}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleLoginAs(creator)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            Log in as User
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/creators/${creator.id}`)}
                            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedCreatorId(creator.id);
                              setIsSendLinkModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-yellow-500 transition-colors"
                            title="Send Link"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Link Modal */}
      {isSendLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Download Link</h3>
              <button onClick={() => setIsSendLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSendLink} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Recipient</label>
                <select 
                  value={selectedCreatorId}
                  onChange={(e) => setSelectedCreatorId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                >
                  <option value="all">All Creators</option>
                  {creators.filter(p => p.role === 'creator').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">File Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., Raw Match Footage - Finals"
                  value={linkData.title}
                  onChange={(e) => setLinkData({...linkData, title: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cloud URL</label>
                <input 
                  type="url" 
                  placeholder="https://cloud-storage.com/file-id"
                  value={linkData.url}
                  onChange={(e) => setLinkData({...linkData, url: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsSendLinkModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-bold transition-colors"
                >
                  Send Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
