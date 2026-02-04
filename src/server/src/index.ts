import { Config, createDataGuardApp } from "./app";
import { Server } from "http";

export function startServer(config: Config): Server {
  const PORT = process.env.PORT || 4000;
  const app = createDataGuardApp(config);

  return app.listen(PORT, () => {
    console.log(`Express running on ${PORT}`);
  });
}
