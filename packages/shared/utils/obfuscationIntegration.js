import fs from "fs";
import path from "path";
import {
  getObfuscatedClassName,
  saveClassMap,
  loadClassMap,
  processHtmlFiles,
} from "./obfuscationManager.js";

/**
 * Custom Astro integration for obfuscating Astro files
 * This integration will:
 * 1. Obfuscate CSS class names in Astro files
 * 2. Ensure inline scripts are handled correctly
 * 3. Apply obfuscation during the build process
 */
export function obfuscationIntegration() {
  return {
    name: "astro-obfuscation-integration",
    hooks: {
      "astro:config:setup": ({ config }) => {
        console.log("🔧 Setting up obfuscation integration...");

        // Create a global class mapping function for PostCSS to use
        global.getObfuscatedClassName = getObfuscatedClassName;
      },

      "astro:build:done": async ({ dir, pages }) => {
        console.log("🔒 Starting HTML obfuscation process...");

        // Convert URL to string if needed
        let outputDir = dir;
        if (typeof dir === "object" && dir instanceof URL) {
          outputDir = dir.pathname;
          // On Windows, remove the leading slash from the pathname
          if (process.platform === "win32" && outputDir.startsWith("/")) {
            outputDir = outputDir.substring(1);
          }
        }

        console.log(`📁 Output directory: ${outputDir}`);

        // Process all HTML files in the build output
        processHtmlFiles(outputDir);

        // Save the mapping for reference
        saveClassMap(outputDir);

        console.log("🔒 Obfuscation process completed!");
      },
    },
  };
}
