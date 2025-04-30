import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    loader: "tsx", // Configura o loader para tratar arquivos .js como JSX
    target: "esnext",
    include: [
      "src/**/*.{js,jsx,ts,tsx}", // Inclui arquivos .js, .jsx, .ts e .tsx
      "node_modules/**/*.{js,jsx,ts,tsx}",
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx", // Configura o loader para arquivos .js
      },
    },
  },
});
