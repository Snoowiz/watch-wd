import React, { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

export interface GeoStatus {
  restricted: boolean;
  purchaseRestricted?: boolean;
  reason: string | null;
  endsAt: string | null;
}

/** Polls viewer availability so a window that starts or ends while the page is open is picked up. */
export function useGeoStatus(matchId?: string | number) {
  const [geo, setGeo] = useState<GeoStatus | null>(null);

  useEffect(() => {
    setGeo(null);
    if (!matchId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(String(matchId))}/geo-status`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        // The status endpoint cannot see protection problems; retrying /stream on clear is intended.
        if (!cancelled) setGeo(data);
      } catch {
        // Keep the last known status; the server enforces playback regardless.
      }
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [matchId]);

  return { geo, setGeo };
}

export function GeoRestrictionNotice({ status, thumbnail }: { status: GeoStatus; thumbnail?: string }) {
  const message =
    status.reason === 'location_unverified'
      ? 'We could not confirm your location. If you use a VPN or Tor, turn it off and reload.'
      : status.reason === 'event_window'
        ? 'This event will not be available in your location during its broadcast, so it cannot be purchased.'
      : status.reason === 'protection_unavailable'
        ? 'Playback is temporarily unavailable. Please try again shortly.'
        : status.endsAt
          ? `Available in your location from ${new Date(status.endsAt).toLocaleString()}.`
          : 'The video is not available where you are. Event details remain below.';

  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 p-4 text-center overflow-hidden">
      {thumbnail && (
        <img src={thumbnail} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
      )}
      <div className="z-10 max-w-sm">
        <Globe className="w-9 h-9 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">
          {status.reason === 'protection_unavailable' ? 'Video unavailable' : 'Not available in your location'}
        </h3>
        <p className="text-slate-300 text-sm">{message}</p>
      </div>
    </div>
  );
}
