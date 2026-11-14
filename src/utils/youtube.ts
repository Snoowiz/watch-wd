/** Parse only documented YouTube hosts, never a lookalike URL or arbitrary script. */
export function youtubeSource(raw: string): { src: string; videoId: string } | null {
  let value = raw.trim();
  if (value.includes('<')) {
    const iframe = value.match(/<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!iframe) return null;
    value = (iframe[1] || iframe[2]).replace(/&amp;/g, '&');
  }
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const hosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (hosts.includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)\/?$/)?.[1] || null;
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    // Preserve privacy-enhanced hosting, but never inherit autoplay/hidden controls.
    const embed = new URL(`https://www.${host.includes('youtube-nocookie') ? 'youtube-nocookie.com' : 'youtube.com'}/embed/${id}`);
    for (const key of ['start', 'end', 'cc_lang_pref', 'cc_load_policy', 'hl']) {
      const v = url.searchParams.get(key);
      if (v && (/^(start|end|cc_load_policy)$/.test(key) ? /^\d+$/.test(v) : /^[a-zA-Z-]{2,12}$/.test(v))) embed.searchParams.set(key, v);
    }
    for (const [key, v] of Object.entries({autoplay:'0', controls:'1', playsinline:'1', rel:'0', color:'white'})) embed.searchParams.set(key,v);
    return {src:embed.toString(),videoId:id};
  } catch { return null; }
}
