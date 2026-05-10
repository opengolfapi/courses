import type { Metadata } from "next";
import { MyEditsClient } from "./my-edits-client";

export const metadata: Metadata = {
  title: "My contributions",
  description: "Track the status of edits you've submitted to OpenGolfAPI.",
};

export default function MyEditsPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-16">
      <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
        Editor dashboard
      </p>
      <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
        My <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>contributions.</em>
      </h1>
      <p className="text-lg mb-10 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
        Every edit you&apos;ve submitted, with its current verification status and reviewer notes.
      </p>
      <MyEditsClient />
    </div>
  );
}
