import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Video, Newspaper, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useSettingsStore } from '../store';

export function MobileDock() {
  const { blogSettings } = useSettingsStore();
  const blogEnabled = blogSettings?.enabled !== false;
  const [showShare, setShowShare] = useState(false);
  const location = useLocation();

  const handleShareClick = () => {
    setShowShare(!showShare);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(currentUrl)}`,
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center md:hidden pointer-events-none pb-safe">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-full px-6 py-3.5 flex items-center gap-6 pointer-events-auto transition-colors duration-300">
        <div className="relative flex items-center overflow-hidden min-w-[120px] justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {!showShare ? (
              <motion.div 
                key="nav"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-7"
              >
                <Link to="/" className={`transition-colors ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'}`}>
                  <Home className="w-5 h-5" />
                </Link>
                <Link to="/matches" className={`transition-colors ${(location.pathname.startsWith('/matches') || location.pathname.startsWith('/category')) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'}`}>
                  <Video className="w-5 h-5" />
                </Link>
                {blogEnabled && (
                  <Link to="/blog" className={`transition-colors ${location.pathname.startsWith('/blog') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'}`}>
                    <Newspaper className="w-5 h-5" />
                  </Link>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="social"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-7"
              >
                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#1877F2] dark:text-slate-400 dark:hover:text-[#1877F2] transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#1DA1F2] dark:text-slate-400 dark:hover:text-[#1DA1F2] transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#0A66C2] dark:text-slate-400 dark:hover:text-[#0A66C2] transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700"></div>
        
        <button 
          onClick={handleShareClick}
          className={`flex items-center justify-center transition-colors ${
            showShare 
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20 rounded-full w-9 h-9 -my-1 -mx-2' 
              : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 w-5 h-5'
          }`}
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
