import { app } from "./app.js";
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4000);

app.listen(port, host, () => {
  console.log(`Regex Visualizer backend listening on http://${host}:${port}`);
});
