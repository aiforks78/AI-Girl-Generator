import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  outDir: ".open-next",
  compatibilityDate: "2025-10-01",
  routes: {
    basePath: "/"
  },
  build: {
    command: "pnpm run build"
  },
  cloudflare: {
    assets: {
      binding: "ASSETS",
      directory: ".open-next/assets"
    }
  }
});
