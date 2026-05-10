import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Five tiers, all donations to a community-maintained open dataset. The data stays free under ODbL forever.",
};

type Tier = {
  name: string;
  price: string;
  cadence: string;
  limit: string;
  signup: string;
  recognition: string;
  cta: { label: string; href: string; external?: boolean };
  highlight?: "subtle" | "primary";
  kicker?: string;
};

const TIERS: Tier[] = [
  {
    name: "Anonymous",
    price: "$0",
    cadence: "forever",
    limit: "1,000 requests per day, per IP address.",
    signup: "No signup, no email, no key. Just hit the endpoint.",
    recognition:
      "We won't know who you are, and that's fine — the dataset is free for everyone.",
    cta: { label: "Read the docs", href: "https://opengolfapi.org/#api", external: true },
  },
  {
    name: "Keyed",
    price: "$0",
    cadence: "forever",
    limit: "10,000 requests per day, attached to your key.",
    signup: "Drop an email at /api-keys and we'll generate a key on the spot.",
    recognition:
      "We'll email you ahead of any breaking change so your integration never wakes up broken.",
    cta: { label: "Get a free key", href: "/api-keys" },
    highlight: "subtle",
    kicker: "Most developers start here",
  },
  {
    name: "Backer",
    price: "$10",
    cadence: "per month",
    limit: "50,000 requests per day.",
    signup: "Pledge on Open Collective, then send the matching email so we can lift your limit.",
    recognition:
      "Your name on the /supporters page — a small, permanent thank-you in the credits of the dataset.",
    cta: {
      label: "Become a backer",
      href: "https://opencollective.com/opengolfapi",
      external: true,
    },
  },
  {
    name: "Sponsor",
    price: "$50",
    cadence: "per month",
    limit: "250,000 requests per day.",
    signup: "Pledge on Open Collective.",
    recognition:
      "Your logo on the /supporters page and a thank-you in every release note we publish.",
    cta: {
      label: "Sponsor OpenGolfAPI",
      href: "https://opencollective.com/opengolfapi",
      external: true,
    },
    highlight: "primary",
    kicker: "Most popular",
  },
  {
    name: "Major Sponsor",
    price: "$250",
    cadence: "per month",
    limit: "1,000,000 requests per day.",
    signup: "Pledge on Open Collective.",
    recognition:
      "Your logo lives on the opengolfapi.org footer, and we mention you by name in every launch post.",
    cta: {
      label: "Become a major sponsor",
      href: "https://opencollective.com/opengolfapi",
      external: true,
    },
  },
];

function TierCard({ tier }: { tier: Tier }) {
  const borderColor =
    tier.highlight === "primary"
      ? "var(--color-evergreen-700)"
      : tier.highlight === "subtle"
        ? "var(--color-brass-500)"
        : "var(--color-cream-darkest)";
  const borderWidth = tier.highlight ? "2px" : "1px";

  const buttonStyle =
    tier.highlight === "primary"
      ? {
          background: "var(--color-evergreen-950)",
          color: "var(--color-cream)",
          border: "1px solid var(--color-evergreen-950)",
        }
      : {
          background: "transparent",
          color: "var(--color-evergreen-950)",
          border: "1px solid var(--color-evergreen-950)",
        };

  return (
    <article
      className="rounded-sm p-8 flex flex-col h-full"
      style={{
        borderStyle: "solid",
        borderColor,
        borderWidth,
        background: "var(--color-cream)",
      }}
    >
      {tier.kicker ? (
        <p
          className="font-display italic text-[13px] mb-2"
          style={{
            color: "var(--color-brass-700)",
            fontVariationSettings: '"opsz" 14',
          }}
        >
          {tier.kicker}
        </p>
      ) : (
        <p className="text-[13px] mb-2" style={{ color: "transparent" }}>
          &nbsp;
        </p>
      )}
      <h2 className="font-display text-2xl font-bold mb-3" style={{ color: "var(--color-ink)" }}>
        {tier.name}
      </h2>
      <div className="mb-6 flex items-baseline gap-2">
        <span
          className="font-display font-bold"
          style={{
            fontSize: "clamp(32px, 3.5vw, 44px)",
            lineHeight: 1,
            color: "var(--color-ink)",
          }}
        >
          {tier.price}
        </span>
        <span
          className="text-sm"
          style={{ color: "var(--color-ink-muted)" }}
        >
          {tier.cadence}
        </span>
      </div>
      <dl className="space-y-4 mb-8 text-[15px]" style={{ color: "var(--color-ink)" }}>
        <div>
          <dt
            className="text-[11px] font-semibold tracking-wider uppercase mb-1"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Rate limit
          </dt>
          <dd>{tier.limit}</dd>
        </div>
        <div>
          <dt
            className="text-[11px] font-semibold tracking-wider uppercase mb-1"
            style={{ color: "var(--color-ink-muted)" }}
          >
            How to sign up
          </dt>
          <dd>{tier.signup}</dd>
        </div>
        <div>
          <dt
            className="text-[11px] font-semibold tracking-wider uppercase mb-1"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Recognition
          </dt>
          <dd>{tier.recognition}</dd>
        </div>
      </dl>
      <div className="mt-auto">
        {tier.cta.external ? (
          <a
            href={tier.cta.href}
            target="_blank"
            rel="noopener"
            className="inline-block w-full text-center px-5 py-2.5 text-sm font-semibold rounded-sm transition-colors hover:opacity-90"
            style={buttonStyle}
          >
            {tier.cta.label}
          </a>
        ) : (
          <Link
            href={tier.cta.href}
            className="inline-block w-full text-center px-5 py-2.5 text-sm font-semibold rounded-sm transition-colors hover:opacity-90"
            style={buttonStyle}
          >
            {tier.cta.label}
          </Link>
        )}
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 pt-12 pb-16">
      <p
        className="font-display italic text-[15px] mb-3"
        style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}
      >
        Donations, not paywalls
      </p>
      <h1
        className="font-display tracking-tight font-bold mb-4"
        style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}
      >
        Pay what helps the{" "}
        <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>almanac grow.</em>
      </h1>
      <p className="text-lg mb-3 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
        OpenGolfAPI is free to use, free to fork, and licensed under ODbL forever. The tiers below
        exist so the people who lean on the data hardest can keep the lights on for everyone else.
      </p>
      <p className="text-lg mb-12 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
        Higher tiers come with higher rate limits and a thank-you in the credits — never with
        access to data that the free tier doesn&apos;t already have.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TIERS.map((tier) => (
          <TierCard key={tier.name} tier={tier} />
        ))}
      </div>

      <section
        className="mt-20 pt-10 border-t"
        style={{ borderColor: "var(--color-rule, var(--color-cream-darkest))" }}
      >
        <p
          className="font-display italic text-[15px] mb-3"
          style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}
        >
          A note on the model
        </p>
        <h2
          className="font-display tracking-tight font-bold mb-5"
          style={{ fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.15 }}
        >
          Free and open <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>under ODbL,</em> forever.
        </h2>
        <p
          className="text-lg max-w-[720px] mb-4"
          style={{ color: "var(--color-ink-muted)" }}
        >
          All tiers are donations to a community-maintained open dataset. Any tier can be
          cancelled anytime. The dataset stays free and open under ODbL forever &mdash; these are
          thank-yous, not paywalls.
        </p>
        <p
          className="text-lg max-w-[720px]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          We run on a foundation model: pledges go to{" "}
          <a
            href="https://opencollective.com/opengolfapi"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Open Collective
          </a>{" "}
          where the books are public, the bills are infrastructure and surveying, and nobody owns
          the data. If you ever stop liking us, you can take the dataset with you.
        </p>
      </section>
    </div>
  );
}
