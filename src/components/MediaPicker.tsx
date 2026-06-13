import React, { useState, useRef } from 'react';
import { useMediaStore } from '../store';
import { Image as ImageIcon, Video, Search, Upload, X, Check } from 'lucide-react';
import { compressImage } from '../lib/imageCompressor';

interface MediaPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const { media = [], addMedia } = useMediaStore();
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'url'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = media.filter(m => (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()));

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
      setActiveTab('library');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl) return;
    
    addMedia({
      name: uploadUrl.split('/').pop() || 'external-media',
      url: uploadUrl,
      type: uploadUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
    });
    setUploadUrl('');
    setActiveTab('library');
  };

  const handleSelect = () => {
    if (selectedId) {
      const selectedItem = media.find(m => m.id === selectedId);
      if (selectedItem) {
        onSelect(selectedItem.url);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col h-[80vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Choose Media</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-700 flex gap-6">
          <button 
            className={`pb-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'library' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('library')}
          >
            Media Library
          </button>
          <button 
            className={`pb-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'upload' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Files
          </button>
          <button 
            className={`pb-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'url' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('url')}
          >
            Insert from URL
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex bg-slate-50 dark:bg-slate-900">
          {activeTab === 'library' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 content-start">
                {filteredMedia.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all relative ${selectedId === item.id ? 'border-indigo-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-400" />
                      </div>
                    ) : (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                    {selectedId === item.id && (
                      <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow-lg z-10">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div 
                className="w-full max-w-lg border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-indigo-500 mb-4" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Drop files here to upload</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">or click to choose from your computer</p>
                <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-lg font-bold">
                  Select Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,video/*"
                />
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
               <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Insert from URL</h3>
                  <form onSubmit={handleUrlSubmit} className="space-y-4">
                    <div>
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={uploadUrl}
                        onChange={(e) => setUploadUrl(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                      Upload
                    </button>
                  </form>
               </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-800">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSelect}
            disabled={activeTab !== 'library' || !selectedId}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors"
          >
            Select Media
          </button>
        </div>
      </div>
    </div>
  );
}
