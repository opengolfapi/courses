import Link from "next/link";

export function OwnerBanner({ courseId, isClaimed }: { courseId: string; isClaimed: boolean }) {
  // courseId is intentionally unused right now but kept for future per-course tracking
  void courseId;
  if (isClaimed) {
    return (
      <div className="border-y px-6 py-3 flex items-center justify-center gap-2 text-sm" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--color-evergreen-600)", color: "white" }}>✓ Owner verified</span>
        <span style={{ color: "var(--color-ink-muted)" }}>Rates, hours, and policies are set by the course itself.</span>
      </div>
    );
  }
  return (
    <div className="border-y px-6 py-3" style={{ borderColor: "var(--color-cream-darkest)", background: "var(--color-cream-darker)" }}>
      <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p>
          <span className="font-semibold">Is this your course?</span>{" "}
          <span style={{ color: "var(--color-ink-muted)" }}>Claim it to control rates, hours, and policies.</span>
        </p>
        <Link
          href={`#claim`}
          className="px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap"
          style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}
        >
          Claim this course
        </Link>
      </div>
    </div>
  );
}
