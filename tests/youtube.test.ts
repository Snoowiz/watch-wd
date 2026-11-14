import { describe, it, expect } from 'vitest';
import { youtubeSource } from '../src/utils/youtube';
import { formatStreamHtml } from '../src/utils/embedHelper';

describe('YouTube saved source configuration', () => {
  it.each(['https://youtu.be/QvJr_sdhD-c','https://www.youtube.com/watch?feature=shared&v=QvJr_sdhD-c','https://youtube.com/live/QvJr_sdhD-c','https://youtube.com/shorts/QvJr_sdhD-c'])('normalises %s after a JSON save/reload', raw => {
    const saved = JSON.parse(JSON.stringify({description:raw}));
    const result = youtubeSource(saved.description)!;
    expect(result.videoId).toBe('QvJr_sdhD-c');
    const url = new URL(result.src);
    expect(Object.fromEntries(url.searchParams)).toEqual({autoplay:'0',controls:'1',playsinline:'1',rel:'0',color:'white'});
  });
  it('preserves privacy host, replaces unsafe playback settings and strips HTML', () => {
    const raw = `<div style="display:none"><iframe src='https://www.youtube-nocookie.com/embed/QvJr_sdhD-c?autoplay=1&controls=0&modestbranding=1&start=30'></iframe><script>alert(1)</script></div>`;
    expect(youtubeSource(raw)!.src).toContain('youtube-nocookie.com/embed/');
    const html = formatStreamHtml(raw, {autoplay:true});
    expect(html).toContain('autoplay=0'); expect(html).toContain('start=30');
    expect(html).not.toMatch(/script|display:none|modestbranding/);
    expect(html.match(/<iframe/g)).toHaveLength(1);
    expect(html).toContain('strict-origin-when-cross-origin');
  });
  it.each(['https://youtube.com.evil.test/watch?v=QvJr_sdhD-c','https://evil.test/youtube.com/watch?v=QvJr_sdhD-c','javascript:alert(1)','https://youtu.be/invalid','https://stream.mux.com/abc.m3u8'])('does not classify %s as YouTube', raw => expect(youtubeSource(raw)).toBeNull());
  it('keeps each event video and retains other provider rendering', () => {
    expect(youtubeSource('https://youtu.be/abcdefghijk')!.videoId).toBe('abcdefghijk');
    expect(formatStreamHtml('https://stream.mux.com/abcdef123456.m3u8', {isLive:true})).toContain('stream-type="live"');
    expect(formatStreamHtml('https://vimeo.com/123456')).toContain('player.vimeo.com/video/123456');
  });
});
