import { Config, createDataGuardApp } from "./app";
import { Server } from "http";
import { initSocketService } from "./modules/socket/socket.service";

export function startServer(config: Config): Server {
  const PORT = process.env.PORT || 4000;
  const app = createDataGuardApp(config);

  const httpServer = new Server(app);

  // Initialize Socket.IO attached to the HTTP server
  initSocketService(httpServer, config.IS_PRODUCTION);

  return httpServer.listen(PORT, () => {
    console.log(`Express running on ${PORT}`);
  });
}

if (require.main === module) {
  const config: Config = {
    IS_PRODUCTION: false,
    DB_PATH: process.env.DB_PATH || "./database-files",
  };
  startServer(config);
}