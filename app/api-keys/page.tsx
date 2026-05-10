import type { Metadata } from "next";
import { ApiKeysClient } from "./api-keys-client";

export const metadata: Metadata = {
  title: "API keys",
  description: "Get a free OpenGolfAPI key — higher rate limits, change notifications.",
};

export default function ApiKeysPage() {
  return (
    <div className="max-w-[800px] mx-auto px-6 pt-12 pb-16">
      <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
        For developers
      </p>
      <h1 className="font-display tracking-tight font-bold mb-4" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
        API <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>keys.</em>
      </h1>
      <p className="text-lg mb-3 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
        The API works without a key — 1,000 requests/day per IP, no signup needed.
      </p>
      <p className="text-lg mb-10 max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
        Get a free key to bump your limit to <strong style={{ color: "var(--color-ink)" }}>10,000/day</strong> and we&apos;ll email you about breaking changes. One key per email.
      </p>
      <ApiKeysClient />
      <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--color-rule)" }}>
        <h2 className="font-display text-2xl font-bold mb-4">Using your key</h2>
        <p className="text-base mb-3" style={{ color: "var(--color-ink-muted)" }}>
          Pass it as a bearer token:
        </p>
        <pre className="text-xs p-4 rounded overflow-x-auto" style={{ background: "var(--color-cream-darker)", color: "var(--color-ink)" }}>
{`curl -H "Authorization: Bearer ogapi_xxxxx..." \\
  "https://api.opengolfapi.org/v1/courses?state=CA"`}
        </pre>
      </div>
    </div>
  );
}
