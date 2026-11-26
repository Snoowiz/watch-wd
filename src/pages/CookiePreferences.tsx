import React, { useEffect, useId, useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { useConsent } from '../utils/useConsent';
import type { ConsentChoice } from '../utils/consent';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

const actionClass =
  `w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 ${focusRing}`;

function CategoryRow(props: {
  title: string;
  description: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  alwaysOn?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <h2 id={`${id}-title`} className="font-bold text-slate-900 dark:text-white">{props.title}</h2>
        <p id={`${id}-desc`} className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed break-words">
          {props.description}
        </p>
      </div>
      {props.alwaysOn ? (
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
          <Lock className="w-3 h-3" aria-hidden="true" /> Always on
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={!!props.checked}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
          onClick={() => props.onChange?.(!props.checked)}
          className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${focusRing} ${
            props.checked ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span className="sr-only">{props.checked ? 'On' : 'Off'}</span>
          <span
            aria-hidden="true"
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              props.checked ? 'translate-x-5' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
}

export function CookiePreferences() {
  const { settings, record, ready, save } = useConsent();
  const [choice, setChoice] = useState<ConsentChoice>({ analytics: false, advertising: false });
  const [status, setStatus] = useState('');

  // Start from the visitor's current, valid choice; both off when undecided.
  useEffect(() => {
    if (ready) setChoice({ analytics: !!record?.analytics, advertising: !!record?.advertising });
  }, [ready, record]);

  const apply = (next: ConsentChoice) => {
    setChoice(next);
    save(next);
    setStatus('Your choices have been saved.');
  };

  return (
    <div className="max-w-2xl mx-auto px-0 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">Cookie preferences</h1>
      {settings?.message && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{settings.message}</p>
      )}

      {!ready ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(choice);
          }}
        >
          <div className="space-y-3">
            <CategoryRow
              alwaysOn
              title={settings?.essentialTitle || 'Essential'}
              description={settings?.essentialDescription || ''}
            />
            <CategoryRow
              title={settings?.analyticsTitle || 'Analytics'}
              description={settings?.analyticsDescription || ''}
              checked={choice.analytics}
              onChange={(v) => { setChoice((c) => ({ ...c, analytics: v })); setStatus(''); }}
            />
            <CategoryRow
              title={settings?.advertisingTitle || 'Advertising'}
              description={settings?.advertisingDescription || ''}
              checked={choice.advertising}
              onChange={(v) => { setChoice((c) => ({ ...c, advertising: v })); setStatus(''); }}
            />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button type="submit" className={actionClass}>Save</button>
            <button type="button" className={actionClass} onClick={() => apply({ analytics: false, advertising: false })}>
              {settings?.rejectText || 'Reject all'}
            </button>
            <button type="button" className={actionClass} onClick={() => apply({ analytics: true, advertising: true })}>
              {settings?.acceptText || 'Accept all'}
            </button>
          </div>

          <p role="status" aria-live="polite" className="mt-4 min-h-[1.25rem] text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            {status && <><CheckCircle className="w-4 h-4" aria-hidden="true" />{status}</>}
          </p>
        </form>
      )}
    </div>
  );
}
