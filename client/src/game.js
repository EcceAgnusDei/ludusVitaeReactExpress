/** Coordonnées relatives des voisins d'une cellules */
const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

class Element {
  constructor(tag, parent, id) {
    this.element = document.createElement(tag);
    id && this.element.setAttribute("id", id);
    this.parent = parent;
    this.id = id;
    parent.appendChild(this.element);
  }
}

class Cell extends Element {
  constructor(playable, x, y, parent, grid, id, cellSize = "20px") {
    super("div", parent, id);
    this.grid = grid;
    this.playable = playable;
    this.x = x;
    this.y = y;
    this.cellSize = cellSize;
    this.isAlive = false;
    this.willBeAlive = false;
    this.configureCell();
  }

  configureCell() {
    this.element.classList.add("lv-cell");
    this.element.style.width = this.cellSize;
    this.element.style.height = this.cellSize;
    this.element.setAttribute("x", this.x);
    this.element.setAttribute("y", this.y);
    if (this.playable) {
      this.element.onclick = () => {
        if (this.isAlive) {
          this.setLife(false);
        } else {
          this.setLife(true);
        }
      };
    }
  }

  setLife(isAlive) {
    if (isAlive) {
      this.isAlive = true;
      this.element.classList.add("lv-cell--alive");
      this.grid.trackedCells.add(this);
    } else {
      this.isAlive = false;
      this.element.classList.remove("lv-cell--alive");
      this.grid.trackedCells.delete(this);
    }
  }
}

class Grid extends Element {
  constructor(playable, parent, id) {
    super("div", parent, id);
    this.playable = playable;
    this.trackedCells = new Set();
    this.cells = [];
    this.cellSize = "20px";
    this.baseInterval = 2000;
    this.gridSize = { x: 50, y: 30 };
    this.isPlaying = false;
    this.timerId = null;
    this.dbId;
    this.devider = 1;
    this.configureGrid();
  }

  getCell(x, y) {
    return this.cells[(y - 1) * this.gridSize.x + (x - 1)];
  }

  configureGrid() {
    const root = this.element;
    root.style.width = "fit-content";
    this.createCells();
  }

  createCells() {
    const root = this.element;
    root.innerHTML = "";
    this.cells = [];
    this.trackedCells = new Set();

    root.style.display = "grid";
    root.style.gridTemplateColumns = `repeat(${this.gridSize.x}, ${this.cellSize})`;
    root.style.gridAutoRows = this.cellSize;

    const fragment = document.createDocumentFragment();

    for (let y = 1; y <= this.gridSize.y; y++) {
      for (let x = 1; x <= this.gridSize.x; x++) {
        const cell = new Cell(
          this.playable,
          x,
          y,
          fragment,
          this,
          `${this.id}x${x}y${y}`,
          this.cellSize,
        );
        this.cells.push(cell);
      }
    }
    root.appendChild(fragment);
    this.syncVisualsFromState();
  }

  resize(value) {
    if (typeof value == "string") {
      this.cellSize = value;
      const root = this.element;
      root.style.gridTemplateColumns = `repeat(${this.gridSize.x}, ${value})`;
      root.style.gridAutoRows = value;
      this.cells.forEach((cell) => {
        cell.cellSize = value;
        cell.element.style.width = value;
        cell.element.style.height = value;
      });
      this.syncVisualsFromState();
    } else {
      this.gridSize.x = value.x;
      this.gridSize.y = value.y;
      this.createCells();
    }
  }

  getAliveCellsCoords() {
    const aliveCellsCoords = [];
    for (const cell of this.trackedCells) {
      aliveCellsCoords.push({ x: cell.x, y: cell.y });
    }
    return aliveCellsCoords;
  }

  applyAliveCells(coords) {
    for (const { x, y } of coords) {
      const cell = this.getCell(x, y);
      if (cell && !cell.isAlive) {
        cell.setLife(true);
      }
    }
    this.syncVisualsFromState();
  }

  syncVisualsFromState() {
    for (const cell of this.cells) {
      cell.element.classList.toggle("lv-cell--alive", cell.isAlive);
    }
  }

  loadGrid(aliveCellsCoords, gridSize) {
    this.resize({ x: gridSize.x, y: gridSize.y });
    this.applyAliveCells(aliveCellsCoords);
    console.log("Grille chargée");
  }

  handleSpeed(devider) {
    this.devider = devider;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  nextState() {
    const liveNeighborCount = new Map();
    const maxX = this.gridSize.x;
    const maxY = this.gridSize.y;

    for (const live of this.trackedCells) {
      const { x: cx, y: cy } = live;
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const i = cx + dx;
        const j = cy + dy;
        if (i < 1 || i > maxX || j < 1 || j > maxY) continue;
        const c = this.getCell(i, j);
        liveNeighborCount.set(c, (liveNeighborCount.get(c) ?? 0) + 1);
      }
    }

    const candidates = new Set(this.trackedCells);
    for (const c of liveNeighborCount.keys()) {
      candidates.add(c);
    }

    for (const cell of candidates) {
      const n = liveNeighborCount.get(cell) ?? 0;
      const alive = cell.isAlive;
      cell.willBeAlive = n === 3 || (alive && n === 2);
    }
    for (const cell of candidates) {
      if (cell.isAlive !== cell.willBeAlive) cell.setLife(cell.willBeAlive);
    }
  }

  play() {
    this.isPlaying = true;
    this.timerId = setTimeout(() => {
      this.nextState();
      this.play();
    }, this.baseInterval / this.devider);
  }

  pause() {
    this.isPlaying = false;
    clearTimeout(this.timerId);
  }
}

export { Grid };
