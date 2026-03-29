import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { Grid } from "../game.js";

const Game = () => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid | null>(null);
  const gridSizeInputXRef = useRef<HTMLInputElement>(null);
  const gridSizeInputYRef = useRef<HTMLInputElement>(null);
  const cellSizeInputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const grid = new Grid(true, el, "gamegrid");
    grid.mount();
    gridRef.current = grid;

    const xIn = gridSizeInputXRef.current;
    const yIn = gridSizeInputYRef.current;
    if (xIn) xIn.value = `${grid.gridSize.x}`;
    if (yIn) yIn.value = `${grid.gridSize.y}`;

    return () => {
      grid.pause();
      gridRef.current = null;
      el.replaceChildren();
      setPlaying(false);
    };
  }, []);

  const handlePlay = () => {
    const grid = gridRef.current;
    if (!grid) return;
    if (playing) {
      grid.pause();
      setPlaying(false);
    } else {
      grid.play();
      setPlaying(true);
    }
  };

  const handleSpeed = (value: number) => {
    gridRef.current?.handleSpeed(value);
  };

  const handleGridSize = () => {
    const grid = gridRef.current;
    const gridSizeInputX = gridSizeInputXRef.current;
    const gridSizeInputY = gridSizeInputYRef.current;
    if (!grid || !gridSizeInputX || !gridSizeInputY) return;

    const x = parseInt(gridSizeInputX.value, 10);
    const y = parseInt(gridSizeInputY.value, 10);
    if (x > 0 && x < 101 && y > 0 && y < 101) {
      const cellsToClick = grid.getAliveCellsCoords();
      grid.resize({ x, y });
      grid.toggleCells(cellsToClick, true);
      gridSizeInputX.value = `${x}`;
      gridSizeInputY.value = `${y}`;
    } else {
      alert("Entrez une valeur entre 1 et 100");
    }
  };

  const handleCellSize = () => {
    const grid = gridRef.current;
    const cellSizeInput = cellSizeInputRef.current;
    if (!grid || !cellSizeInput) return;

    const n = parseInt(cellSizeInput.value, 10);
    if (n > 1 && n < 71) {
      const cellsToClick = grid.getAliveCellsCoords();
      grid.resize(`${n}px`);
      grid.toggleCells(cellsToClick, true);
      cellSizeInput.value = "";
    } else {
      cellSizeInput.value = "";
      alert("Entrez une valeur entre 0 et 70");
    }
  };

  const handleSaveLocaly = () => {
    const grid = gridRef.current;
    if (!grid) return;
    try {
      localStorage.setItem(
        "grid",
        JSON.stringify({
          aliveCells: grid.getAliveCellsCoords(),
          gridSize: grid.gridSize,
        }),
      );
      alert("Grille enregistrée");
    } catch {
      alert("Impossible d'enregistrer");
    }
  };

  const handleLoad = () => {
    const grid = gridRef.current;
    if (!grid) return;
    try {
      const raw = localStorage.getItem("grid");
      if (!raw) throw new Error("empty");
      const localGrid = JSON.parse(raw);
      grid.loadGrid(localGrid.aliveCells, localGrid.gridSize, true);
      alert("Grille chargée");
    } catch {
      alert("Impossible de charger la grille");
    }
  };

  return (
    <main
      id="gamecontainer"
      className="flex flex-col gap-4 p-4 [&_input]:rounded-md [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm"
    >
      <div id="gridcontainer" ref={gridContainerRef} />

      <Button type="button" onClick={handlePlay}>
        {playing ? "Pause" : "Play"}
      </Button>

      <label className="flex flex-col gap-1 text-sm">
        <span>Vitesse</span>
        <input
          type="range"
          min={1}
          max={100}
          defaultValue={1}
          onInput={(e) => handleSpeed(Number(e.currentTarget.value))}
        />
      </label>

      <fieldset className="flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="sr-only">Taille de la grille</legend>
        <input
          ref={gridSizeInputXRef}
          min={0}
          type="number"
          defaultValue={0}
          placeholder="Taille horizontale de la grille"
          aria-label="Taille horizontale de la grille"
        />
        <input
          ref={gridSizeInputYRef}
          min={0}
          type="number"
          defaultValue={0}
          placeholder="Taille verticale de la grille"
          aria-label="Taille verticale de la grille"
        />
        <Button type="button" variant="secondary" onClick={handleGridSize}>
          Ok grille
        </Button>
      </fieldset>

      <fieldset className="flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="sr-only">Taille des cellules</legend>
        <input
          ref={cellSizeInputRef}
          type="number"
          placeholder="Taille d'une cellule"
          aria-label="Taille d'une cellule en pixels"
        />
        <Button type="button" variant="secondary" onClick={handleCellSize}>
          Ok cellule
        </Button>
      </fieldset>

      <fieldset className="flex flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">Sauvegarde locale</legend>
        <Button type="button" variant="outline" onClick={handleSaveLocaly}>
          Sauvegarder localement
        </Button>
        <Button type="button" variant="outline" onClick={handleLoad}>
          Charger
        </Button>
      </fieldset>
    </main>
  );
};

export default Game;
