"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Course {
  id: string;
  slug: string | null;
  course_name: string;
  city: string;
  state: string;
  course_type: string | null;
  par_total: number | null;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string, st: string) => {
    if (!q && !st) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    try {
      const { supabase } = await import("@/lib/supabase");

      let builder = supabase
        .from("golf_courses")
        .select("id, slug, course_name, city, state, course_type, par_total")
        .order("course_name")
        .limit(50);

      if (q) {
        builder = builder.ilike("course_name", `%${q}%`);
      }
      if (st) {
        builder = builder.eq("state", st);
      }

      const { data } = await builder;
      setResults(data ?? []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, stateFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, stateFilter, search]);

  return (
    <div>
      <section className="max-w-[880px] mx-auto px-6 pt-12 pb-8">
        <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
          Search the almanac
        </p>
        <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
          Find any <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>course.</em>
        </h1>
        <p className="text-lg max-w-[600px]" style={{ color: "var(--color-ink-muted)" }}>
          By name, city, or state. Limit 50 results — narrow with a state filter for more.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Course name or city..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-evergreen-600 focus:border-transparent"
            autoFocus
          />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-evergreen-600 focus:border-transparent"
          >
            <option value="">All States</option>
            {US_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <p className="text-gray-500 text-center py-8">Searching...</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No courses found. Try a different search term.
          </p>
        )}

        {!loading && !searched && (
          <p className="text-gray-400 text-center py-8">
            Start typing to search courses.
          </p>
        )}

        {results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3 hidden sm:table-cell">City</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 hidden md:table-cell text-right">
                    Par
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((course) => (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/courses/${course.state?.toLowerCase()}/${course.slug ?? course.id}`}
                        className="font-medium text-gray-900 hover:text-evergreen-700"
                      >
                        {course.course_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {course.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {course.state}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {course.course_type && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-cream-darker text-evergreen-800 border border-cream-darkest">
                          {course.course_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell text-right">
                      {course.par_total ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
