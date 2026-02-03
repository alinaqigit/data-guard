import { createDataGuardApp } from "./app";
import { Server } from "http";

export function startServer(): Server {
  const PORT = process.env.PORT || 4000;
  const app = createDataGuardApp();

  return app.listen(PORT, () => {
    console.log(`Express running on ${PORT}`);
  });
}
