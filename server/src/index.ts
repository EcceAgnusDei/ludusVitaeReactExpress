import "./load-env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

const app = express();
const PORT = process.env.PORT || 3000; //ou parseInt(process.env.PORT || "3000", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
// Middleware de protection dees routes
// import { fromNodeHeaders } from "better-auth/node";
// const requireAuth = async (req: any, res: any, next: any) => {
//   const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
//   if (!session) return res.status(401).json({ error: "Non autorisé" });
//   req.user = session.user;
//   next();
// };
// ex d'utilisation :
// app.get("/api/protected", requireAuth, (req, res) => {
//   res.json({ message: "Bienvenue, tu es authentifié !" });
// });

// IMPORTANT : le handler Better Auth DOIT être avant express.json()
app.all("/api/auth/{*splat}", toNodeHandler(auth));

// Maintenant on peut parser le JSON pour tes autres routes
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express + TypeScript Server ! 🚀" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
