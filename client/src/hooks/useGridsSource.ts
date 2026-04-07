import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { SavedGrid } from "@/types/saved-grid";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type GridsSourceSort = "recent" | "popular";

export type UseGridsSourceOptions =
  | { kind: "explore"; sort: GridsSourceSort }
  | { kind: "user"; userId: string; sort: GridsSourceSort }
  | { kind: "likes" };

function parseGridsPage(body: unknown): {
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

export function useGridsSource(options: UseGridsSourceOptions) {
  const kind = options.kind;
  const sort = kind === "explore" || kind === "user" ? options.sort : undefined;
  const userId = kind === "user" ? options.userId : undefined;

  const [grids, setGrids] = useState<SavedGrid[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadMoreLock = useRef(false);
  const pendingLoadMorePaintRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setGrids(null);
    setNextCursor(null);
    setHasMore(false);
    loadMoreLock.current = false;
    pendingLoadMorePaintRef.current = false;
    setLoading(true);

    void (async () => {
      try {
        if (kind === "likes") {
          const res = await fetch(`${API_BASE}/api/grids/me/likes`, {
            credentials: "include",
          });
          if (cancelled) return;

          if (res.status === 401) {
            setError("Connectez-vous pour voir vos grilles aimées.");
            setGrids([]);
            return;
          }

          if (!res.ok) {
            setError("Impossible de charger vos grilles.");
            setGrids([]);
            return;
          }

          const body = (await res.json()) as unknown;
          const items = Array.isArray(body) ? (body as SavedGrid[]) : null;
          if (items === null) {
            setError("Réponse serveur inattendue.");
            setGrids([]);
            return;
          }

          setGrids(items);
          return;
        }

        if (kind === "user") {
          const res = await fetch(
            `${API_BASE}/api/grids/user/${encodeURIComponent(userId!)}?sort=${sort}`,
            { credentials: "include" },
          );
          if (cancelled) return;

          if (!res.ok) {
            setError("Impossible de charger vos grilles.");
            setGrids([]);
            return;
          }

          const body = (await res.json()) as unknown;
          const items = Array.isArray(body) ? (body as SavedGrid[]) : null;
          if (items === null) {
            setError("Réponse serveur inattendue.");
            setGrids([]);
            return;
          }

          setGrids(items);
          return;
        }

        const res = await fetch(`${API_BASE}/api/grids/all?sort=${sort}`, {
          credentials: "include",
        });
        if (cancelled) return;

        if (!res.ok) {
          setError("Impossible de charger les grilles.");
          return;
        }

        const body = (await res.json()) as unknown;
        const page = parseGridsPage(body);
        if (page === null) {
          setError("Réponse serveur inattendue.");
          return;
        }

        setGrids(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch {
        if (!cancelled) {
          if (kind === "explore") {
            setError(
              "Impossible de joindre le serveur. Vérifiez votre connexion.",
            );
          } else {
            setError(
              "Impossible de joindre le serveur. Vérifiez votre connexion.",
            );
            setGrids([]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, sort, userId]);

  const loadMore = useCallback(async () => {
    if (kind !== "explore" || sort === undefined) return;
    if (!hasMore || nextCursor === null || loadMoreLock.current) return;
    loadMoreLock.current = true;
    pendingLoadMorePaintRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/grids/all?sort=${sort}&cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setError("Impossible de charger la suite.");
        return;
      }
      const body = (await res.json()) as unknown;
      const page = parseGridsPage(body);
      if (page === null) {
        setError("Réponse serveur inattendue.");
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
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      if (!pendingLoadMorePaintRef.current) {
        loadMoreLock.current = false;
        setLoading(false);
      }
    }
  }, [kind, sort, hasMore, nextCursor]);

  useLayoutEffect(() => {
    if (kind !== "explore") return;
    if (!pendingLoadMorePaintRef.current) return;
    pendingLoadMorePaintRef.current = false;
    loadMoreLock.current = false;
    setLoading(false);
  }, [kind, grids]);

  const noopLoadMore = useCallback(async () => {}, []);

  return {
    grids,
    error,
    loading,
    loadMore: kind === "explore" ? loadMore : noopLoadMore,
    hasMore: kind === "explore" ? hasMore : false,
  };
}
