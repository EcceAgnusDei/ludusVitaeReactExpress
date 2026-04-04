import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useOutletContext } from "react-router-dom";

import { SavedGridsGallery } from "@/components/SavedGridsGallery";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { SavedGrid } from "@/types/saved-grid";

export type MonEspaceVariant = "recent" | "popular" | "likes";

type DashboardOutletContext = { userId: string };

const TAB_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function tabClassName(isActive: boolean) {
  return cn(
    TAB_LINK_CLASS,
    isActive
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

const TAB_COPY: Record<
  MonEspaceVariant,
  { to: string; label: string; description: string; end?: boolean }
> = {
  recent: {
    to: "/mon-espace",
    end: true,
    label: "Récentes",
    description:
      "Vos grilles, de la plus récemment modifiée à la plus ancienne.",
  },
  popular: {
    to: "/mon-espace/populaires",
    label: "Populaires",
    description:
      "Vos grilles triées par nombre de likes, du plus apprécié au moins.",
  },
  likes: {
    to: "/mon-espace/aimees",
    label: "J’aime",
    description:
      "Grilles que vous avez aimées, de la dernière action au plus ancien.",
  },
};

export function MonEspaceTabPanel({ variant }: { variant: MonEspaceVariant }) {
  const { userId } = useOutletContext<DashboardOutletContext>();
  const [grids, setGrids] = useState<SavedGrid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setGrids(null);

    void (async () => {
      try {
        let url: string;
        if (variant === "likes") {
          url = `${import.meta.env.VITE_API_BASE_URL}/api/grids/me/likes`;
        } else {
          const sort = variant === "popular" ? "?sort=popular" : "";
          url = `${import.meta.env.VITE_API_BASE_URL}/api/grids/user/${encodeURIComponent(userId)}${sort}`;
        }

        const res = await fetch(url, { credentials: "include" });
        if (cancelled) return;

        if (res.status === 401 && variant === "likes") {
          setLoadError("Connectez-vous pour voir vos grilles aimées.");
          setGrids([]);
          return;
        }

        if (!res.ok) {
          setLoadError("Impossible de charger vos grilles.");
          setGrids([]);
          return;
        }

        const body = (await res.json()) as unknown;
        if (!Array.isArray(body)) {
          setLoadError("Réponse serveur inattendue.");
          setGrids([]);
          return;
        }

        setGrids(body as SavedGrid[]); //on fait confiance au backend ici
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
  }, [userId, variant]);

  const emptyMessages: Record<MonEspaceVariant, string> = {
    recent:
      "Aucune grille enregistrée. Enregistrez-en une depuis la page Jouer.",
    popular:
      "Aucune grille enregistrée. Enregistrez-en une depuis la page Jouer.",
    likes:
      "Vous n’avez pas encore aimé de grille. Explorez Récents ou Populaires.",
  };

  if (grids === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de vos grilles…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {TAB_COPY[variant].description}
      </p>
      <SavedGridsGallery
        grids={grids}
        loadError={loadError}
        emptyMessage={emptyMessages[variant]}
        showCreator={variant === "likes"}
      />
    </div>
  );
}

const Dashboard = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  if (sessionPending) {
    return (
      <main className="flex w-full min-w-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Chargement…</p>
      </main>
    );
  }

  if (!session?.user) {
    return <Navigate to="/" replace />;
  }

  const userId = session.user.id;
  const outletContext: DashboardOutletContext = { userId };

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mon espace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos grilles enregistrées et les grilles que vous avez aimées.
        </p>
      </div>

      <nav aria-label="Sections Mon espace" className="flex flex-wrap gap-2">
        {(Object.keys(TAB_COPY) as MonEspaceVariant[]).map((key) => {
          const tab = TAB_COPY[key];
          return (
            <NavLink
              key={key}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => tabClassName(isActive)}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <Outlet context={outletContext} />
    </main>
  );
};

export default Dashboard;
