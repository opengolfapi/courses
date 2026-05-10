import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for OpenGolfAPI — a free, community-maintained, ODbL-licensed open dataset of US golf courses.",
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

export default function TermsPage() {
  return (
    <div className="max-w-[760px] mx-auto px-6 pt-12 pb-16">
      <p
        className="font-display italic text-[15px] mb-3"
        style={{
          color: "var(--color-brass-700)",
          fontVariationSettings: '"opsz" 14',
        }}
      >
        The fine print, in plain English
      </p>
      <h1
        className="font-display tracking-tight font-bold mb-4"
        style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}
      >
        Terms of{" "}
        <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>
          service.
        </em>
      </h1>
      <p
        className="text-lg mb-3 max-w-[640px]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        OpenGolfAPI is a community-maintained open dataset of US golf courses,
        with an optional REST API and MCP server on top. By using any of it,
        you&apos;re agreeing to what&apos;s below.
      </p>
      <p
        className="text-sm mb-12"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Last updated: {LAST_UPDATED}
      </p>

      <Section kicker="What you&rsquo;re using" title="The service.">
        <p>
          OpenGolfAPI provides a free open dataset of US golf courses
          (geometry, tees, scorecards, hazards, and metadata), plus optional
          access via a REST API and an MCP server for AI agents. The dataset
          and tooling are operated by an unincorporated solo maintainer
          (&ldquo;we,&rdquo; &ldquo;us&rdquo;) — not a registered company.
        </p>
      </Section>

      <Section kicker="The data is yours" title="License.">
        <p>
          All course data is published under the{" "}
          <a
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Open Data Commons Open Database License (ODbL) 1.0
          </a>
          . You can download it, redistribute it, and build commercial
          products on top of it. Attribution is required: cite{" "}
          <strong style={{ color: "var(--color-ink)" }}>
            &ldquo;OpenGolfAPI, ODbL&rdquo;
          </strong>{" "}
          wherever the data shows up.
        </p>
        <p>
          ODbL is a copyleft data license — derivative databases must be
          shared under the same terms. Read the full license text if you plan
          to redistribute.
        </p>
      </Section>

      <Section kicker="Rate limits" title="API usage.">
        <p>
          The API is free at every tier. Limits exist so one user can&apos;t
          starve everyone else:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Anonymous:</strong>{" "}
            1,000 requests per day, per IP.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Keyed (free):</strong>{" "}
            10,000 requests per day, per key.
          </li>
          <li>
            <strong style={{ color: "var(--color-ink)" }}>Higher tiers:</strong>{" "}
            available with a recurring donation via{" "}
            <a
              href="https://opencollective.com/opengolfapi"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              Open Collective
            </a>
            .
          </li>
        </ul>
        <p>
          Limits are enforced. Sustained abuse — scraping past limits,
          rotating IPs to dodge the cap, or any pattern that looks like a
          denial-of-service attempt — may result in your key being revoked
          without notice.
        </p>
      </Section>

      <Section kicker="Best effort" title="No SLA.">
        <p>
          OpenGolfAPI is community-maintained, best-effort. There is no
          uptime guarantee, no support contract, and no obligation on us to
          keep any specific endpoint, schema, or behavior stable forever.
        </p>
        <p>
          <strong style={{ color: "var(--color-ink)" }}>
            Do not use this service for life-critical or safety-critical
            applications.
          </strong>{" "}
          Don&apos;t use it to navigate, to make medical decisions, to control
          equipment, or for anything where a wrong answer or an outage could
          hurt someone.
        </p>
      </Section>

      <Section kicker="As-is" title="No warranties.">
        <p>
          The service and the data are provided <em>as-is</em>, with all
          faults, and without warranty of any kind — express, implied, or
          statutory. We disclaim, to the maximum extent permitted by law, any
          warranty of merchantability, fitness for a particular purpose,
          accuracy, completeness, non-infringement, and quiet enjoyment.
        </p>
        <p>You assume all risk associated with your use.</p>
      </Section>

      <Section kicker="The cap" title="Liability.">
        <p>
          To the maximum extent permitted by law, our aggregate liability to
          you for any and all claims arising out of or relating to this
          service — regardless of the legal theory (contract, tort,
          negligence, strict liability, statute, or otherwise) — is capped at{" "}
          <strong style={{ color: "var(--color-ink)" }}>USD $100</strong>.
        </p>
        <p>
          We are not liable for indirect, incidental, special, consequential,
          exemplary, or punitive damages, lost profits, lost data, or business
          interruption, even if we&apos;ve been advised that such damages were
          possible.
        </p>
      </Section>

      <Section kicker="Keys are revocable" title="Termination.">
        <p>
          We may revoke any API key at any time, for any reason, including
          (but not limited to) abuse, fraud, suspected fraud, security
          concerns, or operational reasons. Where practical we&apos;ll email
          you first; where it isn&apos;t, we won&apos;t.
        </p>
        <p>
          You can stop using the service whenever you like. To delete your
          key and the email tied to it, write to{" "}
          <a href="mailto:hello@opengolfapi.org" className="underline">
            hello@opengolfapi.org
          </a>
          .
        </p>
      </Section>

      <Section kicker="Don&rsquo;t do these things" title="Acceptable use.">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Attempt to overload, degrade, or disrupt the service.</li>
          <li>
            Resell or redistribute raw data without the required ODbL
            attribution.
          </li>
          <li>
            Use the service or the data to harass, threaten, or defame course
            owners, operators, staff, or other contributors.
          </li>
          <li>
            Submit fraudulent edits, fake claims, or deliberately wrong data.
          </li>
          <li>
            Use the service to violate any applicable law or third-party
            right.
          </li>
        </ul>
      </Section>

      <Section kicker="These will change" title="Changes to these terms.">
        <p>
          We may update these terms from time to time. The &ldquo;Last
          updated&rdquo; date at the top of this page is the source of truth.
          Material changes — anything that meaningfully affects your rights
          or obligations — will be emailed to keyed users at the address on
          file.
        </p>
        <p>Continued use of the service after a change means you accept it.</p>
      </Section>

      <Section kicker="Where this lives" title="Governing law.">
        <p>
          These terms are governed by the laws of the United States and
          applicable federal law. Any dispute is subject to the exclusive
          jurisdiction of US federal and state courts.
        </p>
      </Section>

      <Section kicker="Last thing" title="Contact.">
        <p>
          Questions about these terms, requests to delete your account, or
          anything that doesn&apos;t fit a form go to{" "}
          <a href="mailto:hello@opengolfapi.org" className="underline">
            hello@opengolfapi.org
          </a>
          . One person reads every email.
        </p>
      </Section>
    </div>
  );
}
