
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  server:
    command === "serve"
      ? {
          host: "0.0.0.0",
          port: 5173,
          https: {
            key: fs.readFileSync("./localhost-key.pem"),
            cert: fs.readFileSync("./localhost.pem")
          }
        }
      : undefined
}));
