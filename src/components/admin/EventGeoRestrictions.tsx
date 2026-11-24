import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Globe, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store';
import { ISO_COUNTRY_CODES, countryName } from '../../config/countries';

interface Row {
  countryCode: string;
  mode: 'permanent' | 'timed';
  /** datetime-local values in the admin's own time zone */
  start: string;
  end: string;
  state?: string;
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toRow = (e: any): Row => ({
  countryCode: e.countryCode, mode: e.mode, start: toLocalInput(e.startsAt), end: toLocalInput(e.endsAt), state: e.state,
});

const inputClass =
  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white min-w-0';

export function EventGeoRestrictions({ eventId }: { eventId: string | null }) {
  const role = useAuthStore((s: any) => s.user?.role);
  const [rows, setRows] = useState<Row[]>([]);
  const [requirements, setRequirements] = useState<{ code: string; message: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const countries = useMemo(
    () => ISO_COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const url = `/api/admin/matches/${encodeURIComponent(String(eventId))}/geo-restrictions`;
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = useCallback(async () => {
    setLoaded(false);
    setFeedback(null);
    try {
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      setRows(data.exclusions.map(toRow));
      setRequirements(data.requirements);
      setLoaded(true);
    } catch (e: any) {
      setFeedback({ ok: false, text: e?.message || 'Could not load geographic restrictions.' });
    }
  }, [url]);

  useEffect(() => {
    if (eventId && role === 'admin') load();
  }, [eventId, role, load]);

  if (role !== 'admin') return null;

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, n) => (n === i ? { ...x, ...patch, state: undefined } : x)));

  const save = async () => {
    if (rows.some((r) => !r.countryCode || (r.mode === 'timed' && (!r.start || !r.end)))) {
      setFeedback({ ok: false, text: 'Choose a country for every row, and a start and end for timed rows.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          exclusions: rows.map((r) => ({
            countryCode: r.countryCode,
            mode: r.mode,
            ...(r.mode === 'timed' ? { startsAt: new Date(r.start).toISOString(), endsAt: new Date(r.end).toISOString() } : {}),
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.requirements) setRequirements(data.requirements);
        throw new Error(data?.error || 'Could not save.');
      }
      setRows(data.exclusions.map(toRow));
      setFeedback({ ok: true, text: data.exclusions.length ? 'Restrictions saved.' : 'Saved. This event is available worldwide.' });
    } catch (e: any) {
      setFeedback({ ok: false, text: e?.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/90 dark:bg-[#0f172a]/75 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm min-w-0">
      <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <Globe className="w-5 h-5" />
        <h3>Geographic availability</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Available worldwide except the countries below. The event page stays visible everywhere. Times are in your time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
      </p>

      {feedback && (
        <p role="status" className={`text-sm font-medium ${feedback.ok ? 'text-emerald-600' : 'text-red-600 dark:text-red-400'}`}>{feedback.text}</p>
      )}

      {!eventId ? (
        <p className="text-sm text-slate-500">Save the event first to add restrictions.</p>
      ) : loaded && (
        <>
          {requirements.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Required before restrictions can be saved</p>
              <ul className="list-disc pl-6 mt-1 space-y-1">
                {requirements.map((r) => <li key={r.code + r.message}>{r.message}</li>)}
              </ul>
              <button type="button" onClick={load} className="mt-2 font-bold underline">Check again (discards unsaved rows)</button>
            </div>
          )}

          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <select aria-label="Country" className={`${inputClass} flex-1`} value={r.countryCode} onChange={(e) => update(i, { countryCode: e.target.value })}>
                <option value="">Choose a country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <select aria-label="Duration" className={inputClass} value={r.mode} onChange={(e) => update(i, { mode: e.target.value as Row['mode'] })}>
                <option value="permanent">Permanent</option>
                <option value="timed">Timed</option>
              </select>
              {r.mode === 'timed' && (
                <>
                  <input aria-label="Start" type="datetime-local" className={inputClass} value={r.start} onChange={(e) => update(i, { start: e.target.value })} />
                  <input aria-label="End" type="datetime-local" className={inputClass} value={r.end} onChange={(e) => update(i, { end: e.target.value })} />
                </>
              )}
              {r.state && <span className="text-xs font-bold uppercase text-slate-500">{r.state}</span>}
              <button type="button" aria-label="Remove" onClick={() => setRows((x) => x.filter((_, n) => n !== i))} className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRows((r) => [...r, { countryCode: '', mode: 'permanent', start: '', end: '' }])}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Plus className="w-4 h-4" /> Exclude a country
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save restrictions
            </button>
          </div>
        </>
      )}
    </div>
  );
}
