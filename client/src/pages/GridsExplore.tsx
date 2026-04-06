import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { SavedGridsGallery } from "@/components/SavedGridsGallery";
import { Button } from "@/components/ui/button";
import type { SavedGrid } from "@/types/saved-grid";

export type GridsExploreVariant = "recent" | "popular";

const VARIANT = {
  recent: {
    title: "Récents",
    description: "Toutes les grilles, de la plus récente à la plus ancienne.",
    apiPath: "/api/grids/all?sort=recent",
  },
  popular: {
    title: "Populaires",
    description: "Grilles les plus appréciées, du plus de likes au moins",
    apiPath: "/api/grids/all?sort=popular",
  },
} as const satisfies Record<
  GridsExploreVariant,
  { title: string; description: string; apiPath: string }
>;

type GridsExploreProps = { variant: GridsExploreVariant };

/** Valide la forme de la réponse paginée de `GET /api/grids/all` après `res.json()`. Retourne les champs typés ou `null` si la structure est invalide. */
function parseGridsExplorePage(body: unknown): {
  items: SavedGrid[];
  nextCursor: string | null;
  hasMore: boolean;
} | null {
  if (body === null || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  if (typeof o.hasMore !== "boolean") return null;
  if (
    o.nextCursor !== null &&
    o.nextCursor !== undefined &&
    typeof o.nextCursor !== "string"
  ) {
    return null;
  }
  const nextCursor =
    o.nextCursor === undefined || o.nextCursor === null ? null : o.nextCursor;
  return {
    items: o.items as SavedGrid[],
    nextCursor,
    hasMore: o.hasMore,
  };
}

export function GridsExplore({ variant }: GridsExploreProps) {
  const { title, description, apiPath } = VARIANT[variant];
  const [grids, setGrids] = useState<SavedGrid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreLock = useRef(false);
  const pendingLoadMorePaintRef = useRef(false); //sert à faire persister "chargement en cours" jusqu'à l'affichage des grilles
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadMoreError(null);
    setGrids(null);
    setNextCursor(null);
    setHasMore(false);
    setLoadingMore(false);
    loadMoreLock.current = false;
    pendingLoadMorePaintRef.current = false;

    void (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}${apiPath}`,
          { credentials: "include" },
        );
        if (cancelled) return;

        if (!res.ok) {
          setLoadError("Impossible de charger les grilles.");
          setLoadingMore(false);
          return;
        }

        const body = (await res.json()) as unknown;
        const page = parseGridsExplorePage(body);
        if (page === null) {
          setLoadError("Réponse serveur inattendue.");
          setLoadingMore(false);
          return;
        }

        setGrids(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setLoadingMore(false);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Impossible de joindre le serveur. Vérifiez votre connexion.",
          );
          setLoadingMore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  const loadMore = useCallback(async () => {
    if (!hasMore || nextCursor === null || loadMoreLock.current) return;
    loadMoreLock.current = true;
    pendingLoadMorePaintRef.current = false;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}${apiPath}&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setLoadMoreError("Impossible de charger la suite.");
        return;
      }
      const body = (await res.json()) as unknown;
      const page = parseGridsExplorePage(body);
      if (page === null) {
        setLoadMoreError("Réponse serveur inattendue.");
        return;
      }
      pendingLoadMorePaintRef.current = true;
      setGrids((prev) => {
        if (prev === null) return prev;
        const seen = new Set(prev.map((g) => g.id));
        return [...prev, ...page.items.filter((g) => !seen.has(g.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setLoadMoreError(
        "Impossible de joindre le serveur. Vérifiez votre connexion.",
      );
    } finally {
      if (!pendingLoadMorePaintRef.current) {
        loadMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  }, [apiPath, hasMore, nextCursor]);

  useLayoutEffect(() => {
    if (!pendingLoadMorePaintRef.current) return;
    pendingLoadMorePaintRef.current = false;
    loadMoreLock.current = false;
    setLoadingMore(false);
  }, [grids]);

  useEffect(() => {
    if (!hasMore || nextCursor === null) return;
    const el = sentinelRef.current;
    if (el === null) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "500px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, nextCursor, loadMore]);

  if (grids === null) {
    return (
      <main className="flex w-full min-w-0 flex-1 flex-col items-center justify-center p-6">
        {loadError !== null ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <p className="text-muted-foreground">Chargement des grilles…</p>
        )}
      </main>
    );
  }

  return (
    <main
      className="flex w-full min-w-0 flex-1 flex-col gap-6 p-6"
      aria-busy={loadingMore}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <SavedGridsGallery
        grids={grids}
        loadError={loadError}
        emptyMessage="Aucune grille pour le moment."
        showCreator
      />

      {loadMoreError !== null ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-center text-sm text-destructive">
            {loadMoreError}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadMoreError(null);
              void loadMore();
            }}
          >
            Réessayer
          </Button>
        </div>
      ) : null}

      {loadingMore ? (
        <p className="text-center text-sm text-muted-foreground">
          Chargement de la suite…
        </p>
      ) : null}

      {hasMore && nextCursor !== null ? (
        <div
          ref={sentinelRef}
          className="pointer-events-none h-2 w-full shrink-0"
          aria-hidden
        />
      ) : null}
    </main>
  );
}
