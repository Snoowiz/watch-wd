/**
 * Helper to strip HTML tags and decode HTML entities securely
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // First, completely remove iframes, video, audio, script, and style blocks (including inner content and self-closing/unclosed tags)
  let text = html
    .replace(/<iframe\b[^>]*>(.*?)<\/iframe>/gis, ' ')
    .replace(/<iframe\b[^>]*\/?>/gis, ' ')
    .replace(/<video\b[^>]*>(.*?)<\/video>/gis, ' ')
    .replace(/<video\b[^>]*\/?>/gis, ' ')
    .replace(/<audio\b[^>]*>(.*?)<\/audio>/gis, ' ')
    .replace(/<audio\b[^>]*\/?>/gis, ' ')
    .replace(/<script\b[^>]*>(.*?)<\/script>/gis, ' ')
    .replace(/<style\b[^>]*>(.*?)<\/style>/gis, ' ');
  
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Replace HTML entities with actual characters
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&rsquo;/gi, '’')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#96;/gi, '`');
  
  // Clean up any extra redundant carriage returns, tabs, and spaces
  return text.replace(/\s+/g, ' ').trim();
}
