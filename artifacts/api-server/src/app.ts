import path from "node:path";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// The app is served same-origin through the Replit path-routing proxy, so no
// CORS middleware: wildcard CORS + credentialed cookies would be unsafe.
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Outside Replit there is no path-routing proxy, so the API also serves the built storefront.
const staticDir = process.env["STATIC_DIR"];
if (staticDir) {
  app.use(express.static(staticDir));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.resolve(staticDir, "index.html")));
}

export default app;
