import DOMPurify from 'dompurify';

/**
 * Loads the @mux/mux-player Web Component custom element script if not already loaded.
 */
export function loadMuxPlayerIfNeeded(content: string) {
  if (typeof window === 'undefined') return;
  if (!content) return;

  const needsMux = /<mux-player|<mux-video|mux\.com/i.test(content);
  if (!needsMux) return;

  if (window.customElements && window.customElements.get('mux-player')) {
    return;
  }

  const existingScript = document.querySelector('script[src*="@mux/mux-player"]');
  if (existingScript) return;

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player';
  script.async = true;
  document.head.appendChild(script);
}

/**
 * Normalizes and formats video stream content / embed code (YouTube, Mux, Vimeo, HLS, MP4, raw iframes).
 */
export function formatStreamHtml(raw: string, options?: { autoplay?: boolean }): string {
  if (!raw) return '';
  let content = raw.trim();
  const autoplay = options?.autoplay ?? false;

  // 1. YouTube URL detection
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const matchYt = content.match(ytRegex);

  // 2. Mux URL detection (e.g. https://stream.mux.com/{playbackId}.m3u8 or https://player.mux.com/{playbackId})
  const muxStreamRegex = /(?:https?:\/\/)?stream\.mux\.com\/([a-zA-Z0-9]+)(?:\.m3u8)?/i;
  const muxPlayerRegex = /(?:https?:\/\/)?player\.mux\.com\/([a-zA-Z0-9]+)/i;
  const matchMuxStream = content.match(muxStreamRegex);
  const matchMuxPlayer = content.match(muxPlayerRegex);

  // 3. Vimeo URL detection
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i;
  const matchVimeo = content.match(vimeoRegex);

  // 4. Raw HLS / MP4 / WebM / OGG URL detection
  const videoFileRegex = /^https?:\/\/[^\s<"']+\.(m3u8|mp4|webm|ogg)(?:\?[^\s<"']*)?$/i;
  const matchVideoFile = content.match(videoFileRegex);

  if (!content.includes('<iframe') && !content.includes('<video') && !content.includes('<mux-player')) {
    if (matchMuxStream && matchMuxStream[1]) {
      const playbackId = matchMuxStream[1];
      content = `<mux-player playback-id="${playbackId}" stream-type="on-demand" controls playsinline ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
    } else if (matchMuxPlayer && matchMuxPlayer[1]) {
      const playbackId = matchMuxPlayer[1];
      content = `<mux-player playback-id="${playbackId}" stream-type="on-demand" controls playsinline ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
    } else if (matchYt && matchYt[1]) {
      const videoId = matchYt[1];
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      content = `<iframe src="https://www.youtube.com/embed/${videoId}?enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}${autoplay ? '&autoplay=1' : ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="width: 100%; height: 100%;"></iframe>`;
    } else if (matchVimeo && matchVimeo[1]) {
      const vimeoId = matchVimeo[1];
      content = `<iframe src="https://player.vimeo.com/video/${vimeoId}${autoplay ? '?autoplay=1' : ''}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width: 100%; height: 100%;"></iframe>`;
    } else if (matchVideoFile) {
      const ext = (matchVideoFile[1] || '').toLowerCase();
      if (ext === 'm3u8') {
        content = `<mux-player src="${content}" controls playsinline ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else {
        content = `<video src="${content}" controls playsinline ${autoplay ? 'autoplay muted' : ''} style="width: 100%; height: 100%; object-fit: contain;"></video>`;
      }
    }
  } else {
    // If it contains an iframe for YouTube, ensure proper referrerpolicy, allow, and origin parameter
    if (content.includes('<iframe') && /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(content)) {
      if (!content.includes('referrerpolicy')) {
        content = content.replace(/<iframe\s/i, '<iframe referrerpolicy="strict-origin-when-cross-origin" ');
      } else {
        content = content.replace(/referrerpolicy="[^"]*"/i, 'referrerpolicy="strict-origin-when-cross-origin"');
      }

      const requiredAllow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      if (!content.includes('allow=')) {
        content = content.replace(/<iframe\s/i, `<iframe allow="${requiredAllow}" `);
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      if (origin && !content.includes('origin=')) {
        content = content.replace(/src="([^"]+)"/i, (m, p1) => {
          const sep = p1.includes('?') ? '&' : '?';
          return `src="${p1}${sep}origin=${encodeURIComponent(origin)}&enablejsapi=1"`;
        });
      }
    }

    // Ensure mux-player styling if style is missing
    if (content.includes('<mux-player') && !content.includes('style=')) {
      content = content.replace(/<mux-player\s/i, '<mux-player style="width: 100%; height: 100%; display: block;" ');
    }

    if (autoplay && content) {
      if (content.includes('<iframe') || content.includes('<video')) {
        content = content.replace(/src="([^"]+)"/gi, (m: string, p1: string) => `src="${p1}${p1.includes('?') ? '&' : '?'}autoplay=1"`);
      }
      if (content.includes('<mux-player') && !content.includes('autoplay')) {
        content = content.replace(/<mux-player\s/i, '<mux-player autoplay="muted" ');
      }
    }
  }

  // Pre-load the script if Mux is referenced
  loadMuxPlayerIfNeeded(content);

  return DOMPurify.sanitize(content, {
    ADD_TAGS: [
      'iframe',
      'video',
      'source',
      'mux-player',
      'mux-video',
      'track',
      'embed',
      'audio'
    ],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'target',
      'src',
      'width',
      'height',
      'style',
      'class',
      'referrerpolicy',
      'title',
      'loading',
      'playback-id',
      'stream-type',
      'metadata-video-title',
      'metadata-viewer-user-id',
      'poster',
      'controls',
      'playsinline',
      'muted',
      'autoplay',
      'crossorigin',
      'loop',
      'preload',
      'type',
      'accent-color',
      'audio',
      'cast',
      'custom-domain',
      'env-key',
      'forward-seek-offset',
      'backward-seek-offset',
      'max-resolution',
      'min-resolution',
      'nohotkeys',
      'prefer-playback',
      'start-time',
      'target-live-window'
    ],
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: (tagName: string) => tagName.toLowerCase().startsWith('mux-'),
      attributeNameCheck: () => true,
      allowCustomizedBuiltInElements: true
    }
  });
}
