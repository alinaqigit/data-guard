import { Router } from "express";

const routes = Router();

routes.get("/health", (_, res) => {
  res.send({
    status: "healthy",
  });
});



export default routes;
