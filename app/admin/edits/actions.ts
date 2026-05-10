'use server';

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { requireAdmin } from '../_lib/require-admin';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function approveEdit(editId: string, token: string) {
  try {
    await requireAdmin(token);
    const { error } = await adminSupabase.rpc('rpc_approve_edit', {
      p_edit_id: editId,
      p_reviewer: 'admin',
    });
    if (error) throw new Error(`RPC: ${error.message}`);

    // Notify the editor — fire-and-forget, never block on email failure
    void notifyEditorOfDecision(editId, 'approved').catch((e) =>
      console.error('approval notify failed', e instanceof Error ? e.message : e),
    );

    return { ok: true } as const;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('approveEdit FAILED', { editId, detail });
    return { ok: false as const, error: detail };
  }
}

export async function rejectEdit(editId: string, reason: string, token: string) {
  try {
    await requireAdmin(token);
    const { error } = await adminSupabase.rpc('rpc_reject_edit', {
      p_edit_id: editId,
      p_reviewer: 'admin',
      p_reason: reason,
    });
    if (error) throw new Error(`RPC: ${error.message}`);

    void notifyEditorOfDecision(editId, 'rejected', reason).catch((e) =>
      console.error('reject notify failed', e instanceof Error ? e.message : e),
    );

    return { ok: true } as const;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('rejectEdit FAILED', { editId, detail });
    return { ok: false as const, error: detail };
  }
}

export async function approveSubmission(submissionId: string, token: string) {
  try {
    await requireAdmin(token);
    const { error } = await adminSupabase.rpc('rpc_approve_submission', {
      p_submission_id: submissionId,
    });
    if (error) throw new Error(`RPC: ${error.message}`);
    return { ok: true as const };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('approveSubmission FAILED', { submissionId, detail });
    return { ok: false as const, error: detail };
  }
}

export async function rejectSubmission(submissionId: string, reason: string, token: string) {
  try {
    await requireAdmin(token);
    const { error } = await adminSupabase.rpc('rpc_reject_submission', {
      p_submission_id: submissionId,
      p_reason: reason,
    });
    if (error) throw new Error(`RPC: ${error.message}`);
    return { ok: true as const };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('rejectSubmission FAILED', { submissionId, detail });
    return { ok: false as const, error: detail };
  }
}

const FROM = 'OpenGolfAPI <hello@opengolfapi.org>';
const REPLY_DOMAIN = 'opengolfapi.org';

function makeThreadKey(): string {
  // 12-char URL-safe token. Embedded in Reply-To and Subject for inbound matching.
  return randomBytes(9).toString('base64url');
}

export async function sendReply(editId: string, bodyText: string, token: string) {
  try {
    return await sendReplyImpl(editId, bodyText, token);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error('sendReply FAILED', { editId, detail });
    return { ok: false as const, error: detail };
  }
}

async function sendReplyImpl(editId: string, bodyText: string, token: string) {
  await requireAdmin(token);
  const trimmed = bodyText.trim();
  if (!trimmed) throw new Error('Empty reply');
  if (trimmed.length > 5000) throw new Error('Reply too long');

  // Load the edit + course
  const { data: edit } = await adminSupabase
    .from('golf_course_edits')
    .select('id, course_id, field_name, editor_email, new_value')
    .eq('id', editId)
    .single();
  if (!edit) throw new Error('Edit not found');

  const { data: course } = await adminSupabase
    .from('golf_courses')
    .select('course_name, state')
    .eq('id', edit.course_id)
    .single();

  // Reuse existing thread_key if any prior message exists for this edit
  const { data: existingThread } = await adminSupabase
    .from('golf_edit_communications')
    .select('thread_key')
    .eq('edit_id', editId)
    .limit(1)
    .maybeSingle();
  const threadKey = existingThread?.thread_key ?? makeThreadKey();

  const subject = `Re: your edit on ${course?.course_name ?? 'a course'} [${threadKey}]`;
  const replyTo = `replies+${threadKey}@${REPLY_DOMAIN}`;

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1F2421;">
  <p>Hi,</p>
  <p style="white-space: pre-wrap;">${escapeHtml(trimmed)}</p>
  <hr style="border: none; border-top: 1px solid #D9D2C0; margin: 24px 0;">
  <p style="font-size: 12px; color: #6B7470;">
    Re: your suggested edit to <strong>${escapeHtml(edit.field_name)}</strong> on
    <em>${escapeHtml(course?.course_name ?? '')}</em>
    (${escapeHtml(edit.new_value ?? '')}).
  </p>
  <p style="font-size: 12px; color: #6B7470;">Reply directly to this email — your reply will appear in our admin queue.</p>
</div>`.trim();

  const text = `${trimmed}\n\n---\nRe: your suggested edit to ${edit.field_name} on ${course?.course_name ?? ''} (${edit.new_value ?? ''}). Reply directly to this email.`;

  // Send via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: edit.editor_email,
      reply_to: replyTo,
      subject,
      html,
      text,
      headers: {
        'X-OpenGolfAPI-Thread': threadKey,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const result = (await res.json()) as { id?: string };

  // Store outbound message
  const { error: insErr } = await adminSupabase.from('golf_edit_communications').insert({
    edit_id: editId,
    course_id: edit.course_id,
    thread_key: threadKey,
    direction: 'outbound',
    from_email: 'hello@opengolfapi.org',
    to_email: edit.editor_email,
    subject,
    body: trimmed,
    resend_id: result.id ?? null,
  });
  if (insErr) throw new Error(`DB write failed: ${insErr.message}`);

  return { ok: true as const };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Notify editor of approve/reject decision via Resend, threaded so replies route back.
async function notifyEditorOfDecision(
  editId: string,
  decision: 'approved' | 'rejected',
  reason?: string,
) {
  const { data: edit } = await adminSupabase
    .from('golf_course_edits')
    .select('id, course_id, field_name, new_value, editor_email')
    .eq('id', editId)
    .single();
  if (!edit) return;

  const { data: course } = await adminSupabase
    .from('golf_courses')
    .select('course_name, state')
    .eq('id', edit.course_id)
    .single();

  // Reuse existing thread_key if any prior message exists for this edit
  const { data: existingThread } = await adminSupabase
    .from('golf_edit_communications')
    .select('thread_key')
    .eq('edit_id', editId)
    .limit(1)
    .maybeSingle();
  const threadKey = existingThread?.thread_key ?? makeThreadKey();
  const replyTo = `replies+${threadKey}@${REPLY_DOMAIN}`;

  const courseName = course?.course_name ?? 'a course';
  const fieldDisplay = edit.field_name.replace(/_/g, ' ');
  const valueDisplay = edit.new_value ?? '(empty)';

  const subject =
    decision === 'approved'
      ? `Your edit on ${courseName} was approved [${threadKey}]`
      : `Your edit on ${courseName} was not accepted [${threadKey}]`;

  const headline =
    decision === 'approved'
      ? `Approved — your suggested change to ${escapeHtml(fieldDisplay)} on ${escapeHtml(courseName)} is now live.`
      : `Not accepted — we couldn't apply your suggested change to ${escapeHtml(fieldDisplay)} on ${escapeHtml(courseName)}.`;

  const reasonBlock =
    decision === 'rejected' && reason && reason.trim().length > 0
      ? `<p style="margin-top: 16px; padding: 10px 14px; background: #FEF6E5; border-left: 3px solid #B8541F; color: #1F2421; font-size: 14px;"><strong>Reviewer note:</strong> ${escapeHtml(reason)}</p>`
      : '';

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #1F2421;">
  <p>${headline}</p>
  <p style="font-size: 13px; color: #6B7470;">
    <strong>${escapeHtml(fieldDisplay)}</strong> → <em>${escapeHtml(valueDisplay)}</em>
  </p>
  ${reasonBlock}
  <hr style="border: none; border-top: 1px solid #D9D2C0; margin: 24px 0;">
  <p style="font-size: 12px; color: #6B7470;">
    Thanks for contributing to OpenGolfAPI — every correction makes the dataset more useful.
    ${decision === 'approved'
      ? 'See more courses to fix at <a href="https://courses.opengolfapi.org/">courses.opengolfapi.org</a>.'
      : 'Reply to this email if you have additional context — we read every reply.'}
  </p>
</div>`.trim();

  const text = decision === 'approved'
    ? `Your suggested change to ${fieldDisplay} on ${courseName} (${valueDisplay}) was approved and is now live.\n\nThanks for contributing to OpenGolfAPI.`
    : `We didn't accept your suggested change to ${fieldDisplay} on ${courseName} (${valueDisplay}).${reason ? `\n\nReviewer note: ${reason}` : ''}\n\nReply to this email if you have additional context.`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: edit.editor_email,
      reply_to: replyTo,
      subject,
      html,
      text,
      headers: { 'X-OpenGolfAPI-Thread': threadKey },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  const result = (await res.json()) as { id?: string };

  await adminSupabase.from('golf_edit_communications').insert({
    edit_id: editId,
    course_id: edit.course_id,
    thread_key: threadKey,
    direction: 'outbound',
    from_email: 'hello@opengolfapi.org',
    to_email: edit.editor_email,
    subject,
    body: text,
    resend_id: result.id ?? null,
  });
}
