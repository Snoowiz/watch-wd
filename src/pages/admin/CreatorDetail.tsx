import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUsersStore, useCreatorStore } from '../../store';
import { 
  User, ArrowLeft, Mail, Calendar, Shield, Activity as ActivityIcon, 
  Download, ExternalLink, CheckCircle, Clock, XCircle, FileText,
  Edit2, Save, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CreatorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, updateUser } = useUsersStore();
  const { activities, downloadLinks, creatorContent } = useCreatorStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
    creatorStatus: '',
    balance: 0,
    verified: false,
    avatar: ''
  });

  const creator = users.find(u => String(u.id) === String(id));
  
  if (!creator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <XCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Not Found</h2>
        <button onClick={() => navigate('/admin/creators')} className="mt-4 text-indigo-500 hover:underline">
          Back to Directory
        </button>
      </div>
    );
  }

  const creatorActivities = activities.filter(a => a.userId === creator.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const creatorDownloads = downloadLinks.filter(l => l.downloadedBy.includes(creator.id));
  const creatorSubmissions = creatorContent.filter(c => c.creatorId === creator.id);

  const startEditing = () => {
    setEditForm({
      name: creator.name,
      email: creator.email,
      role: creator.role,
      status: creator.status,
      creatorStatus: creator.creatorStatus || 'none',
      balance: creator.balance || 0,
      verified: creator.verified || false,
      avatar: creator.avatar || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Also save to backend API if it were fully implemented
    updateUser(creator.id, editForm as any);
    try {
      await fetch(`/api/admin/users/${creator.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(editForm)
      });
    } catch(e) {}
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <button 
        onClick={() => navigate('/admin/creators')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Creators
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Profile Sidebar */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 relative">
            {!isEditing ? (
              <button onClick={startEditing} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-full" title="Edit User">
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-full" title="Cancel">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleSave} className="p-2 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-full" title="Save">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {isEditing ? (
                <input 
                  type="text" 
                  value={editForm.avatar} 
                  onChange={e => setEditForm({...editForm, avatar: e.target.value})} 
                  placeholder="URL" 
                  className="w-full text-xs text-center border-none focus:ring-0 bg-transparent px-2 text-slate-700 dark:text-slate-300"
                />
              ) : creator.avatar ? (
                <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-300" />
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  className="w-full text-center font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
                <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={e => setEditForm({...editForm, email: e.target.value})} 
                  className="w-full text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-center gap-2 mt-2">
                  <input type="checkbox" id="verified" checked={editForm.verified} onChange={e => setEditForm({...editForm, verified: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                  <label htmlFor="verified" className="text-xs font-bold text-slate-700 dark:text-slate-300">Verified Badge</label>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  {creator.name}
                  {creator.verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{creator.email}</p>
              </>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-slate-900 dark:text-white">{creatorSubmissions.length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submissions</div>
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
              <div className="text-center">
                {isEditing ? (
                  <input type="number" value={editForm.balance} onChange={e => setEditForm({...editForm, balance: Number(e.target.value)})} className="w-20 text-center text-xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500 inline-block" />
                ) : (
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{creator.balance || 0}</div>
                )}
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Wallet Balance</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Account Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Creator Status</span>
                {isEditing ? (
                  <select value={editForm.creatorStatus} onChange={e => setEditForm({...editForm, creatorStatus: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ) : (
                  <span className={`font-bold capitalize ${creator.creatorStatus === 'approved' ? 'text-green-500' : creator.creatorStatus === 'pending' ? 'text-orange-500' : creator.creatorStatus === 'rejected' ? 'text-red-500' : 'text-slate-400'}`}>
                    {creator.creatorStatus || 'None'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                {isEditing ? (
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                ) : (
                  <span className={`font-bold capitalize ${creator.status === 'active' ? 'text-green-500' : 'text-slate-400'}`}>
                    {creator.status || 'Active'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Role</span>
                {isEditing ? (
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                    <option value="user">User</option>
                    <option value="creator">Creator</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{creator.role}</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Joined</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(creator.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity & Content Tabs */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-yellow-500" />
                Activity History
              </h2>
            </div>
            <div className="p-6">
              {creatorActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-700">
                  {creatorActivities.map((activity) => (
                    <div key={activity.id} className="relative pl-8">
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${
                        activity.type === 'download' ? 'bg-green-500' :
                        activity.type === 'submission' ? 'bg-blue-500' :
                        activity.type === 'login_as' ? 'bg-purple-500' :
                        'bg-slate-400'
                      }`}></div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{activity.description}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                Submitted Content
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {creatorSubmissions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  No content submitted yet.
                </div>
              ) : (
                creatorSubmissions.map((content) => (
                  <div key={content.id} className="p-6 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{content.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                        <span>Submitted {new Date(content.submittedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <div>
                      {content.status === 'approved' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 uppercase tracking-wider">Approved</span>
                      ) : content.status === 'pending' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 uppercase tracking-wider">Pending</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 uppercase tracking-wider">Rejected</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
