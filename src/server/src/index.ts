import { createDataGuardApp } from "./app";
import { Server } from "http";

export function startServer(port = 3001): Server {
  const app = createDataGuardApp();

  return app.listen(port, () => {
    console.log(`Express running on ${port}`);
  });
}
