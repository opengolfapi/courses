// System Health panel for /admin/dashboard.
//
// Surfaces operational signal that the content-focused dashboard above doesn't:
//   1. Cron job last-run + status (pg_cron.job_run_details)
//   2. security_audit_log drift in the last 7 days
//   3. Resend delivery stats (last 24h)
//   4. Sentry unresolved issues (gated on SENTRY_AUTH_TOKEN env)
//
// Renders server-side at request time. All four sections fetch in parallel.

import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SENTRY_ORG = 'dudeos';
const SENTRY_PROJECTS = ['opengolfapi-api', 'opengolfapi-courses', 'opengolfapi-mcp-server'];

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function ageHours(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000);
}

// ───── 1. cron job health ─────

type CronRow = {
  jobname: string;
  schedule: string;
  active: boolean;
  last_status: string | null;
  last_run: string | null;
  last_failure: string | null;
};

// Expected max-hours-since-run per cron (1.5x the schedule, with a minimum of 2h).
// If we exceed this, the job is overdue and we surface it red.
const CRON_OVERDUE_HOURS: Record<string, number> = {
  'signup-attempts-gc': 2,
  'api-key-milestones': 9,           // every 6h → red if >9h
  'verify-pending-edits-daily': 36,
  'api-key-grace-expiry': 36,
  'security-regression-daily': 36,
};

async function fetchCronHealth(): Promise<CronRow[]> {
  // pg_cron schema is readable by service_role on Supabase. Pull each job's
  // most recent run via a LATERAL join.
  const { data, error } = await adminSupabase.rpc('_admin_cron_health' as never).single();
  if (!error && data) return data as CronRow[];

  // Fallback: two separate queries if the helper RPC isn't installed yet.
  const { data: jobs } = await adminSupabase.from('cron.job' as never).select('jobid, jobname, schedule, active') as { data: Array<{ jobid: number; jobname: string; schedule: string; active: boolean }> | null };
  if (!jobs) return [];
  const rows: CronRow[] = [];
  for (const j of jobs) {
    const { data: runs } = await adminSupabase
      .from('cron.job_run_details' as never)
      .select('status, start_time')
      .eq('jobid', j.jobid)
      .order('start_time', { ascending: false })
      .limit(5) as { data: Array<{ status: string; start_time: string }> | null };
    const latest = runs?.[0];
    const lastFailure = runs?.find(r => r.status !== 'succeeded')?.start_time ?? null;
    rows.push({
      jobname: j.jobname,
      schedule: j.schedule,
      active: j.active,
      last_status: latest?.status ?? null,
      last_run: latest?.start_time ?? null,
      last_failure: lastFailure,
    });
  }
  return rows.sort((a, b) => a.jobname.localeCompare(b.jobname));
}

// ───── 2. security drift ─────

type DriftRow = {
  check_name: string;
  finding: string;
  count: number;
  last_at: string;
};

async function fetchSecurityDrift(): Promise<{ rows: DriftRow[]; lastFullSweep: string | null }> {
  const { data } = await adminSupabase
    .from('security_audit_log')
    .select('check_name, finding, ran_at')
    .gte('ran_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('ran_at', { ascending: false });
  if (!data) return { rows: [], lastFullSweep: null };

  const driftMap = new Map<string, DriftRow>();
  let lastFullSweep: string | null = null;
  for (const r of data) {
    if (r.check_name === 'full_sweep' && r.finding === 'ok') {
      if (!lastFullSweep || r.ran_at > lastFullSweep) lastFullSweep = r.ran_at;
      continue;
    }
    if (r.finding !== 'drift' && r.finding !== 'error') continue;
    const k = `${r.check_name}:${r.finding}`;
    const existing = driftMap.get(k);
    if (existing) {
      existing.count += 1;
      if (r.ran_at > existing.last_at) existing.last_at = r.ran_at;
    } else {
      driftMap.set(k, { check_name: r.check_name, finding: r.finding, count: 1, last_at: r.ran_at });
    }
  }
  return { rows: Array.from(driftMap.values()).sort((a, b) => b.last_at.localeCompare(a.last_at)), lastFullSweep };
}

// ───── 3. resend stats ─────

type ResendStats = {
  available: boolean;
  total24h: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
  recent: Array<{ subject: string; to: string; status: string; at: string }>;
};

async function fetchResendStats(): Promise<ResendStats> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { available: false, total24h: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, recent: [] };
  try {
    const res = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${key}` },
      // edge runtime: don't cache; we want a live read
      cache: 'no-store',
    });
    if (!res.ok) return { available: false, total24h: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, recent: [] };
    const body = await res.json() as { data?: Array<{ created_at: string; subject?: string; to?: string[]; last_event?: string }> };
    const all = body.data ?? [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const last24h = all.filter(e => new Date(e.created_at).getTime() >= cutoff);
    const count = (status: string) => last24h.filter(e => (e.last_event ?? '').toLowerCase() === status).length;
    return {
      available: true,
      total24h: last24h.length,
      delivered: count('delivered'),
      bounced: count('bounced'),
      complained: count('complained'),
      failed: last24h.filter(e => {
        const s = (e.last_event ?? '').toLowerCase();
        return s === 'failed' || s === 'rejected' || s === 'suppressed';
      }).length,
      recent: last24h.slice(0, 6).map(e => ({
        subject: (e.subject ?? '').slice(0, 80),
        to: (e.to?.[0] ?? '').slice(0, 64),
        status: e.last_event ?? 'unknown',
        at: e.created_at,
      })),
    };
  } catch {
    return { available: false, total24h: 0, delivered: 0, bounced: 0, complained: 0, failed: 0, recent: [] };
  }
}

// ───── 4. sentry issues ─────

type SentryStats = {
  available: boolean;
  perProject: Array<{ project: string; unresolved: number; topIssue: string | null }>;
};

async function fetchSentryStats(): Promise<SentryStats> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) return { available: false, perProject: [] };
  const perProject = await Promise.all(
    SENTRY_PROJECTS.map(async (proj) => {
      try {
        const url = `https://sentry.io/api/0/projects/${SENTRY_ORG}/${proj}/issues/?statsPeriod=24h&query=is:unresolved&limit=5`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return { project: proj, unresolved: 0, topIssue: null };
        const arr = await res.json() as Array<{ title?: string; count?: string }>;
        return {
          project: proj,
          unresolved: arr.length,
          topIssue: arr[0]?.title ?? null,
        };
      } catch {
        return { project: proj, unresolved: 0, topIssue: null };
      }
    }),
  );
  return { available: true, perProject };
}

// ───── component ─────

function HealthPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border rounded p-5" style={{ borderColor: 'var(--color-rule)' }}>
      <div className="mb-4">
        <h2 className="font-display font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'bad' | 'idle' }) {
  const color = tone === 'ok' ? '#10b981' : tone === 'warn' ? '#f59e0b' : tone === 'bad' ? '#dc2626' : '#9ca3af';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8 }} aria-label={tone} />;
}

export async function SystemHealth() {
  const [crons, drift, resend, sentry] = await Promise.all([
    fetchCronHealth(),
    fetchSecurityDrift(),
    fetchResendStats(),
    fetchSentryStats(),
  ]);

  return (
    <section className="mb-6">
      <h2 className="font-display font-bold text-lg mb-3">System health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CRONS */}
        <HealthPanel title="Cron jobs" subtitle={`${crons.length} scheduled, last 5 runs each`}>
          {crons.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>No cron data available.</p>
          ) : (
            <ul className="text-xs divide-y" style={{ borderColor: 'var(--color-rule)' }}>
              {crons.map(c => {
                const overdueAfter = CRON_OVERDUE_HOURS[c.jobname] ?? 36;
                const age = ageHours(c.last_run);
                const tone: 'ok' | 'warn' | 'bad' | 'idle' = !c.active ? 'idle'
                  : c.last_status === 'failed' ? 'bad'
                  : age > overdueAfter ? 'bad'
                  : age > overdueAfter * 0.6 ? 'warn'
                  : 'ok';
                return (
                  <li key={c.jobname} className="py-2 flex justify-between gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono"><StatusDot tone={tone} />{c.jobname}</div>
                      <div style={{ color: 'var(--color-ink-muted)' }} className="text-[10px] ml-4">
                        {c.schedule} {c.last_failure ? `· last failure ${relativeTime(c.last_failure)}` : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--color-ink-muted)' }} className="whitespace-nowrap">
                      {c.last_status ?? 'never run'} · {relativeTime(c.last_run)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </HealthPanel>

        {/* SECURITY DRIFT */}
        <HealthPanel
          title="Security regression"
          subtitle={drift.lastFullSweep ? `Last clean sweep ${relativeTime(drift.lastFullSweep)}` : 'No clean sweep on record in last 7d'}
        >
          {drift.rows.length === 0 ? (
            <p className="text-sm flex items-center" style={{ color: 'var(--color-ink-muted)' }}>
              <StatusDot tone="ok" />No drift detected in the last 7 days.
            </p>
          ) : (
            <ul className="text-xs divide-y" style={{ borderColor: 'var(--color-rule)' }}>
              {drift.rows.map((r, i) => (
                <li key={i} className="py-2 flex justify-between gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono"><StatusDot tone={r.finding === 'error' ? 'bad' : 'warn'} />{r.check_name}</div>
                    <div style={{ color: 'var(--color-ink-muted)' }} className="text-[10px] ml-4">
                      {r.count} occurrence{r.count > 1 ? 's' : ''} · finding: {r.finding}
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-ink-muted)' }} className="whitespace-nowrap">{relativeTime(r.last_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </HealthPanel>

        {/* RESEND */}
        <HealthPanel
          title="Email delivery (Resend)"
          subtitle={resend.available ? `${resend.total24h} sent in last 24h` : 'RESEND_API_KEY missing'}
        >
          {!resend.available ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>Set RESEND_API_KEY to enable.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div><span style={{ color: 'var(--color-ink-muted)' }}>delivered</span> <span className="font-bold tabular-nums">{resend.delivered}</span></div>
                <div><span style={{ color: 'var(--color-ink-muted)' }}>bounced</span> <span className="font-bold tabular-nums" style={{ color: resend.bounced > 0 ? '#dc2626' : 'inherit' }}>{resend.bounced}</span></div>
                <div><span style={{ color: 'var(--color-ink-muted)' }}>failed</span> <span className="font-bold tabular-nums" style={{ color: resend.failed > 0 ? '#dc2626' : 'inherit' }}>{resend.failed}</span></div>
              </div>
              <ul className="text-xs divide-y" style={{ borderColor: 'var(--color-rule)' }}>
                {resend.recent.map((e, i) => (
                  <li key={i} className="py-2 flex justify-between gap-3 items-center">
                    <div className="flex-1 min-w-0">
                      <div className="truncate"><StatusDot tone={e.status === 'delivered' ? 'ok' : e.status === 'bounced' || e.status === 'failed' ? 'bad' : 'warn'} />{e.subject || '(no subject)'}</div>
                      <div style={{ color: 'var(--color-ink-muted)' }} className="text-[10px] ml-4 truncate">{e.to}</div>
                    </div>
                    <div style={{ color: 'var(--color-ink-muted)' }} className="whitespace-nowrap">{relativeTime(e.at)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </HealthPanel>

        {/* SENTRY */}
        <HealthPanel
          title="Sentry"
          subtitle={sentry.available ? 'Unresolved issues in last 24h' : 'SENTRY_AUTH_TOKEN missing'}
        >
          {!sentry.available ? (
            <div className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              <p className="mb-2">Set <code className="font-mono">SENTRY_AUTH_TOKEN</code> as a Worker secret to enable.</p>
              <p>Create at <a href="https://dudeos.sentry.io/settings/auth-tokens/" className="underline" style={{ color: 'var(--color-evergreen)' }}>dudeos.sentry.io/settings/auth-tokens/</a> with scopes <code className="font-mono">org:read project:read event:read</code>.</p>
            </div>
          ) : (
            <ul className="text-xs divide-y" style={{ borderColor: 'var(--color-rule)' }}>
              {sentry.perProject.map(p => (
                <li key={p.project} className="py-2 flex justify-between gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono">
                      <StatusDot tone={p.unresolved === 0 ? 'ok' : p.unresolved > 5 ? 'bad' : 'warn'} />{p.project}
                    </div>
                    {p.topIssue && (
                      <div style={{ color: 'var(--color-ink-muted)' }} className="text-[10px] ml-4 truncate">top: {p.topIssue}</div>
                    )}
                  </div>
                  <div className="whitespace-nowrap font-bold tabular-nums">{p.unresolved}</div>
                </li>
              ))}
            </ul>
          )}
        </HealthPanel>

      </div>
    </section>
  );
}
