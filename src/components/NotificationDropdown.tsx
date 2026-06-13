import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (id: number, link: string | null) => {
    markAsRead(id);
    setIsOpen(false);
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-slate-600 dark:text-slate-300 hover:text-yellow-500 dark:hover:text-yellow-400 p-2 rounded-full relative transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        )}
      </button>
      
      {isOpen && (
        <div className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 max-w-sm mx-auto sm:mx-0 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 origin-top">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllAsRead()} className="text-xs text-yellow-600 dark:text-yellow-400 font-medium hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {safeNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                You're all caught up!
              </div>
            ) : (
              safeNotifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n.id, n.link)} 
                  className={`p-4 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors ${!n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                >
                  <div className="flex gap-3">
                    {n.actor_avatar ? (
                      <img src={n.actor_avatar} alt={n.actor_name || ''} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs">
                        {n.type === 'system' ? 'W' : (n.actor_name ? n.actor_name[0].toUpperCase() : 'U')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">{n.title}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{n.message}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
