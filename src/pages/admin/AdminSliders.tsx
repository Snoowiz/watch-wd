import React, { useState, useEffect } from 'react';
import { useSliderStore, SliderGroup, Slide, useMatchStore, useBlogStore } from '../../store';
import { useUIStore } from '../../store/uiStore';
import { Plus, GripVertical, Trash2, Edit2, Play, Pause, Save, CheckCircle, Image as ImageIcon, Search, Loader2 } from 'lucide-react';
import { MediaPicker } from '../../components/MediaPicker';
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
  const { sliders, fetchSliders, addSlider, updateSlider, deleteSlider, saveSlidersToDatabase, isLoading } = useSliderStore();
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
    addSlider({
      name: 'New Slider Group',
      autoSlide: true,
      interval: 5,
      slides: []
    });
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
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
             <p className="text-sm text-slate-500">Create sliders to inject into pages</p>
           </div>
           <button
             onClick={handleAddGroup}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
           >
             <Plus className="w-4 h-4" />
             New Slider Group
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 h-fit">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Slider Groups</h3>
          {sliders.map(group => (
            <div
              key={group.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                activeGroupId === group.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              onClick={() => setActiveGroupId(group.id)}
            >
              <span className="truncate pr-4">{group.name}</span>
              {group.id !== 'default-hero' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {sliders.length === 0 && (
             <p className="text-sm text-slate-500">No sliders created yet.</p>
          )}
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          {activeGroup ? (
            <SliderGroupEditor 
              group={activeGroup} 
              onUpdate={(updates) => updateSlider(activeGroup.id, updates)} 
              onSaveToDb={saveSlidersToDatabase}
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
  onUpdate,
  onSaveToDb
}: { 
  group: SliderGroup; 
  onUpdate: (updates: Partial<SliderGroup>) => void;
  onSaveToDb: () => Promise<boolean>;
}) {
  const [localGroup, setLocalGroup] = useState<SliderGroup>(group);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useUIStore();

  // Sync when group prop changes
  useEffect(() => {
    setLocalGroup(group);
  }, [group]);

  const handleSave = async () => {
    setIsSaving(true);
    onUpdate(localGroup);
    const success = await onSaveToDb();
    setIsSaving(false);
    if (success) {
      setIsSaved(true);
      addToast('Sliders saved to database successfully!', 'success');
      setTimeout(() => setIsSaved(false), 2500);
    } else {
      addToast('Failed to save sliders to database.', 'error');
    }
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Math.random().toString(36).substring(7)}`,
      title: 'New Slide',
      subtitle: 'Add a captivating description here.',
      image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
      link: '',
      buttonText: 'Read More',
      isActive: true,
    };
    setLocalGroup(prev => ({ ...prev, slides: [...prev.slides, newSlide] }));
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
      {/* Group Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Slider Settings</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 select-all border border-slate-200 dark:border-slate-700">
              {localGroup.shortcode}
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
                isSaved 
                  ? 'bg-green-500 text-white' 
                  : isSaving 
                  ? 'bg-indigo-400 text-white cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving to Database...</>
              ) : isSaved ? (
                <><CheckCircle className="w-4 h-4" /> Saved to DB</>
              ) : (
                <><Save className="w-4 h-4" /> Save All Changes</>
              )}
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
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:text-white transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Auto Slide</label>
              <button
                onClick={() => setLocalGroup(prev => ({ ...prev, autoSlide: !prev.autoSlide }))}
                className={`p-2.5 rounded-xl border w-full flex items-center justify-center gap-2 transition-colors ${
                  localGroup.autoSlide
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500'
                }`}
              >
                {localGroup.autoSlide ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {localGroup.autoSlide ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {localGroup.autoSlide && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Interval (s)</label>
                <input
                  type="number"
                  min="1"
                  value={localGroup.interval}
                  onChange={(e) => setLocalGroup(prev => ({ ...prev, interval: parseInt(e.target.value) || 5 }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 dark:text-white transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slides List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Slides</h2>
          <button
            onClick={handleAddSlide}
            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
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
                  onUpdate={(updates) => handleUpdateSlide(slide.id, updates)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                />
              ))}
              {localGroup.slides.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">No slides added yet.</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

const SortableSlideItem: React.FC<{ slide: Slide, onUpdate: (updates: Partial<Slide>) => void, onDelete: () => void }> = ({ slide, onUpdate, onDelete }) => {
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

  const [isExpanded, setIsExpanded] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  
  const { matches = [] } = useMatchStore();
  const { posts = [] } = useBlogStore();

  const getLinkSuggestions = () => {
    if (!slide.link) return [];
    
    const query = slide.link.toLowerCase();
    const suggestions: { title: string; url: string; type: string }[] = [];

    // Check matches
    matches.forEach(match => {
      if ((match.title || '').toLowerCase().includes(query) || `/matches/${match.id}`.includes(query)) {
        suggestions.push({ title: match.title, url: `/matches/${match.id}`, type: 'Match' });
      }
    });

    // Check blogs
    posts.forEach(post => {
      if ((post.title || '').toLowerCase().includes(query) || `/blog/${post.slug}`.includes(query)) {
        suggestions.push({ title: post.title, url: `/blog/${post.slug}`, type: 'Blog' });
      }
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  };

  const linkSuggestions = getLinkSuggestions();

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden group">
      <div className="flex items-center p-4 gap-4">
        <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div 
          className="w-16 h-12 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${slide.image})` }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {!slide.image && <ImageIcon className="w-4 h-4 m-auto mt-4 text-slate-400" />}
        </div>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h4 className="font-bold text-slate-900 dark:text-white truncate">{slide.title}</h4>
          <p className="text-xs text-slate-500 truncate">{slide.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center cursor-pointer">
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
              <input
                type="text"
                value={slide.subtitle}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slide.image}
                  onChange={(e) => onUpdate({ image: e.target.value })}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
                <button
                  onClick={() => setShowMediaPicker(true)}
                  className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Link URL (Optional)</label>
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
                placeholder="/matches"
              />
              {showLinkSuggestions && linkSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Button Text</label>
              <input
                type="text"
                value={slide.buttonText}
                onChange={(e) => onUpdate({ buttonText: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                placeholder="Watch Now"
              />
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
}
