import React, { useState, useEffect, useRef } from 'react';
import { useSliderStore, SliderGroup, Slide, useMatchStore, useBlogStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit2, 
  Play, 
  Pause, 
  Save, 
  CheckCircle, 
  Image as ImageIcon, 
  Search, 
  Loader2, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { MediaPicker } from '../../components/MediaPicker';
import { compressImage } from '../../lib/imageCompressor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function AdminSliders({ embedded = false }: { embedded?: boolean }) {
  const { sliders, fetchSliders, addSlider, deleteSlider, saveSlidersToDatabase, isLoading } = useSliderStore();
  const { showConfirm, addToast, updateToast } = useUIStore();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(sliders[0]?.id || null);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  useEffect(() => {
    if (!activeGroupId && sliders.length > 0) {
      setActiveGroupId(sliders[0].id);
    }
  }, [sliders, activeGroupId]);

  const activeGroup = sliders.find(s => s.id === activeGroupId) || sliders[0];

  const handleAddGroup = async () => {
    const newGroupData = {
      name: 'New Slider Group',
      autoSlide: true,
      interval: 5,
      slides: []
    };
    addSlider(newGroupData);
    await saveSlidersToDatabase();
    addToast('New slider group created and saved to database!', 'success');
  };

  const handleDeleteGroup = (id: string) => {
    const group = sliders.find(s => s.id === id);
    const groupName = group ? group.name : 'this slider group';

    showConfirm({
      title: 'Delete Slider Group?',
      message: `Are you sure you want to permanently delete slider group "${groupName}"? Sub-slides inside will also be removed.`,
      confirmText: 'Delete Group',
      cancelText: 'Keep Group',
      isDanger: true,
      onConfirm: async () => {
        const toastId = addToast('Deleting slider group...', 'loading');
        try {
          deleteSlider(id);
          await saveSlidersToDatabase();
          if (activeGroupId === id) {
            setActiveGroupId(sliders.filter(s => s.id !== id)[0]?.id || null);
          }
          updateToast(toastId, { message: 'Slider group deleted successfully from database!', type: 'success' });
        } catch (err) {
          updateToast(toastId, { message: 'Failed to delete slider group.', type: 'error' });
        }
      }
    });
  };

  const handleSaveGroup = async (updatedGroup: SliderGroup): Promise<boolean> => {
    const updatedSliders = sliders.map(s => s.id === updatedGroup.id ? updatedGroup : s);
    return await saveSlidersToDatabase(updatedSliders);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Slider Management</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Create and manage sliders to use anywhere via shortcodes.</p>
          </div>
          <button
            onClick={handleAddGroup}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Slider Group
          </button>
        </div>
      )}

      {embedded && (
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 -mx-6 -mt-6 p-6 border-b border-slate-200 dark:border-slate-700 mb-6">
           <div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">Slider Builder</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400">Create and customize sliders to inject into pages</p>
           </div>
           <button
             onClick={handleAddGroup}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
           >
             <Plus className="w-4 h-4" />
             New Slider Group
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 h-fit">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Slider Groups
            </h3>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
              {sliders.length}
            </span>
          </div>

          <div className="space-y-1.5">
            {sliders.map(group => (
              <div
                key={group.id}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  activeGroupId === group.id
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-bold shadow-sm'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
                onClick={() => setActiveGroupId(group.id)}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-sm font-bold">{group.name}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {group.slides?.length || 0} {group.slides?.length === 1 ? 'slide' : 'slides'}
                  </div>
                </div>
                {group.id !== 'default-hero' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {sliders.length === 0 && (
             <p className="text-sm text-slate-500 py-4 text-center">No sliders created yet.</p>
          )}
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          {activeGroup ? (
            <SliderGroupEditor 
              key={activeGroup.id}
              group={activeGroup} 
              onSaveGroup={handleSaveGroup}
            />
          ) : (
            <div className="h-64 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">Select or create a slider group to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderGroupEditor({ 
  group, 
  onSaveGroup
}: { 
  group: SliderGroup; 
  onSaveGroup: (updatedGroup: SliderGroup) => Promise<boolean>;
}) {
  const [localGroup, setLocalGroup] = useState<SliderGroup>(group);
  const [expandedSlideIds, setExpandedSlideIds] = useState<Record<string, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavedAll, setIsSavedAll] = useState(false);
  const [savingSlideId, setSavingSlideId] = useState<string | null>(null);
  const [savedSlideId, setSavedSlideId] = useState<string | null>(null);
  const [copiedShortcode, setCopiedShortcode] = useState(false);
  const { addToast } = useUIStore();

  useEffect(() => {
    setLocalGroup(group);
  }, [group]);

  const handleCopyShortcode = () => {
    if (localGroup.shortcode) {
      navigator.clipboard.writeText(localGroup.shortcode);
      setCopiedShortcode(true);
      addToast('Shortcode copied to clipboard!', 'info');
      setTimeout(() => setCopiedShortcode(false), 2000);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    const success = await onSaveGroup(localGroup);
    setIsSavingAll(false);
    if (success) {
      setIsSavedAll(true);
      addToast('Slider settings and all slides saved to database successfully!', 'success');
      setTimeout(() => setIsSavedAll(false), 2500);
    } else {
      addToast('Failed to save slider settings to database.', 'error');
    }
  };

  const handleSaveSlide = async (slideId: string, updatedSlide?: Partial<Slide>) => {
    setSavingSlideId(slideId);
    let updatedGroup = localGroup;
    if (updatedSlide) {
      updatedGroup = {
        ...localGroup,
        slides: localGroup.slides.map(s => s.id === slideId ? { ...s, ...updatedSlide } : s)
      };
      setLocalGroup(updatedGroup);
    }
    const success = await onSaveGroup(updatedGroup);
    setSavingSlideId(null);
    if (success) {
      setSavedSlideId(slideId);
      addToast('Slide saved and applied to database!', 'success');
      setTimeout(() => {
        setSavedSlideId(curr => (curr === slideId ? null : curr));
      }, 2500);
    } else {
      addToast('Failed to save slide to database.', 'error');
    }
  };

  const handleAddSlide = () => {
    const newSlideId = `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSlide: Slide = {
      id: newSlideId,
      title: 'New Slide',
      subtitle: 'Add a captivating description here.',
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
      link: '',
      buttonText: 'Read More',
      isActive: true,
    };
    setLocalGroup(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
    // Automatically open the newly added slide so the user can immediately edit & save it!
    setExpandedSlideIds(prev => ({ ...prev, [newSlideId]: true }));
  };

  const handleDeleteSlide = (slideId: string) => {
    setLocalGroup(prev => ({
      ...prev,
      slides: prev.slides.filter(s => s.id !== slideId)
    }));
  };

  const handleUpdateSlide = (slideId: string, updates: Partial<Slide>) => {
    setLocalGroup(prev => ({
      ...prev,
      slides: prev.slides.map(s => s.id === slideId ? { ...s, ...updates } : s)
    }));
  };

  const toggleExpand = (slideId: string) => {
    setExpandedSlideIds(prev => ({
      ...prev,
      [slideId]: !prev[slideId]
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalGroup((prev) => {
        const oldIndex = prev.slides.findIndex(s => s.id === active.id);
        const newIndex = prev.slides.findIndex(s => s.id === over.id);

        return {
          ...prev,
          slides: arrayMove(prev.slides, oldIndex, newIndex)
        };
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Group Settings Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Slider Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure slider group playback and timing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShortcode}
              type="button"
              className="text-xs font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-950 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Click to copy shortcode"
            >
              {copiedShortcode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{localGroup.shortcode}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Group Name</label>
            <input
              type="text"
              value={localGroup.name}
              onChange={(e) => setLocalGroup(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Homepage Hero"
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:text-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Auto Slide</label>
              <button
                type="button"
                onClick={() => setLocalGroup(prev => ({ ...prev, autoSlide: !prev.autoSlide }))}
                className={`p-2.5 rounded-xl border w-full flex items-center justify-center gap-2 transition-all font-bold text-sm cursor-pointer ${
                  localGroup.autoSlide
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500'
                }`}
              >
                {localGroup.autoSlide ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                {localGroup.autoSlide ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {localGroup.autoSlide && (
              <div className="w-32">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interval (s)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={localGroup.interval}
                  onChange={(e) => setLocalGroup(prev => ({ ...prev, interval: parseInt(e.target.value) || 5 }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:text-white transition-all text-center font-bold"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slides List Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Slides
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                {localGroup.slides.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag to reorder slides. Click any slide to expand, customize details, or save individually.
            </p>
          </div>
          <button
            onClick={handleAddSlide}
            type="button"
            className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800/60 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Slide
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localGroup.slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {localGroup.slides.map((slide) => (
                <SortableSlideItem 
                  key={slide.id} 
                  slide={slide} 
                  isExpanded={!!expandedSlideIds[slide.id]}
                  onToggleExpand={() => toggleExpand(slide.id)}
                  onUpdate={(updates) => handleUpdateSlide(slide.id, updates)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                  onSaveSlide={(updatedValues) => handleSaveSlide(slide.id, updatedValues)}
                  isSavingThisSlide={savingSlideId === slide.id}
                  isSavedThisSlide={savedSlideId === slide.id}
                />
              ))}

              {localGroup.slides.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No slides in this group</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Add your first slide to start building the hero carousel.</p>
                  <button
                    onClick={handleAddSlide}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add First Slide
                  </button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {/* BOTTOM SAVE BAR — Placed prominently at the bottom of the editor */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/60 -mx-6 -mb-6 p-6 rounded-b-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddSlide}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Another Slide
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              {localGroup.slides.length} {localGroup.slides.length === 1 ? 'slide' : 'slides'} in <strong>{localGroup.name}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSavingAll}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer ${
              isSavedAll 
                ? 'bg-green-600 text-white shadow-green-500/20' 
                : isSavingAll 
                ? 'bg-indigo-400 text-white cursor-wait' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 active:scale-[0.99]'
            }`}
          >
            {isSavingAll ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving to Database...</>
            ) : isSavedAll ? (
              <><CheckCircle className="w-4 h-4" /> Saved to Database!</>
            ) : (
              <><Save className="w-4 h-4" /> Save Slider Group & All Slides</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const SortableSlideItem: React.FC<{ 
  slide: Slide;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Slide>) => void;
  onDelete: () => void;
  onSaveSlide: (updatedValues?: Partial<Slide>) => Promise<void>;
  isSavingThisSlide: boolean;
  isSavedThisSlide: boolean;
}> = ({ 
  slide, 
  isExpanded,
  onToggleExpand,
  onUpdate, 
  onDelete,
  onSaveSlide,
  isSavingThisSlide,
  isSavedThisSlide
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { matches = [] } = useMatchStore();
  const { posts = [] } = useBlogStore();

  const getLinkSuggestions = () => {
    if (!slide.link) return [];
    
    const query = slide.link.toLowerCase();
    const suggestions: { title: string; url: string; type: string }[] = [];

    matches.forEach(match => {
      if ((match.title || '').toLowerCase().includes(query) || `/matches/${match.id}`.includes(query)) {
        suggestions.push({ title: match.title, url: `/matches/${match.id}`, type: 'Match' });
      }
    });

    posts.forEach(post => {
      if ((post.title || '').toLowerCase().includes(query) || `/blog/${post.slug}`.includes(query)) {
        suggestions.push({ title: post.title, url: `/blog/${post.slug}`, type: 'Blog' });
      }
    });

    return suggestions.slice(0, 5);
  };

  const linkSuggestions = getLinkSuggestions();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large. Max 15MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      let url = event.target?.result as string;
      if (file.type.startsWith('image/')) {
        // Compress to responsive dimensions to avoid slow multi-megabyte payloads!
        url = await compressImage(url, 1600, 900, file.type);
      }
      onUpdate({ image: url });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageUrlBlur = async () => {
    // Automatically compress huge pasted base64 image strings to speed up saving
    if (slide.image && slide.image.startsWith('data:image/') && slide.image.length > 100000) {
      const compressed = await compressImage(slide.image, 1600, 900);
      onUpdate({ image: compressed });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden group shadow-sm transition-all">
      <div className="flex items-center p-4 gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div 
          className="w-16 h-12 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 bg-cover bg-center cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs relative"
          style={{ backgroundImage: `url(${slide.image})` }}
          onClick={onToggleExpand}
        >
          {!slide.image && <ImageIcon className="w-4 h-4 m-auto mt-4 text-slate-400" />}
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm">{slide.title || 'Untitled Slide'}</h4>
            {!slide.isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{slide.subtitle || 'No subtitle provided'}</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center cursor-pointer select-none" title="Toggle Slide Active/Hidden">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={slide.isActive}
                onChange={(e) => onUpdate({ isActive: e.target.checked })}
              />
              <div className={`block w-8 h-5 rounded-full transition-colors ${slide.isActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${slide.isActive ? 'transform translate-x-3' : ''}`}></div>
            </div>
          </label>
          <button 
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            title={isExpanded ? "Collapse Slide" : "Edit Slide"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
          <button 
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            title="Delete Slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Slide Title</label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="e.g. Grassroots Sports, Live & Direct"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Subtitle / Description</label>
              <input
                type="text"
                value={slide.subtitle}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                placeholder="e.g. Catch every match live on WatchWDS"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Image URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={slide.image}
                  onChange={(e) => onUpdate({ image: e.target.value })}
                  onBlur={handleImageUrlBlur}
                  placeholder="https://... or choose / upload an image"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3.5 py-2 rounded-lg font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Browse
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-600"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Link URL (Optional)</label>
              <input
                type="text"
                value={slide.link}
                onChange={(e) => {
                  onUpdate({ link: e.target.value });
                  setShowLinkSuggestions(true);
                }}
                onFocus={() => setShowLinkSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLinkSuggestions(false), 200)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="/matches or https://..."
              />
              {showLinkSuggestions && linkSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {linkSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm"
                      onClick={() => {
                        onUpdate({ link: suggestion.url });
                        setShowLinkSuggestions(false);
                      }}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{suggestion.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="uppercase text-[10px] font-black text-indigo-500">{suggestion.type}</span>
                        {suggestion.url}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Button Text</label>
              <input
                type="text"
                value={slide.buttonText}
                onChange={(e) => onUpdate({ buttonText: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="Watch Now"
              />
            </div>
          </div>

          {/* DEDICATED SLIDE ACTION BAR — Direct Save inside each slide! */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {slide.image ? 'Image asset attached' : 'No image asset attached'}
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onToggleExpand}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Done Editing
              </button>

              <button
                type="button"
                onClick={() => onSaveSlide()}
                disabled={isSavingThisSlide}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isSavedThisSlide
                    ? 'bg-green-600 text-white'
                    : isSavingThisSlide
                    ? 'bg-indigo-400 text-white cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
              >
                {isSavingThisSlide ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Slide...</>
                ) : isSavedThisSlide ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Slide Saved!</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Save Slide & Apply</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMediaPicker && (
        <MediaPicker 
          onSelect={(url) => {
            onUpdate({ image: url });
            setShowMediaPicker(false);
          }} 
          onClose={() => setShowMediaPicker(false)} 
        />
      )}
    </div>
  );
};
