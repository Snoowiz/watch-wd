import React, { useState, useEffect } from 'react';
import {
  useHomepageBuilderStore,
  useSliderStore,
  useCategoryStore,
  BlockType,
  HomepageBlock
} from '../../store';
import { useUIStore } from '../../store/uiStore';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  ExternalLink,
  RotateCcw,
  Sliders,
  Tv,
  Radio,
  Calendar,
  Trophy,
  Newspaper,
  Award,
  Building2,
  Megaphone,
  LayoutGrid,
  FileText,
  Minus,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  AlertTriangle,
  Play
} from 'lucide-react';

interface ClubOption {
  id: string;
  name: string;
}

export function AdminHomepageBuilder() {
  const {
    config,
    draftBlocks,
    isLoading,
    isSaving,
    isDirty,
    fetchAdminConfig,
    saveDraft,
    publish,
    reorderBlocks,
    updateBlock,
    toggleBlock,
    addBlock,
    removeBlock,
    duplicateBlock,
    resetToDefault
  } = useHomepageBuilderStore();

  const { sliders, fetchSliders } = useSliderStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { addToast, showConfirm } = useUIStore();

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'matches' | 'content' | 'layout'>('all');

  useEffect(() => {
    fetchAdminConfig();
    fetchSliders();
    fetchCategories();

    // Fetch active clubs for filtering options
    fetch('/api/clubs/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClubs(data.map(c => ({ id: String(c.id), name: c.name })));
        }
      })
      .catch(() => {});
  }, [fetchAdminConfig, fetchSliders, fetchCategories]);

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
      const oldIndex = draftBlocks.findIndex(b => b.id === active.id);
      const newIndex = draftBlocks.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderBlocks(oldIndex, newIndex);
      }
    }
  };

  const handleSaveDraft = async () => {
    const ok = await saveDraft();
    if (ok) {
      addToast('Draft layout saved successfully!', 'success');
    } else {
      addToast('Failed to save draft layout.', 'error');
    }
  };

  const handlePublish = async () => {
    const ok = await publish();
    if (ok) {
      addToast('Homepage layout published live!', 'success');
    } else {
      addToast('Failed to publish homepage layout.', 'error');
    }
  };

  const handleReset = () => {
    showConfirm({
      title: 'Reset to Default Layout?',
      message: 'This will replace current draft blocks with the standard WatchWDS homepage layout. Are you sure?',
      confirmText: 'Reset Layout',
      cancelText: 'Cancel',
      onConfirm: () => {
        resetToDefault();
        addToast('Layout reset to default. Remember to save or publish.', 'info');
      }
    });
  };

  const handlePreview = () => {
    window.open('/?preview=draft', '_blank');
  };

  const blockPaletteItems: { type: BlockType; label: string; icon: any; category: 'matches' | 'content' | 'layout'; desc: string }[] = [
    { type: 'hero_slider', label: 'Hero Slider', icon: Tv, category: 'content', desc: 'Featured hero slider from Slider Builder' },
    { type: 'featured_broadcasts', label: 'Featured Broadcasts', icon: Trophy, category: 'matches', desc: 'Top featured upcoming & highlight matches' },
    { type: 'live_matches', label: 'Live Matches', icon: Radio, category: 'matches', desc: 'Currently broadcasting live streams' },
    { type: 'upcoming_matches', label: 'Upcoming Matches', icon: Calendar, category: 'matches', desc: 'Scheduled games and broadcasts' },
    { type: 'completed_matches', label: 'Replays & Results', icon: Play, category: 'matches', desc: 'Finished matches and on-demand replays' },
    { type: 'latest_blogs', label: 'Latest Blogs', icon: Newspaper, category: 'content', desc: 'Recent articles, news, and insights' },
    { type: 'competitions', label: 'Competitions Grid', icon: Award, category: 'matches', desc: 'Browse games by league and tournament' },
    { type: 'clubs', label: 'Partner Clubs', icon: Building2, category: 'content', desc: 'Official club channels and emblems' },
    { type: 'ads', label: 'Advertisement Banner', icon: Megaphone, category: 'layout', desc: 'Custom sponsor ad banner or embed' },
    { type: 'features_grid', label: 'Features Showcase', icon: Sparkles, category: 'layout', desc: '3-feature grid: Streaming, PPV, Plans' },
    { type: 'custom_text', label: 'Custom Callout / Text', icon: FileText, category: 'content', desc: 'Custom headline, text content, and CTA' },
    { type: 'spacer', label: 'Spacer & Divider', icon: Minus, category: 'layout', desc: 'Visual separator between homepage sections' },
  ];

  const filteredPalette = blockPaletteItems.filter(item => {
    if (selectedCategoryTab === 'all') return true;
    return item.category === selectedCategoryTab;
  });

  return (
    <div className="space-y-8 text-left pb-16">
      {/* Top Header & Actions Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Homepage Builder
              </h1>
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Unsaved Changes
                </span>
              ) : config?.status === 'draft' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Draft Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-green-500/10 text-green-500 border border-green-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Live & Published
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Visually arrange, sort, and configure content blocks on your main landing page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
              title="Reset blocks to standard default"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Default
            </button>

            <button
              onClick={handlePreview}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Draft
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>

            <button
              onClick={handlePublish}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-yellow-500/20 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-slate-900" /> : <CheckCircle className="w-4 h-4 text-slate-900" />}
              Publish to Live
            </button>
          </div>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Palette: Add Content Blocks */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-yellow-500" />
              Add Content Blocks
            </h2>
            <span className="text-xs font-bold text-slate-400">{draftBlocks.length} in layout</span>
          </div>

          {/* Palette Filter Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1 text-xs font-bold text-slate-600 dark:text-slate-400">
            {(['all', 'matches', 'content', 'layout'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedCategoryTab(tab)}
                className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${
                  selectedCategoryTab === tab
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Palette Blocks List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredPalette.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => addBlock(item.type)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/70 hover:border-yellow-500/50 dark:hover:border-yellow-500/50 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-yellow-500/5 transition-all group flex items-start gap-3.5"
                >
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 group-hover:text-yellow-500 group-hover:border-yellow-500/40 transition-colors shrink-0 shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-yellow-500 transition-colors">
                        {item.label}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-yellow-500 transition-colors" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 font-medium">
            💡 Click any block to append it to the bottom of the homepage. You can then drag to reorder.
          </div>
        </div>

        {/* Right Canvas: Drag-and-drop sortable blocks */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              Homepage Layout Sequence
            </h2>
            <span className="text-xs text-slate-400 font-medium">Drag handle ⠿ to rearrange</span>
          </div>

          {isLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-16 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              <p className="text-sm font-bold text-slate-500">Loading homepage configuration...</p>
            </div>
          ) : draftBlocks.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-16 border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Your layout is currently empty</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select content blocks from the left sidebar or reset to the standard default layout.
                </p>
              </div>
              <button
                onClick={resetToDefault}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-900 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Load Default Layout
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draftBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3.5">
                  {draftBlocks.map((block, index) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      index={index}
                      isExpanded={expandedBlockId === block.id}
                      onToggleExpand={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                      onUpdate={(updates) => updateBlock(block.id, updates)}
                      onToggleActive={() => toggleBlock(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => {
                        showConfirm({
                          title: 'Remove Section?',
                          message: `Remove "${block.title || block.type}" from the homepage?`,
                          confirmText: 'Remove',
                          cancelText: 'Keep',
                          onConfirm: () => removeBlock(block.id)
                        });
                      }}
                      sliders={sliders}
                      categories={categories}
                      clubs={clubs}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}

// === SORTABLE BLOCK ITEM CARD ===
interface SortableBlockItemProps {
  block: HomepageBlock;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<HomepageBlock>) => void;
  onToggleActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  sliders: any[];
  categories: any[];
  clubs: ClubOption[];
}

function SortableBlockItem({
  block,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onToggleActive,
  onDuplicate,
  onDelete,
  sliders,
  categories,
  clubs
}: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.7 : 1
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'hero_slider': return Tv;
      case 'featured_broadcasts': return Trophy;
      case 'live_matches': return Radio;
      case 'upcoming_matches': return Calendar;
      case 'completed_matches': return Play;
      case 'latest_blogs': return Newspaper;
      case 'competitions': return Award;
      case 'clubs': return Building2;
      case 'ads': return Megaphone;
      case 'features_grid': return Sparkles;
      case 'custom_text': return FileText;
      case 'spacer': return Minus;
      default: return LayoutGrid;
    }
  };

  const Icon = getBlockIcon(block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border transition-all ${
        !block.enabled
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
          : isExpanded
          ? 'bg-white dark:bg-slate-800 border-yellow-500/50 dark:border-yellow-500/50 shadow-md ring-1 ring-yellow-500/20'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
      }`}
    >
      {/* Block Header Row */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <span className="text-xs font-black text-slate-400 w-5 text-center">
            {index + 1}
          </span>

          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 shrink-0">
            <Icon className="w-4 h-4 text-yellow-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                {block.title || 'Untitled Section'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 shrink-0">
                {block.type.replace('_', ' ')}
              </span>
            </div>
            {block.subtitle && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{block.subtitle}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Layout Badge */}
          <span className="text-[11px] font-bold text-slate-400 uppercase px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hidden sm:inline-block">
            {block.layout}
          </span>

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={onToggleActive}
            className={`p-2 rounded-xl border transition-colors ${
              block.enabled
                ? 'border-green-200 dark:border-green-900/40 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-500/10'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 bg-slate-100/50 dark:bg-slate-800'
            }`}
            title={block.enabled ? 'Section Visible (Click to disable)' : 'Section Hidden (Click to enable)'}
          >
            {block.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Duplicate block"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Remove block"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Expand Settings */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1"
            title="Configure settings"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Block Settings Panel */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Section Heading
              </label>
              <input
                type="text"
                value={block.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="e.g. Featured Broadcasts"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Subtitle / Description
              </label>
              <input
                type="text"
                value={block.subtitle || ''}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                placeholder="e.g. Catch up on the latest live sports"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-yellow-500 outline-none"
              />
            </div>

            {/* Layout Mode */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Display Layout
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['carousel', 'grid', 'list'] as const).map(layoutOpt => (
                  <button
                    key={layoutOpt}
                    type="button"
                    onClick={() => onUpdate({ layout: layoutOpt })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      block.layout === layoutOpt
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-black'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {layoutOpt}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Sort Items By
              </label>
              <select
                value={block.sortBy || 'latest'}
                onChange={(e) => onUpdate({ sortBy: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
              >
                <option value="latest">Latest / Newest First</option>
                <option value="popular">Most Popular / Featured</option>
                <option value="most_commented">Most Commented / Active</option>
                <option value="custom">Custom Filter Order</option>
              </select>
            </div>

            {/* Max Items */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Max Items to Display: <span className="text-yellow-500">{block.maxItems}</span>
              </label>
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={block.maxItems}
                onChange={(e) => onUpdate({ maxItems: parseInt(e.target.value, 10) })}
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                <span>2</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
              </div>
            </div>

            {/* View All Settings */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                "View All" Action Link
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={block.showViewAll !== false}
                    onChange={(e) => onUpdate({ showViewAll: e.target.checked })}
                    className="rounded text-yellow-500 focus:ring-yellow-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Button</span>
                </label>
                <input
                  type="text"
                  value={block.viewAllUrl || ''}
                  onChange={(e) => onUpdate({ viewAllUrl: e.target.value })}
                  placeholder="/matches or /blog"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Block-Type Specific Config */}
          {block.type === 'hero_slider' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Slider Group Selection
              </h4>
              <select
                value={block.config?.sliderId || 'default-hero'}
                onChange={(e) => onUpdate({ config: { ...block.config, sliderId: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
              >
                {sliders.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.slides?.length || 0} slides) [{s.id}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {block.type === 'ads' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ad Banner Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={block.config?.bannerImageUrl || ''}
                    onChange={(e) => onUpdate({ config: { ...block.config, bannerImageUrl: e.target.value } })}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Target Link URL</label>
                  <input
                    type="text"
                    value={block.config?.targetUrl || ''}
                    onChange={(e) => onUpdate({ config: { ...block.config, targetUrl: e.target.value } })}
                    placeholder="https://sponsor.com or /plans"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {block.type === 'spacer' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Spacer Properties
              </h4>
              <div className="flex items-center gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gap Height</label>
                  <select
                    value={block.config?.height || 'md'}
                    onChange={(e) => onUpdate({ config: { ...block.config, height: e.target.value } })}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                  >
                    <option value="sm">Small (24px)</option>
                    <option value="md">Medium (48px)</option>
                    <option value="lg">Large (72px)</option>
                    <option value="xl">Extra Large (96px)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={block.config?.showDivider !== false}
                    onChange={(e) => onUpdate({ config: { ...block.config, showDivider: e.target.checked } })}
                    className="rounded text-yellow-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Subtle Divider Line</span>
                </label>
              </div>
            </div>
          )}

          {block.type === 'custom_text' && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Content & Call to Action
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Content Text</label>
                <textarea
                  rows={3}
                  value={block.config?.content || ''}
                  onChange={(e) => onUpdate({ config: { ...block.config, content: e.target.value } })}
                  placeholder="Enter descriptive text or platform announcement..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={block.config?.buttonText || ''}
                    onChange={(e) => onUpdate({ config: { ...block.config, buttonText: e.target.value } })}
                    placeholder="e.g. Subscribe Now"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Button Target URL</label>
                  <input
                    type="text"
                    value={block.config?.buttonUrl || ''}
                    onChange={(e) => onUpdate({ config: { ...block.config, buttonUrl: e.target.value } })}
                    placeholder="e.g. /plans"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filtering Criteria for Matches blocks */}
          {['featured_broadcasts', 'live_matches', 'upcoming_matches', 'completed_matches'].includes(block.type) && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Filter Criteria (Optional)
              </h4>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">Match Status Filter</label>
                <div className="flex flex-wrap gap-2">
                  {(['live', 'upcoming', 'completed'] as const).map(st => {
                    const activeStatuses = block.filters?.status || [];
                    const isSelected = activeStatuses.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? activeStatuses.filter(s => s !== st)
                            : [...activeStatuses, st];
                          onUpdate({ filters: { ...block.filters, status: next } });
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                  {(!block.filters?.status || block.filters.status.length === 0) && (
                    <span className="text-[11px] text-slate-400 italic py-1">All statuses enabled</span>
                  )}
                </div>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Filter by Category / Sport</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {categories.map(cat => {
                      const activeCatIds = block.filters?.categoryIds || [];
                      const isSelected = activeCatIds.includes(Number(cat.id));
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            const numId = Number(cat.id);
                            const next = isSelected
                              ? activeCatIds.filter(id => id !== numId)
                              : [...activeCatIds, numId];
                            onUpdate({ filters: { ...block.filters, categoryIds: next } });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                            isSelected
                              ? 'bg-yellow-500 text-slate-900 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Club Filter */}
              {clubs.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2">Filter by Partner Club</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {clubs.map(club => {
                      const activeClubIds = block.filters?.clubIds || [];
                      const isSelected = activeClubIds.includes(club.id);
                      return (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? activeClubIds.filter(id => id !== club.id)
                              : [...activeClubIds, club.id];
                            onUpdate({ filters: { ...block.filters, clubIds: next } });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                            isSelected
                              ? 'bg-yellow-500 text-slate-900 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {club.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Access Filter (Free vs Paid) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">Access Type</label>
                <div className="flex items-center gap-4">
                  {(['free', 'paid'] as const).map(acc => {
                    const activeAccess = block.filters?.access || [];
                    const isSelected = activeAccess.includes(acc);
                    return (
                      <label key={acc} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...activeAccess, acc]
                              : activeAccess.filter(a => a !== acc);
                            onUpdate({ filters: { ...block.filters, access: next } });
                          }}
                          className="rounded text-yellow-500"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {acc === 'free' ? 'Free Matches' : 'Paid / PPV Matches'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
