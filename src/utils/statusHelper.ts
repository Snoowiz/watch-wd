export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'full_match' | 'highlights' | 'interview';

/**
 * Checks if a broadcast item is an interview based on title, status, or description metadata.
 */
export function isInterview(item?: { status?: string | null; title?: string | null; description?: string | null } | null): boolean {
  if (!item) return false;
  const s = (item.status || '').toLowerCase();
  const t = (item.title || '').toLowerCase();
  const d = (item.description || '').toLowerCase();
  return s === 'interview' || t.includes('interview') || d.includes('#interview');
}

/**
 * Checks if a broadcast item represents highlights.
 */
export function isHighlights(item?: { status?: string | null; title?: string | null; description?: string | null } | null): boolean {
  if (!item) return false;
  const s = (item.status || '').toLowerCase();
  const t = (item.title || '').toLowerCase();
  const d = (item.description || '').toLowerCase();
  return s === 'highlights' || t.includes('highlight') || d.includes('#highlights');
}

/**
 * Helper to check if content is video-only (interview, highlights, clip) rather than a full match.
 */
export function isVideoOnlyContent(item?: { status?: string | null; title?: string | null; description?: string | null } | null): boolean {
  return isInterview(item) || isHighlights(item);
}

/**
 * Cleans public description by stripping internal editorial tags (e.g. #full-match, #interview, SEO: lines)
 * and raw embedded media tags (iframe, mux-player, video, embed, object) or standalone stream URLs,
 * keeping editorial descriptions clean and preventing duplicate players or layout blowout on mobile.
 */
export function cleanEditorialDescription(rawText?: string | null): string {
  if (!rawText) return 'No description provided.';

  let cleaned = rawText
    // Strip SEO prefix
    .replace(/(?:^|\n)\s*SEO:[^\n]*/gi, '')
    // Strip status hashtags
    .replace(/#(?:full-match|full_match|interview|highlights)\b/gi, '')
    // Strip iframe tags (with or without closing tag)
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    // Strip mux-player tags
    .replace(/<mux-player\b[^>]*>[\s\S]*?<\/mux-player>/gi, '')
    .replace(/<mux-player\b[^>]*\/?>/gi, '')
    // Strip video tags
    .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '')
    .replace(/<video\b[^>]*\/?>/gi, '')
    // Strip embed & object tags
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');

  // Strip lines that are solely standalone video stream URLs
  const lines = cleaned.split('\n').filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Standalone YouTube, Mux, or Vimeo URLs
    if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com|stream\.mux\.com|player\.mux\.com|vimeo\.com)[^\s]*$/i.test(trimmed)) {
      return false;
    }
    // Standalone direct video file stream URL
    if (/^https?:\/\/[^\s<"']+\.(m3u8|mp4|webm|ogg)(?:\?[^\s<"']*)?$/i.test(trimmed)) {
      return false;
    }
    return true;
  });

  cleaned = lines.join('\n').trim();

  // Strip leftover empty HTML tags like <p></p>, <p><br></p>, <div></div>
  cleaned = cleaned
    .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .trim();

  return cleaned || 'No description provided.';
}

/**
 * Returns a human-friendly display label for match statuses with content-type awareness.
 * Avoids showing contradictory labels such as "Full Match" on an interview.
 * - Interview -> 'Interview'
 * - Highlights -> 'Highlights'
 * - 'upcoming' -> 'Upcoming'
 * - 'live' -> 'Live Now'
 * - 'completed' / 'full_match' -> 'Full Match'
 */
export function formatMatchStatus(status?: string | null, title?: string | null): string {
  const t = (title || '').toLowerCase();
  if (t.includes('interview') || status?.toLowerCase() === 'interview') return 'Interview';
  if (t.includes('highlight') || status?.toLowerCase() === 'highlights') return 'Highlights';
  if (!status) return 'Upcoming';
  const s = status.toLowerCase();
  if (s === 'live') return 'Live Now';
  if (s === 'completed' || s === 'full_match') return 'Full Match';
  if (s === 'upcoming') return 'Upcoming';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Helper to check if a match status represents a completed/full match recording.
 */
export function isFullMatch(status?: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'full_match' || s === 'completed';
}

/**
 * Returns verified viewer-facing playback action labels according to playback state:
 * - Live and playable: Watch live
 * - Replay available: Watch replay
 * - Player's replay overlay: Play replay
 * - Upcoming broadcast: View broadcast
 * - Ended with no playable replay: Broadcast ended
 * - Temporarily unavailable: show the actual unavailable or connection-error state, not Broadcast ended
 */
export function getPlaybackActionLabel(params: {
  status?: string | null;
  hasPlayableStream?: boolean;
  isPlayable?: boolean;
  isReplayAvailable?: boolean;
  isUpcoming?: boolean;
  isLive?: boolean;
  isEnded?: boolean;
  isUnavailable?: boolean;
  isOverlay?: boolean;
}): string {
  if (params.isUnavailable) return 'Temporarily unavailable';
  if (params.isLive) return 'Watch live';
  if (params.isUpcoming) return 'View broadcast';
  if (params.hasPlayableStream || params.isReplayAvailable || params.isPlayable) {
    return params.isOverlay ? 'Play replay' : 'Watch replay';
  }
  if (params.isEnded) return 'Broadcast ended';
  return 'View broadcast';
}
