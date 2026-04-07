export type SavedGrid = {
  id: string;
  userId: string;
  name: string | null;
  data: unknown;
  createdAt: string;
  /** Renseigné par `GET /api/grids/all` (jointure sur `user`). */
  creatorName?: string | null;
  /** Renseigné par `GET /api/grids/all` (table `grid_like`). */
  likeCount?: number;
  /** Renseigné par `GET /api/grids/all` si l’utilisateur est connecté. */
  likedByMe?: boolean;
};
