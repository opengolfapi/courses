type Verification = {
  ai_verdict?: 'approve' | 'reject' | 'inconclusive';
  ai_confidence?: number;
  ai_reasoning?: string;
  sources_checked?: string[];
  flagged?: string;
  recent_count?: number;
} | null;

export function EvidencePanel({ verification }: { verification: Verification }) {
  if (!verification) {
    return (
      <div className="text-[11px] mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
        No verification yet · runs nightly 02:00 UTC
      </div>
    );
  }

  if (verification.flagged === 'burst') {
    return (
      <div
        className="text-[11px] mt-1.5 px-2 py-1 rounded inline-block"
        style={{ background: '#b85450', color: 'white' }}
      >
        ⚠ Burst pattern · {verification.recent_count} edits in 10 min
      </div>
    );
  }

  const v = verification.ai_verdict;
  if (!v) return null;
  const verdictColor =
    v === 'approve'
      ? 'var(--color-evergreen-700)'
      : v === 'reject'
        ? '#b85450'
        : 'var(--color-ink-muted)';
  const conf = verification.ai_confidence != null ? Math.round(verification.ai_confidence * 100) : null;

  return (
    <div className="text-[11px] mt-1.5 leading-snug">
      <div>
        <strong style={{ color: verdictColor }}>{v}</strong>
        {conf != null && <span style={{ color: 'var(--color-ink-muted)' }}> · {conf}% confidence</span>}
        {verification.sources_checked && verification.sources_checked.length > 0 && (
          <span style={{ color: 'var(--color-ink-muted)' }}> · {verification.sources_checked.join(', ')}</span>
        )}
      </div>
      {verification.ai_reasoning && (
        <div className="italic mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
          {verification.ai_reasoning.slice(0, 280)}
          {verification.ai_reasoning.length > 280 ? '…' : ''}
        </div>
      )}
    </div>
  );
}
