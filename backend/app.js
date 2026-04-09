import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import regexRoutes from "./routes/regexRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, "../frontend/dist");

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "regex-visualizer-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/regex", regexRoutes);

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.status(503).json({
      ok: false,
      error:
        "Frontend build not found. Run `npm run build` before starting the production server.",
    });
  });
}

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err.message || "Unexpected server error",
    details: err.details || null,
  });
});

