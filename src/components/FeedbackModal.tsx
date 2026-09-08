import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, MessageSquare, AlertCircle, Loader2, Sparkles, Send, Clock, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMaybeLater?: () => void;
  initialCategory?: string;
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  'Website Experience',
  'Video/Streaming',
  'Payment',
  'Account',
  'Performance',
  'Bug Report',
  'Suggestion',
  'Other'
];

const RATING_LEVELS: { rating: number; label: string; color: string; bg: string; border: string }[] = [
  { rating: 1, label: 'Terrible', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { rating: 2, label: 'Poor', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { rating: 3, label: 'Average', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { rating: 4, label: 'Good', color: 'text-lime-500', bg: 'bg-lime-500/10', border: 'border-lime-500/30' },
  { rating: 5, label: 'Excellent', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' }
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onMaybeLater,
  initialCategory,
  categories = DEFAULT_CATEGORIES
}) => {
  const { user, token } = useAuthStore();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>(initialCategory || 'Website Experience');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setTimeout(() => {
        setRating(0);
        setHoverRating(0);
        setFeedbackText('');
        setGuestEmail('');
        setIsSuccess(false);
        setErrorMessage('');
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;
  const ratingDetails = RATING_LEVELS.find((r) => r.rating === activeRating);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }
    if (!feedbackText.trim()) {
      setErrorMessage('Please tell us a little about your experience.');
      return;
    }
    if (feedbackText.trim().length > 2000) {
      setErrorMessage('Feedback is too long (maximum 2,000 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const selectedRatingLabel = RATING_LEVELS.find(r => r.rating === rating)?.label || 'Average';
      
      const payload = {
        rating,
        rating_label: selectedRatingLabel,
        category,
        feedback_text: feedbackText.trim(),
        guest_email: !user && guestEmail ? guestEmail.trim() : undefined,
        page_url: window.location.pathname + window.location.search,
        device_info: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          timestamp: new Date().toISOString()
        }
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback. Please try again.');
      }

      setIsSuccess(true);

      // Store submission timestamp in localStorage for cooldown
      try {
        localStorage.setItem('watchwds_fb_submitted_at', Date.now().toString());
      } catch (storageErr) {
        console.warn('Storage unavailable', storageErr);
      }

      // Auto close after 2.2 seconds
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaybeLater = () => {
    try {
      localStorage.setItem('watchwds_fb_later_at', Date.now().toString());
    } catch (err) {
      console.warn('Storage unavailable', err);
    }
    if (onMaybeLater) {
      onMaybeLater();
    } else {
      onClose();
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('watchwds_fb_dismissed_at', Date.now().toString());
    } catch (err) {
      console.warn('Storage unavailable', err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={handleDismiss}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 transition-all transform animate-in zoom-in-95 duration-200">
        {/* Subtle accent gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
          aria-label="Close feedback modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* Success Screen */
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-90 duration-300">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-2">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-white">Thank you for your feedback!</h3>
            <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
              Your feedback is essential in helping us craft the premier sports streaming experience on WatchWDS.
            </p>
            <div className="pt-4 flex items-center gap-2 text-xs font-medium text-yellow-400/90 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Feedback recorded successfully</span>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="space-y-1.5 text-center sm:text-left pr-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Your Voice Matters</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">How was your experience?</h2>
              <p className="text-slate-400 text-sm">
                Rate your time on WatchWDS and let our team know what we can do better.
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Star Rating Section */}
            <div className="flex flex-col items-center justify-center py-2 bg-slate-950/40 border border-slate-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 sm:p-2 transition-transform hover:scale-125 focus:outline-none focus:scale-125"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors duration-150 ${
                          isFilled
                            ? 'text-yellow-400 fill-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]'
                            : 'text-slate-600 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Rating Label */}
              <div className="h-6 mt-2 flex items-center justify-center">
                {ratingDetails ? (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ratingDetails.bg} ${ratingDetails.color} ${ratingDetails.border} transition-all`}>
                    {ratingDetails.label}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic">Select your rating (1-5 stars)</span>
                )}
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Feedback Topic / Category
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-400 font-semibold shadow-sm shadow-yellow-500/10'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Feedback Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="feedback-text" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Detailed Feedback
                </label>
                <span className={`text-xs ${feedbackText.length > 1900 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {feedbackText.length} / 2,000
                </span>
              </div>
              <textarea
                id="feedback-text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value.slice(0, 2000))}
                rows={4}
                placeholder="Tell us what you enjoyed, issues you faced with streaming, payments, or features you'd like to see..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none"
              />
            </div>

            {/* Account / Guest details banner */}
            {user ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="font-semibold text-white">{user.name || user.email}</span>
                  <span className="text-slate-400 ml-1.5">({user.email})</span>
                  <p className="text-slate-400 text-[11px] truncate">
                    Feedback will be linked to your WatchWDS account for priority support.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="guest-email" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Contact Email (Optional)</span>
                  <span className="text-[11px] text-slate-500 font-normal">For direct support replies</span>
                </label>
                <input
                  id="guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting || !rating || !feedbackText.trim()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleMaybeLater}
                disabled={isSubmitting}
                className="w-full sm:w-auto py-3 px-4 rounded-xl font-medium text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Maybe Later</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
