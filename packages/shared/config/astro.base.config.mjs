import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import genericBuildFilenames from "astro-generic-build-filenames";
import { createClassTransformer } from "@monorepo/shared/utils/classTransformer.js";
import { faviconPlugin } from "@monorepo/shared/utils/generateFavicon.js";

export default defineConfig({
  integrations: [genericBuildFilenames()],
  // Use directory-based URLs with consistent trailing slashes
  trailingSlash: "always", // Ensures URLs always end with / in both dev and build
  build: {
    assets: "assets", // This will put all Astro-generated assets in dist/assets/ s
    format: "directory", // Generate directory-based structure (e.g., about/index.html)
  },
  vite: {
    plugins: [tailwindcss(), faviconPlugin()],
  },
});
