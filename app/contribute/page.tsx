import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStateName } from "@/lib/states";

export const metadata: Metadata = {
  title: "Adopt a Course — Help Complete the Database",
  description:
    "Thousands of courses are missing green fees, architects, or dress codes. Pick your home course and fill in what you know — every edit is verified.",
};

export const revalidate = 3600;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const GAP_LABELS: Record<string, string> = {
  green_fees: "green fees",
  architect: "architect",
  year_built: "year built",
  dress_code: "dress code",
  walking_policy: "walking policy",
  hours_text: "hours",
  phone: "phone",
  website: "website",
};
const GAP_FIELDS = Object.keys(GAP_LABELS);

type Props = { searchParams: Promise<{ state?: string }> };

export default async function ContributePage({ searchParams }: Props) {
  const { state } = await searchParams;
  const code = state?.toUpperCase();

  let q = supabase
    .from("golf_courses")
    .select(`id, slug, course_name, city, state, ${GAP_FIELDS.join(", ")}`)
    .order("course_name")
    .limit(60);
  if (code) q = q.eq("state", code);
  // Most-incomplete first: courses missing green fees AND architect are the
  // highest-value targets, and that's most of the table — name order keeps it stable.
  q = q.is("green_fees", null);

  const { data } = code ? await q : { data: [] };
  const courses = ((data ?? []) as unknown) as Array<
    { id: string; slug: string | null; course_name: string; city: string | null; state: string | null } & Record<string, unknown>
  >;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <p className="font-display italic text-sm mb-2" style={{ color: "var(--color-brass-700)" }}>
        Community project
      </p>
      <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.05 }}>
        Adopt your home course.
      </h1>
      <p className="text-lg max-w-[640px] mb-10" style={{ color: "var(--color-ink-muted)" }}>
        We track 14,708 US courses, but plenty are missing the details only a regular
        would know — green fees, the dress code, who designed it. Pick a course below,
        fill in what you know, and our verification pipeline does the rest. No account
        needed beyond an email.
      </p>

      {/* State picker */}
      <div className="mb-12">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-ink-muted)" }}>
          Browse incomplete courses by state
        </p>
        <div className="flex flex-wrap gap-1.5">
          {US_STATES.map((st) => (
            <Link
              key={st}
              href={`/contribute?state=${st.toLowerCase()}`}
              className="px-2.5 py-1.5 text-sm rounded border hover:bg-white transition-colors"
              style={{
                borderColor: "var(--color-cream-darkest)",
                background: code === st ? "var(--color-evergreen-950)" : undefined,
                color: code === st ? "var(--color-cream)" : "var(--color-ink)",
              }}
            >
              {st}
            </Link>
          ))}
        </div>
      </div>

      {code && (
        <section>
          <h2 className="font-display tracking-tight text-2xl font-bold mb-1">
            {getStateName(code.toLowerCase())} courses that need a regular
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-ink-muted)" }}>
            Each of these is missing green fees — and usually more. Know one? Click through and hit “Edit page.”
          </p>
          {courses.length === 0 ? (
            <p style={{ color: "var(--color-ink-muted)" }}>
              Nothing missing here — every course in {getStateName(code.toLowerCase())} has its essentials filled in. 🎉
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courses.map((c) => {
                const missing = GAP_FIELDS.filter((f) => c[f] == null).map((f) => GAP_LABELS[f]);
                return (
                  <li key={c.id} className="border rounded-md p-4 bg-white" style={{ borderColor: "var(--color-cream-darkest)" }}>
                    <Link
                      href={`/courses/${(c.state ?? "").toLowerCase()}/${c.slug ?? c.id}`}
                      className="font-semibold hover:underline"
                    >
                      {c.course_name}
                    </Link>
                    {c.city && <span className="text-sm ml-2" style={{ color: "var(--color-ink-muted)" }}>{c.city}</span>}
                    <p className="text-xs mt-1.5" style={{ color: "var(--color-brass-700)" }}>
                      needs: {missing.join(", ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {!code && (
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Pick a state above to see which courses near you need help.
        </p>
      )}
    </div>
  );
}
