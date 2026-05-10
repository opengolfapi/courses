'use client';

import { useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string;
  slug: string | null;
  course_name: string;
  state: string;
  city: string | null;
  course_type: string | null;
  par_total: number | null;
  latitude: number;
  longitude: number;
  distance_mi?: number;
};

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3959;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function NearMeClient() {
  const [radiusMi, setRadiusMi] = useState(25);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'denied' | 'error'>('idle');
  const locatingRef = useRef(false);

  async function search(lat: number, lng: number, miles: number) {
    setStatus('searching');
    const latDelta = miles / 69.0;
    const lngDelta = miles / (69.0 * Math.cos((lat * Math.PI) / 180));
    const { data } = await supabase
      .from('golf_courses')
      .select('id, slug, course_name, state, city, course_type, par_total, latitude, longitude')
      .gte('latitude', lat - latDelta)
      .lte('latitude', lat + latDelta)
      .gte('longitude', lng - lngDelta)
      .lte('longitude', lng + lngDelta)
      .limit(200);
    const filtered = (data ?? [])
      .map((c) => ({ ...c, distance_mi: haversineMiles(lat, lng, c.latitude as number, c.longitude as number) }))
      .filter((c) => c.distance_mi <= miles)
      .sort((a, b) => (a.distance_mi ?? 0) - (b.distance_mi ?? 0)) as Course[];
    setCourses(filtered);
    setStatus('idle');
  }

  function locate() {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setStatus('locating');
    if (!navigator.geolocation) {
      locatingRef.current = false;
      setStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locatingRef.current = false;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        void search(lat, lng, radiusMi);
      },
      (err) => {
        locatingRef.current = false;
        setStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  if (!coords) {
    return (
      <div className="border rounded-md p-8 bg-white text-center" style={{ borderColor: "var(--color-cream-darkest)" }}>
        <p className="mb-5" style={{ color: "var(--color-ink-muted)" }}>
          {status === 'denied' ? 'Location blocked. Check browser settings or use the search instead.'
            : status === 'error' ? "Couldn't determine your location. Try again, or use the search."
            : 'Click below and your browser will ask for permission.'}
        </p>
        <button
          onClick={locate}
          disabled={status === 'locating'}
          className="px-5 py-2.5 rounded font-semibold disabled:opacity-50"
          style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}
        >
          {status === 'locating' ? 'Locating…' : 'Use my location'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Searching within
          <strong className="mx-1" style={{ color: "var(--color-ink)" }}>{radiusMi} miles</strong>
          of <span className="font-mono">{coords.lat.toFixed(2)}, {coords.lng.toFixed(2)}</span>
        </p>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={radiusMi}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRadiusMi(r);
              void search(coords.lat, coords.lng, r);
            }}
            className="w-40"
          />
          <span className="font-mono w-10 text-right" style={{ color: "var(--color-ink-muted)" }}>{radiusMi}mi</span>
        </div>
      </div>

      {status === 'searching' && <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Searching…</p>}

      {courses && courses.length === 0 && (
        <p style={{ color: "var(--color-ink-muted)" }}>No courses within {radiusMi} miles. Try widening the radius.</p>
      )}

      {courses && courses.length > 0 && (
        <table className="almanac-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>City</th>
              <th>Type</th>
              <th style={{ textAlign: "right" }}>Par</th>
              <th style={{ textAlign: "right" }}>Distance</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link
                    href={`/courses/${c.state}/${c.slug ?? c.id}`}
                    className="font-semibold"
                    style={{ color: "var(--color-evergreen-950)" }}
                  >
                    {c.course_name}
                  </Link>
                </td>
                <td style={{ color: "var(--color-ink-muted)" }}>{c.city ?? "—"}, {c.state}</td>
                <td style={{ color: "var(--color-ink-muted)" }}>{c.course_type ?? "—"}</td>
                <td style={{ textAlign: "right" }}>{c.par_total ?? "—"}</td>
                <td style={{ textAlign: "right" }} className="font-mono">{c.distance_mi?.toFixed(1)} mi</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
