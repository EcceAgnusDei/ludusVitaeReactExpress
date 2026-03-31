import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../lib/db.js";
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

gridsRouter.get("/all", async (req, res, next) => {
  try {
    const { rows } = await pool.query<GridRow>(
      `select "id", "userId", "name", "data", "createdAt", "updatedAt"
       from "grid"
       order by "updatedAt" desc`,
    );
    res.json(rows.map(rowToJson));
  } catch (err) {
    next(err);
  }
});

gridsRouter.get("/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query<GridRow>(
      `select "id", "userId", "name", "data", "createdAt", "updatedAt"
       from "grid"
       where "userId" = $1
       order by "updatedAt" desc`,
      [userId],
    );
    res.json(rows.map(rowToJson));
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
    if (
      hasData &&
      (body.data === null || typeof body.data !== "object")
    ) {
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
