import React, { useEffect, useState } from 'react';
import { Heart, Facebook, Twitter, Linkedin, Youtube, Instagram, Rss } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSocialSettings, SocialSettings } from '../services/settingsService';
import { useSettingsStore } from '../store';

const SocialLinks = ({ social }: { social?: SocialSettings | null }) => {
  if (!social) return null;
  return (
    <>
      {social.facebook && (
        <a href={social.facebook} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-blue-600 dark:hover:text-blue-500 md:hover:bg-blue-50 md:dark:hover:bg-blue-500/10 rounded-lg transition-all" title="Facebook">
          <span className="sr-only">Facebook</span>
          <Facebook className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" />
        </a>
      )}
      {social.twitter && (
        <a href={social.twitter} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-sky-500 md:hover:bg-sky-50 md:dark:hover:bg-sky-500/10 rounded-lg transition-all" title="Twitter">
          <span className="sr-only">Twitter</span>
          <Twitter className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" />
        </a>
      )}
      {social.linkedin && (
        <a href={social.linkedin} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-blue-700 dark:hover:text-blue-500 md:hover:bg-blue-50 md:dark:hover:bg-blue-500/10 rounded-lg transition-all" title="LinkedIn">
          <span className="sr-only">LinkedIn</span>
          <Linkedin className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" />
        </a>
      )}
      {social.youtube && (
        <a href={social.youtube} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-red-500 md:hover:bg-red-50 md:dark:hover:bg-red-500/10 rounded-lg transition-all" title="YouTube">
          <span className="sr-only">YouTube</span>
          <Youtube className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" />
        </a>
      )}
      {social.instagram && (
        <a href={social.instagram} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-pink-600 md:hover:bg-pink-50 md:dark:hover:bg-pink-500/10 rounded-lg transition-all" title="Instagram">
          <span className="sr-only">Instagram</span>
          <Instagram className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" />
        </a>
      )}
      {social.tiktok && (
        <a href={social.tiktok} target="_blank" rel="external noopener noreferrer" className="p-2 md:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white md:hover:bg-slate-100 md:dark:hover:bg-slate-700/50 rounded-lg transition-all" title="TikTok">
          <span className="sr-only">TikTok</span>
          <svg className="w-6 h-6 md:w-5 md:h-5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
          </svg>
        </a>
      )}
    </>
  );
};

export function Footer() {
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const { platformName: storedPlatformName } = useSettingsStore();
  const platformName = storedPlatformName || 'WatchWDS';

  useEffect(() => {
    getSocialSettings().then(d => setSocialSettings(d));
  }, []);

  return (
    <>
      {/* Floating Social Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 py-3 px-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-l-0 border-slate-200/50 dark:border-slate-700/50 shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] rounded-r-xl transition-all duration-300">
        <SocialLinks social={socialSettings} />
      </div>

      {/* Main Footer Content */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 pb-28 md:py-8 mt-auto relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center gap-4 md:gap-6">
          <div className="text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-1 flex-wrap">
            © Copyright 2026, All Rights Reserved <span className="mx-2 hidden sm:inline">|</span>
            <span className="flex items-center gap-1 mt-2 sm:mt-0">
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span className="text-slate-900 dark:text-white font-bold">{platformName}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <Link to="/about" className="hover:text-yellow-500 transition-colors">About Us</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Use</Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
          </div>

          <div className="flex md:hidden items-center gap-1 sm:gap-2 flex-wrap justify-center">
            <SocialLinks social={socialSettings} />
          </div>
        </div>
      </footer>
    </>
  );
}
