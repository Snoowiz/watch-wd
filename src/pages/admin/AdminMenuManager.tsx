import React, { useState, useEffect } from 'react';
import { 
  Menu as MenuIcon, Plus, Save, RotateCcw, ChevronDown, ChevronRight, 
  Trash2, MoveUp, MoveDown, CornerDownRight, ExternalLink, Link as LinkIcon, 
  Layers, CheckSquare, Square, GripVertical, Loader2, Sparkles, Trophy, Globe
} from 'lucide-react';
import { useMenuStore, MenuItem, NavigationMenusConfig, DEFAULT_NAVIGATION_MENUS, useSportStore } from '../../store';
import { useUIStore } from '../../store/uiStore';

const STANDARD_PAGES = [
  { id: 'page-home', label: 'Home', url: '/' },
  { id: 'page-browse', label: 'Browse / All events', url: '/browse' },
  { id: 'page-clubs', label: 'Clubs', url: '/clubs' },
  { id: 'page-competition', label: 'Competitions', url: '/competition' },
  { id: 'page-blog', label: 'Blog', url: '/blog' },
  { id: 'page-forum', label: 'Community Forum', url: '/forum' },
  { id: 'page-plans', label: 'Plans & Subscriptions', url: '/plans' },
  { id: 'page-search', label: 'Search', url: '/search' },
  { id: 'page-about', label: 'About Us', url: '/about' },
  { id: 'page-terms', label: 'Terms of Use', url: '/terms' },
  { id: 'page-privacy', label: 'Privacy Policy', url: '/privacy' },
];

export function AdminMenuManager() {
  const { menus, fetchMenus, saveMenus, isLoading } = useMenuStore();
  const { sports, fetchActiveSports } = useSportStore();
  const { addToast, updateToast, showConfirm } = useUIStore();

  const [activeLocation, setActiveLocation] = useState<'primary' | 'mobile' | 'footer'>('primary');
  const [currentMenuConfig, setCurrentMenuConfig] = useState<NavigationMenusConfig>(menus);
  const [isSaving, setIsSaving] = useState(false);

  // Add items state
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [customLinkText, setCustomLinkText] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [customLinkBlank, setCustomLinkBlank] = useState(false);

  // Expanded items in tree
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchMenus();
    fetchActiveSports();
  }, [fetchMenus, fetchActiveSports]);

  useEffect(() => {
    if (menus) {
      setCurrentMenuConfig(menus);
    }
  }, [menus]);

  const activeItems = currentMenuConfig[activeLocation] || [];

  const updateActiveItems = (items: MenuItem[]) => {
    setCurrentMenuConfig(prev => ({
      ...prev,
      [activeLocation]: items,
    }));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add Standard Pages to Menu
  const handleAddSelectedPages = () => {
    if (selectedPages.length === 0) return;
    const newItems: MenuItem[] = selectedPages.map(pageId => {
      const page = STANDARD_PAGES.find(p => p.id === pageId)!;
      return {
        id: `menu-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        label: page.label,
        url: page.url,
        type: 'page',
      };
    });
    updateActiveItems([...activeItems, ...newItems]);
    setSelectedPages([]);
    addToast(`Added ${newItems.length} page(s) to menu.`, 'success');
  };

  // Add Configured Sports to Menu
  const handleAddSelectedSports = () => {
    if (selectedSports.length === 0) return;
    const newItems: MenuItem[] = selectedSports.map(spId => {
      const sp = sports.find(s => s.id === spId || s.slug === spId)!;
      return {
        id: `menu-sport-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        label: sp.name,
        url: `/browse?sport=${sp.slug || sp.id}`,
        type: 'sport',
      };
    });
    updateActiveItems([...activeItems, ...newItems]);
    setSelectedSports([]);
    addToast(`Added ${newItems.length} sport(s) to menu.`, 'success');
  };

  // Add Custom Link to Menu
  const handleAddCustomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLinkText.trim() || !customLinkUrl.trim()) {
      addToast('Link text and URL are required.', 'error');
      return;
    }
    const newItem: MenuItem = {
      id: `menu-custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      label: customLinkText.trim(),
      url: customLinkUrl.trim(),
      type: 'custom',
      target: customLinkBlank ? '_blank' : '_self',
    };
    updateActiveItems([...activeItems, newItem]);
    setCustomLinkText('');
    setCustomLinkUrl('');
    setCustomLinkBlank(false);
    addToast('Custom link added to menu.', 'success');
  };

  // Tree manipulation
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...activeItems];
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;
    updateActiveItems(items);
  };

  const handleMoveDown = (index: number) => {
    if (index === activeItems.length - 1) return;
    const items = [...activeItems];
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;
    updateActiveItems(items);
  };

  // Indent item (create nested sub-item)
  const handleNestItem = (index: number) => {
    if (index === 0) return;
    const items = [...activeItems];
    const targetChild = items[index];
    const parent = items[index - 1];
    parent.children = parent.children || [];
    parent.children.push(targetChild);
    items.splice(index, 1);
    updateActiveItems(items);
    addToast(`Nested "${targetChild.label}" under "${parent.label}".`, 'info');
  };

  // Outdent sub-item (extract back to top level)
  const handleOutdentChild = (parentIndex: number, childIndex: number) => {
    const items = [...activeItems];
    const parent = items[parentIndex];
    if (!parent.children || !parent.children[childIndex]) return;
    const extracted = parent.children.splice(childIndex, 1)[0];
    items.splice(parentIndex + 1, 0, extracted);
    updateActiveItems(items);
    addToast(`Moved "${extracted.label}" back to top level.`, 'info');
  };

  const handleDeleteItem = (index: number) => {
    const items = [...activeItems];
    items.splice(index, 1);
    updateActiveItems(items);
  };

  const handleDeleteChild = (parentIndex: number, childIndex: number) => {
    const items = [...activeItems];
    if (items[parentIndex]?.children) {
      items[parentIndex].children!.splice(childIndex, 1);
      updateActiveItems(items);
    }
  };

  const handleItemLabelChange = (index: number, newLabel: string) => {
    const items = [...activeItems];
    items[index].label = newLabel;
    updateActiveItems(items);
  };

  const handleItemUrlChange = (index: number, newUrl: string) => {
    const items = [...activeItems];
    items[index].url = newUrl;
    updateActiveItems(items);
  };

  const handleItemTargetChange = (index: number, blank: boolean) => {
    const items = [...activeItems];
    items[index].target = blank ? '_blank' : '_self';
    updateActiveItems(items);
  };

  const handleChildLabelChange = (parentIndex: number, childIndex: number, newLabel: string) => {
    const items = [...activeItems];
    if (items[parentIndex]?.children?.[childIndex]) {
      items[parentIndex].children![childIndex].label = newLabel;
      updateActiveItems(items);
    }
  };

  const handleChildUrlChange = (parentIndex: number, childIndex: number, newUrl: string) => {
    const items = [...activeItems];
    if (items[parentIndex]?.children?.[childIndex]) {
      items[parentIndex].children![childIndex].url = newUrl;
      updateActiveItems(items);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const items = [...activeItems];
    const draggedItem = items.splice(draggedIndex, 1)[0];
    items.splice(targetIndex, 0, draggedItem);
    setDraggedIndex(null);
    updateActiveItems(items);
  };

  // Save all menus to server
  const handleSaveAll = async () => {
    setIsSaving(true);
    const toastId = addToast('Saving navigation menus...', 'loading');
    try {
      const ok = await saveMenus(currentMenuConfig);
      if (ok) {
        updateToast(toastId, { message: 'Navigation menus saved and cache purged!', type: 'success' });
      } else {
        updateToast(toastId, { message: 'Failed to save navigation menus.', type: 'error' });
      }
    } catch (err: any) {
      updateToast(toastId, { message: err.message || 'Save error', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    showConfirm({
      title: 'Reset Menus to Default',
      message: 'Are you sure you want to restore the canonical navigation menus? Any custom arrangements will be replaced with standard defaults.',
      onConfirm: async () => {
        setCurrentMenuConfig(DEFAULT_NAVIGATION_MENUS);
        await saveMenus(DEFAULT_NAVIGATION_MENUS);
        addToast('Navigation menus restored to defaults.', 'success');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <MenuIcon className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Menu Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            WordPress-style visual navigation builder. Create dropdowns, reorder links, and assign menus to desktop and mobile layouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-yellow-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Menu
              </>
            )}
          </button>
        </div>
      </div>

      {/* Location Selector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6">
        {[
          { id: 'primary', label: 'Primary Navigation (Desktop Header)' },
          { id: 'mobile', label: 'Mobile Drawer Menu' },
          { id: 'footer', label: 'Footer Menu' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveLocation(tab.id as any)}
            className={`pb-3.5 px-2 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeLocation === tab.id
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Builder Layout: Left Controls, Right Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Add Items Panels (4 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Panel 1: Site Pages */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Site Pages
              </span>
              <span className="text-xs text-slate-400 font-semibold">{STANDARD_PAGES.length} available</span>
            </div>
            <div className="p-4 max-h-56 overflow-y-auto space-y-2">
              {STANDARD_PAGES.map(page => {
                const isSelected = selectedPages.includes(page.id);
                return (
                  <label key={page.id} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-yellow-600">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedPages(prev => isSelected ? prev.filter(x => x !== page.id) : [...prev, page.id]);
                      }}
                      className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                    />
                    <span>{page.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">{page.url}</span>
                  </label>
                );
              })}
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                type="button"
                onClick={handleAddSelectedPages}
                disabled={selectedPages.length === 0}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition-all disabled:opacity-40"
              >
                Add to Menu
              </button>
            </div>
          </div>

          {/* Panel 2: Sports Categories */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Configured Sports
              </span>
              <span className="text-xs text-slate-400 font-semibold">{sports.length} sports</span>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto space-y-2">
              {sports.map(sp => {
                const isSelected = selectedSports.includes(sp.id);
                return (
                  <label key={sp.id} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-yellow-600">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedSports(prev => isSelected ? prev.filter(x => x !== sp.id) : [...prev, sp.id]);
                      }}
                      className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500"
                    />
                    <span>{sp.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">/browse?sport={sp.slug}</span>
                  </label>
                );
              })}
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                type="button"
                onClick={handleAddSelectedSports}
                disabled={selectedSports.length === 0}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition-all disabled:opacity-40"
              >
                Add to Menu
              </button>
            </div>
          </div>

          {/* Panel 3: Custom Links */}
          <form onSubmit={handleAddCustomLink} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-500" />
                Custom Link
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or /custom-url"
                  value={customLinkUrl}
                  onChange={(e) => setCustomLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Live Radio, Merchandise"
                  value={customLinkText}
                  onChange={(e) => setCustomLinkText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={customLinkBlank}
                  onChange={(e) => setCustomLinkBlank(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-yellow-500"
                />
                <span>Open in a new window/tab</span>
              </label>
            </div>
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
              >
                Add to Menu
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Menu Visual Tree Structure (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Menu Structure</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag to reorder. Click "Nest Under Previous" to create sub-menus and dropdowns.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
              {activeItems.length} top-level items
            </span>
          </div>

          {activeItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <MenuIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold">This menu is currently empty.</p>
              <p className="text-xs mt-1">Select pages, sports, or add custom links from the left panel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeItems.map((item, index) => {
                const isExpanded = !!expandedItems[item.id];
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <div key={item.id} className="space-y-2">
                    {/* Top Level Item Card */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 transition-all hover:border-yellow-500/50 group ${
                        draggedIndex === index ? 'opacity-30 border-dashed border-yellow-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab shrink-0" />
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(item.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="truncate">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2 truncate">
                            {item.url}
                          </span>
                        </div>
                      </div>

                      {/* Item Quick Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleNestItem(index)}
                            title="Nest under item above (Create Dropdown)"
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-500/10 rounded-lg text-xs flex items-center gap-1 font-bold"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">Nest</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === activeItems.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          title="Move Down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-500"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Top Level Item Expanded Edit Drawer */}
                    {isExpanded && (
                      <div className="p-4 ml-6 mr-1 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in shadow-inner">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Navigation Label
                            </label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleItemLabelChange(index, e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Destination URL
                            </label>
                            <input
                              type="text"
                              value={item.url}
                              onChange={(e) => handleItemUrlChange(index, e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.target === '_blank'}
                            onChange={(e) => handleItemTargetChange(index, e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-yellow-500"
                          />
                          <span>Open link in new window / tab</span>
                        </label>
                      </div>
                    )}

                    {/* Nested Children / Dropdown Sub-Items */}
                    {hasChildren && (
                      <div className="ml-8 pl-4 border-l-2 border-yellow-500/40 space-y-2">
                        {item.children!.map((child, childIdx) => (
                          <div
                            key={child.id}
                            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <CornerDownRight className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                {child.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate">
                                {child.url}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOutdentChild(index, childIdx)}
                                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-700 rounded-lg"
                                title="Move back to top level"
                              >
                                Outdent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteChild(index, childIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                                title="Remove sub-item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

