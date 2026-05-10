'use client';

import { useState, useTransition } from 'react';
import { bumpTier, revokeKey, type ApiKeyTier } from './actions';
import { supabase } from '@/lib/supabase';

const TIERS: ApiKeyTier[] = ['keyed', 'backer', 'sponsor', 'major_sponsor'];

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function MemberRowActions({
  keyId,
  email,
  currentTier,
  isRevoked,
}: {
  keyId: string;
  email: string;
  currentTier: ApiKeyTier;
  isRevoked: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [tier, setTier] = useState<ApiKeyTier>(currentTier);
  const [err, setErr] = useState('');
  const [revoked, setRevoked] = useState(isRevoked);

  function handleTierChange(next: ApiKeyTier) {
    if (next === tier) return;
    const prev = tier;
    setTier(next);
    setErr('');
    startTransition(async () => {
      const token = await getToken();
      if (!token) { setErr('Not signed in — refresh the page'); setTier(prev); return; }
      const result = await bumpTier(keyId, email, prev, next, token);
      if (!result.ok) {
        setErr(result.error || 'unknown');
        setTier(prev);
      }
    });
  }

  function handleRevoke() {
    const reason = window.prompt('Revocation reason (required):') ?? '';
    if (!reason.trim()) return;
    if (!window.confirm(`Revoke API key for ${email}?\nReason: ${reason}`)) return;
    setErr('');
    startTransition(async () => {
      const token = await getToken();
      if (!token) { setErr('Not signed in — refresh the page'); return; }
      const result = await revokeKey(keyId, email, token, reason);
      if (!result.ok) {
        setErr(result.error || 'unknown');
        return;
      }
      setRevoked(true);
    });
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <select
        value={tier}
        onChange={(e) => handleTierChange(e.target.value as ApiKeyTier)}
        disabled={isPending || revoked}
        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {revoked ? (
        <span className="text-xs font-semibold text-gray-400 px-2 py-1">Revoked</span>
      ) : (
        <button
          onClick={handleRevoke}
          disabled={isPending}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Revoke
        </button>
      )}
      {err && <span className="text-red-500 text-xs break-words">{err}</span>}
    </div>
  );
}
