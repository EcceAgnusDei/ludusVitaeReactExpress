class Element {
  constructor(tag, parent, id) {
    this.element = document.createElement(tag);
    id && this.element.setAttribute("id", id);
    this.parent = parent;
    this.noInfinitLoop = 0;
    this.id = id;
  }

  mount() {
    this.parent.appendChild(this.element);
  }

  waitMounting(callback) {
    if (typeof this.element === "undefined" && this.noInfinitLoop < 100) {
      setTimeout(() => {
        this.noInfinitLoop++;
        this.waitMounting();
      }, 1);
    } else if (this.noInfinitLoop >= 100) {
      throw new Error("Erreur dans le chargement de la page");
    } else {
      callback();
    }
  }
}

class Cell extends Element {
  constructor(
    playable,
    x,
    y,
    parent,
    { trackedCells, cells, gridSize },
    id,
    cellSize = "20px",
  ) {
    super("div", parent, id);
    this.playable = playable;
    this.x = x;
    this.y = y;
    this.cells = cells;
    this.trackedCells = trackedCells;
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    this.isAlive = false;
    this.willBeAlive = false;
    this.neighbours = 0;
    this.configureCell();
  }

  configureCell() {
    this.element.style.border = "1px solid black";
    this.element.style.width = this.cellSize;
    this.element.style.height = this.cellSize;
    this.element.style.backgroundColor = "white";
    this.element.style.color = "green"; //pour le developpement
    this.element.setAttribute("x", this.x);
    this.element.setAttribute("y", this.y);
    if (this.playable) {
      this.element.onclick = () => {
        if (this.isAlive) {
          this.setLife(false);
          this.handleNeighbours(false);
        } else {
          this.setLife(true);
          this.handleNeighbours(true);
        }
      };
    }
  }

  willItBeAlive() {
    if (this.isAlive) {
      if (this.neighbours == 2 || this.neighbours == 3) {
        this.willBeAlive = true;
      } else {
        this.willBeAlive = false;
      }
    } else if (this.neighbours == 3) {
      this.willBeAlive = true;
    } else {
      this.willBeAlive = false;
    }
  }

  isOnGrid(x, y) {
    if (x <= 0 || x > this.gridSize.x || y <= 0 || y > this.gridSize.y) {
      return false;
    } else {
      return true;
    }
  }

  addNeighbour() {
    if (!this.trackedCells.includes(this)) {
      this.trackedCells.push(this);
    }
    this.neighbours++;
    this.element.innerText = `${this.neighbours}`;
  }

  dellNeighbour() {
    this.neighbours--;
    this.element.innerText = `${this.neighbours}`;
  }

  selectCellByCoord(x, y) {
    const selectedCell = this.cells.find((cell) => {
      return cell.x == x && cell.y == y;
    });
    return selectedCell;
  }

  handleNeighbours(isBroughtToLife) {
    for (let i = this.x - 1; i <= this.x + 1; i++) {
      for (let j = this.y - 1; j <= this.y + 1; j++) {
        if ((i != this.x || j != this.y) && this.isOnGrid(i, j)) {
          const neighbour = this.selectCellByCoord(i, j);
          if (isBroughtToLife) {
            neighbour.addNeighbour();
          } else {
            neighbour.dellNeighbour();
          }
        }
      }
    }
  }

  setLife(isAlive) {
    if (isAlive) {
      this.isAlive = true;
      this.element.style.backgroundColor = "black";
      if (!this.trackedCells.includes(this)) {
        this.trackedCells.push(this);
      }
    } else {
      this.isAlive = false;
      this.element.style.backgroundColor = "white";
    }
  }
}

class Line extends Element {
  constructor(parent, id) {
    super("div", parent, id);
    this.configureLine();
  }

  configureLine() {
    this.element.style.display = "flex";
  }
}

class Grid extends Element {
  constructor(playable, parent, id) {
    super("div", parent, id);
    this.playable = playable;
    this.trackedCells = [];
    this.cells = [];
    this.baseInterval = 2000;
    this.gridSize = { x: 10, y: 10 };
    this.isPlaying = false;
    this.timerId = null;
    this.dbId;
    this.devider = 1;
    this.count = 0;
    this.configureGrid();
  }

  configureGrid() {
    this.element.style.width = "fit-content";
    this.waitMounting(this.createCells.bind(this));
  }

  createCells() {
    this.element.innerHTML = ""; //réinitialisation
    this.cells = [];
    this.trackedCells = [];

    for (let y = 1; y <= this.gridSize.y; y++) {
      const line = new Line(this.element);
      for (let x = 1; x <= this.gridSize.x; x++) {
        const cell = new Cell(
          this.playable,
          x,
          y,
          line.element,
          this,
          `${this.id}x${x}y${y}`,
        );
        this.cells.push(cell);
        line.waitMounting(cell.mount.bind(cell));
      }
      this.waitMounting(line.mount.bind(line));
    }
  }

  popUntrackedCells() {
    this.trackedCells = this.trackedCells.filter((cell) => {
      return cell.neighbours != 0 || cell.isAlive;
    });
  }

  resize(value) {
    if (typeof value == "string") {
      this.cells.forEach((cell) => {
        cell.element.style.width = value;
        cell.element.style.height = value;
      });
    } else {
      this.gridSize.x = value.x;
      this.gridSize.y = value.y;
      this.createCells();
    }
  }

  getAliveCellsCoords() {
    const aliveCellsCoords = [];
    this.trackedCells.forEach(({ x, y, isAlive }) => {
      if (isAlive) {
        aliveCellsCoords.push({ x, y });
      }
    });
    return aliveCellsCoords;
  }

  toggleCells(cellsToToggle, click = false) {
    cellsToToggle.forEach(({ x, y }) => {
      const cellToToggle = document.getElementById(`${this.id}x${x}y${y}`);
      if (click) {
        cellToToggle.click();
      } else {
        cellToToggle.style.backgroundColor = "black";
      }
    });
  }

  loadGrid(aliveCellsCoords, gridSize, click = false) {
    this.resize({ x: gridSize.x, y: gridSize.y });
    this.toggleCells(aliveCellsCoords, click);
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
    this.trackedCells.forEach((cell) => {
      cell.willItBeAlive();
    });
    this.trackedCells.forEach((cell) => {
      if (cell.isAlive != cell.willBeAlive) {
        cell.setLife(cell.willBeAlive);
        cell.handleNeighbours(cell.willBeAlive);
      }
    });
  }

  play() {
    this.isPlaying = true;
    this.timerId = setTimeout(() => {
      this.nextState();
      this.count++;
      if (this.count % 20 == 0) {
        this.popUntrackedCells();
      }
      this.play();
    }, this.baseInterval / this.devider);
  }

  pause() {
    this.isPlaying = false;
    clearTimeout(this.timerId);
  }
}

class Container extends Element {
  constructor(id, parent) {
    super("div", id, parent);
  }
}

export { Container, Grid };
