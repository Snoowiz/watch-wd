import DOMPurify from 'isomorphic-dompurify';

/**
 * Loads the @mux/mux-player Web Component custom element script if not already loaded.
 */
export function loadMuxPlayerIfNeeded(content: string) {
  if (typeof window === 'undefined') return;
  if (!content) return;

  const needsMux = /<mux-player|<mux-video|mux\.com/i.test(content) || /^[a-zA-Z0-9_-]{10,64}$/.test(content.trim());
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
export function formatStreamHtml(
  raw: string,
  options?: {
    autoplay?: boolean;
    isLive?: boolean;
    playbackToken?: string | null;
    thumbnailToken?: string | null;
    storyboardToken?: string | null;
    containerId?: string | null;
  }
): string {
  if (!raw) return '';
  let content = raw.trim();
  const autoplay = options?.autoplay ?? false;
  const isLive = options?.isLive;
  const safeJwtToken = (t?: string | null) => {
    if (!t || typeof t !== 'string') return '';
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t.trim()) ? t.trim() : '';
  };
  const playbackToken = safeJwtToken(options?.playbackToken);
  const thumbnailToken = safeJwtToken(options?.thumbnailToken);
  const storyboardToken = safeJwtToken(options?.storyboardToken);
  const containerId = options?.containerId && typeof options.containerId === 'string'
    ? options.containerId.replace(/[^a-zA-Z0-9_-]/g, '').trim()
    : '';
  const fsAttr = containerId ? `fullscreen-element="${containerId}" ` : '';

  // 1. YouTube URL detection
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const matchYt = content.match(ytRegex);

  // 2. Mux URL detection (e.g. https://stream.mux.com/{playbackId}.m3u8 or https://player.mux.com/{playbackId})
  const muxStreamRegex = /(?:https?:\/\/)?stream\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8)?/i;
  const muxPlayerRegex = /(?:https?:\/\/)?player\.mux\.com\/([a-zA-Z0-9_-]+)/i;
  const matchMuxStream = content.match(muxStreamRegex);
  const matchMuxPlayer = content.match(muxPlayerRegex);

  // 2b. Bare Mux Playback ID detection (alphanumeric token 10-64 chars, no HTML tags, no spaces, no slashes, not a URL)
  const isBarePlaybackId = !content.includes('http') && !content.includes('<') && !content.includes('/') && /^[a-zA-Z0-9_-]{10,64}$/.test(content);

  // 3. Vimeo URL detection
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i;
  const matchVimeo = content.match(vimeoRegex);

  // 4. Raw HLS / MP4 / WebM / OGG URL detection
  const videoFileRegex = /^https?:\/\/[^\s<"']+\.(m3u8|mp4|webm|ogg)(?:\?[^\s<"']*)?$/i;
  const matchVideoFile = content.match(videoFileRegex);

  const streamType = isLive === true ? 'live' : (isLive === false ? 'on-demand' : (content.includes('stream-type="live"') ? 'live' : 'on-demand'));

  if (!content.includes('<iframe') && !content.includes('<video') && !content.includes('<mux-player')) {
    if (matchMuxStream && matchMuxStream[1]) {
      const playbackId = matchMuxStream[1];
      content = `<mux-player playback-id="${playbackId}" ${fsAttr}stream-type="${streamType}" controls playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
    } else if (matchMuxPlayer && matchMuxPlayer[1]) {
      const playbackId = matchMuxPlayer[1];
      content = `<mux-player playback-id="${playbackId}" ${fsAttr}stream-type="${streamType}" controls playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
    } else if (isBarePlaybackId) {
      content = `<mux-player playback-id="${content}" ${fsAttr}stream-type="${streamType}" controls playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
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
        content = `<mux-player src="${content}" ${fsAttr}controls playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
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

    // Ensure mux-player styling, playsinline, and preload if missing
    if (content.includes('<mux-player')) {
      if (containerId && !content.includes('fullscreen-element=')) {
        content = content.replace(/<mux-player\s/i, `<mux-player fullscreen-element="${containerId}" `);
      }
      if (!content.includes('style=')) {
        content = content.replace(/<mux-player\s/i, '<mux-player style="width: 100%; height: 100%; display: block;" ');
      }
      if (!content.includes('playsinline')) {
        content = content.replace(/<mux-player\s/i, '<mux-player playsinline ');
      }
      if (!content.includes('preload=')) {
        content = content.replace(/<mux-player\s/i, '<mux-player preload="metadata" ');
      }
      if (isLive !== undefined) {
        if (isLive === false && content.includes('stream-type="live"')) {
          content = content.replace(/stream-type="live"/gi, 'stream-type="on-demand"');
        } else if (isLive === true && content.includes('stream-type="on-demand"')) {
          content = content.replace(/stream-type="on-demand"/gi, 'stream-type="live"');
        }
      }
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

  // Inject signed Mux tokens safely if provided (even when <mux-player> was synthesized above)
  if (content.includes('<mux-player') && (playbackToken || thumbnailToken || storyboardToken)) {
    content = content
      .replace(/\splayback-token="[^"]*"/gi, '')
      .replace(/\sthumbnail-token="[^"]*"/gi, '')
      .replace(/\sstoryboard-token="[^"]*"/gi, '');
    const tokenAttrs = [
      playbackToken ? `playback-token="${playbackToken}"` : '',
      thumbnailToken ? `thumbnail-token="${thumbnailToken}"` : '',
      storyboardToken ? `storyboard-token="${storyboardToken}"` : '',
    ].filter(Boolean).join(' ');
    if (tokenAttrs) {
      content = content.replace(/<mux-player\s/i, `<mux-player ${tokenAttrs} `);
    }
  }

  // Pre-load the script if Mux is referenced
  loadMuxPlayerIfNeeded(content);
  const sanitize = (html: string, config: any): string => {
    try {
      if (DOMPurify && typeof (DOMPurify as any).sanitize === 'function') {
        return (DOMPurify as any).sanitize(html, config);
      }
      if ((DOMPurify as any)?.default && typeof (DOMPurify as any).default.sanitize === 'function') {
        return (DOMPurify as any).default.sanitize(html, config);
      }
    } catch {
      // safe fallback
    }
    return html;
  };

  return sanitize(content, {
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
      'fullscreen-element',
      'playback-token',
      'thumbnail-token',
      'storyboard-token',
      'drm-token',
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
