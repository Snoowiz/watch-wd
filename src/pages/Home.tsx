import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Eye, Edit3 } from 'lucide-react';
import { useHomepageBuilderStore, DEFAULT_HOMEPAGE_BLOCKS } from '../store';
import { HomepageRenderer } from '../components/homepage/HomepageRenderer';

export function Home() {
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'draft';
  const { config, fetchConfig } = useHomepageBuilderStore();

  useEffect(() => {
    fetchConfig(isPreview);
  }, [fetchConfig, isPreview]);

  const activeBlocks = (config?.blocks && config.blocks.length > 0)
    ? config.blocks
    : DEFAULT_HOMEPAGE_BLOCKS;

  return (
    <div className="relative">
      {/* Draft Preview Bar */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-black flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 animate-pulse" />
            <span>HOMEPAGE DRAFT PREVIEW — Viewing draft layout sequence.</span>
          </div>
          <Link
            to="/admin/homepage"
            className="px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit in Builder
          </Link>
        </div>
      )}

      <HomepageRenderer blocks={activeBlocks} />
    </div>
  );
}
