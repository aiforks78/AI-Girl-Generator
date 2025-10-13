import * as Sentry from "@sentry/nextjs";

// Initialize Sentry on the client (replaces the deprecated sentry.client.config.js)
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    instrumenter: "sentry",

    // Adjust this in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Helpful logs during local setup
    debug: process.env.NODE_ENV === "development",

    // Session Replay sampling
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA || "development",

    initialScope: {
      tags: {
        component: "client",
        project: "girl-generator",
      },
    },

    beforeSend(event, hint) {
      // Filter out non-actionable noise
      if (event.exception) {
        const err = hint?.originalException as any;
        const message: string | undefined = err?.message;
        if (
          typeof message === "string" &&
          (message.includes("Non-Error promise rejection captured") ||
            message.includes("ResizeObserver loop limit exceeded") ||
            message.includes("Script error"))
        ) {
          return null;
        }
      }
      return event;
    },
});

// Exported for Next.js router navigation instrumentation (required by Sentry)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
