'use client';

import { useState, useTransition } from 'react';
import { sendReply } from './actions';
import { supabase } from '@/lib/supabase';

export type ThreadMessage = {
  id: string;
  direction: 'outbound' | 'inbound';
  from_email: string;
  body: string;
  created_at: string;
};

export function CommThread({
  editId,
  editorEmail,
  thread,
}: {
  editId: string;
  editorEmail: string;
  thread: ThreadMessage[];
}) {
  const [open, setOpen] = useState(thread.length > 0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inboundCount = thread.filter((m) => m.direction === 'inbound').length;
  const lastInbound = thread.findLast?.((m) => m.direction === 'inbound');
  const hasUnreadHint = inboundCount > 0;

  function submit() {
    setError(null);
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setError('Not signed in — refresh the page'); return; }
        const result = await sendReply(editId, text, token);
        if (result && 'ok' in result && !result.ok) {
          setError(result.error || 'unknown');
          return;
        }
        setBody('');
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-evergreen-700 hover:text-evergreen-950 underline underline-offset-2 inline-flex items-center gap-1"
        aria-label={`Open conversation with ${editorEmail}`}
      >
        <span>💬</span>
        <span>{thread.length === 0 ? 'Reply' : `Thread (${thread.length})`}</span>
        {hasUnreadHint && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warn text-white" style={{ background: 'var(--color-warn)' }}>
            {inboundCount} reply
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-2 border rounded-md p-3 bg-white" style={{ borderColor: 'var(--color-cream-darkest)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
          Conversation with <span className="font-mono normal-case">{editorEmail}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
          aria-label="Collapse thread"
        >
          ✕
        </button>
      </div>

      {thread.length === 0 ? (
        <p className="text-xs italic mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          No messages yet — the editor will see this thread once you reply below.
        </p>
      ) : (
        <ul className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {thread.map((m) => (
            <li
              key={m.id}
              className={`text-xs p-2 rounded ${m.direction === 'outbound' ? 'ml-6' : 'mr-6'}`}
              style={{
                background: m.direction === 'outbound' ? 'var(--color-cream-darker)' : 'white',
                border: `1px solid ${m.direction === 'inbound' ? 'var(--color-cream-darkest)' : 'transparent'}`,
              }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-ink-muted)' }}>
                  {m.direction === 'outbound' ? '→' : '←'} {m.from_email}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-ink-muted)' }}>
                  {new Date(m.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap" style={{ color: 'var(--color-ink)' }}>{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={lastInbound ? 'Type your reply…' : `Reply to ${editorEmail}…`}
        className="w-full text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-evergreen-600 focus:border-evergreen-700"
        style={{ borderColor: 'var(--color-cream-darkest)' }}
        disabled={pending}
      />

      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-warn)' }}>{error}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px]" style={{ color: 'var(--color-ink-muted)' }}>
          Sends from hello@opengolfapi.org · replies appear here
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="px-3 py-1 rounded text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--color-evergreen-950)', color: 'var(--color-cream)' }}
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
