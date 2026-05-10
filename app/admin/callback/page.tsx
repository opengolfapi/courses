'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { grantAdminSession } from '../_lib/grant-admin-session';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'denied'>('pending');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session) return;
      const result = await grantAdminSession(session.access_token);
      if (!result.ok) {
        setStatus('denied');
        setErrorMsg(result.error ?? 'Not authorized');
        // Sign the non-admin out so they don't keep a Supabase session for nothing.
        await supabase.auth.signOut();
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/admin/dashboard';
      router.push(next);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (status === 'denied') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Access denied</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>
          <a href="/admin/login" style={{ color: '#15803d', fontSize: '14px', textDecoration: 'underline' }}>Try again</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
