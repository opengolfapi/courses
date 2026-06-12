import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStateName } from "@/lib/states";
import { TeeSelector } from "./tee-selector";
import CourseMap from "./course-map";
import ClaimForm from "./claim-form";
import EditForm from "./edit-form";
import LocationEditor from "./location-editor";
import ScorecardEditor from "./scorecard-editor";
import { OwnerBanner } from "@/app/(site)/components/owner-banner";
import { DLRow } from "@/app/(site)/components/dl-row";

type Props = {
  params: Promise<{ state: string; slug: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCourse(
  state: string,
  slugOrId: string,
): Promise<{ courseId: string; canonicalSlug: string | null } | null> {
  if (UUID_RE.test(slugOrId)) {
    const { data } = await supabase
      .from("golf_courses")
      .select("id, slug")
      .eq("id", slugOrId)
      .single();
    return data
      ? { courseId: data.id as string, canonicalSlug: (data.slug as string | null) ?? null }
      : null;
  } else {
    // Slugs are unique per-state (migration 017), so filter by state too
    const { data } = await supabase
      .from("golf_courses")
      .select("id, slug")
      .eq("state", state.toUpperCase())
      .eq("slug", slugOrId)
      .single();
    return data
      ? { courseId: data.id as string, canonicalSlug: (data.slug as string | null) ?? null }
      : null;
  }
}

async function getCourseData(id: string) {
  const [
    courseRes, teesRes, holesRes, hazardsRes, climateRes, nearbyRes, editsRes,
    ownerClaimsRes, appliedEditsRes,
  ] = await Promise.all([
    supabase.from("golf_courses").select("*").eq("id", id).single(),
    supabase
      .from("golf_course_tees")
      .select("*")
      .eq("course_id", id)
      .order("total_yardage", { ascending: false }),
    supabase
      .from("golf_course_holes")
      .select("*")
      .eq("course_id", id)
      .order("hole_number"),
    supabase.from("golf_course_hazards").select("*").eq("course_id", id),
    supabase
      .from("golf_course_climate")
      .select("*")
      .eq("course_id", id)
      .maybeSingle(),
    supabase
      .from("golf_course_nearby")
      .select("*")
      .eq("course_id", id)
      .order("distance_miles")
      .limit(20),
    supabase
      .from("golf_course_edits")
      .select("id, field_name, created_at")
      .eq("course_id", id)
      .in("status", ["approved", "auto_approved"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("golf_course_claims")
      .select("claimant_email")
      .eq("course_id", id)
      .eq("status", "approved"),
    supabase
      .from("golf_course_edits")
      .select("field_name, reviewed_by, reviewed_at")
      .eq("course_id", id)
      .in("status", ["approved", "auto_approved"])
      .order("reviewed_at", { ascending: false }),
  ]);

  // Build per-field map of most-recent reviewer (for Owner verified badge)
  const fieldReviewers = new Map<string, string | null>();
  for (const e of (appliedEditsRes.data ?? []) as Array<{ field_name: string; reviewed_by: string | null }>) {
    if (!fieldReviewers.has(e.field_name)) fieldReviewers.set(e.field_name, e.reviewed_by);
  }

  return {
    course: courseRes.data,
    tees: teesRes.data ?? [],
    holes: holesRes.data ?? [],
    hazards: hazardsRes.data ?? [],
    climate: climateRes.data,
    nearby: nearbyRes.data ?? [],
    recentEdits: editsRes.data ?? [],
    verifiedOwnerEmails: (ownerClaimsRes.data ?? []).map(c => c.claimant_email as string),
    fieldReviewers,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, slug } = await params;
  const found = await resolveCourse(state, slug);
  if (!found) return { title: "Course Not Found" };
  const { course, tees } = await getCourseData(found.courseId);

  if (!course) {
    return { title: "Course Not Found" };
  }

  const topTee = tees[0];
  const ratingStr = topTee
    ? ` ${topTee.tee_name} tees: ${topTee.course_rating}/${topTee.slope_rating}.`
    : "";
  const parStr = course.par_total ? `Par ${course.par_total}` : "";
  const yardStr = course.total_yardage
    ? `${course.total_yardage.toLocaleString()} yards`
    : "";
  const details = [parStr, yardStr].filter(Boolean).join(", ");
  const canonical = `https://courses.opengolfapi.org/courses/${state}/${found.canonicalSlug ?? found.courseId}`;

  // Thin-content gate: non-US stubs stay noindex,follow until they earn enough
  // substance to index (scorecard or par+yardage+a contact signal). US pages are
  // never gated — they're complete enough and already indexed.
  const isUS = !course.country || course.country === "United States";
  const hasSubstance =
    (course.par_total != null && course.total_yardage != null) ||
    tees.length > 0;
  const indexable = isUS || hasSubstance;

  return {
    title: `${course.course_name} - ${course.city}, ${course.state}`,
    description: `${course.course_name} in ${course.city}, ${course.state}. ${details}.${ratingStr} Full scorecard, tee data, and nearby courses.`,
    alternates: { canonical },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${course.course_name} - ${course.city}, ${course.state} | OpenGolfAPI`,
      description: `${details}.${ratingStr}`,
      url: canonical,
      type: "website",
    },
  };
}

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default async function CourseDetailPage({ params }: Props) {
  const { state, slug } = await params;
  const found = await resolveCourse(state, slug);
  if (!found) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
        <p className="text-gray-500 mb-8">The course you are looking for does not exist.</p>
        <Link
          href={`/courses/${state}`}
          className="text-evergreen-700 hover:text-evergreen-800 font-medium"
        >
          Back to {getStateName(state)} courses
        </Link>
      </div>
    );
  }
  // 301-redirect UUID URLs to canonical slug URLs
  if (UUID_RE.test(slug) && found.canonicalSlug) {
    redirect(`/courses/${state}/${found.canonicalSlug}`);
  }
  const courseId = found.courseId;
  const canonicalSlug = found.canonicalSlug ?? courseId;

  const { course, tees, holes, hazards, climate, nearby, recentEdits, verifiedOwnerEmails, fieldReviewers } =
    await getCourseData(courseId);

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Course Not Found
        </h1>
        <p className="text-gray-500 mb-8">
          The course you are looking for does not exist.
        </p>
        <Link
          href={`/courses/${state}`}
          className="text-evergreen-700 hover:text-evergreen-800 font-medium"
        >
          Back to {getStateName(state)} courses
        </Link>
      </div>
    );
  }

  const stateName = getStateName(state);

  // Compute insights
  const bunkerCount = hazards.filter(
    (h) => h.hazard_type === "bunker" || h.hazard_type === "sand"
  ).length;
  const waterCount = hazards.filter(
    (h) => h.hazard_type === "water" || h.hazard_type === "lake" || h.hazard_type === "pond" || h.hazard_type === "stream"
  ).length;

  const holesWithHandicap = holes.filter(
    (h) => h.handicap_index != null
  );
  const hardestHole = holesWithHandicap.length > 0
    ? holesWithHandicap.reduce((a, b) =>
        (a.handicap_index ?? 99) < (b.handicap_index ?? 99) ? a : b
      )
    : null;

  const holesWithYardage = holes.filter((h) => {
    if (!h.yardages) return false;
    const vals = Object.values(h.yardages as Record<string, number>);
    return vals.length > 0 && vals.some((v) => v > 0);
  });

  const getMaxYardage = (h: { yardages: Record<string, number> | null }) => {
    if (!h.yardages) return 0;
    const vals = Object.values(h.yardages as Record<string, number>);
    return Math.max(...vals.filter((v) => typeof v === "number"), 0);
  };

  const longestHole =
    holesWithYardage.length > 0
      ? holesWithYardage.reduce((a, b) =>
          getMaxYardage(a) > getMaxYardage(b) ? a : b
        )
      : null;

  const shortestHole =
    holesWithYardage.length > 0
      ? holesWithYardage.reduce((a, b) =>
          getMaxYardage(a) < getMaxYardage(b) ? a : b
        )
      : null;

  // Nearby grouped by type
  const nearbyCourses = nearby.filter((n) => n.poi_type === "golf_course");
  const nearbyRestaurants = nearby.filter(
    (n) => n.poi_type === "restaurant" || n.poi_type === "food"
  );
  const nearbyHotels = nearby.filter(
    (n) => n.poi_type === "hotel" || n.poi_type === "lodging"
  );

  // Climate
  const bestMonths = climate?.best_months as number[] | null;
  const monthly = climate?.monthly as
    | Record<string, { avg_high_f?: number; avg_low_f?: number }>
    | null;

  // Generate description
  const typeLabel = course.course_type
    ? course.course_type.toLowerCase()
    : "golf";
  const desc = `A ${typeLabel} course in ${course.city}, ${stateName}${
    course.architect ? ` designed by ${course.architect}` : ""
  }${course.year_built ? ` (${course.year_built})` : ""}.${
    course.par_total ? ` ${course.par_total} par` : ""
  }${
    course.total_yardage
      ? ` stretching ${course.total_yardage.toLocaleString()} yards`
      : ""
  }.`;

  const isClaimed = (verifiedOwnerEmails ?? []).length > 0;
  const slope = tees[0]?.slope_rating ?? null;
  const rating = tees[0]?.course_rating ?? null;

  const canonicalUrl = `https://courses.opengolfapi.org/courses/${state}/${canonicalSlug}`;
  const golfCourseLd = {
    "@context": "https://schema.org",
    "@type": "GolfCourse",
    name: course.course_name,
    url: canonicalUrl,
    ...(course.description ? { description: course.description } : {}),
    ...(course.latitude && course.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: course.latitude, longitude: course.longitude } }
      : {}),
    address: {
      "@type": "PostalAddress",
      ...(course.address ? { streetAddress: course.address } : {}),
      ...(course.city ? { addressLocality: course.city } : {}),
      addressRegion: course.state,
      ...(course.postal_code ? { postalCode: course.postal_code } : {}),
      addressCountry: "US",
    },
    ...(course.phone ? { telephone: course.phone } : {}),
    ...(course.website ? { sameAs: [course.website] } : {}),
    ...(course.par_total ? { numberOfHoles: course.holes_count ?? 18 } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://courses.opengolfapi.org/" },
      { "@type": "ListItem", position: 2, name: stateName, item: `https://courses.opengolfapi.org/courses/${state}` },
      { "@type": "ListItem", position: 3, name: course.course_name, item: canonicalUrl },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(golfCourseLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {/* HEADER — editorial */}
      <section className="max-w-[1100px] mx-auto px-6 pt-12 pb-8">
        <div className="flex items-baseline gap-3 text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href={`/courses/${state}`} className="hover:underline">{stateName}</Link>
          <span>/</span>
          <span>{course.course_name}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="font-display tracking-tight font-bold mb-3" style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 1.05 }}>
            {course.course_name}
          </h1>
          <div className="flex items-center gap-2 mt-3 text-sm">
            <a href="#edit" className="px-3 py-1.5 rounded border hover:bg-white transition-colors" style={{ borderColor: "var(--color-cream-darkest)", color: "var(--color-ink)" }}>
              ✎ Edit page
            </a>
            {!isClaimed && (
              <a href="#claim" className="px-3 py-1.5 rounded font-semibold" style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}>
                Claim this course
              </a>
            )}
          </div>
        </div>
        <p className="text-lg" style={{ color: "var(--color-ink-muted)" }}>
          {[course.city, course.state].filter(Boolean).join(", ")}
          {course.architect ? <span className="font-display italic"> · designed by {course.architect}</span> : null}
          {course.year_built ? <span> ({course.year_built})</span> : null}
        </p>
      </section>

      <OwnerBanner courseId={course.id} isClaimed={isClaimed} />

      {/* TWO-COLUMN — prose + map left, infobox/KBYG right rail.
          The aside spans both rows so the map slides up beside it;
          on mobile the DOM order gives description → infobox → map. */}
      <section className="max-w-[1100px] mx-auto px-6 pt-10 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
        <div className="md:col-span-2 space-y-4">
          {course.description ? (
            <p className="font-display text-[19px] leading-[1.65]" style={{ fontVariationSettings: '"opsz" 14' }}>{course.description}</p>
          ) : (
            <p className="text-[17px] leading-[1.65]" style={{ color: "var(--color-ink-muted)" }}>{desc}</p>
          )}
        </div>
        <aside className="space-y-6 md:col-start-3 md:row-span-2">
          {/* INFOBOX — Wikipedia-style */}
          <div className="border rounded-md p-5 bg-white" style={{ borderColor: "var(--color-cream-darkest)" }}>
            <p className="font-display italic text-xs mb-3" style={{ color: "var(--color-brass-700)" }}>The course at a glance</p>
            <dl>
              {course.par_total != null && <DLRow label="Par">{course.par_total}</DLRow>}
              {course.total_yardage != null && <DLRow label="Yardage">{course.total_yardage.toLocaleString("en-US")}</DLRow>}
              {rating != null && <DLRow label="Rating">{rating}</DLRow>}
              {slope != null && <DLRow label="Slope">{slope}</DLRow>}
              {course.course_type && <DLRow label="Type">{course.course_type}</DLRow>}
              {course.architect && <DLRow label="Architect">{course.architect}</DLRow>}
              {course.year_built && <DLRow label="Established">{course.year_built}</DLRow>}
              {course.holes_count && <DLRow label="Holes">{course.holes_count}</DLRow>}
              {(bunkerCount > 0 || waterCount > 0) && <DLRow label="Hazards">{bunkerCount} bunker / {waterCount} water</DLRow>}
              {course.latitude && course.longitude && (
                <DLRow label="Coords">
                  <span className="font-mono text-xs">{course.latitude.toFixed(3)}, {course.longitude.toFixed(3)}</span>
                </DLRow>
              )}
            </dl>
          </div>

          {/* PLAN YOUR VISIT — KBYG sidebar */}
          {(course.green_fees || course.hours_text || course.walking_policy || course.dress_code || course.cart_fee || course.twilight_info) && (
            <div className="border rounded-md p-5 bg-white" style={{ borderColor: "var(--color-cream-darkest)" }}>
              <p className="font-display italic text-xs mb-3" style={{ color: "var(--color-brass-700)" }}>Know before you go</p>
              <dl>
                {course.hours_text && <DLRow label="Hours">{course.hours_text}</DLRow>}
                {course.green_fees && <DLRow label="Green fees">{course.green_fees}</DLRow>}
                {course.cart_fee && <DLRow label="Cart fee">{course.cart_fee}</DLRow>}
                {course.twilight_info && <DLRow label="Twilight">{course.twilight_info}</DLRow>}
                {course.walking_policy && <DLRow label="Walking">{course.walking_policy}</DLRow>}
                {course.dress_code && <DLRow label="Dress code">{course.dress_code}</DLRow>}
              </dl>
              {(() => {
                const bookingQuery = [course.course_name, course.city, course.state].filter(Boolean).join(" ");
                const bookingUrl = `https://www.golfnow.com/tee-times/search?SearchText=${encodeURIComponent(bookingQuery)}`;
                return (
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded text-sm font-semibold w-full justify-center"
                    style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}
                  >
                    Book a tee time →
                  </a>
                );
              })()}
              <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
                Booking link goes to GolfNow. We may earn a small commission.
              </p>
            </div>
          )}

          {/* THIS PAGE NEEDS — surface the gaps so visitors become editors */}
          {(() => {
            const gaps: string[] = [];
            if (!course.green_fees) gaps.push("green fees");
            if (!course.architect) gaps.push("architect");
            if (!course.year_built) gaps.push("year built");
            if (!course.dress_code) gaps.push("dress code");
            if (!course.walking_policy) gaps.push("walking policy");
            if (!course.hours_text) gaps.push("hours");
            if (!course.phone) gaps.push("phone");
            if (gaps.length === 0) return null;
            return (
              <div className="border border-dashed rounded-md p-5" style={{ borderColor: "var(--color-brass-700)", background: "rgba(255,255,255,0.5)" }}>
                <p className="font-display italic text-xs mb-2" style={{ color: "var(--color-brass-700)" }}>
                  This page needs a regular
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  We&rsquo;re missing the {gaps.slice(0, 4).join(", ")}
                  {gaps.length > 4 ? ` and ${gaps.length - 4} more` : ""} for this course.
                  Play here? You probably know them.
                </p>
                <a
                  href="#edit"
                  className="inline-block px-3 py-1.5 rounded text-sm font-semibold border hover:bg-white transition-colors"
                  style={{ borderColor: "var(--color-evergreen-950)", color: "var(--color-evergreen-950)" }}
                >
                  Fill in what you know →
                </a>
              </div>
            );
          })()}
        </aside>

        {/* Location Map — second row of the left column, beside the rail */}
        {course.latitude && course.longitude && (
          <section className="md:col-span-2 md:col-start-1">
            <h2 className="font-display tracking-tight text-2xl font-bold mb-4">Location &amp; Nearby</h2>
            <CourseMap
              lat={course.latitude}
              lng={course.longitude}
              name={course.course_name}
              nearby={nearby}
            />
            <div className="mt-2 flex gap-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              <a
                href={`https://www.openstreetmap.org/?mlat=${course.latitude}&mlon=${course.longitude}#map=15/${course.latitude}/${course.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-evergreen-700"
              >
                View on OpenStreetMap →
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${course.latitude},${course.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-evergreen-700"
              >
                Get directions →
              </a>
            </div>
            {nearby.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                <span><span style={{color:'#3b82f6'}}>●</span> Hotels</span>
                <span><span style={{color:'#f59e0b'}}>●</span> Restaurants</span>
                <span><span style={{color:'#16a34a'}}>●</span> Golf Courses</span>
                <span><span style={{color:'#8b5cf6'}}>●</span> Driving Ranges</span>
              </div>
            )}
            <LocationEditor
              courseId={course.id}
              courseName={course.course_name}
              lat={course.latitude}
              lng={course.longitude}
            />
          </section>
        )}
      </section>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
        {/* Tee Selector + Scorecard */}
        {tees.length > 0 && holes.length > 0 && (
          <TeeSelector tees={tees} holes={holes} />
        )}

        {/* Scorecard editor — visible whenever hole data could exist */}
        <ScorecardEditor
          courseId={course.id}
          courseName={course.course_name}
          holes={holes}
        />

        {/* Tee data only (no holes) */}
        {tees.length > 0 && holes.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-display tracking-tight text-2xl font-bold mb-4">Tees</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-3 py-2">Tee</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2 text-right">Rating</th>
                    <th className="px-3 py-2 text-right">Slope</th>
                    <th className="px-3 py-2 text-right">Par</th>
                    <th className="px-3 py-2 text-right">Yardage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tees.map((tee, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          <TeeColorDot color={tee.tee_color} />
                          {tee.tee_name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {tee.gender || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tee.course_rating ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tee.slope_rating ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tee.par_total ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {tee.total_yardage
                          ? tee.total_yardage.toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Difficulty silhouette — every course gets a unique 18-bar
            fingerprint of how strokes-index difficulty is distributed
            across the round. Bar height = (19 - HCP) so HCP-1 is tallest;
            color encodes par. Renders only when we have ≥18 holes with
            handicap_index populated. */}
        {(() => {
          const silhouette = holes
            .filter(h => h.hole_number != null && h.hole_number >= 1 && h.hole_number <= 18)
            .reduce<Record<number, { par: number | null; hcp: number | null }>>(
              (acc, h) => {
                const n = h.hole_number as number;
                if (!acc[n]) acc[n] = { par: h.par ?? null, hcp: h.handicap_index ?? null };
                return acc;
              }, {});
          const ordered = Array.from({ length: 18 }, (_, i) => i + 1).map(n => ({ n, ...(silhouette[n] ?? { par: null, hcp: null }) }));
          const haveHcps = ordered.filter(o => o.hcp != null).length;
          if (haveHcps < 14) return null; // need most of the round to render meaningfully
          const parColor = (par: number | null) =>
            par === 3 ? "var(--color-brass-700)"
            : par === 5 ? "var(--color-ink)"
            : "var(--color-evergreen-700)";
          return (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
              <p className="font-display italic text-[13px] mb-1" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
                The shape of the round
              </p>
              <h2 className="font-display tracking-tight text-2xl font-bold mb-2">
                Difficulty silhouette.
              </h2>
              <p className="text-sm mb-5 max-w-[560px]" style={{ color: "var(--color-ink-muted)" }}>
                Each bar is one hole. Height encodes its stroke-index rank — the highest bar is the toughest hole on the card. Color encodes par.
              </p>
              <div className="flex items-end gap-[3px] h-32 mb-2">
                {ordered.map(o => {
                  const hcpRank = o.hcp ?? 18;
                  const heightPct = Math.max(8, ((19 - hcpRank) / 18) * 100);
                  return (
                    <div key={o.n} className="flex-1 flex flex-col items-center min-w-0" title={`Hole ${o.n} · Par ${o.par ?? "?"} · HCP ${o.hcp ?? "?"}`}>
                      <div className="w-full rounded-t" style={{ height: `${heightPct}%`, background: parColor(o.par), minHeight: 6 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] tabular-nums mb-3" style={{ color: "var(--color-ink-muted)" }}>
                {ordered.map(o => (
                  <span key={o.n} className="flex-1 text-center">{o.n}</span>
                ))}
              </div>
              <div className="flex gap-5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                <span className="flex items-center gap-1.5"><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--color-brass-700)" }} /> Par 3</span>
                <span className="flex items-center gap-1.5"><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--color-evergreen-700)" }} /> Par 4</span>
                <span className="flex items-center gap-1.5"><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--color-ink)" }} /> Par 5</span>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Insights */}
          {(hazards.length > 0 || hardestHole || longestHole) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="font-display tracking-tight text-2xl font-bold mb-4">
                Course Insights
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {(bunkerCount > 0 || waterCount > 0) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {bunkerCount + waterCount}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Hazards ({bunkerCount} bunker{bunkerCount !== 1 ? "s" : ""},{" "}
                      {waterCount} water)
                    </div>
                  </div>
                )}
                {hardestHole && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      #{hardestHole.hole_number}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Hardest Hole (HCP {hardestHole.handicap_index})
                    </div>
                  </div>
                )}
                {longestHole && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      #{longestHole.hole_number}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Longest ({getMaxYardage(longestHole).toLocaleString()} yds)
                    </div>
                  </div>
                )}
                {shortestHole && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      #{shortestHole.hole_number}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Shortest ({getMaxYardage(shortestHole).toLocaleString()} yds)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Season & Weather */}
          {climate && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="font-display tracking-tight text-2xl font-bold mb-4">
                Season & Weather
              </h2>

              {bestMonths && bestMonths.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Best Months
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bestMonths.map((m) => (
                      <span
                        key={m}
                        className="text-xs px-2.5 py-1 rounded-full bg-cream-darker text-evergreen-800 border border-cream-darkest font-medium"
                      >
                        {MONTH_NAMES[m - 1] ?? m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {climate.season_start && climate.season_end && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Season
                  </div>
                  <div className="text-sm text-gray-600">
                    {MONTH_NAMES[(climate.season_start as number) - 1]} to{" "}
                    {MONTH_NAMES[(climate.season_end as number) - 1]}
                  </div>
                </div>
              )}

              {/* Temperature bars */}
              {monthly && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Monthly Highs
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {Array.from({ length: 12 }, (_, i) => {
                      const key = String(i + 1);
                      const data = monthly[key];
                      const high = data?.avg_high_f ?? 0;
                      const pct = Math.max(high / 110, 0.05);
                      const color =
                        high >= 85
                          ? "bg-red-400"
                          : high >= 70
                          ? "bg-orange-400"
                          : high >= 55
                          ? "bg-yellow-400"
                          : "bg-blue-400";
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div className="text-[10px] text-gray-500">
                            {high > 0 ? `${Math.round(high)}` : ""}
                          </div>
                          <div
                            className={`w-full rounded-t ${color}`}
                            style={{ height: `${pct * 100}%` }}
                          />
                          <div className="text-[10px] text-gray-400">
                            {MONTH_NAMES[i]?.charAt(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nearby */}
        {nearby.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-display tracking-tight text-2xl font-bold mb-4">Nearby</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {nearbyCourses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Golf Courses
                  </h3>
                  <ul className="space-y-2">
                    {nearbyCourses.slice(0, 5).map((n, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-gray-900">{n.name}</span>
                        <span className="text-gray-400 ml-2">
                          {n.distance_miles?.toFixed(1)} mi
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nearbyRestaurants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Restaurants
                  </h3>
                  <ul className="space-y-2">
                    {nearbyRestaurants.slice(0, 5).map((n, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-gray-900">{n.name}</span>
                        <span className="text-gray-400 ml-2">
                          {n.distance_miles?.toFixed(1)} mi
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nearbyHotels.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Hotels
                  </h3>
                  <ul className="space-y-2">
                    {nearbyHotels.slice(0, 5).map((n, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-gray-900">{n.name}</span>
                        <span className="text-gray-400 ml-2">
                          {n.distance_miles?.toFixed(1)} mi
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plan Your Visit */}
        {(course.practice_facilities || course.driving_range_type || course.club_rental || course.gps_carts != null) && (
          <PlanYourVisit course={course} fieldReviewers={fieldReviewers} />
        )}

        {/* About */}
        <AboutCourse course={course} bunkerCountDerived={bunkerCount} waterCountDerived={waterCount} />

        {/* Staff */}
        <StaffSection course={course} fieldReviewers={fieldReviewers} />

        {/* Legacy course details (crawler-populated) */}
        {(course.fairway_grass || course.green_grass || course.facilities) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-display tracking-tight text-2xl font-bold mb-4">
              Additional Course Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {course.fairway_grass && (
                <div>
                  <div className="text-gray-500">Fairway Grass</div>
                  <div className="font-medium text-gray-900 mt-0.5">
                    {course.fairway_grass}
                  </div>
                </div>
              )}
              {course.green_grass && (
                <div>
                  <div className="text-gray-500">Green Grass</div>
                  <div className="font-medium text-gray-900 mt-0.5">
                    {course.green_grass}
                  </div>
                </div>
              )}
              {course.facilities &&
                typeof course.facilities === "object" &&
                Object.entries(
                  course.facilities as Record<string, boolean>
                ).map(
                  ([key, val]) =>
                    val && (
                      <div key={key}>
                        <div className="font-medium text-gray-900 capitalize">
                          {key.replace(/_/g, " ")}
                        </div>
                      </div>
                    )
                )}
            </div>
          </div>
        )}
        {/* Community Edits */}
        {recentEdits.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-display tracking-tight text-2xl font-bold mb-3">Community Edits</h2>
            <ul className="space-y-1.5">
              {recentEdits.map((edit) => (
                <li key={edit.id} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-gray-400">&bull;</span>
                  <span className="capitalize">{edit.field_name.replace(/_/g, " ")} updated</span>
                  <span className="text-gray-400">&mdash;</span>
                  <span className="text-gray-400 text-xs">
                    {relativeTime(edit.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Edit Form */}
        <div id="edit">
        <EditForm
          courseId={course.id}
          courseName={course.course_name}
          verifiedOwnerEmails={verifiedOwnerEmails}
          currentData={{
            phone: course.phone ?? null,
            website: course.website ?? null,
            email: course.email ?? null,
            address: course.address ?? null,
            city: course.city ?? null,
            postal_code: course.postal_code ?? null,
            state: course.state ?? '',
            course_type: course.course_type ?? null,
            par_total: course.par_total ?? null,
            year_built: course.year_built ?? null,
            architect: course.architect ?? null,
            description: course.description ?? null,
            practice_facilities: course.practice_facilities ?? null,
            grass_types: course.grass_types ?? null,
            social_media_url: course.social_media_url ?? null,
            course_conditions: course.course_conditions ?? null,
            bunker_count: course.bunker_count ?? null,
            water_holes: course.water_holes ?? null,
            driving_range_type: course.driving_range_type ?? null,
            club_rental: course.club_rental ?? null,
            green_fees: course.green_fees ?? null,
            hours_text: course.hours_text ?? null,
            walking_policy: course.walking_policy ?? null,
            dress_code: course.dress_code ?? null,
            cart_fee: course.cart_fee ?? null,
            twilight_info: course.twilight_info ?? null,
            junior_rates: course.junior_rates ?? null,
            senior_rates: course.senior_rates ?? null,
            head_pro: course.head_pro ?? null,
            superintendent: course.superintendent ?? null,
            gps_carts: course.gps_carts ?? null,
            league_info: course.league_info ?? null,
          }}
        />
        </div>

        <div id="claim">
          <ClaimForm courseId={course.id} courseName={course.course_name} />
        </div>
      </div>
    </div>
  );
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
}

function TeeColorDot({ color }: { color: string | null }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-600",
    white: "bg-white border border-gray-300",
    gold: "bg-yellow-500",
    yellow: "bg-yellow-400",
    red: "bg-red-600",
    black: "bg-black",
    green: "bg-evergreen-600",
    silver: "bg-gray-400",
    combo: "bg-purple-500",
  };
  const cls =
    colorMap[(color ?? "").toLowerCase()] ?? "bg-gray-400";
  return <span className={`inline-block w-3 h-3 rounded-full ${cls}`} />;
}

type CourseRow = {
  id: string;
  course_name: string;
  state: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  green_fees: string | null;
  hours_text: string | null;
  walking_policy: string | null;
  dress_code: string | null;
  cart_fee: string | null;
  twilight_info: string | null;
  junior_rates: string | null;
  senior_rates: string | null;
  practice_facilities: string | null;
  driving_range_type: string | null;
  club_rental: string | null;
  gps_carts: boolean | null;
  head_pro: string | null;
  superintendent: string | null;
  league_info: string | null;
  description: string | null;
  architect: string | null;
  year_built: number | null;
  grass_types: string | null;
  bunker_count: number | null;
  water_holes: string | null;
  course_conditions: string | null;
};

function OwnerBadge({ fieldName, fieldReviewers }: { fieldName: string; fieldReviewers: Map<string, string | null> }) {
  if (fieldReviewers.get(fieldName) !== "auto:owner") return null;
  return (
    <span
      className="ml-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-cream-darker text-evergreen-800 border border-cream-darkest font-medium align-middle"
      title="Set by verified course owner"
    >
      &#10003; Owner verified
    </span>
  );
}

function PlanYourVisit({ course, fieldReviewers }: { course: CourseRow; fieldReviewers: Map<string, string | null> }) {
  const rates: Array<[string, string | null]> = [
    ["Green fees", course.green_fees],
    ["Cart fee", course.cart_fee],
    ["Twilight", course.twilight_info],
    ["Junior", course.junior_rates],
    ["Senior", course.senior_rates],
  ];
  const policies: Array<[string, string | null]> = [
    ["Hours", course.hours_text],
    ["Walking", course.walking_policy],
    ["Dress code", course.dress_code],
  ];
  const rateFields = ["green_fees", "cart_fee", "twilight_info", "junior_rates", "senior_rates"];
  const policyFields = ["hours_text", "walking_policy", "dress_code"];

  const hasAny = rates.some(([, v]) => v) || policies.some(([, v]) => v) || course.practice_facilities || course.website || course.phone;
  if (!hasAny) return null;

  // GolfNow search URL — direct link (no affiliate ID yet; tracking added later).
  const bookingQuery = [course.course_name, course.city, course.state].filter(Boolean).join(" ");
  const bookingUrl = `https://www.golfnow.com/tee-times/search?SearchText=${encodeURIComponent(bookingQuery)}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="font-display tracking-tight text-2xl font-bold mb-4">Plan Your Visit</h2>

      {rates.some(([, v]) => v) && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Rates</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm">
            {rates.map(([label, val], i) =>
              val && (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-900 font-medium text-right">
                    {val}
                    <OwnerBadge fieldName={rateFields[i]} fieldReviewers={fieldReviewers} />
                  </dd>
                </div>
              )
            )}
          </dl>
        </div>
      )}

      {policies.some(([, v]) => v) && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Hours & Policies</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm">
            {policies.map(([label, val], i) =>
              val && (
                <div key={i} className="flex items-baseline justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-900 font-medium text-right">
                    {val}
                    <OwnerBadge fieldName={policyFields[i]} fieldReviewers={fieldReviewers} />
                  </dd>
                </div>
              )
            )}
          </dl>
        </div>
      )}

      {(course.practice_facilities || course.driving_range_type || course.club_rental || course.gps_carts != null) && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Facilities</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm">
            {course.practice_facilities && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-gray-500">Practice</dt>
                <dd className="text-gray-900 font-medium text-right">{course.practice_facilities}</dd>
              </div>
            )}
            {course.driving_range_type && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-gray-500">Range</dt>
                <dd className="text-gray-900 font-medium text-right">{course.driving_range_type}</dd>
              </div>
            )}
            {course.club_rental && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-gray-500">Rentals</dt>
                <dd className="text-gray-900 font-medium text-right">{course.club_rental}</dd>
              </div>
            )}
            {course.gps_carts != null && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-gray-500">GPS carts</dt>
                <dd className="text-gray-900 font-medium text-right">
                  {course.gps_carts ? "Yes" : "No"}
                  <OwnerBadge fieldName="gps_carts" fieldReviewers={fieldReviewers} />
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={bookingUrl}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-evergreen-700 text-white rounded-lg hover:bg-evergreen-800 transition-colors text-sm font-semibold"
        >
          Book a Tee Time
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
        {course.website && (
          <a
            href={course.website.startsWith("http") ? course.website : `https://${course.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-evergreen-950 text-white rounded-lg hover:bg-evergreen-900 transition-colors text-sm font-medium"
          >
            Visit Website
          </a>
        )}
        {course.phone && (
          <a
            href={`tel:${course.phone}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            {course.phone}
          </a>
        )}
      </div>

      <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
        Booking links go to third-party partners. OpenGolfAPI may earn a small commission from qualifying bookings — at no extra cost to you. This helps support the project.
      </p>
    </div>
  );
}

function AboutCourse({
  course, bunkerCountDerived, waterCountDerived,
}: {
  course: CourseRow;
  bunkerCountDerived: number;
  waterCountDerived: number;
}) {
  if (
    !course.description && !course.architect && !course.year_built &&
    !course.grass_types && !course.bunker_count && bunkerCountDerived === 0 &&
    !course.water_holes && waterCountDerived === 0 && !course.course_conditions
  ) return null;

  const totalBunkers = course.bunker_count ?? (bunkerCountDerived > 0 ? bunkerCountDerived : null);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="font-display tracking-tight text-2xl font-bold mb-4">About {course.course_name}</h2>

      {course.description && (
        <p className="text-gray-700 text-sm leading-relaxed mb-5 whitespace-pre-line">{course.description}</p>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
        {course.architect && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Architect</dt>
            <dd className="text-gray-900 font-medium text-right">
              {course.architect}{course.year_built ? ` (${course.year_built})` : ""}
            </dd>
          </div>
        )}
        {course.grass_types && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Grass</dt>
            <dd className="text-gray-900 font-medium text-right">{course.grass_types}</dd>
          </div>
        )}
        {totalBunkers != null && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Bunkers</dt>
            <dd className="text-gray-900 font-medium text-right">{totalBunkers}</dd>
          </div>
        )}
        {(course.water_holes || waterCountDerived > 0) && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Water</dt>
            <dd className="text-gray-900 font-medium text-right">
              {course.water_holes || `${waterCountDerived} hazard${waterCountDerived !== 1 ? "s" : ""}`}
            </dd>
          </div>
        )}
      </dl>

      {course.course_conditions && (
        <div className="mt-5 bg-gray-50 border border-gray-200 rounded-md p-3">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Recent conditions</div>
          <p className="text-sm text-gray-700">{course.course_conditions}</p>
        </div>
      )}
    </div>
  );
}

function StaffSection({ course, fieldReviewers }: { course: CourseRow; fieldReviewers: Map<string, string | null> }) {
  if (!course.head_pro && !course.superintendent && !course.league_info) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="font-display tracking-tight text-2xl font-bold mb-4">Staff</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
        {course.head_pro && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Head pro</dt>
            <dd className="text-gray-900 font-medium text-right">
              {course.head_pro}
              <OwnerBadge fieldName="head_pro" fieldReviewers={fieldReviewers} />
            </dd>
          </div>
        )}
        {course.superintendent && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-gray-500">Superintendent</dt>
            <dd className="text-gray-900 font-medium text-right">
              {course.superintendent}
              <OwnerBadge fieldName="superintendent" fieldReviewers={fieldReviewers} />
            </dd>
          </div>
        )}
      </dl>
      {course.league_info && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Leagues</div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{course.league_info}</p>
        </div>
      )}
    </div>
  );
}
