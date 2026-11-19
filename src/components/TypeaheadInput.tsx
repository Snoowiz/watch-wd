import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export interface TypeaheadOption {
  key: string;
  label: string;
  logo?: string | null;
  hint?: string;
}

interface TypeaheadInputProps {
  value: string;
  onChange: (v: string) => void;
  options: TypeaheadOption[];
  placeholder?: string;
  required?: boolean;
  heading?: string;
  maxResults?: number;
  className?: string;
}

/** Text input with a live suggestion dropdown. Free text is always allowed. */
export function TypeaheadInput({
  value, onChange, options, placeholder, required, heading = 'Suggestions', maxResults = 8, className = ''
}: TypeaheadInputProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? options.filter(o => o.label.toLowerCase().includes(q) && o.label.toLowerCase() !== q)
      : options;
    // Prefix matches first
    return [...list]
      .sort((a, b) => {
        if (!q) return 0;
        const ap = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp;
      })
      .slice(0, maxResults);
  }, [value, options, maxResults]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setActive(-1); }, [value]);

  const pick = (o: TypeaheadOption) => {
    onChange(o.label);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i <= 0 ? matches.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        required={required}
        value={value}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 ${className}`}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
            {heading}
          </div>
          {matches.map((o, i) => (
            <button
              key={o.key}
              type="button"
              onMouseDown={e => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2 ${
                i === active ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-amber-50 dark:hover:bg-amber-500/10'
              }`}
            >
              {o.logo ? (
                <img src={o.logo} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                  {o.label.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex-1 truncate">{o.label}</span>
              {o.hint && <span className="text-[10px] text-slate-400 shrink-0">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
