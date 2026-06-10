import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SystemHealth } from './system-health';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TIER_COLORS: Record<string, string> = {
  keyed: 'var(--color-ink-muted)',
  backer: 'var(--color-brass-700)',
  sponsor: 'var(--color-evergreen-700)',
  major_sponsor: 'var(--color-evergreen-950)',
  unlimited: '#7c3aed',
};

const TIER_LABEL: Record<string, string> = {
  keyed: 'Keyed (free)',
  backer: 'Backer ($10/mo)',
  sponsor: 'Sponsor ($50/mo)',
  major_sponsor: 'Major Sponsor ($250/mo)',
  unlimited: 'Unlimited (internal)',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function AdminDashboardPage() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    keysAll,
    pendingEditsRes,
    signupsTodayRes,
    editsTodayRes,
    recentEditsRes,
    recentKeysRes,
    recentClaimsRes,
    recentSubmissionsRes,
    verifierRecentRes,
    auditRes,
  ] = await Promise.all([
    adminSupabase
      .from('api_keys')
      .select('id, email, tier, total_requests, last_used_at, created_at, revoked_at, key_prefix'),
    adminSupabase
      .from('golf_course_edits')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    adminSupabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo),
    adminSupabase
      .from('golf_course_edits')
      .select('id, status', { count: 'exact' })
      .gte('created_at', dayAgo),
    adminSupabase
      .from('golf_course_edits')
      .select('id, editor_email, field_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('api_keys')
      .select('id, email, name, tier, key_prefix, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    adminSupabase
      .from('golf_course_claims')
      .select('id, claimant_email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    adminSupabase
      .from('golf_course_submissions')
      .select('id, course_name, submitter_email, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    adminSupabase
      .from('golf_edit_verifications')
      .select('id, source, verdict, confidence, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    adminSupabase
      .from('api_key_audit_log')
      .select('action, email, from_tier, to_tier, actor, reason, created_at')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const allKeys = keysAll.data ?? [];
  const activeKeys = allKeys.filter((k) => k.revoked_at === null);

  const tierCounts = activeKeys.reduce<Record<string, number>>((acc, k) => {
    acc[k.tier] = (acc[k.tier] ?? 0) + 1;
    return acc;
  }, {});

  const totalActiveKeys = activeKeys.length;
  const pendingEditsCount = pendingEditsRes.count ?? 0;
  const signupsToday = signupsTodayRes.count ?? 0;
  const editsToday = editsTodayRes.count ?? 0;
  const editsTodayRows = editsTodayRes.data ?? [];
  const editStatusBreakdown = editsTodayRows.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalRequests = activeKeys.reduce((sum, k) => sum + (k.total_requests ?? 0), 0);
  const topConsumers = [...activeKeys]
    .filter((k) => (k.total_requests ?? 0) > 0)
    .sort((a, b) => (b.total_requests ?? 0) - (a.total_requests ?? 0))
    .slice(0, 8);

  // Build a unified activity feed
  type FeedEvent = { kind: string; at: string; line: string; sublabel?: string; href?: string };
  const feed: FeedEvent[] = [];
  for (const e of recentEditsRes.data ?? []) {
    feed.push({
      kind: 'edit',
      at: e.created_at,
      line: `Edit ${e.field_name} (${e.status})`,
      sublabel: e.editor_email,
      href: `/admin/edits?focus=${e.id}`,
    });
  }
  for (const k of recentKeysRes.data ?? []) {
    feed.push({
      kind: 'signup',
      at: k.created_at,
      line: `New key: ${TIER_LABEL[k.tier] ?? k.tier}${k.name ? ` · ${k.name}` : ''}`,
      sublabel: k.email,
      href: `/admin/members`,
    });
  }
  for (const c of recentClaimsRes.data ?? []) {
    feed.push({
      kind: 'claim',
      at: c.created_at,
      line: `Course claim (${c.status})`,
      sublabel: c.claimant_email,
    });
  }
  for (const s of recentSubmissionsRes.data ?? []) {
    feed.push({
      kind: 'submission',
      at: s.created_at,
      line: `Course submission: ${s.course_name}`,
      sublabel: s.submitter_email,
    });
  }
  feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const feedTrimmed = feed.slice(0, 30);

  const verifierRows = verifierRecentRes.data ?? [];
  const verifierLastRun = verifierRows[0]?.created_at;
  const verifierBreakdown = verifierRows.reduce<Record<string, number>>((acc, v) => {
    acc[v.verdict] = (acc[v.verdict] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-10" style={{ color: 'var(--color-ink)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-display italic text-[14px] mb-1" style={{ color: 'var(--color-brass-700)' }}>War room</p>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/admin/edits" className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Edits</Link>
          <Link href="/admin/members" className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Members</Link>
          <span className="px-3 py-1 rounded-full text-gray-400 bg-gray-100">Admin</span>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Counter label="Active keys" value={totalActiveKeys} sublabel={`${(allKeys.length - totalActiveKeys)} revoked`} />
        <Counter label="Pending edits" value={pendingEditsCount} sublabel="Need review" emphasize={pendingEditsCount > 0} />
        <Counter label="Signups (24h)" value={signupsToday} sublabel="New keys" />
        <Counter label="Edits (24h)" value={editsToday} sublabel={Object.entries(editStatusBreakdown).map(([s, n]) => `${n} ${s}`).join(' · ') || '—'} />
      </div>

      {/* System Health — cron, security drift, email delivery, Sentry */}
      <SystemHealth />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Tier breakdown */}
        <Panel title="Tier breakdown" subtitle={`${totalActiveKeys} active keys · ${totalRequests.toLocaleString()} total requests`}>
          {totalActiveKeys === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No active keys yet.</p>
          ) : (
            <ul className="space-y-2">
              {(['keyed', 'backer', 'sponsor', 'major_sponsor', 'unlimited'] as const).map((tier) => {
                const count = tierCounts[tier] ?? 0;
                const pct = totalActiveKeys > 0 ? (count / totalActiveKeys) * 100 : 0;
                return (
                  <li key={tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--color-ink-muted)' }}>{TIER_LABEL[tier]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div style={{ background: 'var(--color-cream-darker)', borderRadius: 2, height: 6 }}>
                      <div style={{ background: TIER_COLORS[tier], width: `${pct}%`, height: '100%', borderRadius: 2 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Verifier */}
        <Panel
          title="Verifier"
          subtitle={verifierLastRun ? `Last run ${relativeTime(verifierLastRun)}` : 'No runs yet'}
        >
          {verifierRows.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Verifier hasn&apos;t run yet. Cron fires nightly at 02:00 UTC.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {Object.entries(verifierBreakdown).map(([verdict, n]) => (
                <li key={verdict} className="flex justify-between">
                  <span style={{ color: 'var(--color-ink-muted)' }}>{verdict}</span>
                  <span className="font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] mt-3" style={{ color: 'var(--color-ink-muted)' }}>
            Last 10 verifications across all sources.
          </p>
        </Panel>

        {/* Top consumers */}
        <Panel title="Top consumers" subtitle="By total requests">
          {topConsumers.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No usage yet.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {topConsumers.map((k) => (
                <li key={k.id} className="flex justify-between gap-2">
                  <span className="truncate" title={k.email}>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-ink-muted)' }}>{k.key_prefix}</span>{' '}
                    <span>{k.email}</span>
                  </span>
                  <span className="font-medium whitespace-nowrap">{(k.total_requests ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Activity feed */}
      <Panel title="Recent activity" subtitle="Last 30 events across edits, signups, claims, submissions">
        {feedTrimmed.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No activity yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-rule)' }}>
            {feedTrimmed.map((ev, i) => {
              const dot = ev.kind === 'signup' ? 'var(--color-evergreen-700)' :
                          ev.kind === 'edit' ? 'var(--color-brass-700)' :
                          ev.kind === 'claim' ? '#7c3aed' : 'var(--color-ink-muted)';
              const inner = (
                <div className="flex items-start gap-3 py-2.5">
                  <div style={{ background: dot, width: 6, height: 6, borderRadius: '50%', marginTop: 7, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{ev.line}</div>
                    {ev.sublabel && (
                      <div className="text-xs truncate" style={{ color: 'var(--color-ink-muted)' }}>{ev.sublabel}</div>
                    )}
                  </div>
                  <div className="text-xs whitespace-nowrap" style={{ color: 'var(--color-ink-muted)' }}>{relativeTime(ev.at)}</div>
                </div>
              );
              return (
                <li key={i}>
                  {ev.href ? <Link href={ev.href} className="block hover:bg-gray-50">{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Audit log of admin/system tier changes */}
      <Panel title="Tier change activity" subtitle="Last 7 days">
        {(auditRes.data ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No tier changes in the last 7 days.</p>
        ) : (
          <ul className="text-xs divide-y" style={{ borderColor: 'var(--color-rule)' }}>
            {(auditRes.data ?? []).map((a, i) => (
              <li key={i} className="py-2 flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-mono">{a.action}</div>
                  <div style={{ color: 'var(--color-ink-muted)' }} className="truncate">
                    {a.email} {a.from_tier && a.to_tier && a.from_tier !== a.to_tier ? `· ${a.from_tier} → ${a.to_tier}` : ''} {a.reason ? `· ${a.reason}` : ''}
                  </div>
                </div>
                <div style={{ color: 'var(--color-ink-muted)' }} className="whitespace-nowrap">{a.actor} · {relativeTime(a.created_at)}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Counter({ label, value, sublabel, emphasize }: { label: string; value: number; sublabel?: string; emphasize?: boolean }) {
  return (
    <div className="border rounded p-4" style={{ borderColor: 'var(--color-rule)', background: emphasize && value > 0 ? 'var(--color-cream-darker)' : 'transparent' }}>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-ink-muted)' }}>{label}</div>
      <div className="font-display text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
      {sublabel && <div className="text-xs mt-1" style={{ color: 'var(--color-ink-muted)' }}>{sublabel}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border rounded p-5 mb-6" style={{ borderColor: 'var(--color-rule)' }}>
      <div className="mb-4">
        <h2 className="font-display font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
