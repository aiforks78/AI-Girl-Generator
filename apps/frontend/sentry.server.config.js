// This file configures the initialization of Sentry on the server side
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  instrumenter: 'sentry',
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Custom tags for Girl Generator
  initialScope: {
    tags: {
      component: 'server',
      project: 'girl-generator'
    },
  },
  
  // Server-specific configuration
  integrations: [
    // Add server-specific integrations here
  ],
  
  // Filter server errors
  beforeSend(event, hint) {
    // Add server-specific filtering logic
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message;
      
      // Filter out expected errors that shouldn't be reported
      if (message.includes('ECONNRESET') ||
          message.includes('EPIPE') ||
          message.includes('Client disconnected')) {
        return null;
      }
    }
    
    return event;
  },
});
