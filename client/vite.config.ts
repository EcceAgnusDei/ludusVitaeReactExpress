import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // ou @vitejs/plugin-react si tu utilises Babel
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← Important : doit être ajouté ici
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Alias @ pour shadcn/ui
    },
  },
});
