import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modèle de rendu classique (pages dynamiques quand elles lisent cookies/DB).
  cacheComponents: false,
  // PGlite (Postgres WASM) et postgres.js ne doivent pas être bundlés côté serveur.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
