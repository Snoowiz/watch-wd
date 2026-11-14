import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
vi.mock('../src/store', () => ({useSettingsStore: () => ({platformName:'WatchWDS'}), useThemeStore: () => ({isDarkMode:true})}));
import { MatchStreamPlayer } from '../src/components/MatchStreamPlayer';
import { WatchWDSYouTubePlayer } from '../src/components/WatchWDSYouTubePlayer';

describe('shared WatchWDS YouTube presentation', () => {
  it('public mobile output is the same native player as admin, without overlays or duplicate players', () => {
    const source = 'https://youtu.be/QvJr_sdhD-c';
    const admin = renderToStaticMarkup(<WatchWDSYouTubePlayer source={source} title="Cup Final" />);
    const publicPlayer = renderToStaticMarkup(<MatchStreamPlayer rawStreamContent={source} title="Cup Final" isMobile watermarkConfig={{enabled:true,mode:'player_overlay'} as any} />);
    expect(publicPlayer).toBe(admin);
    expect(publicPlayer.match(/<iframe/g)).toHaveLength(1);
    expect(publicPlayer).not.toContain('autoplay=1');
    expect(publicPlayer).not.toContain('absolute inset-0');
    expect(publicPlayer).toContain('min-h-[200px]');
    expect(publicPlayer).toContain('min-w-[200px]');
    expect(publicPlayer).toContain('allowFullScreen');
    expect(publicPlayer).not.toContain('>LIVE<');
  });
  it('labels live only when explicitly live, safely escapes match text', () => {
    const html = renderToStaticMarkup(<WatchWDSYouTubePlayer source="https://youtu.be/QvJr_sdhD-c" title={'<script>unsafe</script>'} isLive />);
    expect(html).toContain('>LIVE<');
    expect(html).not.toContain('<script>');
  });
});
