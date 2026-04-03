import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { Grid } from "@/components/Grid";

const MIN_CELL_PX = 2;
/** Largeur cible max de la miniature (px), sans dépasser le slot. */
const THUMB_TARGET_WIDTH_PX = 350;

/**
 * Taille de cellule (px entiers) : min 2px.
 * Largeur cible : min(350px, largeur du slot) pour rester dans la colonne du layout.
 */
function cellSizeForThumbnail(columns: number, slotWidthPx: number): number {
  const available = slotWidthPx > 0 ? slotWidthPx : THUMB_TARGET_WIDTH_PX;
  const targetGridWidth = Math.min(THUMB_TARGET_WIDTH_PX, available);
  return Math.max(MIN_CELL_PX, Math.ceil(targetGridWidth / columns));
}

type ParsedPayload = {
  aliveCells: { x: number; y: number }[];
  gridSize: { x: number; y: number };
};

function parseGridPayload(data: unknown): ParsedPayload | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const gridSizeRaw = d.gridSize;
  const aliveRaw = d.aliveCells;
  if (!gridSizeRaw || typeof gridSizeRaw !== "object") return null;
  const gx = (gridSizeRaw as { x?: unknown }).x;
  const gy = (gridSizeRaw as { y?: unknown }).y;
  if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null;
  const x = Number(gx);
  const y = Number(gy);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1)
    return null;
  if (!Array.isArray(aliveRaw)) return null;

  const aliveCells: { x: number; y: number }[] = [];
  for (const c of aliveRaw) {
    if (!c || typeof c !== "object") continue;
    const cx = (c as { x?: unknown }).x;
    const cy = (c as { y?: unknown }).y;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    aliveCells.push({ x: Number(cx), y: Number(cy) });
  }

  return { aliveCells, gridSize: { x, y } };
}

type GridThumbnailProps = {
  gridId: string;
  data: unknown;
  /** Titre affiché sous la grille (dans le composant si `showCreator`, sinon laisser la galerie gérer). */
  caption?: string | null;
  showCreator?: boolean;
  /** Nom affiché (ex. jointure `GET /api/grids/all`). */
  creatorName?: string | null;
};

export function GridThumbnail({
  gridId,
  data,
  caption,
  showCreator = false,
  creatorName,
}: GridThumbnailProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(MIN_CELL_PX);

  const parsed = useMemo(() => parseGridPayload(data), [data]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || !parsed) return;

    const update = () => {
      const w = slot.getBoundingClientRect().width;
      setCellPx(cellSizeForThumbnail(parsed.gridSize.x, w));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(slot);
    const vv = window.visualViewport;
    window.addEventListener("resize", update);
    vv?.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
    };
  }, [gridId, parsed]);

  const gridMountKey = useMemo(() => {
    //la complexité du code garantit que la key est bien unique
    if (!parsed) return "";
    const aliveSig = [...parsed.aliveCells]
      .map((c) => `${c.x},${c.y}`)
      .sort()
      .join(";");
    return [
      gridId,
      cellPx,
      parsed.gridSize.x,
      parsed.gridSize.y,
      aliveSig,
    ].join("|");
  }, [gridId, cellPx, parsed]);

  if (!parsed) {
    return (
      <p className="text-xs text-muted-foreground" aria-hidden>
        —
      </p>
    );
  }

  const captionText = caption?.trim();
  const captionBlock =
    captionText != null && captionText.length > 0 ? (
      <p className="w-full max-w-full truncate text-center text-sm font-medium text-foreground">
        {captionText}
      </p>
    ) : null;

  const creatorTrimmed = creatorName?.trim();
  const creatorLine = showCreator ? (
    <p className="w-full max-w-full truncate text-center text-xs text-muted-foreground">
      {creatorTrimmed != null && creatorTrimmed.length > 0
        ? `Par ${creatorTrimmed}`
        : "Créateur inconnu"}
    </p>
  ) : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      <div ref={slotRef} className="relative w-full min-w-0">
        <div className="w-full" aria-hidden>
          <div
            className="pointer-events-none mx-auto w-fit max-w-full select-none"
            aria-hidden
          >
            <Grid
              key={gridMountKey}
              playable={false}
              initialGridSize={parsed.gridSize}
              initialAliveCells={parsed.aliveCells}
              initialCellSize={`${cellPx}px`}
            />
          </div>
        </div>
      </div>
      {showCreator ? (
        <>
          {captionBlock}
          {creatorLine}
        </>
      ) : null}
    </div>
  );
}
