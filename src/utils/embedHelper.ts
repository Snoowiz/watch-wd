import DOMPurify from 'isomorphic-dompurify';

export interface FormatStreamOptions {
  autoplay?: boolean;
  isLive?: boolean;
  playbackToken?: string | null;
  thumbnailToken?: string | null;
  storyboardToken?: string | null;
  containerId?: string | null;
  streamProvider?: 'youtube' | 'mux' | 'custom' | string | null;
  title?: string | null;
}

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
 * Extracts a valid 11-character YouTube video ID from various YouTube URL formats,
 * iframe embed codes, or bare 11-character IDs.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - <iframe src="...youtube.../embed/VIDEO_ID"...>
 * - Bare 11-character alphanumeric string (e.g. dQw4w9WgXcQ)
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Bare 11-character YouTube ID (must be exactly 11 characters from [a-zA-Z0-9_-], no slashes, no tags)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Extract from iframe embed src
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return extractYouTubeVideoId(srcMatch[1]);
    }
  }

  // 3. Structured URL parsing
  try {
    const urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }

      const match = parsed.pathname.match(/^\/(?:embed|live|shorts|v)\/([a-zA-Z0-9_-]{11})/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {
    // Non-fatal, fall through to regex
  }

  // 4. Regex fallback for complex query strings, redirects, or partial links
  const regex = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regex);
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }

  return null;
}

/**
 * Builds an official, policy-compliant YouTube embed URL with standard parameters.
 * Preserves controls, playsinline, rel=0, and JS API while omitting deprecated flags.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options?: {
    autoplay?: boolean;
    origin?: string;
    isLive?: boolean;
  }
): string {
  const cleanId = encodeURIComponent(videoId.trim());
  const params = new URLSearchParams();
  params.set('enablejsapi', '1');
  params.set('playsinline', '1');
  params.set('rel', '0');
  params.set('controls', '1');

  if (options?.autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }

  let origin = options?.origin;
  if (!origin && typeof window !== 'undefined' && window.location?.origin) {
    origin = window.location.origin;
  }
  if (origin && /^https?:\/\//i.test(origin)) {
    params.set('origin', origin);
  }

  return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
}

/**
 * Generates clean, responsive HTML for an official YouTube iframe player.
 */
export function buildYouTubeIframeHtml(
  videoId: string,
  options?: {
    autoplay?: boolean;
    origin?: string;
    isLive?: boolean;
    title?: string | null;
  }
): string {
  const embedUrl = buildYouTubeEmbedUrl(videoId, options);
  const safeTitle = (options?.title || 'YouTube video player')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<iframe src="${embedUrl}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="width: 100%; height: 100%; max-width: 100%; border: 0;"></iframe>`;
}

/**
 * Detects whether a string contains actual video stream markup,
 * video players, or valid video URLs rather than plain editorial text.
 */
export function isMediaMarkup(content?: string | null): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  if (!trimmed) return false;

  // HTML media tags
  if (/<(iframe|video|mux-player|embed|object)\b/i.test(trimmed)) return true;

  // YouTube URLs / bare video ID
  if (extractYouTubeVideoId(trimmed) !== null) return true;

  // Mux URLs or playback ID (tokens typically 16+ chars)
  if (
    /(?:https?:\/\/)?stream\.mux\.com\/[a-zA-Z0-9_-]+/i.test(trimmed) ||
    /(?:https?:\/\/)?player\.mux\.com\/[a-zA-Z0-9_-]+/i.test(trimmed) ||
    /^[a-zA-Z0-9_-]{16,64}$/.test(trimmed)
  ) {
    return true;
  }

  // Common video files / streams
  if (/^https?:\/\/[^\s<"']+\.(m3u8|mp4|webm|ogg)(?:\?[^\s<"']*)?$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Normalizes and formats video stream content / embed code (YouTube, Mux, Vimeo, HLS, MP4, raw iframes).
 */
export function formatStreamHtml(
  raw: string,
  options?: FormatStreamOptions
): string {
  if (!raw) return '';
  let content = raw.trim();
  const autoplay = options?.autoplay ?? false;
  const isLive = options?.isLive;
  const provider = String(options?.streamProvider || '').toLowerCase().trim();

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

  const streamType = isLive === true ? 'live' : (isLive === false ? 'on-demand' : (content.includes('stream-type="live"') ? 'live' : 'on-demand'));

  // =========================================================================
  // 1. PROVIDER: YOUTUBE (Strict separation: never route to Mux)
  // =========================================================================
  if (provider === 'youtube') {
    const videoId = extractYouTubeVideoId(content);
    if (videoId) {
      content = buildYouTubeIframeHtml(videoId, {
        autoplay,
        isLive,
        title: options?.title || 'Event Stream'
      });
    } else if (content.includes('<iframe')) {
      // Ensure existing YouTube iframe has responsive styling and allowed parameters
      content = content.replace(/width=["']\d+["']/gi, 'width="100%"').replace(/height=["']\d+["']/gi, 'height="100%"');
      if (!content.includes('style=')) {
        content = content.replace(/<iframe\s/i, '<iframe style="width: 100%; height: 100%; max-width: 100%; border: 0;" ');
      }
      if (!content.includes('referrerpolicy')) {
        content = content.replace(/<iframe\s/i, '<iframe referrerpolicy="strict-origin-when-cross-origin" ');
      }
      if (!content.includes('allow=')) {
        content = content.replace(/<iframe\s/i, '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ');
      }
    }
  }

  // =========================================================================
  // 2. PROVIDER: MUX (Strict separation: never route to YouTube)
  // =========================================================================
  else if (provider === 'mux') {
    const muxStreamRegex = /(?:https?:\/\/)?stream\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8)?/i;
    const muxPlayerRegex = /(?:https?:\/\/)?player\.mux\.com\/([a-zA-Z0-9_-]+)/i;
    const matchMuxStream = content.match(muxStreamRegex);
    const matchMuxPlayer = content.match(muxPlayerRegex);
    const isBarePlaybackId = !content.includes('http') && !content.includes('<') && !content.includes('/') && /^[a-zA-Z0-9_-]{10,64}$/.test(content);

    if (!content.includes('<iframe') && !content.includes('<video') && !content.includes('<mux-player')) {
      if (matchMuxStream && matchMuxStream[1]) {
        content = `<mux-player playback-id="${matchMuxStream[1]}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (matchMuxPlayer && matchMuxPlayer[1]) {
        content = `<mux-player playback-id="${matchMuxPlayer[1]}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (isBarePlaybackId) {
        content = `<mux-player playback-id="${content}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (/^https?:\/\/[^\s<"']+\.m3u8(?:\?[^\s<"']*)?$/i.test(content)) {
        content = `<mux-player src="${content}" ${fsAttr}controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      }
    }
  }

  // =========================================================================
  // 3. PROVIDER: CUSTOM OR AUTODETECTED
  // =========================================================================
  else {
    // 3a. YouTube URL or iframe detection
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const matchYt = content.match(ytRegex);

    // 3b. Mux URL detection
    const muxStreamRegex = /(?:https?:\/\/)?stream\.mux\.com\/([a-zA-Z0-9_-]+)(?:\.m3u8)?/i;
    const muxPlayerRegex = /(?:https?:\/\/)?player\.mux\.com\/([a-zA-Z0-9_-]+)/i;
    const matchMuxStream = content.match(muxStreamRegex);
    const matchMuxPlayer = content.match(muxPlayerRegex);

    // 3c. Bare Playback ID detection (alphanumeric token 10-64 chars)
    const isBarePlaybackId = !content.includes('http') && !content.includes('<') && !content.includes('/') && /^[a-zA-Z0-9_-]{10,64}$/.test(content);

    // 3d. Vimeo URL detection
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i;
    const matchVimeo = content.match(vimeoRegex);

    // 3e. Raw HLS / MP4 / WebM / OGG URL detection
    const videoFileRegex = /^https?:\/\/[^\s<"']+\.(m3u8|mp4|webm|ogg)(?:\?[^\s<"']*)?$/i;
    const matchVideoFile = content.match(videoFileRegex);

    if (!content.includes('<iframe') && !content.includes('<video') && !content.includes('<mux-player')) {
      if (matchYt && matchYt[1]) {
        content = buildYouTubeIframeHtml(matchYt[1], {
          autoplay,
          isLive,
          title: options?.title || 'Event Stream'
        });
      } else if (matchMuxStream && matchMuxStream[1]) {
        content = `<mux-player playback-id="${matchMuxStream[1]}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (matchMuxPlayer && matchMuxPlayer[1]) {
        content = `<mux-player playback-id="${matchMuxPlayer[1]}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (isBarePlaybackId) {
        content = `<mux-player playback-id="${content}" ${fsAttr}stream-type="${streamType}" controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
      } else if (matchVimeo && matchVimeo[1]) {
        const vimeoId = matchVimeo[1];
        content = `<iframe src="https://player.vimeo.com/video/${vimeoId}${autoplay ? '?autoplay=1' : ''}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; max-width: 100%; border: 0;"></iframe>`;
      } else if (matchVideoFile) {
        const ext = (matchVideoFile[1] || '').toLowerCase();
        if (ext === 'm3u8') {
          content = `<mux-player src="${content}" ${fsAttr}controls playsinline webkit-playsinline preload="metadata" ${autoplay ? 'autoplay="muted"' : ''} style="width: 100%; height: 100%; display: block;"></mux-player>`;
        } else {
          content = `<video src="${content}" controls playsinline webkit-playsinline ${autoplay ? 'autoplay muted' : ''} style="width: 100%; height: 100%; object-fit: contain;"></video>`;
        }
      }
    }
  }

  // Common iframe sanitization & responsiveness normalization
  if (content.includes('<iframe')) {
    // Override fixed pixel widths/heights so embedded iframes never cause horizontal page overflow on mobile
    content = content
      .replace(/width=["']\d+["']/gi, 'width="100%"')
      .replace(/height=["']\d+["']/gi, 'height="100%"');

    if (!content.includes('style=')) {
      content = content.replace(/<iframe\s/i, '<iframe style="width: 100%; height: 100%; max-width: 100%; border: 0;" ');
    } else {
      content = content.replace(/style="([^"]*)"/i, (m, p1) => {
        let style = p1;
        if (!style.includes('max-width')) style += '; max-width: 100%';
        if (!style.includes('width')) style += '; width: 100%';
        if (!style.includes('height')) style += '; height: 100%';
        if (!style.includes('border')) style += '; border: 0';
        return `style="${style}"`;
      });
    }

    // If it contains a YouTube iframe, ensure standard security, privacy & origin parameters
    if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(content)) {
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
      if (origin && /^https?:\/\//i.test(origin) && !content.includes('origin=')) {
        content = content.replace(/src="([^"]+)"/i, (m, p1) => {
          const sep = p1.includes('?') ? '&' : '?';
          return `src="${p1}${sep}origin=${encodeURIComponent(origin)}&enablejsapi=1"`;
        });
      }
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
      content = content.replace(/<mux-player\s/i, '<mux-player playsinline webkit-playsinline ');
    } else if (!content.includes('webkit-playsinline')) {
      content = content.replace(/<mux-player\s/i, '<mux-player webkit-playsinline ');
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
