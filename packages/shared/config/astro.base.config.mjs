import { faviconPlugin } from "@monorepo/shared/utils/generateFavicon.js";
import { obfuscationIntegration } from "@monorepo/shared/utils/obfuscationIntegration.js";
import tailwindcss from "@tailwindcss/vite";
import genericBuildFilenames from "astro-generic-build-filenames";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    genericBuildFilenames(),
    obfuscationIntegration()
  ],
  // Use directory-based URLs with consistent trailing slashes
  trailingSlash: "always", // Ensures URLs always end with / in both dev and build
  build: {
    assets: "assets", // This will put all Astro-generated assets in dist/assets/ s
    format: "directory", // Generate directory-based structure (e.g., about/index.html)
  },
  vite: {
    plugins: [tailwindcss(), faviconPlugin()]
  },
});
