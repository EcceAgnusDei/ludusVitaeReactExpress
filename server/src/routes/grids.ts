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

function routeParamId(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

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

gridsRouter.get("/all", async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    const viewerId = session?.user.id ?? null;
    const sortPopular = req.query.sort === "popular";
    const sortMode = sortPopular ? "popular" : "recent";
    const { rows } = await pool.query<GridRowWithLikes>(
      `select g."id", g."userId", g."name", g."data", g."createdAt", g."updatedAt",
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
       inner join "user" u on u."id" = g."userId"
       order by
         (case when $2::text = 'popular'
           then (select count(*)::int from "grid_like" l3 where l3."gridId" = g."id")
         end) desc nulls last,
         g."updatedAt" desc`,
      [viewerId, sortMode],
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

gridsRouter.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    const viewerId = session?.user.id ?? null;
    const sortPopular = req.query.sort === "popular";
    const sortMode = sortPopular ? "popular" : "recent";
    const { rows } = await pool.query<GridRowWithLikeFields>(
      `select g."id", g."userId", g."name", g."data", g."createdAt", g."updatedAt",
              (select count(*)::int from "grid_like" l where l."gridId" = g."id") as "likeCount",
              case
                when $2::text is null then false
                else exists (
                  select 1 from "grid_like" l2
                  where l2."gridId" = g."id" and l2."userId" = $2
                )
              end as "likedByMe"
       from "grid" g
       where g."userId" = $1
       order by
         (case when $3::text = 'popular'
           then (select count(*)::int from "grid_like" l3 where l3."gridId" = g."id")
         end) desc nulls last,
         g."updatedAt" desc`,
      [userId, viewerId, sortMode],
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
