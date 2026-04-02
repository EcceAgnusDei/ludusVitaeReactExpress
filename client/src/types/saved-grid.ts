export type SavedGrid = {
  id: string;
  userId: string;
  name: string | null;
  data: unknown;
  createdAt: string;
  updatedAt: string;
  /** Renseigné par `GET /api/grids/all` (jointure sur `user`). */
  creatorName?: string | null;
};
