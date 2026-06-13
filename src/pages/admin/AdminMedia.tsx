import React, { useState, useRef } from 'react';
import { useMediaStore } from '../../store';
import { Image as ImageIcon, Video, File, Link as LinkIcon, Trash2, Copy, Search, Plus, X, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { compressImage } from '../../lib/imageCompressor';

export function AdminMedia() {
  const { media = [], addMedia, deleteMedia, updateMedia } = useMediaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = media.filter(m => 
    (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      let url = event.target?.result as string;
      const isVideo = file.type.startsWith('video/');
      if (!isVideo) {
        url = await compressImage(url);
      }
      addMedia({
        name: file.name,
        url,
        type: isVideo ? 'video' : 'image',
        size: url.length
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl) return;

    addMedia({
      name: uploadUrl.split('/').pop() || 'external-media',
      url: uploadUrl,
      type: uploadUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
    });
    setUploadUrl('');
    setIsUploading(false);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Media Library</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your images, videos, and files</p>
        </div>
        <button
          onClick={() => setIsUploading(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredMedia.map((item) => (
          <div 
            key={item.id} 
            className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 group relative"
          >
            <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center">
              {item.type === 'video' ? (
                <Video className="w-12 h-12 text-slate-400" />
              ) : (
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
              
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                <button 
                  onClick={() => setSelectedMedia(item.id)}
                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                  title="View Details"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => copyToClipboard(item.url)}
                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteMedia(item.id)}
                  className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.name}>{item.name}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">
                {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        ))}

        {filteredMedia.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No media items found.</p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Upload Media
              </h3>
              <button onClick={() => setIsUploading(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload File</label>
                <div 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-indigo-500 mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to browse files</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Maximum upload size: 5 MB</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,video/*"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OR</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
              </div>

              <form onSubmit={handleUrlUpload}>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Add via URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/image.jpg"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" className="bg-slate-900 dark:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Media Edit/Details Modal */}
      {selectedMedia && (() => {
        const item = media.find(m => m.id === selectedMedia);
        if (!item) return null;

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row h-full max-h-[80vh]">
              
              {/* Media Preview */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[300px]">
                {item.type === 'video' ? (
                  <video src={item.url} controls className="max-w-full max-h-full rounded-lg shadow-lg" />
                ) : (
                  <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" referrerPolicy="no-referrer" />
                )}
              </div>
              
              {/* Media Details */}
              <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800 overflow-y-auto">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Attachment Details</h3>
                  <button onClick={() => setSelectedMedia(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">File Name</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-medium"
                      value={item.name}
                      onChange={(e) => updateMedia(item.id, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Uploaded On</label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{format(new Date(item.createdAt), 'MMMM d, yyyy, h:mm a')}</p>
                  </div>
                  {item.size && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">File Size</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{(item.size / 1024).toFixed(2)} KB</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">File URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        readOnly
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 font-mono"
                        value={item.url}
                      />
                      <button 
                        onClick={() => copyToClipboard(item.url)}
                        className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-500/40 transition-colors"
                        title="Copy Link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <button 
                    onClick={() => {
                      deleteMedia(item.id);
                      setSelectedMedia(null);
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-500 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
