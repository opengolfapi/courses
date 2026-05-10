import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How OpenGolfAPI handles your data — what we collect, what we don't, and what we do with the little we have.",
};

const LAST_UPDATED = "2026-05-03";

function Section({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      {kicker ? (
        <p
          className="font-display italic text-[13px] mb-2"
          style={{
            color: "var(--color-brass-700)",
            fontVariationSettings: '"opsz" 14',
          }}
        >
          {kicker}
        </p>
      ) : null}
      <h2
        className="font-display font-bold mb-3"
        style={{ fontSize: "clamp(22px, 2.4vw, 28px)", lineHeight: 1.15 }}
      >
        {title}
      </h2>
      <div className="text-[16px] space-y-4" style={{ color: "var(--color-ink)" }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 pt-12 pb-16">
      <p
        className="font-display italic text-[15px] mb-3"
        style={{
          color: "var(--color-brass-700)",
          fontVariationSettings: '"opsz" 14',
        }}
      >
        We collect almost nothing
      </p>
      <h1
        className="font-display tracking-tight font-bold mb-4"
        style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}
      >
        Privacy{" "}
        <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>
          policy.
        </em>
      </h1>
      <p
        className="text-lg mb-3 max-w-[640px]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        OpenGolfAPI is run by one person on a tight budget. We don&apos;t need
        your data to make money, so we don&apos;t take it.
      </p>
      <p className="text-sm mb-12" style={{ color: "var(--color-ink-muted)" }}>
        Last updated: {LAST_UPDATED}
      </p>

      <Section kicker="The receipts" title="What we collect.">
        <p>
          <strong style={{ color: "var(--color-ink)" }}>
            When you visit any page.
          </strong>{" "}
          Standard server logs: your IP address, User-Agent string, the path
          you requested, and a timestamp. Retained for 30 days, then deleted.
        </p>
        <p>
          <strong style={{ color: "var(--color-ink)" }}>
            When you sign up for an API key.
          </strong>{" "}
          Your email address, plus an optional name and project name if you
          give them.
        </p>
        <p>
          <strong style={{ color: "var(--color-ink)" }}>
            When you submit an edit or claim a course.
          </strong>{" "}
          Whatever email and name you put in the form.
        </p>
        <p>
          <strong style={{ color: "var(--color-ink)" }}>
            When you donate via Open Collective.
          </strong>{" "}
          Open Collective handles the payment flow. We don&apos;t see your
          card. If we ever wire up the donor webhook, we&apos;ll receive only
          your name, email, and pledge amount — no payment instrument data,
          ever.
        </p>
      </Section>

      <Section kicker="The list of nopes" title="What we don&rsquo;t collect.">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>No tracking pixels.</li>
          <li>
            No third-party analytics — no Google Analytics, no PostHog, no
            Mixpanel.
          </li>
          <li>No behavioral or advertising cookies.</li>
          <li>No cross-site tracking, no fingerprinting, no session replay.</li>
        </ul>
      </Section>

      <Section kicker="Why we have it" title="How we use it.">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong style={{ color: "var(--color-ink)" }}>IP addresses</strong>{" "}
            — to enforce per-IP rate limits on the anonymous tier.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Email (key)</strong>{" "}
            — to send you your key, and to email you about breaking changes.
            That&apos;s it. No newsletter, no marketing.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>
              Email (edit / claim)
            </strong>{" "}
            — to email you when your submission is reviewed, accepted, or
            rejected.
          </li>
        </ul>
      </Section>

      <Section kicker="Who else sees it" title="Sharing.">
        <p>
          We don&apos;t sell your data. We don&apos;t share it with advertisers.
          We don&apos;t share it with anyone, period — except the
          subprocessors below who need it to run the service.
        </p>
      </Section>

      <Section kicker="Our vendors" title="Subprocessors.">
        <div className="border rounded-sm overflow-hidden" style={{ borderColor: "var(--color-cream-darkest)" }}>
          <table className="almanac-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Region</th>
                <th>What they do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supabase</td>
                <td>US / EU</td>
                <td>Database hosting (Postgres + auth)</td>
              </tr>
              <tr>
                <td>Cloudflare</td>
                <td>Global</td>
                <td>CDN, DNS, Workers (the API runs here)</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>US</td>
                <td>Next.js app hosting (this site)</td>
              </tr>
              <tr>
                <td>Resend</td>
                <td>US</td>
                <td>Transactional email delivery</td>
              </tr>
              <tr>
                <td>Anthropic</td>
                <td>US</td>
                <td>
                  AI verification of edit submissions (sees the edit text and
                  course context, never your personal data)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Cloudflare and Vercel see request metadata (IP, headers, path) as a
          side effect of serving you. That&apos;s normal CDN/hosting behavior;
          we don&apos;t pull additional analytics out of either platform.
        </p>
      </Section>

      <Section kicker="EU residents" title="GDPR rights.">
        <p>
          If you&apos;re in the EU/EEA, you have the right to access, correct,
          delete, port, or restrict processing of your personal data, and to
          object to processing. Email{" "}
          <a href="mailto:hello@opengolfapi.org" className="underline">
            hello@opengolfapi.org
          </a>{" "}
          and we&apos;ll respond within 30 days.
        </p>
        <p>
          The legal basis for what little processing we do is{" "}
          <em>legitimate interest</em> (operating a free public-interest
          dataset and protecting it from abuse), and <em>consent</em> (when
          you give us your email for a key or an edit).
        </p>
      </Section>

      <Section kicker="California residents" title="CCPA / CPRA.">
        <p>
          California residents have substantially the same rights — access,
          deletion, correction, and the right to know. Same email, same
          turnaround. We do not &ldquo;sell&rdquo; or &ldquo;share&rdquo;
          personal information as those terms are defined under the CCPA.
        </p>
      </Section>

      <Section kicker="How long we keep things" title="Retention.">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong style={{ color: "var(--color-ink)" }}>
              API key signups:
            </strong>{" "}
            until you ask us to delete them, or 5 years of inactivity —
            whichever comes first.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>
              Edit submissions:
            </strong>{" "}
            indefinitely. Edits become part of the open ODbL dataset and
            can&apos;t be retroactively unpublished without rewriting history.
            We&apos;ll honor a deletion request for your contact info, but the
            edited fact stays in the dataset.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Server logs:</strong>{" "}
            30 days, then deleted.
          </li>
        </ul>
      </Section>

      <Section kicker="What&rsquo;s in your browser" title="Cookies.">
        <p>
          We use one cookie: an authentication cookie set when you log in to{" "}
          <code>/admin</code>. Admin is staff-only; if you&apos;re not Julian,
          you don&apos;t have one. We don&apos;t use any other cookies.
        </p>
      </Section>

      <Section kicker="Not a kids&rsquo; site" title="Children.">
        <p>
          OpenGolfAPI is not designed for children under 16, and we
          don&apos;t knowingly collect personal information from them. If you
          believe a minor has given us their email, write to{" "}
          <a href="mailto:hello@opengolfapi.org" className="underline">
            hello@opengolfapi.org
          </a>{" "}
          and we&apos;ll delete it.
        </p>
      </Section>

      <Section kicker="One inbox" title="Contact.">
        <p>
          All privacy requests, GDPR or CCPA inquiries, deletion requests, or
          general &ldquo;what do you have on me&rdquo; questions go to{" "}
          <a href="mailto:hello@opengolfapi.org" className="underline">
            hello@opengolfapi.org
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
