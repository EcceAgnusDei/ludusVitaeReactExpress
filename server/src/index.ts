import "./load-env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { gridsRouter } from "./routes/grids.js";

const app = express();
const PORT = process.env.PORT || 3000; //ou parseInt(process.env.PORT || "3000", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middlewares — CORP same-origin empêche le navigateur de lire les réponses API
// depuis une autre origine (ex. Vite :5173 → Express :3000), même avec CORS.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
// IMPORTANT : le handler Better Auth DOIT être avant express.json()
app.all("/api/auth/{*splat}", toNodeHandler(auth));

// Maintenant on peut parser le JSON pour tes autres routes
app.use(express.json());

app.use("/api/grids", gridsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express + TypeScript Server ! 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
