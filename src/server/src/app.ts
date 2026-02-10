import express, { Application } from 'express';
import cors from 'cors';
import { authModule } from './modules/auth';

export interface Config {
  IS_PRODUCTION: boolean;
  DB_PATH: string;
}

export function createDataGuardApp(config: Config): Application {
  const app = express();

  // modules setup
  const auth = new authModule(config.DB_PATH);

  // CORS
  const corsOptions = {
    origin: config.IS_PRODUCTION? 'null' : 'localhost',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.get('/api/health', (_, res) => res.json({ status: 'OK' }));

  app.use('/api/auth', auth.authController.getRouter());

  return app;
}
