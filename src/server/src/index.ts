import { Config, createDataGuardApp } from "./app";
import { Server } from "http";

export function startServer(config: Config): Server {
  const PORT = process.env.PORT || 4000;
  const app = createDataGuardApp(config);

  return app.listen(PORT, () => {
    console.log(`Express running on ${PORT}`);
  });
}

if (require.main === module) {
  const config: Config = {
    IS_PRODUCTION: false, // Set to true in production environment
    DB_PATH: process.env.DB_PATH || './database-files'
  };
  startServer(config);
}