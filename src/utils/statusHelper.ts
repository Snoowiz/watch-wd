export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'full_match' | 'highlights';

/**
 * Returns a human-friendly display label for match statuses.
 * - 'upcoming' -> 'Upcoming'
 * - 'live' -> 'Live Now'
 * - 'completed' / 'full_match' -> 'Full Match'
 * - 'highlights' -> 'Highlights'
 */
export function formatMatchStatus(status?: string | null): string {
  if (!status) return 'Upcoming';
  const s = status.toLowerCase();
  if (s === 'live') return 'Live Now';
  if (s === 'completed' || s === 'full_match') return 'Full Match';
  if (s === 'highlights') return 'Highlights';
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
