import { defineConfig } from "astro/config";
import baseConfig from "@monorepo/shared/config/astro";

export default defineConfig({
  ...baseConfig,
  site: "https://domain.com",
});
