import { createAuthClient } from "better-auth/react";

const apiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: apiBase,
});
