import React, { useState, useRef } from 'react';
import { useMediaStore } from '../store';
import { Image as ImageIcon, Search, Upload, Link as LinkIcon, X, Check, Plus } from 'lucide-react';
import { compressImage } from '../lib/imageCompressor';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}

export function MediaPickerModal({ isOpen, onClose, onSelect, title = "Select Media" }: MediaPickerModalProps) {
  const { media = [], addMedia } = useMediaStore();
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'url'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const imageMedia = media.filter(m => m.type !== 'video');
  const filteredMedia = imageMedia.filter(m =>
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
      if (file.type.startsWith('image/')) {
        url = await compressImage(url);
      }
      const newMedia = {
        name: file.name,
        url,
        type: 'image' as const,
        size: url.length
      };
      addMedia(newMedia);
      onSelect(url);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    addMedia({
      name: uploadUrl.split('/').pop() || 'external-logo',
      url: uploadUrl.trim(),
      type: 'image'
    });
    onSelect(uploadUrl.trim());
    onClose();
  };

  const handleConfirmSelection = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose an existing media item or upload a new one</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'library'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Media Library ({imageMedia.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'upload'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'url'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            External URL
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search media library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              {/* Grid */}
              {filteredMedia.length === 0 ? (
                <div className="py-16 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No images in platform media library</p>
                  <p className="text-xs text-slate-400 mt-1">Upload a file or enter an image URL to get started.</p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-500 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {filteredMedia.map((item) => {
                    const isSelected = selectedUrl === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedUrl(item.url)}
                        className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isSelected
                            ? 'border-violet-500 ring-2 ring-violet-500/30 scale-[0.98]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/50'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                            <div className="w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white font-bold truncate">{item.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="py-8">
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-violet-500 dark:hover:border-violet-400 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 hover:bg-violet-50/30 dark:hover:bg-violet-500/5 transition-all text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Click to browse and upload image</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, WEBP, SVG (Max 10MB)</p>
                <p className="text-[11px] text-violet-600 dark:text-violet-400 font-bold mt-3">Images are automatically optimized and added to the Media Library</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
          )}

          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Image URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/logo.png"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add & Select Media
              </button>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          {activeTab === 'library' && (
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedUrl}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-md shadow-violet-600/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Use Selected Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
