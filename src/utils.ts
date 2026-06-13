/**
 * Helper to strip HTML tags and decode HTML entities securely
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // First, strip all HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
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
