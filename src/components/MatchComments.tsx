import React, { useState, useEffect, useRef } from 'react';
import { useCommentStore, useAuthStore, Match } from '../store';
import { Send, Heart, MessageSquare, Clock, Smile, Minimize2, Maximize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { UserAvatar } from './UserAvatar';

interface MatchCommentsProps {
  match: Match;
  hasAccess: boolean;
}

export function MatchComments({ match, hasAccess }: MatchCommentsProps) {
  const { user } = useAuthStore();
  const { comments = [], addComment, likeComment, fetchComments } = useCommentStore();
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    fetchComments(match.id);
  }, [match.id, fetchComments]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const matchComments = comments.filter(c => String(c.matchId) === String(match.id));
  const isCommentingEnabled = match.liveCommenting !== false;

  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
    }
  }, [matchComments.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !isCommentingEnabled || !hasAccess || isOffline) return;

    addComment({
      matchId: match.id,
      userId: user.id,
      username: user.name,
      avatar: user.avatar,
      content: newComment.trim(),
    });

    setNewComment('');
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewComment(prev => prev + emojiObject.emoji);
  };

  const getAlignmentClass = () => {
    switch (match.commentAlignment) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      case 'center': return 'text-center';
      default: return 'text-left';
    }
  };

  return (
    <div className={`MatchComments bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ${getAlignmentClass()}`}>
      <div className={`border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between shrink-0 ${isCompact ? 'p-2' : 'p-4'}`}>
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <MessageSquare className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-indigo-500`} />
          <h3 className={isCompact ? 'text-sm' : ''}>Comments</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          {isOffline ? (
            <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              Offline
            </span>
          ) : match.status === 'live' ? (
             <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Live
             </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {match.status === 'completed' ? 'Ended' : 'Offline'}
            </span>
          )}
          <button 
            onClick={() => setIsCompact(!isCompact)} 
            className="p-1 rounded-md text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
            title={isCompact ? "Expand Chat" : "Compact Chat"}
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div ref={commentsContainerRef} className={`overflow-y-auto space-y-4 custom-scrollbar ${isCompact ? 'max-h-[300px]' : 'max-h-[400px]'} ${isCompact ? 'p-2' : 'p-4'}`}>
        {matchComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 py-8 px-4 text-center">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="text-sm">No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          matchComments.map((comment) => (
            <div key={comment.id} className="flex gap-2 sm:gap-3 items-start">
              <UserAvatar 
                src={comment.avatar} 
                name={comment.username} 
                className={`${isCompact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-full shrink-0 mt-1 shadow-sm`}
                shape="circle"
              />
              <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`font-bold ${isCompact ? 'text-xs' : 'text-sm'} text-slate-900 dark:text-white line-clamp-1`}>{comment.username}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {(() => {
                      const date = new Date(comment.timestamp);
                      if (isNaN(date.getTime())) return 'recently';
                      try {
                        return formatDistanceToNow(date, { addSuffix: true });
                      } catch(e) {
                        return 'recently';
                      }
                    })()}
                  </span>
                </div>
                <div className={`${isCompact ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 sm:px-4 sm:py-2 text-sm'} rounded-2xl break-words ${
                  String(comment.userId) === String(user?.id)
                    ? 'bg-indigo-500 text-white rounded-tr-sm' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  {comment.content}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => likeComment(comment.id)}
                    className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    <Heart className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${comment.likes > 0 ? 'fill-pink-500 text-pink-500' : ''}`} />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                  </button>
                  {user && isCommentingEnabled && hasAccess && (
                    <button 
                      onClick={() => setNewComment(prev => prev ? prev + ` @${comment.username} ` : `@${comment.username} `)}
                      className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={`border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 ${isCompact ? 'p-2' : 'p-4'}`}>
        {!hasAccess ? (
          <div className="text-center p-3 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400">
            Unlock this match to join the conversation.
          </div>
        ) : !isCommentingEnabled ? (
          <div className="text-center p-3 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400">
            Chat is currently disabled for this match.
          </div>
        ) : !user ? (
          <div className="text-center p-3 bg-slate-200 dark:bg-slate-800 rounded-xl text-sm text-slate-500 dark:text-slate-400">
            Please <a href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">log in</a> to chat.
          </div>
        ) : (
          <div className="relative">
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                  lazyLoadEmojis={true}
                />
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isOffline ? "You are offline..." : "Type a message..."}
                  disabled={isOffline || !isCommentingEnabled}
                  className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors disabled:opacity-50 ${isCompact ? 'py-1.5 text-xs' : 'py-2 text-sm pl-4 pr-10'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1`}
                >
                  <Smile className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || isOffline}
                className={`bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 ${isCompact ? 'p-1.5' : 'p-2'}`}
              >
                <Send className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
