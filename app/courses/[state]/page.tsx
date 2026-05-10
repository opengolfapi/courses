import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStateName } from "@/lib/states";

type Props = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state);
  return {
    title: `Golf Courses in ${stateName}`,
    description: `Every golf course in ${stateName} — with scorecards, tees, and player-submitted corrections.`,
  };
}

export default async function StatePage({ params }: Props) {
  const { state } = await params;
  const code = state.toUpperCase();
  const stateName = getStateName(state);

  const [coursesRes, recentRes, claimedRes] = await Promise.all([
    supabase
      .from("golf_courses")
      .select("id, slug, course_name, city, course_type, par_total, total_yardage, year_built, architect")
      .eq("state", code)
      .order("course_name"),
    supabase
      .from("golf_course_edits")
      .select("course_id, field_name, reviewed_at, golf_courses!inner(course_name, state, slug)")
      .eq("golf_courses.state", code)
      .in("status", ["approved", "auto_approved"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(6),
    supabase
      .from("golf_course_claims")
      .select("course_id, golf_courses!inner(id, slug, course_name, city, course_type, state)")
      .eq("status", "approved")
      .eq("golf_courses.state", code)
      .limit(6),
  ]);

  const courses = coursesRes.data ?? [];
  const recent = ((recentRes.data ?? []) as unknown) as Array<{
    course_id: string;
    field_name: string;
    reviewed_at: string;
    golf_courses: { course_name: string; state: string; slug: string | null } | null;
  }>;
  const claimed = ((claimedRes.data ?? []) as unknown) as Array<{
    course_id: string;
    golf_courses: { id: string; slug: string | null; course_name: string; city: string | null; course_type: string | null };
  }>;

  if (courses.length === 0) {
    return (
      <div className="max-w-[880px] mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold mb-3">No courses in {stateName} yet</h1>
        <p className="mb-8" style={{ color: "var(--color-ink-muted)" }}>Help us build out coverage — submit the first one.</p>
        <Link href="/submit" className="px-5 py-2.5 rounded font-semibold inline-block" style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}>
          Submit a course
        </Link>
      </div>
    );
  }

  // Cities sorted by course count
  const cityCounts = new Map<string, number>();
  for (const c of courses) {
    if (c.city) cityCounts.set(c.city, (cityCounts.get(c.city) ?? 0) + 1);
  }
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  const publicCourses = courses.filter((c) => /public|municipal|resort|semi/i.test(c.course_type ?? "")).length;
  const privateCourses = courses.filter((c) => /private/i.test(c.course_type ?? "")).length;

  // Slug for HTML/CSS-safe anchor IDs — encodeURIComponent leaves %20 which Firefox
  // doesn't navigate to (fragment is decoded before lookup). Use a-z0-9 + hyphen only.
  const citySlug = (city: string) =>
    city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div>
      {/* HEADER */}
      <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-10 border-b" style={{ borderColor: "var(--color-cream-darkest)" }}>
        <div className="flex items-baseline gap-3 text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span>{stateName}</span>
        </div>
        <h1 className="font-display font-bold tracking-tight mb-3" style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.05 }}>
          Golf in <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>{stateName}.</em>
        </h1>
        <p className="text-lg max-w-[600px]" style={{ color: "var(--color-ink-muted)" }}>
          A mix of public, private, semi-private, and resort courses across {stateName}.
        </p>
      </section>

      {/* CLAIMED / OWNER-VERIFIED — if any */}
      {claimed.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 py-12">
          <p className="font-display italic text-[14px] mb-2" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
            Verified by their owners
          </p>
          <h2 className="font-display text-[24px] sm:text-[32px] font-bold mb-6">Claimed courses.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {claimed.map((c) => (
              <Link
                key={`${c.course_id}-${c.golf_courses.id}`}
                href={`/courses/${state}/${c.golf_courses.slug ?? c.golf_courses.id}`}
                className="block border rounded-lg p-4 hover:shadow-sm transition"
                style={{ background: "white", borderColor: "var(--color-cream-darkest)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[15px]" style={{ color: "var(--color-evergreen-950)" }}>{c.golf_courses.course_name}</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "var(--color-evergreen-600)", color: "white" }}>✓ Owner</span>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--color-ink-muted)" }}>{c.golf_courses.city ?? "—"} · {c.golf_courses.course_type ?? "Course"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* RECENT EDITS — log */}
      {recent.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 py-10">
          <p className="font-display italic text-[14px] mb-2" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
            Editor's log
          </p>
          <h2 className="font-display text-[24px] sm:text-[32px] font-bold mb-6">Recently corrected in {stateName}.</h2>
          <ul className="space-y-2 text-[15px]">
            {recent.map((e) => (
              <li key={`${e.course_id}-${e.field_name}-${e.reviewed_at}`} className="flex items-baseline gap-3">
                <span className="font-mono text-xs" style={{ color: "var(--color-ink-muted)" }}>{new Date(e.reviewed_at).toISOString().slice(5, 10)}</span>
                <Link href={`/courses/${state}/${e.golf_courses?.slug ?? e.course_id}`} className="font-semibold" style={{ color: "var(--color-evergreen-950)" }}>
                  {e.golf_courses?.course_name ?? "Course"}
                </Link>
                <span style={{ color: "var(--color-ink-muted)" }}>· {e.field_name.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* BY CITY */}
      {topCities.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-6 py-10">
          <p className="font-display italic text-[14px] mb-2" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>By city</p>
          <h2 className="font-display text-[24px] sm:text-[32px] font-bold mb-6">Where they cluster.</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {topCities.map(([city, count]) => (
              <a key={city} href={`#city-${citySlug(city)}`} className="px-3 py-1.5 rounded-full border hover:bg-white" style={{ borderColor: "var(--color-cream-darkest)" }}>
                {city} <span className="font-mono text-xs ml-1" style={{ color: "var(--color-ink-muted)" }}>{count}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ALPHABETICAL TABLE */}
      <section className="max-w-[1100px] mx-auto px-6 py-12">
        <h2 className="font-display text-[24px] sm:text-[32px] font-bold mb-6">All courses, alphabetical.</h2>
        <div className="overflow-x-auto">
          <table className="almanac-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>City</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Par</th>
                <th style={{ textAlign: "right" }}>Yards</th>
                <th>Architect</th>
                <th style={{ textAlign: "right" }}>Built</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} id={c.city ? `city-${citySlug(c.city)}` : undefined}>
                  <td>
                    <Link href={`/courses/${state}/${c.slug ?? c.id}`} className="font-semibold" style={{ color: "var(--color-evergreen-950)" }}>
                      {c.course_name}
                    </Link>
                  </td>
                  <td style={{ color: "var(--color-ink-muted)" }}>{c.city ?? "—"}</td>
                  <td style={{ color: "var(--color-ink-muted)" }}>{c.course_type ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{c.par_total ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{c.total_yardage?.toLocaleString("en-US") ?? "—"}</td>
                  <td style={{ color: "var(--color-ink-muted)" }}>{c.architect ?? "—"}</td>
                  <td style={{ textAlign: "right", color: "var(--color-ink-muted)" }}>{c.year_built ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
