/** Encode une position de grille en clé unique pour les `Set` (`"x,y"`). */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Décode une clé `"x,y"` en coordonnées entières. */
export function parseCellKey(key: string): { x: number; y: number } {
  const [xs, ys] = key.split(",");
  return { x: Number(xs), y: Number(ys) };
}

/** Déplacements relatifs des 8 voisins d’une case (Moore). */
const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * Compte combien de cellules de `alive` touchent `(cx, cy)` sur ses 8 voisins
 * (la case centrale n’est pas comptée ; sert aux règles de survie et de naissance).
 */
function countLiveNeighborsAround(
  alive: Set<string>,
  cx: number,
  cy: number,
  maxX: number,
  maxY: number,
): number {
  let n = 0;
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const i = cx + dx;
    const j = cy + dy;
    if (i < 1 || i > maxX || j < 1 || j > maxY) continue;
    if (alive.has(cellKey(i, j))) n++;
  }
  return n;
}

/** Résultat d’une étape du jeu : naissances et morts par rapport à l’état courant. */
export type GenerationDelta = {
  born: Set<string>;
  died: Set<string>;
};

/**
 * Avance d’une génération du jeu de la vie sur une grille `maxX`×`maxY` (1-based).
 * Sert à obtenir `died` (vivantes qui meurent) et `born` (mortes voisines d’une vivante qui naissent)
 * à partir de `currentlyAlive`.
 */
export function computeNextGeneration(
  currentlyAlive: Set<string>,
  maxX: number,
  maxY: number,
): GenerationDelta {
  const died = new Set<string>();

  for (const key of currentlyAlive) {
    const { x, y } = parseCellKey(key);
    const liveNeighbors = countLiveNeighborsAround(
      currentlyAlive,
      x,
      y,
      maxX,
      maxY,
    );
    if (liveNeighbors < 2 || liveNeighbors > 3) {
      died.add(key);
    }
  }

  const deadNeighborsOfLive = new Set<string>();
  for (const key of currentlyAlive) {
    const { x: cx, y: cy } = parseCellKey(key);
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const i = cx + dx;
      const j = cy + dy;
      if (i < 1 || i > maxX || j < 1 || j > maxY) continue;
      const neighborKey = cellKey(i, j);
      if (!currentlyAlive.has(neighborKey)) {
        deadNeighborsOfLive.add(neighborKey);
      }
    }
  }

  const born = new Set<string>();
  for (const key of deadNeighborsOfLive) {
    const { x, y } = parseCellKey(key);
    const liveNeighbors = countLiveNeighborsAround(
      currentlyAlive,
      x,
      y,
      maxX,
      maxY,
    );
    if (liveNeighbors === 3) {
      born.add(key);
    }
  }

  return { born, died };
}
