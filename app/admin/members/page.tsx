import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { MemberRowActions } from './member-row';
import { IssueKeyDialog } from './issue-key-dialog';
import type { ApiKeyTier } from './actions';

// Render at request time only — never statically. This page reads service-role
// data and would expose api_key metadata in static HTML otherwise.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Filter = 'all' | 'active' | 'revoked' | 'grace';

type ApiKeyRow = {
  id: string;
  key_prefix: string;
  email: string;
  name: string | null;
  tier: ApiKeyTier;
  daily_limit: number | null;
  oc_subscription_id: string | null;
  oc_order_id: string | null;
  tier_grace_until: string | null;
  total_requests: number | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  notes: string | null;
};

type AuditLogRow = {
  id: string;
  api_key_id: string | null;
  email: string | null;
  action: string;
  from_tier: ApiKeyTier | null;
  to_tier: ApiKeyTier | null;
  reason: string | null;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  revoked: 'Revoked',
  grace: 'In Grace',
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  try {
    const sp = await searchParams;
    const rawFilter = typeof sp.filter === 'string' ? sp.filter : 'all';
    const filter: Filter = (['all', 'active', 'revoked', 'grace'] as const).includes(
      rawFilter as Filter,
    )
      ? (rawFilter as Filter)
      : 'all';
    return await renderAdminMembersPage(filter);
  } catch (e) {
    console.error('AdminMembersPage render FAILED', {
      err: e instanceof Error ? { message: e.message, stack: e.stack } : e,
    });
    throw e;
  }
}

async function renderAdminMembersPage(filter: Filter) {
  const nowIso = new Date().toISOString();

  // Build the query with the filter applied at the DB layer where possible,
  // but pull the unfiltered tier-breakdown in parallel for the summary line.
  let query = adminSupabase
    .from('api_keys')
    .select(
      'id, key_prefix, email, name, tier, daily_limit, oc_subscription_id, oc_order_id, tier_grace_until, total_requests, last_used_at, created_at, revoked_at, notes',
    )
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter === 'active') {
    query = query.is('revoked_at', null);
  } else if (filter === 'revoked') {
    query = query.not('revoked_at', 'is', null);
  } else if (filter === 'grace') {
    query = query.is('revoked_at', null).gt('tier_grace_until', nowIso);
  }

  const [{ data: keys, error: keysError }, summaryRes, auditRes] = await Promise.all([
    query,
    adminSupabase
      .from('api_keys')
      .select('tier, revoked_at, tier_grace_until')
      .limit(10000),
    adminSupabase
      .from('api_key_audit_log')
      .select('id, api_key_id, email, action, from_tier, to_tier, reason, actor, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (keysError) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Admin — Members</h1>
        <p className="text-red-600">Error loading api_keys: {keysError.message}</p>
      </div>
    );
  }

  const allKeys = (summaryRes.data ?? []) as Array<Pick<ApiKeyRow, 'tier' | 'revoked_at' | 'tier_grace_until'>>;
  const activeKeys = allKeys.filter((k) => k.revoked_at === null);
  const tierCounts: Record<ApiKeyTier, number> = {
    keyed: 0,
    backer: 0,
    sponsor: 0,
    major_sponsor: 0,
    unlimited: 0,
  };
  for (const k of activeKeys) {
    if (k.tier in tierCounts) tierCounts[k.tier as ApiKeyTier] += 1;
  }
  const revokedCount = allKeys.length - activeKeys.length;
  const graceCount = activeKeys.filter(
    (k) => k.tier_grace_until !== null && new Date(k.tier_grace_until) > new Date(),
  ).length;

  const rows = (keys ?? []) as ApiKeyRow[];
  const audit = (auditRes.data ?? []) as AuditLogRow[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeKeys.length} active · {tierCounts.backer} backer{tierCounts.backer === 1 ? '' : 's'} · {tierCounts.sponsor} sponsor{tierCounts.sponsor === 1 ? '' : 's'} · {tierCounts.major_sponsor} major sponsor{tierCounts.major_sponsor === 1 ? '' : 's'} · {revokedCount} revoked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IssueKeyDialog />
          <a
            href="https://opencollective.com/opengolfapi/contributors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Open Collective contributors ↗
          </a>
          <a
            href="https://opencollective.com/opengolfapi/transactions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            OC transactions ↗
          </a>
          <Link href="/admin/dashboard" className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Dashboard</Link>
          <Link href="/admin/edits" className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Edits</Link>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Admin</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {(['all', 'active', 'revoked', 'grace'] as Filter[]).map((f) => {
          const isActive = f === filter;
          const count =
            f === 'all'
              ? allKeys.length
              : f === 'active'
                ? activeKeys.length
                : f === 'revoked'
                  ? revokedCount
                  : graceCount;
          return (
            <Link
              key={f}
              href={f === 'all' ? '/admin/members' : `/admin/members?filter=${f}`}
              className={
                isActive
                  ? 'px-3 py-1.5 text-xs font-semibold rounded bg-gray-900 text-white'
                  : 'px-3 py-1.5 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            >
              {FILTER_LABELS[f]} <span className="opacity-60 ml-1">{count}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          <p className="text-lg">No api_keys match this filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 border-b">Email</th>
                <th className="px-4 py-3 border-b">Prefix</th>
                <th className="px-4 py-3 border-b">Tier</th>
                <th className="px-4 py-3 border-b">Daily Limit</th>
                <th className="px-4 py-3 border-b">Total Requests</th>
                <th className="px-4 py-3 border-b">Last Used</th>
                <th className="px-4 py-3 border-b">OC Subscription</th>
                <th className="px-4 py-3 border-b">Status</th>
                <th className="px-4 py-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const status = computeStatus(row);
                return (
                  <tr key={row.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-xs max-w-[220px] break-all">
                      <div className="font-medium text-gray-900">{row.email}</div>
                      {row.name && (
                        <div className="text-gray-400 text-xs">{row.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {row.key_prefix}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span style={{ color: 'var(--color-ink-muted)' }} className="text-xs">
                        {row.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {row.daily_limit ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap font-mono">
                      {(row.total_requests ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {row.last_used_at ? formatRelative(row.last_used_at) : <span className="italic">never</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] break-all">
                      {row.oc_subscription_id ? (
                        <span className="font-mono">{row.oc_subscription_id}</span>
                      ) : (
                        <span className="italic text-gray-300">—</span>
                      )}
                      {row.oc_order_id && (
                        <div className="text-gray-400 text-xs mt-0.5">
                          order: <span className="font-mono">{row.oc_order_id}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <StatusBadge status={status} graceUntil={row.tier_grace_until} />
                    </td>
                    <td className="px-4 py-3">
                      <MemberRowActions
                        keyId={row.id}
                        email={row.email}
                        currentTier={row.tier}
                        isRevoked={row.revoked_at !== null}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent activity */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent activity</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last {audit.length} entries from api_key_audit_log
          </p>
        </div>
        {audit.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <p className="text-sm">No audit log entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 border-b">When</th>
                  <th className="px-4 py-3 border-b">Email</th>
                  <th className="px-4 py-3 border-b">Action</th>
                  <th className="px-4 py-3 border-b">From → To</th>
                  <th className="px-4 py-3 border-b">Actor</th>
                  <th className="px-4 py-3 border-b">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatRelative(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] break-all">
                      {row.email ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {row.from_tier || row.to_tier ? (
                        <span>
                          <span className="text-gray-400">{row.from_tier ?? '—'}</span>
                          <span className="mx-1 text-gray-300">→</span>
                          <span className="text-gray-700">{row.to_tier ?? '—'}</span>
                        </span>
                      ) : (
                        <span className="italic text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] break-all">
                      {row.actor ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[280px] break-words">
                      {row.reason ?? <span className="italic text-gray-300">—</span>}
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

type Status = 'active' | 'revoked' | 'grace';

function computeStatus(row: ApiKeyRow): Status {
  if (row.revoked_at) return 'revoked';
  if (row.tier_grace_until && new Date(row.tier_grace_until) > new Date()) return 'grace';
  return 'active';
}

function StatusBadge({ status, graceUntil }: { status: Status; graceUntil: string | null }) {
  if (status === 'revoked') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700">
        Revoked
      </span>
    );
  }
  if (status === 'grace') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-50 text-yellow-800"
        title={graceUntil ? `Grace until ${new Date(graceUntil).toLocaleString()}` : ''}
      >
        Grace
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-800">
      Active
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
