import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useBlogStore, useAuthStore } from '../store';
import { Calendar, Clock, Eye, Heart, Share2, ArrowLeft, Volume2, VolumeX, MessageSquare, Tag as TagIcon, Lock } from 'lucide-react';
import { format } from 'date-fns';

export function BlogPostDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { posts = [], comments = [], incrementViews, likePost, addComment, likeComment, fetchComments } = useBlogStore();
  const { user } = useAuthStore();
  
  const [post, setPost] = useState(posts.find(p => p.slug === slug));

  const formatDateSafe = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'TBA';
    return format(date, formatStr);
  };
  
  const [readProgress, setReadProgress] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const contentRef = useRef<HTMLDivElement>(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    const currentPost = posts.find(p => p.slug === slug);
    if (currentPost) {
      setPost(currentPost);
      fetchComments(currentPost.id);
      // Only increment view if it hasn't been viewed this session
      const viewed = sessionStorage.getItem(`viewed_${currentPost.id}`);
      if (!viewed) {
        incrementViews(currentPost.id);
        sessionStorage.setItem(`viewed_${currentPost.id}`, 'true');
      }
    }
  }, [slug, posts, incrementViews, fetchComments]);

  // Read progress tracker
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const element = contentRef.current;
      const windowScroll = window.scrollY;
      const elementOffset = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const windowHeight = window.innerHeight;
      
      let progress = 0;
      if (windowScroll > elementOffset) {
        progress = ((windowScroll - elementOffset) / (elementHeight - windowHeight)) * 100;
      }
      setReadProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, [synth]);

  if (!post) {
    return (
      <div className="text-center py-32">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Post not found</h2>
        <Link to="/blog" className="text-indigo-600 font-bold hover:underline">← Back to Blog</Link>
      </div>
    );
  }

  const postComments = comments.filter(c => String(c.postId) === String(post.id));

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const toggleAudio = () => {
    if (isPlayingAudio) {
      synth.cancel();
      setIsPlayingAudio(false);
    } else {
      // Strip HTML for plain text
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = post.content;
      const text = `${post.title}. ${tempDiv.textContent || tempDiv.innerText || ""}`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlayingAudio(false);
      synth.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    addComment({
      postId: post.id,
      userId: user.id,
      userName: user.name,
      avatar: user.avatar,
      content: newComment.trim()
    });
    setNewComment('');
  };

  // Content Restriction Check
  const hasAccess = () => {
    if (post.restricted === 'none') return true;
    if (!user) return false;
    if (post.restricted === 'premium' && user.balance < 500 && user.role !== 'admin') return false; // Simple logic
    return true;
  };

  return (
    <article className="w-full max-w-4xl mx-auto pb-24 relative overflow-x-hidden md:overflow-x-visible">
      {/* Read Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800 z-50">
        <div 
          className="h-full bg-indigo-600 transition-all duration-150 ease-out"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Articles
      </Link>

      {/* Header */}
      <header className="mb-12">
        <div className="flex flex-wrap gap-2 mb-6">
          {(post.categories || []).map(cat => (
            <span key={cat} className="text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest">
              {cat}
            </span>
          ))}
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-slate-900 dark:text-white">Admin</span>
          </div>
          <span className="opacity-50 hidden sm:inline">•</span>
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {formatDateSafe(post.createdAt, 'MMMM d, yyyy')}</span>
          <span className="opacity-50 hidden sm:inline">•</span>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {post.readingTimeMinutes} min read</span>
          <span className="opacity-50 hidden sm:inline">•</span>
          <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> {post.views} views</span>
        </div>
      </header>

      {/* Tools */}
      <div className="sticky top-4 right-0 float-right ml-8 mb-8 flex flex-col gap-3 hidden lg:flex">
        <button onClick={() => likePost(post.id)} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:scale-110 transition-all hover:shadow-rose-500/20" title="Like">
          <Heart className="w-5 h-5" />
        </button>
        <button onClick={handleShare} className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 text-slate-500 hover:text-indigo-500 hover:scale-110 transition-all hover:shadow-indigo-500/20" title="Share">
          <Share2 className="w-5 h-5" />
        </button>
        <button onClick={toggleAudio} className={`w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 transition-all hover:scale-110 ${isPlayingAudio ? 'text-indigo-600 border-indigo-600 shadow-indigo-500/20 animate-pulse' : 'text-slate-500 hover:text-indigo-500 hover:shadow-indigo-500/20'}`} title="Listen to Article">
          {isPlayingAudio ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-12 bg-slate-200 dark:bg-slate-800">
          <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Embed */}
      {post.embedUrl && hasAccess() && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden mb-12 bg-slate-900 border-4 border-slate-900 shadow-2xl">
          <iframe 
            src={post.embedUrl} 
            title="Embedded content"
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* Content */}
      <div ref={contentRef} className="prose prose-lg dark:prose-invert prose-indigo mx-auto lg:mx-0 max-w-none break-words">
        {hasAccess() ? (
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} className="break-words [&_p]:[overflow-wrap:anywhere] [&_p]:break-words [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full" />
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 sm:p-12 text-center">
            <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Restricted Content</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              {post.restricted === 'login' ? 'You must be logged in to view this article.' : 'This is a premium article. Upgrade your account to access.'}
            </p>
            {!user ? (
              <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-colors inline-block">
                Log In to Read
              </Link>
            ) : (
              <button disabled className="bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold py-3 px-8 rounded-xl cursor-not-allowed inline-block">
                Upgrade Required
              </button>
            )}
          </div>
        )}
      </div>

      {hasAccess() && (
        <>
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
              <TagIcon className="w-4 h-4 text-slate-400 mr-2" />
              {post.tags.map(tag => (
                <span key={tag} className="text-sm font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Mobile Actions */}
          <div className="lg:hidden mt-12 flex items-center gap-4 justify-center">
            <button onClick={() => likePost(post.id)} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-full font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-rose-500 transition-colors">
              <Heart className="w-5 h-5" /> {post.likes}
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-full font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-indigo-500 transition-colors">
              <Share2 className="w-5 h-5" /> Share
            </button>
          </div>

          {/* Comments Section */}
          <section className="mt-16 pt-16 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-8 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
              Comments ({postComments.length})
            </h3>

            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-4 resize-none"
                  rows={3}
                  required
                />
                <div className="flex justify-end">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50" disabled={!newComment.trim()}>
                    Post Comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-700 mb-12">
                <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">You must be logged in to post a comment.</p>
                <Link to="/login" className="text-indigo-600 font-bold hover:underline">Log in now</Link>
              </div>
            )}

            <div className="space-y-6">
              {postComments.map(comment => (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex flex-shrink-0 items-center justify-center font-bold text-lg overflow-hidden border border-indigo-200 dark:border-indigo-500/30">
                    {comment.avatar ? (
                      <img src={comment.avatar} alt={comment.userName} className="w-full h-full object-cover" />
                    ) : (
                      (comment.userName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-slate-900 dark:text-white">{comment.userName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {formatDateSafe(comment.createdAt, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap text-sm">{comment.content}</p>
                    <button 
                      onClick={() => likeComment(comment.id)} 
                      className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1.5 transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      {comment.likes > 0 && comment.likes}
                      {comment.likes === 0 ? 'Like' : comment.likes === 1 ? 'Like' : 'Likes'}
                    </button>
                  </div>
                </div>
              ))}
              {postComments.length === 0 && (
                <div className="text-center py-12 text-slate-500 font-medium bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </article>
  );
}
