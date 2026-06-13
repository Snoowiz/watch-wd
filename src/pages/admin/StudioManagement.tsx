import React, { useState } from 'react';
import { useCreatorStore, useNotificationStore, useMatchStore, useAuthStore } from '../../store';
import { Check, X, FileText, Upload, Users, Video } from 'lucide-react';

export function StudioManagement() {
  const { creatorContent = [], updateContentStatus, addDownloadLink, addActivity } = useCreatorStore();
  const { addNotification } = useNotificationStore();
  const { addMatch } = useMatchStore();
  
  const [showFileForm, setShowFileForm] = useState(false);
  const [fileTitle, setFileTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (content: any) => {
    updateContentStatus(content.id, 'approved');
    addActivity({
      userId: content.creatorId,
      type: 'submission',
      description: `Your match submission "${content.title}" was APPROVED by admin.`
    });
    addNotification({
        userId: content.creatorId,
        type: 'system',
        title: 'Match Approved',
        message: `Your match "${content.title || 'Untitled Match'}" has been APPROVED.`,
        link: '/creator/studio'
    });
    
    let embedHtml = '';
    if (content.url) {
      if (content.url.includes('youtube.com') || content.url.includes('youtu.be')) {
        const videoId = content.url.includes('v=') ? content.url.split('v=')[1]?.split('&')[0] : content.url.split('/').pop();
        embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      } else if (content.url.includes('vimeo.com')) {
        const videoId = content.url.split('/').pop();
        embedHtml = `<iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        embedHtml = `<video controls class="w-full h-full" src="${content.url}"></video>`;
      }
    }

    // Add match to global match store
    addMatch({
       id: Date.now(),
       title: content.title || 'Untitled Match',
       slug: content.slug || (content.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
       date: content.scheduledDate || new Date().toISOString(),
       price: content.price || 0,
       embedPrice: (content.price || 0) * 10,
       status: content.scheduledDate ? 'upcoming' : 'live',
       thumbnail: content.thumbnail || 'https://picsum.photos/800/450',
       content: content.content || content.description, // Use rich text content
       description: embedHtml || content.description, // Use embed code
       categories: content.categories && content.categories.length > 0 ? content.categories : (content.categoryId ? [content.categoryId] : [1]),
       access: content.access || 'paid',
       seo: content.seo || { keywords: '', metaDescription: (content.title || 'Untitled Match').substring(0, 50) },
       creatorId: content.creatorId,
       publishStatus: 'approved'
    });
    
    // Notify all users in the system conceptually...
    addNotification({
       type: 'system',
       title: 'New Content Available',
       message: `New match posted by ${content.creatorName}!`,
       link: `/matches/${(content.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    });
  };

  const handleReject = () => {
    if (rejectingId) {
       updateContentStatus(rejectingId, 'rejected', rejectionReason);
       const content = creatorContent.find(c => c.id === rejectingId);
       if (content) {
         addActivity({
           userId: content.creatorId,
           type: 'submission',
           description: `Your match submission "${content.title}" was REJECTED by admin.`
         });
         addNotification({
            userId: content.creatorId,
            type: 'system',
            title: 'Match Rejected',
            message: `Your match "${content.title || 'Untitled Match'}" has been REJECTED. Reason: ${rejectionReason}`,
            link: '/creator/studio'
         });
       }
       setRejectingId(null);
       setRejectionReason('');
    }
  };

  const handleShareFile = (e: React.FormEvent) => {
    e.preventDefault();
    addDownloadLink({ creatorId: 'all', title: fileTitle, url: fileUrl });
    setFileTitle('');
    setFileUrl('');
    setShowFileForm(false);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Studio Content Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Review pending creator matches and manage raw file sharing across the network.</p>
      </div>
      
      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <Video className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pending Creator Matches</h2>
        </div>
        
        <div className="space-y-4">
          {creatorContent.filter(c => c.status === 'pending').length === 0 ? (
             <div className="text-center py-10 text-slate-500 font-medium">All caught up! No pending submissions.</div>
          ) : creatorContent.filter(c => c.status === 'pending').map(content => (
            <div key={content.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                  <div className="w-32 h-20 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                     {content.thumbnail ? <img src={content.thumbnail} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{content.title}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">By Channel: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{content.creatorName}</span></p>
                    <div 
                      className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 max-w-xl prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: content.description || '' }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded font-bold uppercase">{content.access}</span>
                      {content.access === 'paid' && <span className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">{content.price} Pts</span>}
                    </div>
                  </div>
              </div>
              
              {rejectingId === content.id ? (
                 <div className="flex flex-col gap-2 min-w-[200px]">
                    <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Provide reason to creator..." className="w-full p-2 text-sm border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                    <div className="flex gap-2">
                       <button onClick={() => setRejectingId(null)} className="flex-1 bg-slate-200 dark:bg-slate-700 py-1.5 rounded text-sm font-bold">Cancel</button>
                       <button onClick={handleReject} disabled={!rejectionReason} className="flex-1 bg-red-600 text-white py-1.5 rounded text-sm font-bold disabled:opacity-50">Confirm Reject</button>
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button onClick={() => handleApprove(content)} className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                       <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => setRejectingId(content.id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                       <X className="w-4 h-4" /> Reject
                    </button>
                 </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-3">
               <FileText className="w-6 h-6 text-indigo-500" />
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Global File Shares</h2>
            </div>
            <button onClick={() => setShowFileForm(!showFileForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold transition-colors">
               + Share New File
            </button>
        </div>

        {showFileForm && (
            <form onSubmit={handleShareFile} className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">File Title / Description</label>
                      <input required type="text" placeholder="Raw footage: Matches 01-10" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Download URL (G-Drive, Dropbox, etc)</label>
                      <input required type="url" placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" />
                   </div>
                </div>
                <div className="flex justify-end pt-2">
                   <button type="submit" className="bg-green-500 hover:bg-green-400 text-slate-900 px-6 py-2.5 rounded-lg font-black shadow-lg shadow-green-500/30 transition-all flex items-center gap-2">
                     <Upload className="w-4 h-4" /> Broadcast File to Creators
                   </button>
                </div>
            </form>
        )}

        <div className="space-y-3">
            {creatorContent.length === 0 && !showFileForm ? (
                <div className="text-sm text-slate-500 text-center py-4">No active file shares.</div>
            ) : null}
            {/* We could list historical shares here, but let's keep it simple for now */}
        </div>
      </section>
    </div>
  );
}
