'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Edit = {
  id: string;
  course_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  status: 'pending' | 'auto_approved' | 'approved' | 'rejected';
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  verification: {
    ai_verdict?: 'approve' | 'reject' | 'inconclusive';
    ai_confidence?: number;
    ai_reasoning?: string;
    sources_checked?: string[];
    flagged?: string;
  } | null;
};

type CourseRef = { id: string; course_name: string; state: string; slug: string | null };

type ViewState =
  | { kind: 'loading' }
  | { kind: 'signin'; email: string; sent: boolean; sending: boolean; error?: string }
  | { kind: 'authed'; userEmail: string; edits: Edit[]; courses: Record<string, CourseRef> };

const STATUS_LABEL: Record<Edit['status'], string> = {
  pending: 'Pending review',
  auto_approved: 'Auto-approved',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_COLOR: Record<Edit['status'], string> = {
  pending: 'var(--color-brass-700)',
  auto_approved: 'var(--color-evergreen-700)',
  approved: 'var(--color-evergreen-700)',
  rejected: '#b85450',
};

export function MyEditsClient() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setView({ kind: 'signin', email: '', sent: false, sending: false });
        return;
      }
      await loadEdits(session.user.email!, cancelled);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEdits(email: string, cancelled = false) {
    const { data: edits, error } = await supabase
      .from('golf_course_edits')
      .select('id, course_id, field_name, old_value, new_value, status, reviewer_notes, created_at, reviewed_at, verification')
      .eq('editor_email', email)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !edits) {
      if (!cancelled) setView({ kind: 'authed', userEmail: email, edits: [], courses: {} });
      return;
    }

    const courseIds = [...new Set(edits.map((e) => e.course_id))];
    const { data: courses } = await supabase
      .from('golf_courses')
      .select('id, course_name, state, slug')
      .in('id', courseIds);

    const courseMap: Record<string, CourseRef> = {};
    for (const c of (courses ?? [])) courseMap[c.id] = c as CourseRef;

    if (!cancelled) setView({ kind: 'authed', userEmail: email, edits: edits as Edit[], courses: courseMap });
  }

  async function sendMagicLink(email: string) {
    setView((v) => v.kind === 'signin' ? { ...v, sending: true, error: undefined } : v);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setView((v) =>
      v.kind === 'signin'
        ? { ...v, sending: false, sent: !error, error: error?.message }
        : v,
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    setView({ kind: 'signin', email: '', sent: false, sending: false });
  }

  if (view.kind === 'loading') {
    return <div style={{ color: 'var(--color-ink-muted)' }}>Loading…</div>;
  }

  if (view.kind === 'signin') {
    return (
      <div className="max-w-md">
        <p className="mb-4" style={{ color: 'var(--color-ink-muted)' }}>
          Sign in with the email you used when submitting edits. We&apos;ll send you a one-time link.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (view.email) sendMagicLink(view.email);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={view.email}
            onChange={(e) => setView({ ...view, email: e.target.value })}
            className="px-4 py-3 border rounded text-base"
            style={{ borderColor: 'var(--color-rule)' }}
          />
          <button
            type="submit"
            disabled={view.sending || !view.email}
            className="px-5 py-3 rounded text-white font-medium disabled:opacity-50"
            style={{ background: 'var(--color-evergreen-700)' }}
          >
            {view.sending ? 'Sending…' : view.sent ? 'Sent — check your email' : 'Send me a sign-in link'}
          </button>
          {view.error && <p style={{ color: '#b85450' }} className="text-sm">{view.error}</p>}
          {view.sent && !view.error && (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
              Click the link in your email, then return here.
            </p>
          )}
        </form>
      </div>
    );
  }

  // authed
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p style={{ color: 'var(--color-ink-muted)' }}>
          Signed in as <strong style={{ color: 'var(--color-ink)' }}>{view.userEmail}</strong>
        </p>
        <button
          onClick={signOut}
          className="text-sm underline"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          Sign out
        </button>
      </div>

      {view.edits.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-ink-muted)' }}>
          <p className="text-lg mb-2">No contributions yet.</p>
          <p className="text-sm">
            Find a course and click &ldquo;Suggest an edit&rdquo; on its page to start.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {view.edits.map((edit) => {
            const course = view.courses[edit.course_id];
            const courseUrl = course?.slug && course?.state
              ? `/courses/${course.state.toLowerCase()}/${course.slug}`
              : null;

            return (
              <div
                key={edit.id}
                className="border rounded p-4"
                style={{ borderColor: 'var(--color-rule)' }}
              >
                <div className="flex items-start justify-between mb-2 gap-3 flex-wrap">
                  <div>
                    {courseUrl && course ? (
                      <Link
                        href={courseUrl}
                        className="font-display text-lg hover:underline"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {course.course_name}
                      </Link>
                    ) : (
                      <span className="font-display text-lg" style={{ color: 'var(--color-ink-muted)' }}>
                        Unknown course
                      </span>
                    )}
                    {course && (
                      <span className="ml-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                        ({course.state})
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ color: STATUS_COLOR[edit.status], border: `1px solid ${STATUS_COLOR[edit.status]}` }}
                  >
                    {STATUS_LABEL[edit.status]}
                  </span>
                </div>

                <div className="text-sm mb-2">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-cream-100)', color: 'var(--color-ink-muted)' }}>
                    {edit.field_name}
                  </span>
                  <span className="ml-2" style={{ color: 'var(--color-ink-muted)' }}>
                    {edit.old_value ?? <em>empty</em>} → <strong style={{ color: 'var(--color-ink)' }}>{edit.new_value ?? <em>empty</em>}</strong>
                  </span>
                </div>

                {edit.verification?.ai_verdict && (
                  <div className="text-xs mt-2" style={{ color: 'var(--color-ink-muted)' }}>
                    Verifier: <strong style={{ color: STATUS_COLOR[edit.status] }}>{edit.verification.ai_verdict}</strong>
                    {edit.verification.ai_confidence != null && ` · ${Math.round(edit.verification.ai_confidence * 100)}%`}
                    {edit.verification.ai_reasoning && (
                      <span className="block italic mt-1">
                        {edit.verification.ai_reasoning.slice(0, 240)}
                        {edit.verification.ai_reasoning.length > 240 ? '…' : ''}
                      </span>
                    )}
                  </div>
                )}

                {edit.reviewer_notes && (
                  <div className="text-xs mt-2" style={{ color: 'var(--color-ink-muted)' }}>
                    Reviewer: <em>{edit.reviewer_notes}</em>
                  </div>
                )}

                <div className="text-xs mt-2" style={{ color: 'var(--color-ink-muted)' }}>
                  Submitted {new Date(edit.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {edit.reviewed_at && ` · reviewed ${new Date(edit.reviewed_at).toLocaleDateString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
