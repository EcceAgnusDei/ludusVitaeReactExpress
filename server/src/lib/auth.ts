import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { pool } from "./db.js";
import { assertUniqueUserName } from "./uniqueUserName.js";

function excludeUserIdForUserUpdate(ctx: unknown): string | undefined {
  if (!ctx || typeof ctx !== "object") return undefined;
  const c = ctx as {
    body?: unknown;
    context?: { session?: { user?: { id?: string } } | null };
  };
  if (typeof c.body === "object" && c.body !== null) {
    const body = c.body as { userId?: unknown };
    if (typeof body.userId === "string") return body.userId;
  }
  return c.context?.session?.user?.id;
}

export const auth = betterAuth({
  database: pool,
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:5173"],
  emailAndPassword: {
    enabled: true, // active l’auth par email + mot de passe
    autoSignIn: true, // connexion automatique après inscription
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name = typeof user.name === "string" ? user.name.trim() : "";
          if (!name) return { data: user };
          await assertUniqueUserName(pool, name, null);
          return { data: { ...user, name } };
        },
      },
      update: {
        before: async (partial, ctx) => {
          if (!Object.prototype.hasOwnProperty.call(partial, "name")) {
            return { data: partial };
          }
          const raw = partial.name;
          const name = typeof raw === "string" ? raw.trim() : "";
          if (!name) {
            throw new APIError("BAD_REQUEST", {
              message: "Le nom d'utilisateur ne peut pas être vide.",
            });
          }
          await assertUniqueUserName(
            pool,
            name,
            excludeUserIdForUserUpdate(ctx),
          );
          return { data: { ...partial, name } };
        },
      },
    },
  },
  // Tu peux ajouter ici socialProviders, magicLink, passkey, etc. plus tard
});
