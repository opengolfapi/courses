'use client';

import { useState } from "react";
import { issueApiKey } from "./actions";

type ViewState =
  | { kind: 'form'; email: string; name: string; sending: boolean; error?: string }
  | { kind: 'issued'; key: string; email: string };

export function ApiKeysClient() {
  const [view, setView] = useState<ViewState>({ kind: 'form', email: '', name: '', sending: false });
  const [copied, setCopied] = useState(false);

  async function submit(email: string, name: string) {
    setView({ kind: 'form', email, name, sending: true });
    const result = await issueApiKey(email, name);
    if (result.error) {
      setView({ kind: 'form', email, name, sending: false, error: result.error });
      return;
    }
    setView({ kind: 'issued', key: result.key!, email });
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (view.kind === 'issued') {
    return (
      <div className="border rounded p-6" style={{ borderColor: 'var(--color-evergreen-700)', background: 'var(--color-cream-darker)' }}>
        <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-evergreen-700)' }}>
          Your key is ready
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-ink-muted)' }}>
          We also emailed it to <strong style={{ color: 'var(--color-ink)' }}>{view.email}</strong>. Save it somewhere — we hash and discard the original, so we can&apos;t show it again. Lose it and you&apos;ll need to revoke + reissue.
        </p>
        <div className="flex items-center gap-2 p-3 rounded" style={{ background: 'var(--color-ink)' }}>
          <code className="flex-1 font-mono text-sm break-all" style={{ color: 'var(--color-cream)' }}>
            {view.key}
          </code>
          <button
            onClick={() => copyKey(view.key)}
            className="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
            style={{ background: 'var(--color-brass-500)', color: 'var(--color-ink)' }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (view.email) submit(view.email, view.name);
      }}
      className="flex flex-col gap-3 max-w-md"
    >
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={view.email}
        onChange={(e) => setView({ ...view, email: e.target.value, error: undefined })}
        className="px-4 py-3 border rounded text-base"
        style={{ borderColor: 'var(--color-rule)', background: 'white' }}
      />
      <input
        type="text"
        placeholder="Project / company name (optional)"
        value={view.name}
        onChange={(e) => setView({ ...view, name: e.target.value })}
        className="px-4 py-3 border rounded text-base"
        style={{ borderColor: 'var(--color-rule)', background: 'white' }}
      />
      <button
        type="submit"
        disabled={view.sending || !view.email}
        className="px-5 py-3 rounded text-white font-medium disabled:opacity-50"
        style={{ background: 'var(--color-evergreen-700)' }}
      >
        {view.sending ? 'Issuing key…' : 'Get my free key'}
      </button>
      {view.error && (
        <p style={{ color: '#b85450' }} className="text-sm">{view.error}</p>
      )}
      <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
        We&apos;ll only email you about breaking API changes. No marketing.
      </p>
    </form>
  );
}
