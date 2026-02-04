import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';

export interface Config {
  IS_PRODUCTION: boolean;
  
}

export function createDataGuardApp(config: Config): Application {
  const app = express();

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
  app.use('/api', routes);

  return app;
}
