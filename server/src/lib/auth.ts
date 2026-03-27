import "../load-env.js";

import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optionnel : pour plus de sécurité en prod
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const auth = betterAuth({
  database: pool, // connexion directe à PostgreSQL
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:5173"],
  emailAndPassword: {
    enabled: true, // active l’auth par email + mot de passe
    autoSignIn: true, // connexion automatique après inscription
  },
  // Tu peux ajouter ici socialProviders, magicLink, passkey, etc. plus tard
});
