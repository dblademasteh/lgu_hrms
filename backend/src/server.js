import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

app.use(helmet());
// Same-origin in prod (nginx proxies /api); allow the configured web origin
// plus localhost for developers. Never reflect arbitrary origins.
const allowedOrigins = [process.env.WEB_ORIGIN, 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:80'].filter(Boolean);
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

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  res.status(status).json({ error: { code, message: err.message } });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`LGU HRMS Backend running on http://localhost:${PORT}`);
});
