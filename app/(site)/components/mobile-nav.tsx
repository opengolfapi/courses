"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
        style={{ color: "var(--color-evergreen-950)" }}
      >
        <span className={`block w-5 h-[2px] bg-current transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
        <span className={`block w-5 h-[2px] bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`block w-5 h-[2px] bg-current transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-16 z-50 border-b shadow-lg px-6 py-5"
          style={{ background: "var(--color-cream)", borderColor: "var(--color-cream-darkest)" }}
        >
          <div className="flex flex-col gap-1 text-[15px]" style={{ color: "var(--color-ink)" }}>
            <Link href="/search" className="py-2">Search</Link>
            <Link href="/near-me" className="py-2">Near me</Link>
            <Link href="/contribute" className="py-2">Contribute</Link>
            <a href="https://opengolfapi.org/#api" className="py-2">API</a>
            <Link
              href="/submit"
              className="mt-2 px-4 py-2.5 rounded text-sm font-semibold text-center"
              style={{ background: "var(--color-evergreen-950)", color: "var(--color-cream)" }}
            >
              Submit a course
            </Link>
          </div>
          <p className="font-display italic text-xs mt-5 mb-2" style={{ color: "var(--color-brass-700)" }}>
            Browse by state
          </p>
          <div className="grid grid-cols-6 gap-1">
            {US_STATES.map((st) => (
              <Link
                key={st}
                href={`/courses/${st.toLowerCase()}`}
                className="px-1 py-1.5 text-xs text-center rounded hover:bg-white"
                style={{ color: "var(--color-ink)" }}
              >
                {st}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
