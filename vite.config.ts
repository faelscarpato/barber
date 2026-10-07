import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    command === "build" &&
      nitro({
        preset: process.env.NITRO_PRESET || "node-server",
      }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      external: ["@aws-sdk/client-s3"],
    },
  },
  server: {
    port: 3000,
    watch: {
      ignored: [
        "**/.wwebjs_auth/**",
        "**/.wwebjs_cache/**",
        "**/*.tmp",
        /\.wwebjs_auth/,
        /\.wwebjs_cache/,
      ],
    },
  },
}));
