import React, { useState, useRef } from 'react';
import { useAuthStore, useMatchStore, useNotificationStore, Match } from '../../store';
import { 
  User, Send, CheckCircle, Clock, 
  LogOut, LayoutDashboard, History, Activity,
  Video, Plus, X, BarChart2, Tv, Image as ImageIcon, Eye
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MediaPicker } from '../../components/MediaPicker';
import { compressImage } from '../../lib/imageCompressor';

import { NotificationDropdown } from '../../components/NotificationDropdown';

export function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, setLogoutModalOpen, revertLoginAs, originalUser } = useAuthStore();
  const { matches = [], addMatch, watchHistory = [] } = useMatchStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'studio' | 'upload' | 'activity' | 'library'>('studio');
  const [showMediaPicker, setShowMediaPicker] = useState<'thumbnail' | 'content' | null>(null);
  const [isCreatorDropdownOpen, setIsCreatorDropdownOpen] = useState(false);

  // Form State for "Upload Video (New Match)"
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    content: '',
    price: 0,
    access: 'free' as 'free' | 'paid',
  });

  if (!user || user.role !== 'creator') {
    navigate('/');
    return null;
  }

  const myVideos = matches.filter(m => m.creatorId === user.id);
  const myWatchHistory = watchHistory.filter(w => w.userId === user.id);
  
  const totalViews = myVideos.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalSubmissions = myVideos.length;
  const approvedVideos = myVideos.filter(m => m.publishStatus === 'approved');
  const pendingVideos = myVideos.filter(m => m.publishStatus === 'pending');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.title || !uploadData.content) return;

    let finalThumbnail = uploadData.thumbnail;
    if (uploadData.thumbnail && uploadData.thumbnail.startsWith('data:image/')) {
      finalThumbnail = await compressImage(uploadData.thumbnail);
    }

    const newMatch: Match = {
      id: Date.now(),
      title: uploadData.title,
      slug: uploadData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      date: new Date().toISOString(),
      price: uploadData.price,
      embedPrice: 0,
      status: 'completed',
      publishStatus: 'pending',
      creatorId: user.id,
      thumbnail: finalThumbnail || 'https://picsum.photos/seed/creatorvid/800/450',
      content: uploadData.content,
      description: uploadData.description,
      categories: [1], // Defaulting to 1 for creator uploads
      access: uploadData.access,
      seo: { keywords: '', metaDescription: '' },
      views: 0,
    };

    addMatch(newMatch);

    // Notify Admins
    addNotification({
      type: 'system',
      title: 'New Video Submission',
      message: `New video uploaded by ${user.name}: ${uploadData.title}. Awaiting approval.`,
    });
    
    // Notify the creator that it submitted successfully
    addNotification({
       userId: user.id,
       type: 'system',
       title: 'Video Submitted',
       message: 'Your video was submitted successfully and is awaiting admin approval.',
       link: '/creator/studio'
    });

    setUploadData({ title: '', description: '', thumbnail: '', content: '', price: 0, access: 'free' });
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white">
              <Tv className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">Creator Studio</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {originalUser && (
              <button 
                onClick={revertLoginAs}
                className="bg-red-500 hover:bg-red-400 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Return to Admin
              </button>
            )}
            
            <Link to="/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="View Site">
              <Eye className="w-5 h-5" />
            </Link>

            <NotificationDropdown />
            
            <div className="relative border-l pl-4 border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setIsCreatorDropdownOpen(!isCreatorDropdownOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{user.channelName || user.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Channel</div>
                </div>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    {(user.name || 'U').charAt(0)}
                  </div>
                )}
              </button>
              
              {/* Dropdown Menu */}
              {isCreatorDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <Link to="/profile" onClick={() => setIsCreatorDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left">
                    <User className="w-4 h-4" /> Edit Profile
                  </Link>
                  <button onClick={() => { setIsCreatorDropdownOpen(false); setLogoutModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <Link 
            to="/creator/studio"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800`}
          >
            <BarChart2 className="w-5 h-5" /> Studio Manager
          </Link>
          <button 
            onClick={() => setActiveTab('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <BarChart2 className="w-5 h-5" /> Legacy Analytics
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Video className="w-5 h-5" /> Upload Video
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" /> Activity Tracking
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <History className="w-5 h-5" /> Smart Library
          </button>
          
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          
          {/* Studio Tab */}
          {activeTab === 'studio' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Channel Analytics</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Deep insights into your content's performance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Total Views</div>
                  <div className="text-4xl font-black text-slate-900 dark:text-white">{totalViews.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Approved Videos</div>
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{approvedVideos.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Pending Review</div>
                  <div className="text-4xl font-black text-amber-500">{pendingVideos.length}</div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Your Uploads</h3>
                {myVideos.length > 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Video</th>
                          <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                          <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Views</th>
                          <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {myVideos.map(video => (
                          <tr key={video.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={video.thumbnail || null} alt="" className="w-16 h-9 object-cover rounded bg-slate-200 dark:bg-slate-800" />
                                <span className="font-bold text-slate-900 dark:text-white">{video.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {video.publishStatus === 'approved' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 uppercase tracking-widest">
                                  <CheckCircle className="w-3 h-3" /> Live
                                </span>
                              ) : video.publishStatus === 'rejected' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 uppercase tracking-widest">
                                  <X className="w-3 h-3" /> Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-widest">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{video.views?.toLocaleString() || 0}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">{format(new Date(video.date), 'MMM d, yyyy')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                    <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No videos yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Start your channel by uploading your first video.</p>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                      Upload Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 max-w-3xl">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Content Creation</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Upload and share videos directly to your channel. Needs admin approval.</p>
              </div>

              <form onSubmit={handleUpload} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Video Title</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={uploadData.title}
                    onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="Provide a catchy title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={uploadData.description}
                    onChange={e => setUploadData({ ...uploadData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tell viewers what this video is about..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Thumbnail URL</label>
                    <div className="flex gap-2">
                       <input
                        type="url"
                        readOnly
                        placeholder="Click pick to open media"
                        value={uploadData.thumbnail}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm"
                      />
                      <button type="button" onClick={() => setShowMediaPicker('thumbnail')} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-4 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Video Content URL</label>
                    <div className="flex gap-2">
                       <input
                        type="url"
                        required
                        readOnly
                        placeholder="Click pick to open media"
                        value={uploadData.content}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm"
                      />
                      <button type="button" onClick={() => setShowMediaPicker('content')} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-4 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center">
                        <Video className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Access Type</label>
                    <select
                      value={uploadData.access}
                      onChange={e => setUploadData({ ...uploadData, access: e.target.value as 'free' | 'paid' })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="free">Free to Watch</option>
                      <option value="paid">Premium (Paid)</option>
                    </select>
                  </div>
                  {uploadData.access === 'paid' && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Price (Points)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={uploadData.price}
                        onChange={e => setUploadData({ ...uploadData, price: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" /> Submit for Approval
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Activity / Your Data Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Your Data & Activity</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your channel's systemic interactions and account changes.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.channelName || user.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Creator Account • Joined {format(new Date(user.createdAt), 'MMMM yyyy')}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                      Active
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-bold text-slate-900 dark:text-white">Recent Channel Activity</h4>
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8">
                    {myVideos.slice(0, 5).map((match, i) => (
                      <div key={match.id} className="relative pl-8">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900"></div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">{format(new Date(match.date), 'MMM d, yyyy')}</div>
                        <div className="text-slate-900 dark:text-white font-medium">Uploaded a new video: <span className="font-bold text-indigo-600 dark:text-indigo-400">{match.title}</span></div>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                           Status: <span className={`font-bold uppercase text-[10px] tracking-widest px-2 py-0.5 rounded-full ${match.publishStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {match.publishStatus}
                           </span>
                        </div>
                      </div>
                    ))}
                    {myVideos.length === 0 && (
                      <div className="pl-8 text-slate-500">No activity yet. Upload a video to get started.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Library Tab */}
          {activeTab === 'library' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Smart Library / Watch History</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Easily revisit content with your dedicated watch history.</p>
                </div>
              </div>

              {myWatchHistory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myWatchHistory.map(entry => {
                    const matchData = matches.find(m => m.id === entry.matchId);
                    if (!matchData) return null;
                    return (
                      <Link to={`/match/${matchData.slug}`} key={`${entry.matchId}-${entry.watchedAt}`} className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                           <img src={matchData.thumbnail || null} alt={matchData.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors"></div>
                           <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm">
                             {matchData.status === 'live' ? 'LIVE' : 'VOD'}
                           </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={matchData.title}>{matchData.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Watched {format(new Date(entry.watchedAt), 'MMM d, yyyy')}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No watch history</h3>
                  <p className="text-slate-500 dark:text-slate-400">Videos you watch will appear here to easily revisit them.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

       {showMediaPicker && (
         <MediaPicker
           onSelect={(url) => {
             if (showMediaPicker === 'thumbnail') {
               setUploadData(prev => ({ ...prev, thumbnail: url }));
             } else {
               setUploadData(prev => ({ ...prev, content: url }));
             }
             setShowMediaPicker(null);
           }}
           onClose={() => setShowMediaPicker(null)}
         />
       )}
    </div>
  );
}
