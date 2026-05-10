import type { Metadata } from "next";
import { NearMeClient } from "./near-me-client";

export const metadata: Metadata = {
  title: "Find golf courses near me",
  description: "Geolocation-based discovery — every course within 25 miles, sorted by distance.",
};

export default function NearMePage() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-16">
      <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
        Discover by geography
      </p>
      <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
        Courses <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>near you.</em>
      </h1>
      <p className="text-lg mb-10 max-w-[600px]" style={{ color: "var(--color-ink-muted)" }}>
        We&apos;ll ask your browser for location. Nothing is stored — the search runs entirely client-side.
      </p>
      <NearMeClient />
    </div>
  );
}
