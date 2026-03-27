import { useEffect } from "react";

import { handleGame } from "../script.js";

/**
 * Même structure DOM et même logique que l’ancienne page (createpage + script.js).
 */
const Game = () => {
  useEffect(() => {
    handleGame();
    return () => {
      document.getElementById("gridcontainer")?.replaceChildren();
    };
  }, []);

  return (
    <div id="gamecontainer" className="p-4">
      <div id="gridcontainer" />
      <button type="button" id="playbutton">
        Play
      </button>
      <input type="range" min={1} max={100} defaultValue={1} id="speedslider" />
      <div id="gridsizecontainer">
        <input
          min={0}
          type="number"
          defaultValue={0}
          id="gridsizeinputx"
          placeholder="Taille horrizontale de la grille"
        />
        <input
          min={0}
          type="number"
          defaultValue={0}
          id="gridsizeinputy"
          placeholder="Taille verticale de la grille"
        />
        <button type="button" id="gridsizebutton">
          Ok
        </button>
      </div>
      <div id="cellsizecontainer">
        <input
          type="number"
          id="cellsizeinput"
          placeholder="Taille d'une cellule"
        />
        <button type="button" id="cellsizebutton">
          Ok
        </button>
      </div>
      <button type="button" id="savelocalybutton">
        Sauvegarder localement
      </button>
      <button type="button" id="loadbutton">
        Charger
      </button>
    </div>
  );
};

export default Game;
