'use client';

import { useState, useTransition } from 'react';
import { approveEdit, rejectEdit } from './actions';
import { supabase } from '@/lib/supabase';

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function ReviewButtons({ editId }: { editId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [err, setErr] = useState('');

  function handleApprove() {
    startTransition(async () => {
      try {
        const token = await getToken();
        if (!token) { setErr('Not signed in — refresh the page'); return; }
        const result = await approveEdit(editId, token);
        if (result && 'ok' in result && !result.ok) {
          setErr(result.error || 'unknown');
          return;
        }
        setDone('approved');
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  function handleReject() {
    const reason = window.prompt('Rejection reason (optional):') ?? '';
    startTransition(async () => {
      try {
        const token = await getToken();
        if (!token) { setErr('Not signed in — refresh the page'); return; }
        const result = await rejectEdit(editId, reason, token);
        if (result && 'ok' in result && !result.ok) {
          setErr(result.error || 'unknown');
          return;
        }
        setDone('rejected');
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  if (done === 'approved') {
    return <span className="text-evergreen-700 text-xs font-semibold">Approved</span>;
  }
  if (done === 'rejected') {
    return <span className="text-red-600 text-xs font-semibold">Rejected</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="px-3 py-1 text-xs bg-evergreen-700 text-white rounded hover:bg-evergreen-800 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        Reject
      </button>
      {err && <span className="text-red-500 text-xs">{err}</span>}
    </div>
  );
}
