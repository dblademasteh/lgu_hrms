import * as Sentry from '@sentry/react';
import React from 'react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';

// Sentry glue for the SPA. Activates only when VITE_SENTRY_DSN is set
// (see frontend/.env.example); without it every call here is a no-op so the
// bundle stays inert in local dev.

const dsn = import.meta.env.VITE_SENTRY_DSN;
export const sentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!sentryEnabled) return null;
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENV || (import.meta.env.DEV ? 'development' : 'production'),
    integrations: [
      // Route-aware performance tracing (SPA navigations become transactions).
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
      ? Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)
      : 0.1,
    // RA 10173: never attach personal data to events unless explicitly scoped.
    sendDefaultPii: false,
  });
  return Sentry;
}

// Wraps createBrowserRouter so route navigations emit tracing transactions.
// Must be applied to the router instance after initSentry() has run.
export function sentryWrapCreateBrowserRouter(createRouter) {
  return sentryEnabled ? Sentry.wrapCreateBrowserRouter(createRouter) : createRouter;
}

// Wired into the root ErrorBoundary so render-time exceptions reach Sentry —
// browser captures of plain runtime errors are handled automatically by init.
export function captureError(error, extra) {
  if (!sentryEnabled) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}