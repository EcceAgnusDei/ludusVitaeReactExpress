import { Grid } from "./game.js";

export function handleGame() {
  const gridContainer = document.getElementById("gridcontainer");
  const grid = new Grid(true, gridContainer, "gamegrid");
  grid.mount();

  async function saveLocaly(data) {
    try {
      localStorage.setItem("grid", JSON.stringify(data));
      alert("Grille enregistrée");
    } catch {
      alert("Impossible d'enregistrer");
    }
  }

  async function loadLocaly() {
    try {
      const localGrid = JSON.parse(localStorage.getItem("grid"));
      grid.loadGrid(localGrid.aliveCells, localGrid.gridSize, true);
      alert("Grille chargée");
    } catch {
      alert("Impossible de charger la grille");
    }
  }

  (function handlePlay() {
    const playButton = document.getElementById("playbutton");
    playButton.onclick = (event) => {
      if (event.target.innerText === "Play") {
        event.target.innerText = "Pause";
        grid.play();
      } else {
        event.target.innerText = "Play";
        grid.pause();
      }
    };
  })();

  (function handleSpeed() {
    const speedSlider = document.getElementById("speedslider");
    speedSlider.addEventListener("input", () => {
      grid.handleSpeed(speedSlider.value);
    });
  })();

  (function handleGridSize() {
    const gridSizeInputX = document.getElementById("gridsizeinputx");
    gridSizeInputX.value = `${grid.gridSize.x}`;
    const gridSizeInputY = document.getElementById("gridsizeinputy");
    gridSizeInputY.value = `${grid.gridSize.y}`;
    const gridSizeButton = document.getElementById("gridsizebutton");
    gridSizeButton.onclick = () => {
      if (
        parseInt(gridSizeInputX.value) > 0 &&
        parseInt(gridSizeInputX.value) < 101 &&
        parseInt(gridSizeInputY.value) > 0 &&
        parseInt(gridSizeInputY.value) < 101
      ) {
        const x = parseInt(gridSizeInputX.value);
        const y = parseInt(gridSizeInputY.value);
        const cellsToClick = grid.getAliveCellsCoords();
        grid.resize({
          x,
          y,
        });
        grid.toggleCells(cellsToClick, true);
        gridSizeInputX.value = `${x}`;
        gridSizeInputY.value = `${y}`;
      } else {
        alert("Entrez une valeur entre 1 et 100");
      }
    };
  })();

  (function handleCellSize() {
    const cellSizeInput = document.getElementById("cellsizeinput");
    const cellSizeButton = document.getElementById("cellsizebutton");
    cellSizeButton.onclick = () => {
      if (
        parseInt(cellSizeInput.value) > 1 &&
        parseInt(cellSizeInput.value) < 71
      ) {
        const cellsToClick = grid.getAliveCellsCoords();
        grid.resize(cellSizeInput.value + "px");
        grid.toggleCells(cellsToClick, true);
        cellSizeInput.value = "";
      } else {
        cellSizeInput.value = "";
        alert("Entrez une valeur entre 0 et 70");
      }
    };
  })();

  (function handleSaveLocaly() {
    const saveButton = document.getElementById("savelocalybutton");
    saveButton.onclick = () => {
      saveLocaly({
        aliveCells: grid.getAliveCellsCoords(),
        gridSize: grid.gridSize,
      });
    };
  })();

  (function handleLoad() {
    const loadButton = document.getElementById("loadbutton");
    loadButton.onclick = () => {
      loadLocaly();
    };
  })();
}
