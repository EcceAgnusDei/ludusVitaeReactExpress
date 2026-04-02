import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { GridThumbnail } from "@/components/GridThumbnail";
import { authClient } from "@/lib/auth-client";

type SavedGrid = {
  id: string;
  userId: string;
  name: string | null;
  data: unknown;
  createdAt: string;
  updatedAt: string;
};

const Dashboard = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [grids, setGrids] = useState<SavedGrid[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (sessionPending || !userId) return;

    let cancelled = false;
    setLoadError(null);

    void (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/grids/user/${encodeURIComponent(userId)}`,
          { credentials: "include" },
        );
        if (cancelled) return;

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
  }, [session?.user?.id, sessionPending]);

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

  if (grids === null) {
    return (
      <main className="flex w-full min-w-0 flex-1 flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Chargement de vos grilles…</p>
      </main>
    );
  }

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mon espace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grilles enregistrées sur votre compte.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {grids.length === 0 && !loadError ? (
        <p className="text-sm text-muted-foreground">
          Aucune grille enregistrée. Enregistrez-en une depuis la page Jouer.
        </p>
      ) : null}

      <ul className="grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {grids.map((g) => {
          const name = g.name?.trim();
          const label =
            name != null && name.length > 0
              ? `Ouvrir la grille « ${name} » dans Jouer`
              : "Ouvrir cette grille dans Jouer";
          const cardClass =
            "flex w-full min-w-0 flex-col items-center gap-2 rounded-md p-1 outline-offset-2 transition-transform duration-200 ease-out hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

          return (
            <li key={g.id}>
              <Link //on va à la page Jeu en faisant passer les données de la grille
                to="/"
                state={{ savedGridData: g.data }}
                className={cardClass}
                aria-label={label}
              >
                <GridThumbnail gridId={g.id} data={g.data} />
                {name ? (
                  <p className="w-full max-w-full truncate text-center text-sm font-medium text-foreground">
                    {name}
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
};

export default Dashboard;
