import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  cellKey,
  computeNextGeneration,
  parseCellKey,
} from "@/lib/game-of-life";

export type GridCoord = { x: number; y: number };

export type GridHandle = {
  getAliveCellsCoords: () => GridCoord[];
  applyAliveCells: (coords: GridCoord[]) => void;
  resize: (value: string | GridCoord) => void;
  play: () => void;
  pause: () => void;
  handleSpeed: (divider: number) => void;
  gridSize: { x: number; y: number };
  cellSize: string;
};

type GridProps = {
  playable?: boolean;
  /** Lu uniquement au premier rendu (remonter avec `key` pour une nouvelle grille). */
  initialGridSize?: GridCoord | null;
  initialAliveCells?: GridCoord[] | null;
  initialCellSize?: string | null;
};

const DEFAULT_GRID = { x: 50, y: 30 };
const DEFAULT_CELL_SIZE = "20px";
const BASE_INTERVAL_MS = 2000;

/** Applique ou retire le style « cellule vivante » (`lv-cell--alive`) pour une case donnée. */
function setCellAliveVisual(
  root: HTMLElement,
  x: number,
  y: number,
  isAlive: boolean,
) {
  root.querySelector(`[x="${x}"][y="${y}"]`)?.classList.toggle("lv-cell--alive", isAlive);
}

export const Grid = forwardRef<GridHandle, GridProps>(function LifeGrid(
  {
    playable = true,
    initialGridSize = null,
    initialAliveCells = null,
    initialCellSize = null,
  },
  ref,
) {
  const [gridSize, setGridSize] = useState(
    () => initialGridSize ?? DEFAULT_GRID,
  );
  const [cellSize, setCellSize] = useState(
    () => initialCellSize ?? DEFAULT_CELL_SIZE,
  );
  const [alive, setAlive] = useState<Set<string>>(() => {
    if (!initialAliveCells?.length) return new Set();
    return new Set(
      initialAliveCells.map((c) =>
        cellKey(Math.trunc(c.x), Math.trunc(c.y)),
      ),
    );
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [divider, setDivider] = useState(1);

  const rootRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement[]>([]);
  /** État déjà reflété dans le DOM (pour ne parcourir que born/died). */
  const domSyncedAliveRef = useRef<Set<string>>(new Set());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(alive);
  const gridSizeRef = useRef(gridSize);
  const cellSizeRef = useRef(cellSize);
  const isPlayingRef = useRef(isPlaying);
  const dividerRef = useRef(divider);
  const playableRef = useRef(playable);

  aliveRef.current = alive;
  gridSizeRef.current = gridSize;
  cellSizeRef.current = cellSize;
  isPlayingRef.current = isPlaying;
  dividerRef.current = divider;
  playableRef.current = playable;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const kill = useCallback((x: number, y: number) => {
    const k = cellKey(x, y);
    if (aliveRef.current.has(k)) {
      setAlive((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }
    const root = rootRef.current;
    if (root && cellsRef.current.length > 0) {
      setCellAliveVisual(root, x, y, false);
    }
    const synced = new Set(domSyncedAliveRef.current);
    synced.delete(k);
    domSyncedAliveRef.current = synced;
  }, []);

  const giveBirth = useCallback((x: number, y: number) => {
    const k = cellKey(x, y);
    if (!aliveRef.current.has(k)) {
      setAlive((prev) => {
        const next = new Set(prev);
        next.add(k);
        return next;
      });
    }
    const root = rootRef.current;
    if (root && cellsRef.current.length > 0) {
      setCellAliveVisual(root, x, y, true);
    }
    const synced = new Set(domSyncedAliveRef.current);
    synced.add(k);
    domSyncedAliveRef.current = synced;
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      const { x: maxX, y: maxY } = gridSizeRef.current;
      const prev = aliveRef.current;
      const { born, died } = computeNextGeneration(prev, maxX, maxY);
      for (const key of died) {
        const { x, y } = parseCellKey(key);
        kill(x, y);
      }
      for (const key of born) {
        const { x, y } = parseCellKey(key);
        giveBirth(x, y);
      }
      if (isPlayingRef.current) {
        scheduleNext();
      }
    }, BASE_INTERVAL_MS / dividerRef.current);
  }, [clearTimer, kill, giveBirth]);

  const toggleCell = useCallback(
    (x: number, y: number) => {
      const k = cellKey(x, y);
      if (aliveRef.current.has(k)) kill(x, y);
      else giveBirth(x, y);
    },
    [kill, giveBirth],
  );

  /**
   * Recrée toute la grille DOM quand les dimensions ou le mode cliquable changent :
   * vide le conteneur, recrée une div par case (attributs x/y, styles), branche les clics si jouable,
   * puis peint les cellules vivantes via giveBirth pour aligner le DOM sur l’état React `alive`.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const { x: w, y: h } = gridSize;
    const cs = cellSizeRef.current;
    const canPlay = playableRef.current;

    root.style.display = "grid";
    root.style.width = "fit-content";
    root.style.gridTemplateColumns = `repeat(${w}, ${cs})`;
    root.style.gridAutoRows = cs;

    root.replaceChildren();
    const list: HTMLDivElement[] = [];
    const fragment = document.createDocumentFragment();

    for (let y = 1; y <= h; y++) {
      for (let x = 1; x <= w; x++) {
        const div = document.createElement("div");
        div.classList.add("lv-cell");
        div.style.width = cs;
        div.style.height = cs;
        div.setAttribute("x", String(x));
        div.setAttribute("y", String(y));
        if (canPlay) {
          div.onclick = () => {
            toggleCell(x, y);
          };
        }
        fragment.appendChild(div);
        list.push(div);
      }
    }

    root.appendChild(fragment);
    cellsRef.current = list;
    domSyncedAliveRef.current = new Set();
    for (const key of aliveRef.current) {
      const { x, y } = parseCellKey(key);
      giveBirth(x, y);
    }
  }, [gridSize.x, gridSize.y, playable, toggleCell, giveBirth]);

  /**
   * Ajuste uniquement la taille des cellules (px) sans recréer les nœuds : met à jour le template
   * CSS du conteneur et width/height de chaque div existante quand `cellSize` change.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const cells = cellsRef.current;
    const { x: w } = gridSizeRef.current;
    const cs = cellSize;
    if (!root || cells.length === 0) return;

    root.style.gridTemplateColumns = `repeat(${w}, ${cs})`;
    root.style.gridAutoRows = cs;
    for (const el of cells) {
      el.style.width = cs;
      el.style.height = cs;
    }
  }, [cellSize]);

  useEffect(() => {
    if (!isPlaying) {
      clearTimer();
      return;
    }
    scheduleNext();
    return clearTimer;
  }, [isPlaying, divider, scheduleNext, clearTimer]);

  useImperativeHandle(
    ref,
    () => ({
      get gridSize() {
        return { ...gridSizeRef.current };
      },
      get cellSize() {
        return cellSizeRef.current;
      },
      getAliveCellsCoords: () => {
        const out: GridCoord[] = [];
        for (const key of aliveRef.current) {
          const [xs, ys] = key.split(",");
          out.push({ x: Number(xs), y: Number(ys) });
        }
        return out;
      },
      applyAliveCells: (coords: GridCoord[]) => {
        for (const { x, y } of coords) {
          giveBirth(x, y);
        }
      },
      resize: (value) => {
        if (typeof value === "string") {
          cellSizeRef.current = value;
          setCellSize(value);
        } else {
          setGridSize({ x: value.x, y: value.y });
        }
      },
      play: () => setIsPlaying(true),
      pause: () => {
        clearTimer();
        setIsPlaying(false);
      },
      handleSpeed: (d: number) => {
        setDivider(d);
      },
    }),
    [clearTimer, giveBirth],
  );

  return (
    <div
      ref={rootRef}
      className="w-fit"
      style={{ display: "grid", width: "fit-content" }}
    />
  );
});

Grid.displayName = "Grid";
