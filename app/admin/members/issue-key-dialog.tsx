'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { issueKey, type ApiKeyTier } from './actions';

const TIERS: Array<{ value: ApiKeyTier; label: string; limit: string }> = [
  { value: 'keyed', label: 'Keyed (free)', limit: '10,000/day' },
  { value: 'backer', label: 'Backer', limit: '50,000/day' },
  { value: 'sponsor', label: 'Sponsor', limit: '250,000/day' },
  { value: 'major_sponsor', label: 'Major Sponsor', limit: '1,000,000/day' },
  { value: 'unlimited', label: 'Unlimited (internal)', limit: '1B/day' },
];

type State =
  | { kind: 'closed' }
  | { kind: 'form'; email: string; name: string; tier: ApiKeyTier; submitting: boolean; error?: string }
  | { kind: 'issued'; key: string; prefix: string; email: string };

export function IssueKeyDialog() {
  const [state, setState] = useState<State>({ kind: 'closed' });
  const [copied, setCopied] = useState(false);

  function open() {
    setState({ kind: 'form', email: '', name: '', tier: 'keyed', submitting: false });
  }

  function close() {
    setState({ kind: 'closed' });
    setCopied(false);
  }

  async function submit() {
    if (state.kind !== 'form') return;
    setState({ ...state, submitting: true, error: undefined });

    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    if (!token) {
      setState({ ...state, submitting: false, error: 'Not signed in' });
      return;
    }

    const result = await issueKey(state.email, state.name, state.tier, token);
    if (result.ok) {
      setState({ kind: 'issued', key: result.key, prefix: result.prefix, email: state.email });
    } else {
      setState({ ...state, submitting: false, error: result.error });
    }
  }

  function copyKey() {
    if (state.kind !== 'issued') return;
    navigator.clipboard.writeText(state.key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        onClick={open}
        className="text-xs px-3 py-1 rounded font-medium text-white"
        style={{ background: 'var(--color-evergreen-700)' }}
      >
        + Issue new key
      </button>

      {state.kind !== 'closed' && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-md"
            style={{ color: 'var(--color-ink)' }}
          >
            {state.kind === 'form' && (
              <>
                <h2 className="font-display text-xl font-bold mb-1">Issue a new key</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
                  Generates a key and (if non-keyed) bumps to the chosen tier in one shot. Logged in audit trail with your admin email.
                </p>
                <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-muted)' }}>Email</label>
                    <input
                      type="email"
                      required
                      value={state.email}
                      onChange={(e) => setState({ ...state, email: e.target.value, error: undefined })}
                      className="w-full px-3 py-2 border rounded text-sm"
                      style={{ borderColor: 'var(--color-rule)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-muted)' }}>Name (optional)</label>
                    <input
                      type="text"
                      value={state.name}
                      onChange={(e) => setState({ ...state, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm"
                      style={{ borderColor: 'var(--color-rule)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-muted)' }}>Tier</label>
                    <select
                      value={state.tier}
                      onChange={(e) => setState({ ...state, tier: e.target.value as ApiKeyTier })}
                      className="w-full px-3 py-2 border rounded text-sm"
                      style={{ borderColor: 'var(--color-rule)' }}
                    >
                      {TIERS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label} — {t.limit}</option>
                      ))}
                    </select>
                  </div>
                  {state.error && <p className="text-xs" style={{ color: '#b85450' }}>{state.error}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={close} className="px-4 py-2 rounded text-sm" style={{ color: 'var(--color-ink-muted)' }}>Cancel</button>
                    <button
                      type="submit"
                      disabled={state.submitting || !state.email}
                      className="px-4 py-2 rounded text-sm text-white font-medium disabled:opacity-50"
                      style={{ background: 'var(--color-evergreen-700)' }}
                    >
                      {state.submitting ? 'Issuing…' : 'Issue key'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {state.kind === 'issued' && (
              <>
                <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--color-evergreen-700)' }}>Key issued</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
                  Save this. We hash + discard the original — it can&apos;t be shown again. The user also got it by email.
                </p>
                <div className="flex items-center gap-2 p-3 rounded mb-4" style={{ background: 'var(--color-ink)' }}>
                  <code className="flex-1 font-mono text-xs break-all" style={{ color: 'var(--color-cream)' }}>
                    {state.key}
                  </code>
                  <button
                    onClick={copyKey}
                    className="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
                    style={{ background: 'var(--color-brass-500)', color: 'var(--color-ink)' }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--color-ink-muted)' }}>
                  Issued to <strong style={{ color: 'var(--color-ink)' }}>{state.email}</strong> · prefix <code className="font-mono">{state.prefix}</code>
                </p>
                <div className="flex justify-end">
                  <button onClick={close} className="px-4 py-2 rounded text-sm text-white" style={{ background: 'var(--color-evergreen-700)' }}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
