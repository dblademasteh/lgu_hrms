import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { prisma } from './lib/prisma.js';
import { initSentry, captureError } from './lib/sentry.js';
import { startBiometricPoller, stopBiometricPoller } from './services/deviceSyncService.js';
import { AppError } from './lib/errors.js';

await initSentry();

const app = express();

// Real client IPs behind proxies: "1" = trust the first hop (nginx), or a
// comma-separated subnet list e.g. "loopback, 10.0.0.0/8". Required for the
// on-premise login allowlist to see the actual caller address.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy.split(',').map(s => s.trim()).filter(Boolean));

app.use(helmet());
// Same-origin in prod (nginx proxies /api); allow the configured web origin
// plus localhost for developers. Never reflect arbitrary origins.
const allowedOrigins = [process.env.WEB_ORIGIN, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:80'].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter);

// Request log: concise JSON line, dev only. Production ships structured logs
// via the platform collector — never per-request console spam.
if (process.env.NODE_ENV !== 'production') {
  app.use((req,res,next)=>{console.log('req',req.path);next();});
}

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'lgu-hrms-backend' });
});

app.use('/api/v1', routes);

// Turn Prisma database errors that bubble up unhandled into client-safe
// responses instead of leaking internals as a 500 (duplicates → 409,
// broken FKs → 400, missing rows → 404). Services that already convert to
// AppError pass through untouched.
function normalizePrismaError(err) {
  if (err instanceof AppError) return err;
  const code = err?.code;
  if (typeof code === 'string' && /^P2\d{3}$/.test(code)) {
    switch (code) {
      case 'P2002': return new AppError('A record with that unique value already exists', 409, 'DUPLICATE');
      case 'P2003': return new AppError('Referenced record does not exist', 400, 'VALIDATION_ERROR');
      case 'P2025': return new AppError('Record not found', 404, 'NOT_FOUND');
      case 'P2000': return new AppError('Value too long for the field', 400, 'VALIDATION_ERROR');
      default: return new AppError('Database validation failed', 400, 'VALIDATION_ERROR');
    }
  }
  return err;
}

app.use((err, req, res, next) => {
  const normalized = normalizePrismaError(err);
  const status = normalized.status || 500;
  const code = normalized.code || 'INTERNAL_ERROR';
  const message = status >= 500 ? 'Something went wrong' : normalized.message;
  if (status >= 500) {
    console.error(normalized);
    captureError(normalized, req);
  }
  res.status(status).json({ error: { code, message } });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, async () => {
  console.log(`LGU HRMS Backend running on http://localhost:${PORT}`);

  // Biometric terminal poller (ZK pull). Enable with BIOMETRIC_POLLER=1.
  if (process.env.BIOMETRIC_POLLER === '1') {
    startBiometricPoller();
  }

  // Run pending Prisma migrations on startup in production.
  // Skipped in development to avoid interfering with `prisma migrate dev`.
  if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS_ON_STARTUP === 'true') {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      console.log('[startup] Running prisma migrate deploy...');
      await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
        cwd: process.cwd(),
        timeout: 120000,
      });
      console.log('[startup] Migrations applied successfully');
    } catch (e) {
      console.error('[startup] Migration failed:', e);
      captureError(e, { method: 'startup', originalUrl: '/prisma/migrate-deploy' });
      // In production, fail fast rather than serving stale schema.
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
});

// Graceful shutdown: drain connections, then exit.
const shutdown = (signal) => {
  console.log(`\n${signal} received: shutting down gracefully...`);
  stopBiometricPoller();
  server.close(async () => {
    console.log('HTTP server closed');
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected');
    } catch (e) {
      console.error('Error during disconnect:', e);
    }
    process.exit(0);
  });

  // Force exit after 30 seconds if graceful shutdown hangs.
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
