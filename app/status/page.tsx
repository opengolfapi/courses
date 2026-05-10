import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Status",
  description:
    "Live health check of OpenGolfAPI services — API, courses site, marketing site, database.",
};

// Live checks on every visit. Never cache, never prerender.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type CheckState = "operational" | "degraded" | "down";

type Check = {
  name: string;
  description: string;
  state: CheckState;
  ms: number;
  detail: string;
  checkedAt: string;
};

const TIMEOUT_MS = 5000;

async function checkHttp(
  name: string,
  description: string,
  url: string,
  method: "HEAD" | "GET",
): Promise<Check> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { "User-Agent": "OpenGolfAPI-Status/1.0" },
    });
    const ms = Date.now() - start;
    if (res.ok) {
      return {
        name,
        description,
        state: ms > 2000 ? "degraded" : "operational",
        ms,
        detail: `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      name,
      description,
      state: res.status >= 500 ? "down" : "degraded",
      ms,
      detail: `HTTP ${res.status}`,
      checkedAt,
    };
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      name,
      description,
      state: "down",
      ms,
      detail: msg.includes("aborted") ? `Timeout after ${TIMEOUT_MS}ms` : msg,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkSupabasePing(): Promise<Check> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      name: "Supabase connection",
      description: "Service role can reach the database",
      state: "down",
      ms: 0,
      detail: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      checkedAt,
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Hitting the auth health endpoint proves Supabase is reachable on the
    // service-role plane without depending on any specific table.
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const ms = Date.now() - start;
    if (res.ok) {
      return {
        name: "Supabase connection",
        description: "Service role can reach the database",
        state: ms > 1500 ? "degraded" : "operational",
        ms,
        detail: `HTTP ${res.status}`,
        checkedAt,
      };
    }
    return {
      name: "Supabase connection",
      description: "Service role can reach the database",
      state: "down",
      ms,
      detail: `HTTP ${res.status}`,
      checkedAt,
    };
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      name: "Supabase connection",
      description: "Service role can reach the database",
      state: "down",
      ms,
      detail: msg.includes("aborted") ? `Timeout after ${TIMEOUT_MS}ms` : msg,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkApiKeysTable(): Promise<Check> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      name: "Postgres / RPC layer",
      description: "api_keys table is queryable",
      state: "down",
      ms: 0,
      detail: "Missing Supabase env",
      checkedAt,
    };
  }
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const queryPromise = client
      .from("api_keys")
      .select("*", { count: "exact", head: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout after ${TIMEOUT_MS}ms`)),
        TIMEOUT_MS,
      ),
    );
    const result = (await Promise.race([
      queryPromise,
      timeoutPromise,
    ])) as Awaited<typeof queryPromise>;
    const ms = Date.now() - start;
    if (result.error) {
      return {
        name: "Postgres / RPC layer",
        description: "api_keys table is queryable",
        state: "down",
        ms,
        detail: result.error.message,
        checkedAt,
      };
    }
    return {
      name: "Postgres / RPC layer",
      description: "api_keys table is queryable",
      state: ms > 1500 ? "degraded" : "operational",
      ms,
      detail: `count=${result.count ?? 0}`,
      checkedAt,
    };
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      name: "Postgres / RPC layer",
      description: "api_keys table is queryable",
      state: "down",
      ms,
      detail: msg,
      checkedAt,
    };
  }
}

const STATE_COLOR: Record<CheckState, string> = {
  operational: "var(--color-evergreen-600)",
  degraded: "var(--color-brass-500)",
  down: "var(--color-warn)",
};

const STATE_LABEL: Record<CheckState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

const STATE_GLYPH: Record<CheckState, string> = {
  operational: "OK",
  degraded: "DEG",
  down: "DOWN",
};

function StatusDot({ state }: { state: CheckState }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 999,
        background: STATE_COLOR[state],
        marginRight: 8,
        verticalAlign: "middle",
      }}
    />
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default async function StatusPage() {
  const results = await Promise.allSettled([
    checkHttp(
      "REST API",
      "api.opengolfapi.org responds",
      "https://api.opengolfapi.org/",
      "HEAD",
    ),
    checkHttp(
      "Courses site",
      "courses.opengolfapi.org responds",
      "https://courses.opengolfapi.org/",
      "HEAD",
    ),
    checkHttp(
      "Marketing site",
      "opengolfapi.org responds",
      "https://opengolfapi.org/",
      "GET",
    ),
    checkSupabasePing(),
    checkApiKeysTable(),
  ]);

  const checks: Check[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const fallbackNames = [
      "REST API",
      "Courses site",
      "Marketing site",
      "Supabase connection",
      "Postgres / RPC layer",
    ];
    return {
      name: fallbackNames[i] ?? "Check",
      description: "—",
      state: "down" as const,
      ms: 0,
      detail: r.reason instanceof Error ? r.reason.message : String(r.reason),
      checkedAt: new Date().toISOString(),
    };
  });

  const downCount = checks.filter((c) => c.state === "down").length;
  const degradedCount = checks.filter((c) => c.state === "degraded").length;
  const overall: CheckState =
    downCount >= 3
      ? "down"
      : downCount > 0 || degradedCount > 0
        ? "degraded"
        : "operational";
  const overallHeadline =
    downCount >= 3
      ? "Major outage."
      : downCount > 0 || degradedCount > 0
        ? "Some services degraded."
        : "All systems operational.";

  return (
    <div className="max-w-[860px] mx-auto px-6 pt-12 pb-16">
      <p
        className="font-display italic text-[15px] mb-3"
        style={{
          color: "var(--color-brass-700)",
          fontVariationSettings: '"opsz" 14',
        }}
      >
        Live health check
      </p>
      <h1
        className="font-display tracking-tight font-bold mb-5"
        style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}
      >
        <em style={{ color: STATE_COLOR[overall], fontStyle: "italic" }}>
          {overallHeadline.replace(/\.$/, "")}
        </em>
        <span style={{ color: "var(--color-ink)" }}>.</span>
      </h1>
      <p
        className="text-lg mb-10 max-w-[640px]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Five checks ran when you loaded this page. Each had a {TIMEOUT_MS / 1000}-second
        timeout. Below is what came back.
      </p>

      <div
        className="border rounded-sm overflow-hidden mb-6"
        style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}
      >
        <table className="almanac-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Response</th>
              <th>Detail</th>
              <th>Checked</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.name}>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    {c.name}
                  </div>
                  <div
                    style={{ color: "var(--color-ink-muted)", fontSize: 12 }}
                  >
                    {c.description}
                  </div>
                </td>
                <td>
                  <StatusDot state={c.state} />
                  <span style={{ color: STATE_COLOR[c.state], fontWeight: 600 }}>
                    {STATE_LABEL[c.state]}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    [{STATE_GLYPH[c.state]}]
                  </span>
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--color-ink)",
                  }}
                >
                  {c.ms}ms
                </td>
                <td
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  {c.detail}
                </td>
                <td style={{ color: "var(--color-ink-muted)", fontSize: 12 }}>
                  {formatTime(c.checkedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        This page checks live status on every visit. For a public status page
        with historical uptime, see{" "}
        <a
          href="https://status.opengolfapi.org"
          className="underline"
          rel="noopener"
        >
          status.opengolfapi.org
        </a>{" "}
        (coming soon).
      </p>
    </div>
  );
}
