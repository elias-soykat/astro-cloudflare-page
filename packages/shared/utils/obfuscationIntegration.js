import fs from "fs";
import path from "path";
import {
  getObfuscatedClassName,
  saveClassMap,
  loadClassMap,
  processHtmlFiles,
  preprocessSourceFiles,
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
      "astro:config:setup": ({ command, config }) => {
        console.log("🔧 Setting up obfuscation integration...");

        // Create a global class mapping function for PostCSS to use
        global.getObfuscatedClassName = getObfuscatedClassName;

        if (command === "build") {
          console.log(
            "🔍 Pre-processing source files to collect Tailwind classes...",
          );

          // This ensures all Tailwind classes are collected before PostCSS runs
          const srcDir = path.resolve(config.root, "src");
          preprocessSourceFiles(srcDir);
        }
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

        // Verify obfuscation by checking a sample HTML file
        try {
          const indexPath = path.join(outputDir, "index.html");
          if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, "utf-8");
            const hasObfuscatedClasses = content.match(
              /class="[^"]*o[0-9a-f]{8}[^"]*"/,
            );
            if (hasObfuscatedClasses) {
              console.log(
                "✅ Verified obfuscation in index.html - found obfuscated classes",
              );
            } else {
              console.warn(
                "⚠️ No obfuscated classes found in index.html - obfuscation may not be working!",
              );
            }
          }
        } catch (error) {
          console.error("❌ Error verifying obfuscation:", error);
        }

        console.log("🔒 Obfuscation process completed!");
      },
    },
  };
}
