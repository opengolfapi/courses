'use client';

// Error boundary for /admin/edits — shows the actual error in production.
// (Admin route, behind auth, so it's safe to surface details.)

export default function AdminEditsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 font-mono text-sm">
      <h1 className="text-xl font-bold mb-3 text-red-700">Admin error</h1>
      <p className="mb-2"><strong>Message:</strong> {error.message || '(no message)'}</p>
      {error.digest && <p className="mb-2"><strong>Digest:</strong> {error.digest}</p>}
      {error.stack && (
        <pre className="mt-4 p-3 bg-gray-100 rounded text-xs whitespace-pre-wrap break-all overflow-auto max-h-[60vh]">
          {error.stack}
        </pre>
      )}
      <button
        onClick={reset}
        className="mt-4 px-3 py-1.5 rounded text-xs font-semibold bg-gray-800 text-white"
      >
        Retry
      </button>
    </div>
  );
}
