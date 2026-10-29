"use client";

/**
 * Root-level error boundary (required companion to the root layout).
 * Catches failures inside the root layout itself — without this, a layout
 * crash in production renders the platform error page / blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div
          style={{
            margin: "10vh auto",
            maxWidth: 480,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            color: "#fff",
            background: "#000",
            padding: 32,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            The app hit an unexpected error{error.digest ? ` (ref: ${error.digest})` : ""}. Reload to try
            again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #444",
              background: "var(--color-cb-bg-elevated)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
