import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestTimeout } from './middleware/requestTimeout.js';
import apiRouter from './routes/api.js';

const app = express();

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestTimeout(15000));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use('/api', apiRouter);

app.get('/health', (_req, res) => {
  res.json({
    service: 'RDS read scaling lab',
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`RDS read scaling lab running on port ${config.port}`);
  });
}

export default app;
