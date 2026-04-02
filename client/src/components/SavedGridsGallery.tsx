import { Link } from "react-router-dom";

import { GridThumbnail } from "@/components/GridThumbnail";
import type { SavedGrid } from "@/types/saved-grid";

type SavedGridsGalleryProps = {
  grids: SavedGrid[];
  loadError: string | null;
  emptyMessage: string;
  /** Affiche le nom du créateur sous la vignette (ex. page Récents, pas Mon espace). */
  showCreator?: boolean;
};

/** Conteneur de carte : lien en overlay pour éviter bouton dans `<a>`. */
const cardShellClass =
  "relative flex w-full min-w-0 flex-col items-center gap-2 rounded-md p-1 outline-offset-2 transition-transform duration-200 ease-out hover:scale-[1.04]";

const cardLinkOverlayClass =
  "absolute inset-0 z-0 rounded-md focus-visible:z-[5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

export function SavedGridsGallery({
  grids,
  loadError,
  emptyMessage,
  showCreator = false,
}: SavedGridsGalleryProps) {
  return (
    <>
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {grids.length === 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : null}

      <ul className="grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {grids.map((g) => {
          const name = g.name?.trim();
          const creator = g.creatorName?.trim();
          let label =
            name != null && name.length > 0
              ? `Ouvrir la grille « ${name} » dans Jouer`
              : "Ouvrir cette grille dans Jouer";
          if (showCreator && creator != null && creator.length > 0) {
            label = `${label}, par ${creator}`;
          }

          return (
            <li key={g.id} className="w-full min-w-0">
              <div className={cardShellClass}>
                <Link
                  to="/"
                  state={{ savedGridData: g.data }}
                  className={cardLinkOverlayClass}
                  aria-label={label}
                />
                <div className="relative z-[1] flex w-full min-w-0 flex-col items-center gap-2 pointer-events-none">
                  <GridThumbnail
                    gridId={g.id}
                    data={g.data}
                    caption={showCreator ? name : undefined}
                    showCreator={showCreator}
                    creatorName={g.creatorName}
                    showLikeButton={showCreator}
                    likedInitial={g.likedByMe ?? false}
                    likeCountInitial={g.likeCount ?? 0}
                  />
                  {!showCreator && name ? (
                    <p className="w-full max-w-full truncate text-center text-sm font-medium text-foreground">
                      {name}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
