import { describe, it, expect } from 'vitest';
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  buildYouTubeIframeHtml,
  isMediaMarkup,
  formatStreamHtml
} from '../src/utils/embedHelper';
import { cleanEditorialDescription } from '../src/utils/statusHelper';

describe('YouTube Player Standardisation & Mobile Responsiveness Suite', () => {
  describe('1. extractYouTubeVideoId', () => {
    it('extracts video ID from standard watch URLs', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from watch URLs with extra query parameters', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=45s')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from shortened youtu.be URLs', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('http://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from /live/ links', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube.com/live/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from /shorts/ links', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from /embed/ URLs (both standard and nocookie)', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1')).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from raw iframe embed HTML', () => {
      const iframe = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
      expect(extractYouTubeVideoId(iframe)).toBe('dQw4w9WgXcQ');
    });

    it('extracts bare 11-character video IDs', () => {
      expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('m7bc3pC_G1s')).toBe('m7bc3pC_G1s');
      expect(extractYouTubeVideoId('12345678901')).toBe('12345678901');
    });

    it('rejects invalid, malformed, or non-YouTube inputs', () => {
      expect(extractYouTubeVideoId(null)).toBeNull();
      expect(extractYouTubeVideoId('')).toBeNull();
      expect(extractYouTubeVideoId('   ')).toBeNull();
      expect(extractYouTubeVideoId('not-a-valid-id')).toBeNull(); // 14 chars
      expect(extractYouTubeVideoId('tooShort')).toBeNull(); // 8 chars
      expect(extractYouTubeVideoId('https://vimeo.com/123456789')).toBeNull();
      expect(extractYouTubeVideoId('https://stream.mux.com/d54001aBCdE123.m3u8')).toBeNull();
    });
  });

  describe('2. Provider Separation (Never route YouTube ID to Mux and vice versa)', () => {
    it('formats a bare 11-character ID as YouTube when streamProvider is youtube', () => {
      const bareId = 'dQw4w9WgXcQ';
      const result = formatStreamHtml(bareId, {
        streamProvider: 'youtube',
        title: 'Championship Final'
      });
      expect(result).toContain('<iframe');
      expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ');
      expect(result).not.toContain('<mux-player');
      expect(result).not.toContain('playback-id="dQw4w9WgXcQ"');
    });

    it('formats a bare token as Mux when streamProvider is mux', () => {
      const muxId = 'manualPlayback123456';
      const result = formatStreamHtml(muxId, {
        streamProvider: 'mux',
        isLive: true
      });
      expect(result).toContain('<mux-player');
      expect(result).toContain('playback-id="manualPlayback123456"');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('youtube.com');
    });

    it('does not format a YouTube URL as Mux when streamProvider is mux', () => {
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = formatStreamHtml(ytUrl, { streamProvider: 'mux' });
      // Under mux provider, YouTube URL is not converted to YouTube iframe or invalid Mux player
      expect(result).not.toContain('<iframe');
    });
  });

  describe('3. YouTube Player Configuration & Standards Compliance', () => {
    it('generates compliant iframe with enablejsapi, playsinline, rel=0, controls and referrerpolicy', () => {
      const videoId = 'dQw4w9WgXcQ';
      const html = buildYouTubeIframeHtml(videoId, {
        title: 'Live Grassroots Football'
      });

      expect(html).toContain('enablejsapi=1');
      expect(html).toContain('playsinline=1');
      expect(html).toContain('rel=0');
      expect(html).toContain('controls=1');
      expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
      expect(html).toContain('allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"');
      expect(html).toContain('allowfullscreen');
      expect(html).toContain('style="width: 100%; height: 100%; max-width: 100%; border: 0;"');
      expect(html).toContain('title="Live Grassroots Football"');
      // Must not use deprecated modestbranding or showinfo
      expect(html).not.toContain('modestbranding');
      expect(html).not.toContain('showinfo');
    });

    it('safely escapes special characters in title', () => {
      const html = buildYouTubeIframeHtml('dQw4w9WgXcQ', {
        title: 'Team A "The Lions" <Final> & Co.'
      });
      expect(html).toContain('title="Team A &quot;The Lions&quot; &lt;Final&gt; &amp; Co."');
    });

    it('appends origin parameter when origin is available', () => {
      const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ', {
        origin: 'https://watchwds.com'
      });
      expect(url).toContain('origin=https%3A%2F%2Fwatchwds.com');
    });
  });

  describe('4. Mobile Layout & Overflow Protection', () => {
    it('normalizes fixed pixel widths and heights in raw iframes to 100%', () => {
      const rawIframe = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0"></iframe>';
      const result = formatStreamHtml(rawIframe);

      expect(result).toContain('width="100%"');
      expect(result).toContain('height="100%"');
      expect(result).not.toContain('width="560"');
      expect(result).not.toContain('height="315"');
      expect(result).toContain('max-width: 100%');
    });

    it('ensures custom iframes receive max-width 100% to prevent mobile viewport blowout', () => {
      const customEmbed = '<iframe src="https://player.vimeo.com/video/76979871" width="800" height="450" style="border: none;"></iframe>';
      const result = formatStreamHtml(customEmbed, { streamProvider: 'custom' });

      expect(result).toContain('max-width: 100%');
      expect(result).toContain('width="100%"');
      expect(result).not.toContain('width="800"');
    });
  });

  describe('5. Clean Editorial Description & Stream Separation', () => {
    it('strips raw iframe markup from editorial descriptions', () => {
      const rawDesc = 'Exciting match preview between Team A and Team B.\n<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>\nDon\'t miss the kick-off!';
      const cleaned = cleanEditorialDescription(rawDesc);

      expect(cleaned).toContain('Exciting match preview between Team A and Team B.');
      expect(cleaned).toContain("Don't miss the kick-off!");
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).not.toContain('youtube.com/embed');
    });

    it('strips mux-player tags from editorial descriptions', () => {
      const rawDesc = 'Exclusive match footage.<mux-player playback-id="xyz987" stream-type="on-demand"></mux-player>';
      const cleaned = cleanEditorialDescription(rawDesc);

      expect(cleaned).toBe('Exclusive match footage.');
      expect(cleaned).not.toContain('<mux-player');
    });

    it('strips standalone video URLs from editorial descriptions', () => {
      const rawDesc = 'Match description text.\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\nKickoff at 3 PM.';
      const cleaned = cleanEditorialDescription(rawDesc);

      expect(cleaned).toContain('Match description text.');
      expect(cleaned).toContain('Kickoff at 3 PM.');
      expect(cleaned).not.toContain('youtube.com');
    });

    it('returns default fallback when description contains solely media tags or video URLs', () => {
      expect(cleanEditorialDescription('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')).toBe('No description provided.');
      expect(cleanEditorialDescription('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('No description provided.');
      expect(cleanEditorialDescription('https://youtu.be/dQw4w9WgXcQ')).toBe('No description provided.');
      expect(cleanEditorialDescription('')).toBe('No description provided.');
      expect(cleanEditorialDescription(null)).toBe('No description provided.');
    });
  });

  describe('6. isMediaMarkup Detection', () => {
    it('detects media markup for YouTube, Mux, iframes, and video streams', () => {
      expect(isMediaMarkup('<iframe src="https://example.com/embed"></iframe>')).toBe(true);
      expect(isMediaMarkup('<video src="stream.mp4"></video>')).toBe(true);
      expect(isMediaMarkup('<mux-player playback-id="abc1234567890123"></mux-player>')).toBe(true);
      expect(isMediaMarkup('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isMediaMarkup('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isMediaMarkup('https://stream.mux.com/d54001aBCdE123.m3u8')).toBe(true);
      expect(isMediaMarkup('dQw4w9WgXcQ')).toBe(true);
    });

    it('returns false for plain editorial text', () => {
      expect(isMediaMarkup('Welcome to the championship match between SE Dons and Barnet FC.')).toBe(false);
      expect(isMediaMarkup('Match broadcast starts at 3:00 PM GMT. Please arrive early.')).toBe(false);
      expect(isMediaMarkup('Short summary')).toBe(false);
      expect(isMediaMarkup('')).toBe(false);
      expect(isMediaMarkup(null)).toBe(false);
    });
  });
});

