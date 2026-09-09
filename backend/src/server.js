import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req,res,next)=>{console.log('req',req.path);next();});

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
