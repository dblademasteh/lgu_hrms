import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source-map upload only runs for production builds when the org/project/token
// trio is present (Sentry SaaS). Without the auth token the plugin is a no-op
// and builds stay sourcemap-free — local dev is never affected.
const sentryUploadEnabled = Boolean(process.env.VITE_SENTRY_AUTH_TOKEN);

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.VITE_SENTRY_ORG,
      project: process.env.VITE_SENTRY_PROJECT,
      authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
      disable: !sentryUploadEnabled,
      sourcemaps: { assets: ['./dist/**'] },
      telemetry: false,
    }),
  ],
  build: {
    sourcemap: sentryUploadEnabled,
  },
  server: {
    port: 5173,
    host: true,
  },
});