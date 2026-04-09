import { createHash, randomBytes, randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Router } from "express";
import { pool } from "../lib/db.js";
import {
  passwordResetRequestRateLimit,
  passwordResetTokenRateLimit,
} from "../lib/passwordResetRateLimit.js";
import {
  GENERIC_SENT,
  sendPasswordResetEmail,
} from "../lib/sendPasswordResetEmail.js";

export const passwordResetRouter = Router();

const TOKEN_BYTES = 32;
/** Durée de validité du lien (heures). */
const EXPIRES_HOURS = 48;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

const INVALID_LINK =
  "Lien invalide ou expiré. Demande un nouveau lien depuis la page de connexion.";

function validateNewPasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }
  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }
  if (!/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  return null;
}

/**
 * Vérifie si le jeton est encore utilisable (sans révéler la raison exacte).
 */
passwordResetRouter.get(
  "/validate",
  passwordResetTokenRateLimit,
  async (req, res, next) => {
    try {
      const raw =
        typeof req.query.token === "string" ? req.query.token.trim() : "";
      if (!raw) {
        res.status(200).json({ valid: false });
        return;
      }
      const tokenHash = hashToken(raw);
      const { rows } = await pool.query<{ one: number }>(
        `SELECT 1 AS "one"
         FROM "password_reset_token"
         WHERE "tokenHash" = $1 AND "usedAt" IS NULL AND "expiresAt" > NOW()
         LIMIT 1`,
        [tokenHash],
      );
      res.status(200).json({ valid: rows.length > 0 });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Applique le nouveau mot de passe (hash compatible Better Auth) et invalide le jeton.
 */
passwordResetRouter.post(
  "/complete",
  passwordResetTokenRateLimit,
  async (req, res, next) => {
    try {
      const body = req.body as { token?: unknown; newPassword?: unknown };
      const rawToken =
        typeof body.token === "string" ? body.token.trim() : "";
      const newPassword =
        typeof body.newPassword === "string" ? body.newPassword : "";

      if (!rawToken) {
        res.status(400).json({ message: INVALID_LINK });
        return;
      }

      const pwdError = validateNewPasswordStrength(newPassword);
      if (pwdError) {
        res.status(400).json({ message: pwdError });
        return;
      }

      const tokenHash = hashToken(rawToken);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows: tokenRows } = await client.query<{
          id: string;
          userId: string;
        }>(
          `SELECT "id", "userId" FROM "password_reset_token"
           WHERE "tokenHash" = $1 AND "usedAt" IS NULL AND "expiresAt" > NOW()
           FOR UPDATE`,
          [tokenHash],
        );
        const row = tokenRows[0];
        if (!row) {
          await client.query("ROLLBACK");
          res.status(400).json({ message: INVALID_LINK });
          return;
        }

        const hashed = await hashPassword(newPassword);
        const { rowCount } = await client.query(
          `UPDATE "account"
           SET "password" = $1, "updatedAt" = NOW()
           WHERE "userId" = $2 AND "providerId" = 'credential'`,
          [hashed, row.userId],
        );
        if (rowCount === 0) {
          await client.query("ROLLBACK");
          res.status(400).json({ message: INVALID_LINK });
          return;
        }

        await client.query(
          `UPDATE "password_reset_token" SET "usedAt" = NOW() WHERE "id" = $1`,
          [row.id],
        );
        await client.query(`DELETE FROM "session" WHERE "userId" = $1`, [
          row.userId,
        ]);
        await client.query("COMMIT");
        res.status(200).json({
          message: "Ton mot de passe a été mis à jour. Tu peux te connecter.",
        });
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* connexion hors transaction */
        }
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Étape 2 du flux : demande de réinitialisation.
 * Réponse identique que l’e-mail existe ou non (pas d’énumération).
 */
passwordResetRouter.post(
  "/request",
  passwordResetRequestRateLimit,
  async (req, res, next) => {
    try {
      const body = req.body as { email?: unknown };
      if (typeof body.email !== "string") {
        res.status(400).json({ message: "Adresse e-mail requise." });
        return;
      }
      const email = body.email.trim();
      if (!email || !email.includes("@")) {
        res.status(400).json({ message: "Adresse e-mail invalide." });
        return;
      }

      const { rows } = await pool.query<{ id: string }>(
        `SELECT "id" FROM "user" WHERE LOWER(TRIM("email")) = LOWER(TRIM($1)) LIMIT 1`,
        [email],
      );

      const user = rows[0];
      if (user) {
        const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
        const tokenHash = hashToken(rawToken);
        const id = randomUUID();
        const expiresAt = new Date(
          Date.now() + EXPIRES_HOURS * 60 * 60 * 1000,
        );

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `DELETE FROM "password_reset_token" WHERE "userId" = $1 AND "usedAt" IS NULL`,
            [user.id],
          );
          await client.query(
            `INSERT INTO "password_reset_token" ("id", "userId", "tokenHash", "expiresAt")
             VALUES ($1, $2, $3, $4)`,
            [id, user.id, tokenHash, expiresAt.toISOString()],
          );
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }

        try {
          await sendPasswordResetEmail(email, rawToken);
        } catch (err) {
          console.error("[password-reset] échec envoi e-mail:", err);
        }
      }

      res.status(200).json({ message: GENERIC_SENT });
    } catch (err) {
      next(err);
    }
  },
);
