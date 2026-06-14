import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useSettingsStore, useTaskStore, useMatchStore, useSavedMatchesStore, Match, usePurchaseStore, useCategoryStore } from '../store';
import { User, Mail, Star, Activity, Camera, CheckCircle, Clock, Gift, Shield, Bookmark, Settings, Bell, BellRing, BellOff, Menu, X } from 'lucide-react';
import { AddFundsModal } from '../components/AddFundsModal';
import { CompleteProfileModal } from '../components/CompleteProfileModal';
import { requestNotificationPermission, subscribeToCategory, subscribeToMatch, unsubscribeFromMatch, getNotificationPermission } from '../services/notificationService';

export function Profile() {
  const { user, updateUser } = useAuthStore();
  const { currencySymbol } = useSettingsStore();
  const { tasks = [], completedTasks = [], completeTask, fetchTasks } = useTaskStore();
  const { watchHistory = [], matches = [] } = useMatchStore();
  const { savedMatches = [], fetchSavedMatches } = useSavedMatchesStore();
  const { transactions = [], addTransaction, fetchTransactions } = usePurchaseStore();
  const { categories = [] } = useCategoryStore();
  
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isCompleteProfileOpen, setIsCompleteProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [savedMatchesData, setSavedMatchesData] = useState<Match[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTasks();
    fetchSavedMatches();
    fetchTransactions();
    
    // Fetch details for saved matches
    const fetchMatchDetails = async () => {
      try {
        const res = await fetch('/api/saved-matches/details', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavedMatchesData(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
          console.error('Failed to fetch saved matches details', err.message);
        }
      }
    };
    fetchMatchDetails();
  }, [fetchSavedMatches]);

  useEffect(() => {
    // Modal will auto open globally from App.tsx if fields are missing.
    // Here we only open manually via the settings gear.
  }, [user]);

  if (!user) return null;

  const myWatchHistory = watchHistory.filter(w => w.userId === user.id);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const newAvatar = reader.result as string;
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: user.name, avatar: newAvatar })
          });
          const data = await res.json();
          if (res.ok) {
            updateUser(data.user);
          }
        } catch (err) {
          console.error('Failed to update avatar', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCreator = () => {
    updateUser({ creatorStatus: 'pending' });
  };

  const handleCompleteTask = async (taskId: number, reward: number, taskTitle: string) => {
    const earned = await completeTask(taskId);
    if (earned !== undefined) {
      updateUser({ balance: user.balance + reward });
      fetchTransactions();
    }
  };

  const isTaskCompleted = (taskId: number) => {
    return completedTasks.includes(taskId);
  };

  const handleToggleCategoryNotification = async (categoryId: number) => {
    if (!user) return;
    const currentSubs = user.subscribedCategories ?? categories.map(c => c.id);
    const isCurrentlySubscribed = currentSubs.includes(categoryId);
    
    // Request permisson silently, don't block
    if ('Notification' in window && getNotificationPermission() !== 'granted') {
       requestNotificationPermission(user.id).catch(() => {});
    }

    const success = await subscribeToCategory(user.id, categoryId, !isCurrentlySubscribed);
    if (success) {
      if (isCurrentlySubscribed) {
        const newCategories = currentSubs.filter(id => id !== categoryId);
        updateUser({ subscribedCategories: newCategories });
      } else {
        const newCategories = Array.from(new Set([...currentSubs, categoryId]));
        updateUser({ subscribedCategories: newCategories });
      }
    }
  };

  const handleToggleMatchNotification = async (matchId: number) => {
    if (!user) return;
    const isCurrentlySubscribed = user.subscribedMatches?.includes(matchId) ?? false;
    
    // Request permisson silently, don't block
    if ('Notification' in window && getNotificationPermission() !== 'granted') {
       requestNotificationPermission(user.id).catch(() => {});
    }

    let success = false;
    if (isCurrentlySubscribed) {
       success = await unsubscribeFromMatch(user.id, matchId);
       if (success !== false) {
          const newMatches = (user.subscribedMatches || []).filter(id => id !== matchId);
          updateUser({ subscribedMatches: newMatches });
       }
    } else {
       success = await subscribeToMatch(user.id, matchId);
       if (success) {
          const newMatches = Array.from(new Set([...(user.subscribedMatches || []), matchId]));
          updateUser({ subscribedMatches: newMatches });
       }
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 shadow-2xl lg:shadow-none lg:bg-transparent lg:static transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full overflow-y-auto bg-white dark:bg-slate-800 p-4 lg:rounded-xl lg:shadow-sm lg:border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <span className="font-bold text-slate-900 dark:text-white">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-1">
            {(user.role === 'admin' || user.role === 'creator') && (
              <>
                <Link to="/creator/studio" className="flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                  <span className="font-bold text-slate-900 dark:text-white">Studio Manager</span>
                </Link>
                <Link to="/matches/new" className="flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                  <span className="font-bold text-slate-900 dark:text-white">Post Match</span>
                </Link>
                <Link to="/analytics" className="flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                  <span className="font-bold text-slate-900 dark:text-white">Analytics</span>
                </Link>
                <Link to="/subscriptions" className="flex flex-col p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                  <span className="font-bold text-slate-900 dark:text-white">Channel Subscriptions</span>
                </Link>
              </>
            )}
            
            <div className={`p-3 ${(user.role === 'admin' || user.role === 'creator') ? 'border-t border-slate-100 dark:border-slate-700 mt-2' : ''}`}>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Watch Match</span>
              <div className="mt-2 space-y-2">
                {myWatchHistory.length === 0 && <p className="text-xs text-slate-400">No recent matches</p>}
                {myWatchHistory.slice(0, 3).map(entry => {
                  const matchData = matches.find(m => m.id === entry.matchId);
                  if (!matchData) return null;
                  return (
                    <Link to={`/matches/${matchData.slug}`} key={`${entry.matchId}-${entry.watchedAt}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-colors">
                      {matchData.title}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 mt-2">
              <Link to="/saved" className="flex items-center justify-between group">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-yellow-500 transition-colors">Saved for Later</span>
                <Bookmark className="w-3.5 h-3.5 text-slate-400 group-hover:text-yellow-500 transition-colors" />
              </Link>
              <div className="mt-2 space-y-2">
                {savedMatchesData.length === 0 && <p className="text-xs text-slate-400">No saved matches</p>}
                {savedMatchesData.slice(0, 3).map(match => (
                  <Link to={`/matches/${match.slug}`} key={match.id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-yellow-600 dark:hover:text-yellow-400 truncate transition-colors">
                    {match.title}
                  </Link>
                ))}
                {savedMatchesData.length > 3 && (
                  <Link to="/saved" className="block text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 uppercase mt-1">
                    View all ({savedMatchesData.length})
                  </Link>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-700 mt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction History</span>
              <div className="mt-2 space-y-2">
                {transactions.filter(t => t.userId === user.id).length === 0 ? (
                  <p className="text-xs text-slate-400">No transactions</p>
                ) : (
                  transactions.filter(t => t.userId === user.id).slice(0, 4).map(transaction => (
                    <div key={transaction.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={transaction.description}>
                          {transaction.description.length > 20 ? transaction.description.substring(0,20) + '...' : transaction.description}
                        </div>
                        <div className="text-[10px] text-slate-500">{new Date(transaction.date).toLocaleDateString()}</div>
                      </div>
                      <div className={`text-xs font-bold whitespace-nowrap ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} {currencySymbol}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 mt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                Notifications
                <Bell className="w-3.5 h-3.5" />
              </span>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</span>
                  {categories.map(category => {
                    const currentSubs = user.subscribedCategories ?? categories.map(c => c.id);
                    const isSubbed = currentSubs.includes(category.id);
                    return (
                      <div key={category.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 dark:text-slate-300">{category.name}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isSubbed}
                            onChange={() => handleToggleCategoryNotification(category.id)}
                            className="sr-only peer" 
                          />
                          <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saved Matches</span>
                  {savedMatchesData.length === 0 ? (
                    <p className="text-[10px] text-slate-500">No saved matches</p>
                  ) : (
                    savedMatchesData.map(match => {
                      const isSubbed = user.subscribedMatches?.includes(match.id) ?? false;
                      return (
                        <div key={match.id} className="flex justify-between items-center text-xs gap-2">
                          <span className="text-slate-700 dark:text-slate-300 truncate">{match.title}</span>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input 
                              type="checkbox" 
                              checked={isSubbed}
                              onChange={() => handleToggleMatchNotification(match.id)}
                              className="sr-only peer" 
                            />
                            <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Profile Content */}
      <div className="flex-1 space-y-8 min-w-0">
        
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
            <span className="font-bold text-slate-900 dark:text-white">Profile Elements</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="h-32 bg-gradient-to-r from-yellow-400 to-yellow-600 relative flex justify-end p-4 sm:items-center sm:px-8">
          <div className="flex items-center gap-3 sm:gap-4 bg-black/10 dark:bg-black/20 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-white/20 shadow-sm relative z-10">
            <div className="text-right px-1 sm:px-2">
              <div className="text-yellow-50 text-[10px] sm:text-xs font-bold uppercase tracking-wide">Wallet Balance</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm leading-tight mt-0.5">
                {currencySymbol}{user.balance}
              </div>
            </div>
            <button 
              onClick={() => setIsBuyModalOpen(true)}
              className="bg-white text-yellow-600 hover:bg-yellow-50 font-bold py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl transition-colors text-sm shadow-sm"
            >
              Add Funds
            </button>
          </div>
        </div>
        <div className="px-4 sm:px-8 pb-4 sm:pb-8 relative flex flex-col sm:block items-center text-center sm:text-left">
          <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-xl border-4 border-white dark:border-slate-800 absolute -top-12 left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 flex items-center justify-center overflow-hidden shadow-lg group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-slate-400" />
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-colors">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-16 sm:pt-3 sm:ml-32 sm:pl-2 w-full items-center sm:items-stretch">
            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                {user.name}
                {user.verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                <button 
                  onClick={() => setIsCompleteProfileOpen(true)}
                  className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                  title="Edit Profile"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            
            {user.role === 'user' && (
              <div className="shrink-0">
                {!user.creatorStatus || user.creatorStatus === 'none' ? (
                  <button 
                    onClick={handleApplyCreator}
                    className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> Apply for Creator
                  </button>
                ) : user.creatorStatus === 'pending' ? (
                  <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-bold py-2 px-4 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Creator Application Pending
                  </span>
                ) : user.creatorStatus === 'approved' ? (
                  <span className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 font-bold py-2 px-4 rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Creator Approved
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-bold py-2 px-4 rounded-xl flex items-center gap-2">
                    Creator Application Rejected
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-500 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Earn Wallet Balance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Complete tasks to earn free {currencySymbol}</p>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.map(task => {
            const completed = isTaskCompleted(task.id);
            return (
              <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {task.title}
                    {completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task.description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-bold text-yellow-500">+{currencySymbol}{task.points_reward}</span>
                  <button 
                    onClick={() => handleCompleteTask(task.id, task.points_reward, task.title)}
                    disabled={completed}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                      completed 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-400'
                    }`}
                  >
                    {completed ? 'Completed' : 'Complete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Smart Library / Watch History */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Smart Library (Watch History)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Revisit matches and videos you've already watched</p>
          </div>
        </div>

        {myWatchHistory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myWatchHistory.map(entry => {
              const matchData = matches.find(m => m.id === entry.matchId);
              if (!matchData) return null;
              return (
                <div key={`${entry.matchId}-${entry.watchedAt}`} onClick={() => window.location.href = `/match/${matchData.slug}`} className="cursor-pointer group bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors">
                  <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                    <img src={matchData.thumbnail} alt={matchData.title} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Viewed
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{matchData.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Watched: {new Date(entry.watchedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No watch history found. 
          </div>
        )}
      </div>

      <AddFundsModal 
        isOpen={isBuyModalOpen} 
        onClose={() => setIsBuyModalOpen(false)} 
      />

      <CompleteProfileModal 
        isOpen={isCompleteProfileOpen} 
        onClose={() => setIsCompleteProfileOpen(false)} 
      />
      </div>
    </div>
  );
}
