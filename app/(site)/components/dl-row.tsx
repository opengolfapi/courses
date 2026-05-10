export function DLRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b" style={{ borderColor: "var(--color-cream-darker)" }}>
      <dt className="text-xs uppercase tracking-wider flex-shrink-0" style={{ color: "var(--color-ink-muted)" }}>{label}</dt>
      <dd className="text-sm font-medium text-right">{children}</dd>
    </div>
  );
}
