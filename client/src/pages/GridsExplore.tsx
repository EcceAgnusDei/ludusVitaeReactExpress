import { useEffect, useState } from "react";

import { SavedGridsGallery } from "@/components/SavedGridsGallery";
import type { SavedGrid } from "@/types/saved-grid";

export type GridsExploreVariant = "recent" | "popular";

const VARIANT = {
  recent: {
    title: "Récents",
    description: "Toutes les grilles, de la plus récente à la plus ancienne.",
    apiPath: "/api/grids/all",
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

export function GridsExplore({ variant }: GridsExploreProps) {
  const { title, description, apiPath } = VARIANT[variant];
  const [grids, setGrids] = useState<SavedGrid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}${apiPath}`,
          { credentials: "include" },
        );
        if (cancelled) return;

        if (!res.ok) {
          setLoadError("Impossible de charger les grilles.");
          setGrids([]);
          return;
        }

        const body = (await res.json()) as unknown;
        if (!Array.isArray(body)) {
          setLoadError("Réponse serveur inattendue.");
          setGrids([]);
          return;
        }

        setGrids(body as SavedGrid[]);
      } catch {
        if (!cancelled) {
          setLoadError(
            "Impossible de joindre le serveur. Vérifiez votre connexion.",
          );
          setGrids([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  if (grids === null) {
    return (
      <main className="flex w-full min-w-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Chargement des grilles…</p>
      </main>
    );
  }

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
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
    </main>
  );
}
