import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ReviewButtons } from './review-buttons';
import { SubmissionButtons } from './submission-buttons';
import { SignOutButton } from './sign-out-button';
import { CommThread, type ThreadMessage } from './comm-thread';
import { EvidencePanel } from './evidence-panel';

// Render at request time only — never statically. This page reads service-role
// data and would expose pending edits in static HTML otherwise.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type EditFilter = 'pending' | 'all' | 'approved' | 'rejected' | 'auto_approved';

const EDIT_FILTER_LABELS: Record<EditFilter, string> = {
  pending: 'Pending',
  all: 'All',
  approved: 'Approved',
  rejected: 'Rejected',
  auto_approved: 'Auto-approved',
};

export default async function AdminEditsPage({
  searchParams,
}: { searchParams: Promise<{ filter?: string }> }) {
  try {
    const sp = await searchParams;
    const raw = typeof sp.filter === 'string' ? sp.filter : 'pending';
    const filter: EditFilter = (['pending', 'all', 'approved', 'rejected', 'auto_approved'] as const).includes(raw as EditFilter)
      ? (raw as EditFilter)
      : 'pending';
    return await renderAdminEditsPage(filter);
  } catch (e) {
    console.error('AdminEditsPage render FAILED', { err: e instanceof Error ? { message: e.message, stack: e.stack } : e });
    throw e;
  }
}

async function renderAdminEditsPage(filter: EditFilter) {
  // Always fetch pending submissions; edits depend on filter
  let editsQuery = adminSupabase
    .from('golf_course_edits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter !== 'all') {
    editsQuery = editsQuery.eq('status', filter);
  }

  const [{ data: edits, error }, { data: submissions }, { data: editStatusCounts }] = await Promise.all([
    editsQuery,
    adminSupabase
      .from('golf_course_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200),
    adminSupabase
      .from('golf_course_edits')
      .select('status'),
  ]);

  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, auto_approved: 0, all: 0 };
  for (const row of editStatusCounts ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    counts.all += 1;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Admin — Pending Edits</h1>
        <p className="text-red-600">Error loading edits: {error.message}</p>
      </div>
    );
  }

  // Batch-fetch course names + comm threads
  const editIds = (edits ?? []).map((e: { id: string }) => e.id);
  const courseIds = [...new Set((edits ?? []).map((e: { course_id: string }) => e.course_id))];
  const [coursesRes, commsRes] = await Promise.all([
    adminSupabase
      .from('golf_courses')
      .select('id, course_name, city, state')
      .in('id', courseIds),
    editIds.length > 0
      ? adminSupabase
          .from('golf_edit_communications')
          .select('id, edit_id, direction, from_email, body, created_at')
          .in('edit_id', editIds)
          .order('created_at', { ascending: true })
      : { data: [] as Array<{ id: string; edit_id: string; direction: 'outbound' | 'inbound'; from_email: string; body: string; created_at: string }> },
  ]);

  const courseMap = Object.fromEntries(
    (coursesRes.data ?? []).map((c: { id: string; course_name: string; city: string; state: string }) => [c.id, c])
  );

  const threadsByEdit = new Map<string, ThreadMessage[]>();
  for (const m of (commsRes.data ?? []) as Array<ThreadMessage & { edit_id: string }>) {
    const list = threadsByEdit.get(m.edit_id) ?? [];
    list.push({ id: m.id, direction: m.direction, from_email: m.from_email, body: m.body, created_at: m.created_at });
    threadsByEdit.set(m.edit_id, list);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edits</h1>
          <p className="text-sm text-gray-500 mt-1">
            {(edits ?? []).length} {EDIT_FILTER_LABELS[filter].toLowerCase()} · {counts.pending} pending overall
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Dashboard</Link>
          <Link href="/admin/members" className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Members</Link>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Admin</span>
          <SignOutButton />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(['pending', 'auto_approved', 'approved', 'rejected', 'all'] as EditFilter[]).map((f) => {
          const isActive = f === filter;
          const count = counts[f] ?? 0;
          return (
            <Link
              key={f}
              href={f === 'pending' ? '/admin/edits' : `/admin/edits?filter=${f}`}
              className={
                isActive
                  ? 'px-3 py-1.5 text-xs font-semibold rounded bg-gray-900 text-white'
                  : 'px-3 py-1.5 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            >
              {EDIT_FILTER_LABELS[f]} <span className="opacity-60 ml-1">{count}</span>
            </Link>
          );
        })}
      </div>

      {(edits ?? []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No {EDIT_FILTER_LABELS[filter].toLowerCase()} edits</p>
          <p className="text-sm mt-1">{filter === 'pending' ? 'All caught up!' : 'Nothing to show in this view.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 border-b">Course</th>
                <th className="px-4 py-3 border-b">Field</th>
                <th className="px-4 py-3 border-b">Old Value</th>
                <th className="px-4 py-3 border-b">New Value</th>
                <th className="px-4 py-3 border-b">Editor</th>
                <th className="px-4 py-3 border-b">Submitted</th>
                <th className="px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(edits ?? []).map((edit: {
                id: string;
                course_id: string;
                field_name: string;
                old_value: string | null;
                new_value: string | null;
                editor_email: string;
                status: string;
                reviewed_at: string | null;
                reviewer_notes: string | null;
                created_at: string;
                verification: {
                  ai_verdict?: 'approve' | 'reject' | 'inconclusive';
                  ai_confidence?: number;
                  ai_reasoning?: string;
                  sources_checked?: string[];
                  flagged?: string;
                  recent_count?: number;
                } | null;
              }) => {
                const course = courseMap[edit.course_id];
                return (
                  <tr key={edit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      {course ? (
                        <div>
                          <div className="font-medium text-gray-900 text-xs">{course.course_name}</div>
                          <div className="text-gray-400 text-xs">{course.city}, {course.state}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{edit.course_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {edit.field_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-500 text-xs max-w-[140px] break-words">
                      {edit.old_value ?? <span className="italic text-gray-300">empty</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-900 text-xs max-w-[140px] break-words font-medium">
                      {edit.new_value ?? <span className="italic text-gray-300">empty</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-xs max-w-[260px] break-all">
                      <div style={{ color: "var(--color-ink-muted)" }}>{edit.editor_email}</div>
                      <EvidencePanel verification={edit.verification} />
                      <CommThread
                        editId={edit.id}
                        editorEmail={edit.editor_email}
                        thread={threadsByEdit.get(edit.id) ?? []}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-400 whitespace-nowrap">
                      {new Date(edit.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {edit.status === 'pending' ? (
                        <ReviewButtons editId={edit.id} />
                      ) : (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span
                            className="font-semibold inline-block px-2 py-0.5 rounded"
                            style={{
                              color:
                                edit.status === 'approved' || edit.status === 'auto_approved'
                                  ? 'var(--color-evergreen-700)'
                                  : '#b85450',
                              border: `1px solid ${
                                edit.status === 'approved' || edit.status === 'auto_approved'
                                  ? 'var(--color-evergreen-700)'
                                  : '#b85450'
                              }`,
                            }}
                          >
                            {edit.status.replace('_', ' ')}
                          </span>
                          {edit.reviewed_at && (
                            <span className="text-gray-400">
                              {new Date(edit.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {edit.reviewer_notes && (
                            <span className="italic text-gray-500 max-w-[140px]">{edit.reviewer_notes.slice(0, 80)}{edit.reviewer_notes.length > 80 ? '…' : ''}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Course Submissions */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Course Submissions</h2>
          <p className="text-sm text-gray-500 mt-1">{(submissions ?? []).length} awaiting review</p>
        </div>

        {(submissions ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <p className="text-lg">No pending submissions</p>
            <p className="text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b">Course Name</th>
                  <th className="px-4 py-3 border-b">Location</th>
                  <th className="px-4 py-3 border-b">Type / Holes</th>
                  <th className="px-4 py-3 border-b">Submitter</th>
                  <th className="px-4 py-3 border-b">Date</th>
                  <th className="px-4 py-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(submissions ?? []).map((sub: {
                  id: string;
                  course_name: string;
                  city: string | null;
                  state: string | null;
                  country: string | null;
                  course_type: string | null;
                  holes: number | null;
                  submitter_email: string;
                  created_at: string;
                }) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900 text-xs">{sub.course_name}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500">
                      {[sub.city, sub.state, sub.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500">
                      {sub.course_type ?? '—'}
                      {sub.holes ? <span className="ml-1 text-gray-400">({sub.holes}h)</span> : null}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500 max-w-[160px] break-all">
                      {sub.submitter_email}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-400 whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <SubmissionButtons submissionId={sub.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
