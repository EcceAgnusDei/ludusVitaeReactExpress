import { Router } from "express";
import { randomUUID } from "crypto";
import { fromNodeHeaders } from "better-auth/node";
import { pool } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const gridsRouter = Router();

type GridRow = {
  id: string;
  userId: string;
  name: string | null;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
};

/** Extrait l’identifiant unique depuis un paramètre de route Express (gère le cas tableau). */
function routeParamId(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Tri explicite à chaque appel (pagination / cohérence client). */
type GridsListSortMode = "recent" | "popular";

/** Lit `sort` depuis la query ; retourne le mode de tri ou `null` si valeur absente ou invalide. */
function parseGridsListSort(sort: unknown): GridsListSortMode | null {
  const raw = Array.isArray(sort) ? sort[0] : sort;
  if (raw === "recent" || raw === "popular") return raw;
  return null;
}

const GRIDS_PAGE_DEFAULT_LIMIT = 10;
const GRIDS_PAGE_MAX_LIMIT = 50;

/** Curseur pagination (JSON puis base64url) : `v` version schéma, `sort`, `u` = updatedAt ISO, `i` = id ; si popular, `l` = likeCount. */
type GridsCursorRecent = { v: 1; sort: "recent"; u: string; i: string };
type GridsCursorPopular = {
  v: 1;
  sort: "popular";
  l: number;
  u: string;
  i: string;
};
type GridsCursorPayload = GridsCursorRecent | GridsCursorPopular;

/** Sérialise la clé de curseur en chaîne base64url pour le paramètre `cursor` de l'URL qui sera renvoyée par le client au prochain appel. */
function encodeGridsCursor(payload: GridsCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Vérifie que la chaîne a le format d’un UUID (pour valider le champ `i` du curseur avant usage SQL). */
function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

/** Constantes de vérification */
const GRIDS_CURSOR_B64_MAX_LENGTH = 2048;
const GRIDS_CURSOR_KEYS_RECENT = ["i", "sort", "u", "v"] as const;
const GRIDS_CURSOR_KEYS_POPULAR = ["i", "l", "sort", "u", "v"] as const;
const PG_INT_MAX = 2_147_483_647;

type ParseGridsCursorResult =
  | { ok: true; value: GridsCursorPayload | null }
  | { ok: false; reason: "sort_mismatch" | "invalid" };

/** Vérifie que `obj` n’a ni clés en trop ni en manquante par rapport à `expected` (curseur JSON strict). */
function hasExactKeySet(obj: object, expected: readonly string[]): boolean {
  const keys = Object.keys(obj);
  if (keys.length !== expected.length) return false;
  const set = new Set(keys);
  return expected.every((k) => set.has(k));
}

/** Décode et valide `?cursor=` ; `null` = première page ; `ok: false` = illisible, clés invalides ou `sort` ≠ requête. */
function parseGridsListCursor(
  raw: unknown,
  expectedSort: GridsListSortMode,
): ParseGridsCursorResult {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === null || s === "") {
    return { ok: true, value: null };
  }
  if (typeof s !== "string") {
    return { ok: false, reason: "invalid" };
  }
  if (s.length > GRIDS_CURSOR_B64_MAX_LENGTH) {
    return { ok: false, reason: "invalid" };
  }
  let parsed: unknown;
  try {
    const json = Buffer.from(s, "base64url").toString("utf8");
    parsed = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "invalid" };
  }
  if (Object.getPrototypeOf(parsed) !== Object.prototype) {
    return { ok: false, reason: "invalid" };
  }
  const p = parsed as {
    v?: unknown;
    sort?: unknown;
    u?: unknown;
    i?: unknown;
    l?: unknown;
  };
  if (p.v !== 1) {
    return { ok: false, reason: "invalid" };
  }
  if (p.sort !== "recent" && p.sort !== "popular") {
    return { ok: false, reason: "invalid" };
  }
  if (p.sort !== expectedSort) {
    return { ok: false, reason: "sort_mismatch" };
  }
  if (p.sort === "recent") {
    if (!hasExactKeySet(parsed, GRIDS_CURSOR_KEYS_RECENT)) {
      return { ok: false, reason: "invalid" };
    }
    if (typeof p.u !== "string" || typeof p.i !== "string") {
      return { ok: false, reason: "invalid" };
    }
    const t = Date.parse(p.u);
    if (Number.isNaN(t)) {
      return { ok: false, reason: "invalid" };
    }
    if (!isUuidLike(p.i)) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, value: { v: 1, sort: "recent", u: p.u, i: p.i } };
  }
  if (!hasExactKeySet(parsed, GRIDS_CURSOR_KEYS_POPULAR)) {
    return { ok: false, reason: "invalid" };
  }
  if (
    typeof p.l !== "number" ||
    !Number.isInteger(p.l) ||
    p.l < 0 ||
    p.l > PG_INT_MAX
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof p.u !== "string" || typeof p.i !== "string") {
    return { ok: false, reason: "invalid" };
  }
  if (Number.isNaN(Date.parse(p.u))) {
    return { ok: false, reason: "invalid" };
  }
  if (!isUuidLike(p.i)) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    value: { v: 1, sort: "popular", l: p.l, u: p.u, i: p.i },
  };
}

/** Lit `limit` depuis la query, avec valeur par défaut et plafond pour la taille d’une page. */
function parseGridsPageLimit(raw: unknown): number {
  const n = Array.isArray(raw) ? raw[0] : raw;
  const v =
    typeof n === "string" ? parseInt(n, 10) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(v) || v < 1) return GRIDS_PAGE_DEFAULT_LIMIT;
  return Math.min(Math.floor(v), GRIDS_PAGE_MAX_LIMIT);
}

/** Construit le curseur « page suivante » pour le tri par date de mise à jour (clé : updatedAt, id). */
function cursorFromRowRecent(row: { updatedAt: Date; id: string }): string {
  return encodeGridsCursor({
    v: 1,
    sort: "recent",
    u: row.updatedAt.toISOString(),
    i: row.id,
  });
}

/** Construit le curseur « page suivante » pour le tri par popularité (clé : likeCount, updatedAt, id). */
function cursorFromRowPopular(row: {
  likeCount: number;
  updatedAt: Date;
  id: string;
}): string {
  return encodeGridsCursor({
    v: 1,
    sort: "popular",
    l: row.likeCount,
    u: row.updatedAt.toISOString(),
    i: row.id,
  });
}

/** Convertit une ligne SQL grille en objet JSON API (sans champs dérivés likes / créateur). */
function rowToJson(row: GridRow) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    data: row.data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

gridsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { name, data } = req.body as { name?: unknown; data?: unknown };

    if (name !== undefined && name !== null && typeof name !== "string") {
      res.status(400).json({ error: "name doit être une chaîne ou null" });
      return;
    }
    if (data !== undefined && (data === null || typeof data !== "object")) {
      res.status(400).json({ error: "data doit être un objet" });
      return;
    }

    const payload = data === undefined ? {} : (data as object);
    const id = randomUUID();

    const { rows } = await pool.query<GridRow>(
      `insert into "grid" ("id", "userId", "name", "data")
       values ($1, $2, $3, $4::jsonb)
       returning "id", "userId", "name", "data", "createdAt", "updatedAt"`,
      [id, userId, name === undefined ? null : name, JSON.stringify(payload)],
    );

    res.status(201).json(rowToJson(rows[0]!));
  } catch (err) {
    next(err);
  }
});

type GridRowWithCreator = GridRow & { creatorName: string };

type GridRowWithLikes = GridRowWithCreator & {
  likeCount: number;
  likedByMe: boolean;
};

const GRIDS_ALL_SELECT = `select g."id", g."userId", g."name", g."data", g."createdAt", g."updatedAt",
              u."name" as "creatorName",
              (select count(*)::int from "grid_like" l where l."gridId" = g."id") as "likeCount",
              case
                when $1::text is null then false
                else exists (
                  select 1 from "grid_like" l2
                  where l2."gridId" = g."id" and l2."userId" = $1
                )
              end as "likedByMe"
       from "grid" g
       inner join "user" u on u."id" = g."userId"`;

/** Récupère jusqu’à `fetchLimit` lignes pour `/all` (curseur optionnel ; clé populaire = likes, updatedAt, id). */
async function queryGridsAllRawPage(
  viewerId: string | null,
  sortMode: GridsListSortMode,
  fetchLimit: number,
  cursor: GridsCursorPayload | null,
): Promise<GridRowWithLikes[]> {
  if (sortMode === "recent") {
    if (cursor === null) {
      const { rows } = await pool.query<GridRowWithLikes>(
        `${GRIDS_ALL_SELECT}
       order by g."updatedAt" desc, g."id" desc
       limit $2`,
        [viewerId, fetchLimit],
      );
      return rows;
    }
    const c = cursor;
    const { rows } = await pool.query<GridRowWithLikes>(
      `${GRIDS_ALL_SELECT}
       where (
         g."updatedAt" < $2::timestamptz
         or (g."updatedAt" = $2::timestamptz and g."id" < $3::text)
       )
       order by g."updatedAt" desc, g."id" desc
       limit $4`,
      [viewerId, c.u, c.i, fetchLimit],
    );
    return rows;
  }

  if (sortMode === "popular") {
    const likeExpr = `(select count(*)::int from "grid_like" lp where lp."gridId" = g."id")`;
    if (cursor === null) {
      const { rows } = await pool.query<GridRowWithLikes>(
        `${GRIDS_ALL_SELECT}
       order by ${likeExpr} desc, g."updatedAt" desc, g."id" desc
       limit $2`,
        [viewerId, fetchLimit],
      );
      return rows;
    }
    const pop = cursor as GridsCursorPopular;
    const { rows } = await pool.query<GridRowWithLikes>(
      `${GRIDS_ALL_SELECT}
       where (
         ${likeExpr} < $2::int
         or (${likeExpr} = $2::int and g."updatedAt" < $3::timestamptz)
         or (${likeExpr} = $2::int and g."updatedAt" = $3::timestamptz and g."id" < $4::text)
       )
       order by ${likeExpr} desc, g."updatedAt" desc, g."id" desc
       limit $5`,
      [viewerId, pop.l, pop.u, pop.i, fetchLimit],
    );
    return rows;
  }

  const _exhaustive: never = sortMode;
  return _exhaustive;
}

gridsRouter.get("/all", async (req, res, next) => {
  try {
    const sortMode = parseGridsListSort(req.query.sort);
    if (sortMode === null) {
      res.status(400).json({
        error: "Paramètre sort requis : recent ou popular",
      });
      return;
    }
    const parsedCursor = parseGridsListCursor(req.query.cursor, sortMode);
    if (!parsedCursor.ok) {
      res.status(400).json({
        error:
          parsedCursor.reason === "sort_mismatch"
            ? "Ce curseur ne correspond pas au tri (sort) demandé."
            : "Curseur de pagination invalide.",
      });
      return;
    }
    const limit = parseGridsPageLimit(req.query.limit);
    const fetchLimit = limit + 1;
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    const viewerId = session?.user.id ?? null;
    const rows = await queryGridsAllRawPage(
      viewerId,
      sortMode,
      fetchLimit,
      parsedCursor.value,
    );
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last !== undefined
        ? sortMode === "recent"
          ? cursorFromRowRecent(last)
          : cursorFromRowPopular(last)
        : null;
    res.json({
      items: page.map((row) => ({
        ...rowToJson(row),
        creatorName: row.creatorName,
        likeCount: row.likeCount,
        likedByMe: row.likedByMe,
      })),
      nextCursor,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

type GridRowLikedByMe = GridRowWithCreator & {
  likeCount: number;
  likedByMe: boolean;
};

gridsRouter.get("/me/likes", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { rows } = await pool.query<GridRowLikedByMe>(
      `select g."id", g."userId", g."name", g."data", g."createdAt", g."updatedAt",
              u."name" as "creatorName",
              (select count(*)::int from "grid_like" l where l."gridId" = g."id") as "likeCount",
              true as "likedByMe"
       from "grid_like" gl
       inner join "grid" g on g."id" = gl."gridId"
       inner join "user" u on u."id" = g."userId"
       where gl."userId" = $1
       order by gl."createdAt" desc`,
      [userId],
    );
    res.json(
      rows.map((row) => ({
        ...rowToJson(row),
        creatorName: row.creatorName,
        likeCount: row.likeCount,
        likedByMe: row.likedByMe,
      })),
    );
  } catch (err) {
    next(err);
  }
});

async function likeCountForGrid(gridId: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `select count(*)::int as n from "grid_like" where "gridId" = $1`,
    [gridId],
  );
  return rows[0]?.n ?? 0;
}

gridsRouter.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const id = routeParamId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Identifiant de grille manquant" });
      return;
    }
    try {
      await pool.query(
        `insert into "grid_like" ("gridId", "userId") values ($1, $2)
         on conflict do nothing`,
        [id, userId],
      );
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "23503") {
        res.status(404).json({ error: "Grille introuvable" });
        return;
      }
      throw e;
    }
    const likeCount = await likeCountForGrid(id);
    res.status(200).json({ liked: true, likeCount });
  } catch (err) {
    next(err);
  }
});

gridsRouter.delete("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const id = routeParamId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Identifiant de grille manquant" });
      return;
    }
    await pool.query(
      `delete from "grid_like" where "gridId" = $1 and "userId" = $2`,
      [id, userId],
    );
    const likeCount = await likeCountForGrid(id);
    res.status(200).json({ liked: false, likeCount });
  } catch (err) {
    next(err);
  }
});

type GridRowWithLikeFields = GridRow & {
  likeCount: number;
  likedByMe: boolean;
};

const GRIDS_USER_SELECT = `select g."id", g."userId", g."name", g."data", g."createdAt", g."updatedAt",
              (select count(*)::int from "grid_like" l where l."gridId" = g."id") as "likeCount",
              case
                when $2::text is null then false
                else exists (
                  select 1 from "grid_like" l2
                  where l2."gridId" = g."id" and l2."userId" = $2
                )
              end as "likedByMe"
       from "grid" g
       where g."userId" = $1`;

gridsRouter.get("/user/:userId", async (req, res, next) => {
  try {
    const sortMode = parseGridsListSort(req.query.sort);
    if (sortMode === null) {
      res.status(400).json({
        error: "Paramètre sort requis : recent ou popular",
      });
      return;
    }
    const { userId } = req.params;
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    const viewerId = session?.user.id ?? null;
    const likeExpr = `(select count(*)::int from "grid_like" lp where lp."gridId" = g."id")`;
    const orderBy =
      sortMode === "recent"
        ? `order by g."updatedAt" desc, g."id" desc`
        : `order by ${likeExpr} desc, g."updatedAt" desc, g."id" desc`;
    const { rows } = await pool.query<GridRowWithLikeFields>(
      `${GRIDS_USER_SELECT}
       ${orderBy}`,
      [userId, viewerId],
    );
    res.json(
      rows.map((row) => ({
        ...rowToJson(row),
        likeCount: row.likeCount,
        likedByMe: row.likedByMe,
      })),
    );
  } catch (err) {
    next(err);
  }
});

gridsRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query<GridRow>(
      `select "id", "userId", "name", "data", "createdAt", "updatedAt"
       from "grid"
       where "id" = $1`,
      [id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Grille introuvable" });
      return;
    }
    res.json(rowToJson(rows[0]));
  } catch (err) {
    next(err);
  }
});

gridsRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const body = req.body as { name?: unknown; data?: unknown };

    const hasName = Object.prototype.hasOwnProperty.call(body, "name");
    const hasData = Object.prototype.hasOwnProperty.call(body, "data");

    if (!hasName && !hasData) {
      res.status(400).json({ error: "Fournir au moins name ou data" });
      return;
    }

    if (
      hasName &&
      body.name !== null &&
      body.name !== undefined &&
      typeof body.name !== "string"
    ) {
      res.status(400).json({ error: "name doit être une chaîne ou null" });
      return;
    }
    if (hasData && (body.data === null || typeof body.data !== "object")) {
      res.status(400).json({ error: "data doit être un objet" });
      return;
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let p = 1;

    if (hasName) {
      sets.push(`"name" = $${p++}`);
      values.push(body.name === undefined ? null : body.name);
    }
    if (hasData) {
      sets.push(`"data" = $${p++}::jsonb`);
      values.push(JSON.stringify(body.data as object));
    }

    const idParam = p++;
    const userParam = p++;
    values.push(id, userId);

    const { rows } = await pool.query<GridRow>(
      `update "grid"
       set ${sets.join(", ")}
       where "id" = $${idParam} and "userId" = $${userParam}
       returning "id", "userId", "name", "data", "createdAt", "updatedAt"`,
      values,
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Grille introuvable" });
      return;
    }
    res.json(rowToJson(rows[0]));
  } catch (err) {
    next(err);
  }
});

gridsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `delete from "grid" where "id" = $1 and "userId" = $2`,
      [id, userId],
    );
    if (!rowCount) {
      res.status(404).json({ error: "Grille introuvable" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
