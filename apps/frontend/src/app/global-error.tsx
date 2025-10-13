"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Capture the rendering error once on mount
    Sentry.captureException(error, {
      tags: { component: "global-error", project: "girl-generator" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <html>
      <body>
        <div style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>The error has been reported. You can try again.</p>
            <button
              onClick={() => reset()}
              style={{
                background: "#2563eb",
                color: "white",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

