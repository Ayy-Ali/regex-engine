import cors from "cors";
import express from "express";
import regexRoutes from "./routes/regexRoutes.js";

const app = express();
const port = Number(process.env.PORT || 4000);

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

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err.message || "Unexpected server error",
    details: err.details || null,
  });
});

app.listen(port, () => {
  console.log(`Regex Visualizer backend listening on http://localhost:${port}`);
});

