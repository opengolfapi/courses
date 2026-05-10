import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t mt-20 px-6 py-12" style={{ borderColor: "var(--color-cream-darkest)", color: "var(--color-ink-muted)" }}>
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-8">
        <div>
          <h4 className="font-display text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>OpenGolfAPI</h4>
          <p className="mb-2">An open almanac of American golf.</p>
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-wider" style={{ background: "var(--color-cream-darker)", color: "var(--color-ink)" }}>ODbL 1.0</span>
        </div>
        <div>
          <h4 className="font-display text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>Browse</h4>
          <Link href="/" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">All courses</Link>
          <Link href="/search" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Search</Link>
          <Link href="/near-me" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Near me</Link>
          <Link href="/submit" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Submit a course</Link>
          <Link href="/my-edits" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">My contributions</Link>
        </div>
        <div>
          <h4 className="font-display text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>Build</h4>
          <a href="https://opengolfapi.org/#api" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">API docs</a>
          <Link href="/pricing" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Pricing</Link>
          <Link href="/api-keys" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Get an API key</Link>
          <a href="https://github.com/opengolfapi" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">GitHub</a>
          <a href="https://www.npmjs.com/package/@opengolfapi/mcp-server" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">MCP server</a>
        </div>
        <div>
          <h4 className="font-display text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>Support</h4>
          <a href="https://opencollective.com/opengolfapi" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Donate</a>
          <Link href="/contact" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Contact</Link>
          <a href="https://github.com/opengolfapi/opengolfapi/issues" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Report an issue</a>
          <Link href="/status" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Status</Link>
          <Link href="/legal/privacy" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Privacy</Link>
          <Link href="/legal/terms" className="block py-0.5 hover:text-[var(--color-evergreen-950)]">Terms</Link>
        </div>
      </div>
      <p className="max-w-[1100px] mx-auto pt-6 text-center text-xs border-t" style={{ borderColor: "var(--color-cream-darkest)" }}>
        Data licensed under <a href="https://opendatacommons.org/licenses/odbl/1-0/" className="underline">ODbL 1.0</a> · Booking links are affiliate — we may earn a small commission at no cost to you.
      </p>
    </footer>
  );
}
