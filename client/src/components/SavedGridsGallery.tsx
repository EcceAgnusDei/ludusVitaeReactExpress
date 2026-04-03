import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";

import { GridThumbnail } from "@/components/GridThumbnail";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { SavedGrid } from "@/types/saved-grid";

type SavedGridsGalleryProps = {
  grids: SavedGrid[];
  loadError: string | null;
  emptyMessage: string;
  /** Affiche le nom du créateur sous la vignette (ex. page Récents, pas Mon espace). */
  showCreator?: boolean;
};

const cardShellClass =
  "relative flex w-full min-w-0 flex-col items-center gap-2 rounded-md outline-offset-2 transition-transform duration-200 ease-out hover:scale-[1.04]";

const cardLinkClass =
  "flex w-full min-w-0 flex-col items-center gap-2 rounded-md p-1 text-foreground no-underline focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

type GridCardToolbarProps = {
  gridId: string;
  likedInitial: boolean;
  likeCountInitial: number;
  isOwner: boolean;
  onRemoved?: () => void;
};

function GridCardToolbar({
  gridId,
  likedInitial,
  likeCountInitial,
  isOwner,
  onRemoved,
}: GridCardToolbarProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [liked, setLiked] = useState(likedInitial);
  const [likeCount, setLikeCount] = useState(likeCountInitial);
  const [likePending, setLikePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    setLiked(likedInitial);
    setLikeCount(likeCountInitial);
  }, [gridId, likedInitial, likeCountInitial]);

  const showLike = !sessionPending && session?.user != null;
  const showDelete = isOwner && !sessionPending && session?.user != null;

  if (!showLike && !showDelete) return null;

  const toggleLike = async () => {
    if (likePending) return;
    setLikePending(true);
    try {
      const method = liked ? "DELETE" : "POST";
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/grids/${encodeURIComponent(gridId)}/like`,
        { method, credentials: "include" },
      );
      if (!res.ok) return;
      const body = (await res.json()) as {
        liked?: unknown;
        likeCount?: unknown;
      };
      if (
        typeof body.liked === "boolean" &&
        typeof body.likeCount === "number"
      ) {
        setLiked(body.liked);
        setLikeCount(body.likeCount);
      }
    } finally {
      setLikePending(false);
    }
  };

  const deleteGrid = async () => {
    if (deletePending) return;
    if (
      !window.confirm("Supprimer cette grille ? Cette action est irréversible.")
    ) {
      return;
    }
    setDeletePending(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/grids/${encodeURIComponent(gridId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) return;
      onRemoved?.();
    } catch {
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="pointer-events-none absolute right-1 top-1 z-[2] flex items-center gap-1">
      {showDelete ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="pointer-events-auto border border-border/80 bg-background/90 text-destructive shadow-sm backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
          disabled={deletePending}
          aria-label="Supprimer cette grille"
          onClick={() => {
            void deleteGrid();
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
      {showLike ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="pointer-events-auto border border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
            disabled={likePending}
            aria-pressed={liked}
            aria-label={
              liked ? "Ne plus aimer cette grille" : "Aimer cette grille"
            }
            onClick={() => {
              void toggleLike();
            }}
          >
            <Heart
              className={cn(liked && "fill-destructive text-destructive")}
              aria-hidden
            />
          </Button>
          <span
            className="pointer-events-auto min-w-6 rounded-md border border-border/80 bg-background/90 px-1.5 py-0.5 text-center text-xs font-medium tabular-nums shadow-sm backdrop-blur-sm"
            aria-live="polite"
          >
            {likeCount}
          </span>
        </>
      ) : null}
    </div>
  );
}

export function SavedGridsGallery({
  grids,
  loadError,
  emptyMessage,
  showCreator = false,
}: SavedGridsGalleryProps) {
  const { data: session } = authClient.useSession();
  const viewerUserId = session?.user?.id ?? null;

  const [items, setItems] = useState(grids);

  useEffect(() => {
    setItems(grids);
  }, [grids]);

  return (
    <>
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {items.length === 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : null}

      <ul className="grid min-w-0 list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => {
          const name = g.name?.trim();
          const creator = g.creatorName?.trim();
          let label =
            name != null && name.length > 0
              ? `Ouvrir la grille « ${name} » dans Jouer`
              : "Ouvrir cette grille dans Jouer";
          if (showCreator && creator != null && creator.length > 0) {
            label = `${label}, par ${creator}`;
          }

          const isOwner = viewerUserId != null && g.userId === viewerUserId;

          return (
            <li key={g.id} className={cardShellClass}>
              <Link
                to="/"
                state={{ savedGridData: g.data }}
                className={cardLinkClass}
                aria-label={label}
              >
                <GridThumbnail
                  gridId={g.id}
                  data={g.data}
                  caption={showCreator ? name : undefined}
                  showCreator={showCreator}
                  creatorName={g.creatorName}
                />
                {!showCreator && name ? (
                  <p className="w-full max-w-full truncate text-center text-sm font-medium text-foreground">
                    {name}
                  </p>
                ) : null}
              </Link>
              <GridCardToolbar
                gridId={g.id}
                likedInitial={g.likedByMe ?? false}
                likeCountInitial={g.likeCount ?? 0}
                isOwner={isOwner}
                onRemoved={() =>
                  setItems((prev) => prev.filter((row) => row.id !== g.id))
                }
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
