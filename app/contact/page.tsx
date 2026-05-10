import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the maintainers of OpenGolfAPI — for support, partnerships, data corrections, or anything else.",
};

export default function ContactPage() {
  return (
    <div className="max-w-[720px] mx-auto px-6 pt-12 pb-16">
      <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
        Get in touch
      </p>
      <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
        Contact <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>OpenGolfAPI.</em>
      </h1>
      <p className="text-lg mb-10 max-w-[560px]" style={{ color: "var(--color-ink-muted)" }}>
        One person reads every email. Expect a real reply within 1–2 business days.
      </p>

      <div className="border rounded-lg p-6 mb-6" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
        <p className="font-display italic text-[13px] mb-2" style={{ color: "var(--color-brass-700)" }}>For most things</p>
        <h2 className="font-display text-[24px] font-bold mb-3">Email us.</h2>
        <p className="mb-4 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
          <a href="mailto:hello@opengolfapi.org" className="font-semibold underline" style={{ color: "var(--color-evergreen-950)" }}>hello@opengolfapi.org</a> reaches the maintainer directly. You&apos;ll get an automated confirmation within seconds and a real response shortly after.
        </p>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Use this for support, partnerships, press, data licensing, or anything that doesn&apos;t fit a form.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-5" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <h3 className="font-display text-lg font-bold mb-2">Found a bug or wrong data?</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
            Every course page has an &quot;Edit&quot; button at the top. Submit the correction there — it&apos;s faster than email.
          </p>
          <a href="/search" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>Find a course →</a>
        </div>
        <div className="border rounded-lg p-5" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <h3 className="font-display text-lg font-bold mb-2">Course missing?</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
            Submit it via the form. We&apos;ll verify and add it to the dataset.
          </p>
          <a href="/submit" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>Submit a course →</a>
        </div>
        <div className="border rounded-lg p-5" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <h3 className="font-display text-lg font-bold mb-2">Run a course?</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
            Find your course and click &quot;Claim this course&quot; to verify ownership and update rates, hours, and policies directly.
          </p>
          <a href="/search" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>Find your course →</a>
        </div>
        <div className="border rounded-lg p-5" style={{ borderColor: "var(--color-cream-darkest)", background: "white" }}>
          <h3 className="font-display text-lg font-bold mb-2">Developer?</h3>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
            REST API docs at <a href="https://opengolfapi.org/#api" className="font-semibold underline" style={{ color: "var(--color-evergreen-950)" }}>opengolfapi.org</a>. Bug reports and feature requests welcome at GitHub.
          </p>
          <a href="https://github.com/opengolfapi" className="text-sm font-semibold" style={{ color: "var(--color-evergreen-950)" }}>GitHub →</a>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Prefer GitHub for issues? <a href="https://github.com/opengolfapi/opengolfapi/issues" className="underline">File one here</a>.
      </p>
    </div>
  );
}
