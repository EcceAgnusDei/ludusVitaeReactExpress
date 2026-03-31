import { betterAuth } from "better-auth";
import { pool } from "./db.js";

export const auth = betterAuth({
  database: pool,
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:5173"],
  emailAndPassword: {
    enabled: true, // active l’auth par email + mot de passe
    autoSignIn: true, // connexion automatique après inscription
  },
  // Tu peux ajouter ici socialProviders, magicLink, passkey, etc. plus tard
});
