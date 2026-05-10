import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE = "https://courses.opengolfapi.org";

const STATIC_PATHS = ["/", "/search", "/submit", "/near-me"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

// Page through golf_courses; Supabase caps select() at 1000 rows by default.
async function fetchAllCourses(): Promise<Array<{ id: string; slug: string | null; state: string; updated_at: string | null }>> {
  const PAGE = 1000;
  const all: Array<{ id: string; slug: string | null; state: string; updated_at: string | null }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("golf_courses")
      .select("id, slug, state, updated_at")
      .not("state", "is", null)
      .range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as Array<{ id: string; slug: string | null; state: string; updated_at: string | null }>));
    if (data.length < PAGE) break;
  }
  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await fetchAllCourses();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: p === "/" ? 1.0 : 0.7,
  }));

  const stateEntries: MetadataRoute.Sitemap = US_STATES.map((s) => ({
    url: `${BASE}/courses/${s.toLowerCase()}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const courseEntries: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${BASE}/courses/${c.state}/${c.slug ?? c.id}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...stateEntries, ...courseEntries];
}
