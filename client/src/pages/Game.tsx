import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

import { Grid } from "../game.js";

/** Plafond largeur × hauteur : au-delà, trop de nœuds DOM pour rester fluide dans le navigateur. */
const MAX_GRID_CELLS = 20_000;

const Game = () => {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid | null>(null);
  const [playing, setPlaying] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [gridSizeInputs, setGridSizeInputs] = useState({ x: "", y: "" });
  const [cellSizeInput, setCellSizeInput] = useState("");

  const syncInputsFromGrid = () => {
    const grid = gridRef.current;
    if (!grid) return;
    setGridSizeInputs({
      x: `${grid.gridSize.x}`,
      y: `${grid.gridSize.y}`,
    });
    const raw = String(grid.cellSize).replace(/px$/i, "").trim();
  };

  useLayoutEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const grid = new Grid(true, el, "gamegrid");
    gridRef.current = grid;
    syncInputsFromGrid();

    return () => {
      grid.pause();
      gridRef.current = null;
      el.replaceChildren();
      setPlaying(false);
      setGridSizeInputs({ x: "", y: "" });
      setCellSizeInput("");
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
    if (!grid) return;

    const x = parseInt(gridSizeInputs.x, 10);
    const y = parseInt(gridSizeInputs.y, 10);
    const total = x * y;
    if (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 1 &&
      y >= 1 &&
      total <= MAX_GRID_CELLS
    ) {
      const aliveBefore = grid.getAliveCellsCoords();
      grid.resize({ x, y });
      grid.applyAliveCells(aliveBefore);
      syncInputsFromGrid();
    } else {
      setNoticeMessage(
        `Largeur et hauteur entières ≥ 1, avec au plus ${MAX_GRID_CELLS.toLocaleString("fr-FR")} cellules au total (largeur × hauteur).`,
      );
    }
  };

  const handleCellSize = () => {
    const grid = gridRef.current;
    if (!grid) return;

    const trimmed = cellSizeInput.trim();
    const n = Number(trimmed);

    if (!Number.isFinite(n)) {
      setNoticeMessage("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }
    if (!Number.isInteger(n)) {
      setNoticeMessage(
        "La taille d'une cellule doit être un entier (en pixels).",
      );
      syncInputsFromGrid();
      return;
    }
    if (n < 1) {
      setNoticeMessage("Entrez une valeur entière supérieure à 0.");
      syncInputsFromGrid();
      return;
    }

    grid.resize(`${n}px`);
    syncInputsFromGrid();
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
      setNoticeMessage("Grille enregistrée");
    } catch {
      setNoticeMessage("Impossible d'enregistrer");
    }
  };

  const handleLoad = () => {
    const grid = gridRef.current;
    if (!grid) return;
    try {
      const raw = localStorage.getItem("grid");
      if (!raw) throw new Error("empty");
      const localGrid = JSON.parse(raw) as {
        aliveCells: Parameters<Grid["loadGrid"]>[0];
        gridSize: Parameters<Grid["loadGrid"]>[1];
      };
      grid.loadGrid(localGrid.aliveCells, localGrid.gridSize);
      syncInputsFromGrid();
      setNoticeMessage("Grille chargée");
    } catch {
      setNoticeMessage("Impossible de charger la grille");
    }
  };

  return (
    <main
      id="gamecontainer"
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 [&_input]:rounded-md [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-2 [&_input]:py-1 [&_input]:text-sm"
    >
      <div
        id="gridcontainer"
        ref={gridContainerRef}
        className="grid min-h-0 min-w-0 max-w-full flex-1 place-items-center overflow-auto p-2"
      />

      <div className="mx-auto flex max-w-[min(18rem,100%)] flex-col items-center gap-4">
        <Button type="button" onClick={handlePlay}>
          {playing ? "Pause" : "Play"}
        </Button>

        <label className="flex w-full flex-col gap-1 text-sm">
          <span>Vitesse</span>
          <input
            type="range"
            min={1}
            max={100}
            defaultValue={1}
            className="w-full"
            onInput={(e) => handleSpeed(Number(e.currentTarget.value))}
          />
        </label>

        <fieldset className="flex w-full flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Taille de la grille</legend>
          <div className="flex flex-wrap items-end justify-center gap-2">
            <input
              min={1}
              type="number"
              value={gridSizeInputs.x}
              onChange={(e) =>
                setGridSizeInputs((s) => ({ ...s, x: e.target.value }))
              }
              placeholder="Largeur (colonnes)"
              aria-label="Largeur de la grille en colonnes"
              className="w-20 shrink-0"
            />
            <input
              min={1}
              type="number"
              value={gridSizeInputs.y}
              onChange={(e) =>
                setGridSizeInputs((s) => ({ ...s, y: e.target.value }))
              }
              placeholder="Hauteur (lignes)"
              aria-label="Hauteur de la grille en lignes"
              className="w-20 shrink-0"
            />
            <Button type="button" variant="secondary" onClick={handleGridSize}>
              Ok
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Largeur × hauteur ≤ {MAX_GRID_CELLS.toLocaleString("fr-FR")}{" "}
            cellules au total.
          </p>
        </fieldset>

        <fieldset className="flex w-full flex-wrap items-end justify-center gap-2 border-0 p-0">
          <legend className="sr-only">Taille des cellules</legend>
          <input
            min={1}
            type="number"
            value={cellSizeInput}
            onChange={(e) => setCellSizeInput(e.target.value)}
            placeholder="Taille (px)"
            aria-label="Taille d'une cellule en pixels"
            className="w-20 shrink-0"
          />
          <Button type="button" variant="secondary" onClick={handleCellSize}>
            Ok
          </Button>
        </fieldset>

        <fieldset className="w-full gap-2 border-0 p-0">
          <legend className="sr-only">Sauvegarde locale</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <Button type="button" variant="outline" onClick={handleSaveLocaly}>
              Sauvegarder localement
            </Button>
            <Button type="button" variant="outline" onClick={handleLoad}>
              Charger
            </Button>
          </div>
        </fieldset>
      </div>

      <Dialog
        open={noticeMessage !== null}
        onClose={() => setNoticeMessage(null)}
      >
        <Card size="sm" className="w-full">
          <CardContent className="pt-6">
            <p className="text-card-foreground">{noticeMessage}</p>
          </CardContent>
        </Card>
      </Dialog>
    </main>
  );
};

export default Game;
