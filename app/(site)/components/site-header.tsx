import Link from "next/link";
import { MobileNav } from "./mobile-nav";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export function SiteHeader() {
  return (
    <header className="relative bg-cream border-b border-cream-darkest" style={{ background: "var(--color-cream)", borderColor: "var(--color-cream-darkest)" }}>
      <nav className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-[22px] font-bold tracking-tight" style={{ color: "var(--color-evergreen-950)" }}>
          Open<em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>Golf</em>API
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          <details className="relative group [&[open]>summary>span]:rotate-180">
            <summary className="list-none cursor-pointer hover:text-[var(--color-evergreen-950)] transition-colors inline-flex items-center gap-1 select-none">
              Browse
              <span className="text-[10px] transition-transform duration-150" aria-hidden="true">▾</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 z-50">
              <div className="grid grid-cols-5 gap-1 p-3 bg-white rounded-md shadow-xl border" style={{ borderColor: "var(--color-cream-darkest)" }}>
                {US_STATES.map((st) => (
                  <Link
                    key={st}
                    href={`/courses/${st.toLowerCase()}`}
                    className="px-2 py-1 text-xs rounded hover:bg-[var(--color-cream)]"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {st}
                  </Link>
                ))}
              </div>
            </div>
          </details>
          <Link href="/search" className="hover:text-[var(--color-evergreen-950)] transition-colors">Search</Link>
          <Link href="/near-me" className="hover:text-[var(--color-evergreen-950)] transition-colors">Near me</Link>
          <a href="https://opengolfapi.org/#api" className="hover:text-[var(--color-evergreen-950)] transition-colors">API</a>
          <Link
            href="/submit"
            className="px-3 py-1.5 rounded text-sm font-semibold"
            style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}
          >
            Submit
          </Link>
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
