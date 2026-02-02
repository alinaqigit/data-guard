import express, { Application } from 'express';

export function createDataGuardApp(): Application {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
