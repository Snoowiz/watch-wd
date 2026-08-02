import DOMPurify from 'dompurify';

export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}
