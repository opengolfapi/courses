import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Revalidate the homepage once an hour — state counts shift slowly and we
// want every visitor to see the latest "Recently corrected" log + counts.
export const revalidate = 3600;

export default async function Home() {
  const [recentRes, stateRowsRes] = await Promise.all([
    supabase
      .from("golf_course_edits")
      .select("course_id, field_name, reviewed_at, golf_courses(course_name, state, slug)")
      .in("status", ["approved", "auto_approved"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(8),
    supabase
      .from("golf_courses")
      .select("state")
      .not("state", "is", null),
  ]);

  const recent = ((recentRes.data ?? []) as unknown) as Array<{
    course_id: string;
    field_name: string;
    reviewed_at: string;
    golf_courses: { course_name: string; state: string; slug: string | null } | null;
  }>;

  // Aggregate per-state course counts and pre-compute a font-weight bucket
  // for each so the state grid reads as a typographic heatmap — the states
  // with more courses get a heavier Public Sans wght axis, the smallest
  // ones stay light. Cohesive, no extra chrome.
  const stateCounts: Record<string, number> = {};
  for (const row of (stateRowsRes.data ?? []) as Array<{ state: string }>) {
    if (!row?.state) continue;
    stateCounts[row.state] = (stateCounts[row.state] ?? 0) + 1;
  }
  const allCounts = Object.values(stateCounts);
  const maxStateCount = allCounts.length ? Math.max(...allCounts) : 1;
  const minStateCount = allCounts.length ? Math.min(...allCounts) : 0;
  const weightForCount = (n: number): number => {
    if (maxStateCount === minStateCount) return 500;
    const t = (n - minStateCount) / (maxStateCount - minStateCount);
    // Bias the curve so the tail (TX/FL/CA) really pops vs the middle.
    return Math.round(400 + Math.pow(t, 0.55) * 400);
  };

  return (
    <div>
      {/* HERO — editorial, restrained */}
      <section className="max-w-[880px] mx-auto px-6 pt-24 pb-16 text-center">
        <p className="font-display italic text-[15px] mb-4" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
          The open almanac of American golf
        </p>
        <h1 className="font-display font-bold tracking-tight leading-[1.05] mb-6" style={{ fontSize: "clamp(40px, 6.5vw, 78px)" }}>
          Every course, <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>scored.</em>
        </h1>
        <p className="text-lg max-w-[600px] mx-auto mb-9" style={{ color: "var(--color-ink-muted)" }}>
          Browse thousands of US golf courses. Real scorecards, real tee data, claimed by their owners and corrected by their players.
        </p>

        {/* Search bar */}
        <Link
          href="/search"
          className="inline-flex items-center w-full max-w-[560px] mx-auto rounded-md border px-5 py-3.5 text-left transition"
          style={{ background: "white", borderColor: "var(--color-cream-darkest)" }}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: "var(--color-ink-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span style={{ color: "var(--color-ink-muted)" }}>Search by course name, city, or state…</span>
        </Link>

        <div className="flex justify-center gap-4 mt-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          <Link href="/near-me" className="hover:underline">Find courses near me →</Link>
          <span>·</span>
          <Link href="/submit" className="hover:underline">Add a missing course</Link>
        </div>
      </section>

      {/* RECENT EDITS — HN-style log */}
      {recent.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 py-16">
          <p className="font-display italic text-[14px] mb-2" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
            Editor's log
          </p>
          <h2 className="font-display text-[28px] sm:text-[36px] font-bold mb-8 max-w-[600px]">Recently corrected.</h2>
          <ul className="space-y-2 text-[15px]">
            {recent.map((e) => (
              <li key={`${e.course_id}-${e.field_name}-${e.reviewed_at}`} className="flex items-baseline gap-3">
                <span className="font-mono text-xs" style={{ color: "var(--color-ink-muted)" }}>
                  {new Date(e.reviewed_at).toISOString().slice(5, 10)}
                </span>
                {e.golf_courses ? (
                  <Link
                    href={`/courses/${e.golf_courses.state}/${e.golf_courses.slug ?? e.course_id}`}
                    className="font-semibold"
                    style={{ color: "var(--color-evergreen-950)" }}
                  >
                    {e.golf_courses.course_name}
                  </Link>
                ) : (
                  <span style={{ color: "var(--color-ink-muted)" }}>(deleted)</span>
                )}
                <span style={{ color: "var(--color-ink-muted)" }}>· {e.field_name.replace(/_/g, " ")} updated</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* BROWSE BY STATE — alphabetic, dense */}
      <section className="max-w-[1100px] mx-auto px-6 py-16">
        <p className="font-display italic text-[14px] mb-2" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
          By geography
        </p>
        <h2 className="font-display text-[28px] sm:text-[36px] font-bold mb-2 max-w-[600px]">Browse by state.</h2>
        <p className="text-sm mb-7 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
          Bar weight tracks how many courses each state has — Texas and Florida lean heavy, Alaska and Vermont light.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-x-2 gap-y-1">
          {[
            "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
            "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
            "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
            "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
            "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
          ].map((st) => {
            const n = stateCounts[st] ?? 0;
            const w = weightForCount(n);
            return (
              <Link
                key={st}
                href={`/courses/${st.toLowerCase()}`}
                className="px-2 py-1.5 rounded text-center hover:bg-white transition-colors flex items-baseline justify-between gap-1.5"
                style={{ color: "var(--color-ink)" }}
                aria-label={`${st} — ${n} course${n === 1 ? "" : "s"}`}
              >
                <span className="font-mono text-sm" style={{ fontVariationSettings: `"wght" ${w}` }}>{st}</span>
                <span className="text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>{n}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CONTRIBUTE CALLOUT — owner + community */}
      <section className="max-w-[1100px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-8" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <p className="font-display italic text-[13px] mb-2" style={{ color: "var(--color-brass-700)" }}>For course owners</p>
          <h3 className="font-display text-2xl font-bold mb-3">Claim your course.</h3>
          <p className="mb-4 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
            If you run a course, you can claim its page and control rates, hours, and policies. We don&apos;t gatekeep your own data.
          </p>
          <Link href="/search" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>
            Find your course →
          </Link>
        </div>
        <div className="border rounded-lg p-8" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <p className="font-display italic text-[13px] mb-2" style={{ color: "var(--color-brass-700)" }}>For golfers</p>
          <h3 className="font-display text-2xl font-bold mb-3">See something wrong?</h3>
          <p className="mb-4 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
            Phone changed, scorecard wrong, course renamed — every page has an edit button. Submit a correction and our verifier cross-checks against multiple sources.
          </p>
          <Link href="/search" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>
            Find a course to correct →
          </Link>
        </div>
      </section>
    </div>
  );
}

