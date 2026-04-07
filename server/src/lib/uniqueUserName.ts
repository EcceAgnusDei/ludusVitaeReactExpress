import type { Pool } from "pg";
import { APIError } from "better-auth/api";

/**
 * Vérifie que le nom affiché (champ `user.name`) n'est pas déjà pris,
 * en comparant de façon insensible à la casse après trim.
 */
export async function assertUniqueUserName(
  pool: Pool,
  trimmedName: string,
  excludeUserId?: string | null,
): Promise<void> {
  if (!trimmedName) return;
  const { rows } = await pool.query(
    `SELECT 1 FROM "user"
     WHERE LOWER(TRIM("name")) = LOWER($1)
       AND ($2::text IS NULL OR "id" <> $2)
     LIMIT 1`,
    [trimmedName, excludeUserId ?? null],
  );
  if (rows.length > 0) {
    throw new APIError("BAD_REQUEST", {
      message: "Ce nom d'utilisateur est déjà utilisé.",
    });
  }
}
