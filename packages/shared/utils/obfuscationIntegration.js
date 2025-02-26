import fs from "fs";
import path from "path";
import {
  getObfuscatedClassName,
  saveClassMap,
  loadClassMap,
  processHtmlFiles,
  preprocessSourceFiles,
  getClassMap,
  ensureCommonTailwindClasses,
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

        // Pre-generate common class names to ensure consistency
        ensureCommonTailwindClasses();

        if (command === "build") {
          console.log(
            "🔍 Pre-processing source files to collect Tailwind classes...",
          );

          // Convert config.root to string if it's a URL
          let rootDir = config.root;
          if (typeof rootDir === "object" && rootDir instanceof URL) {
            rootDir = rootDir.pathname;
            // On Windows, remove the leading slash from the pathname
            if (process.platform === "win32" && rootDir.startsWith("/")) {
              rootDir = rootDir.substring(1);
            }
          }

          // This ensures all Tailwind classes are collected before PostCSS runs
          const srcDir = path.resolve(rootDir, "src");
          console.log(`📂 Source directory: ${srcDir}`);
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

        // Check for CSS files that might need obfuscation
        try {
          const findAllCssFiles = (directory) => {
            let cssFiles = [];
            const entries = fs.readdirSync(directory, { withFileTypes: true });

            for (const entry of entries) {
              const fullPath = path.join(directory, entry.name);

              if (entry.isDirectory()) {
                cssFiles = cssFiles.concat(findAllCssFiles(fullPath));
              } else if (entry.name.endsWith(".css")) {
                cssFiles.push(fullPath);
              }
            }

            return cssFiles;
          };

          const cssFiles = findAllCssFiles(outputDir);
          console.log(
            `🔍 Found ${cssFiles.length} CSS files in the output directory`,
          );

          // If any CSS files weren't processed by PostCSS, handle them here
          // This is a fallback in case the PostCSS plugin didn't run
          if (cssFiles.length > 0 && Object.keys(getClassMap()).length === 0) {
            console.log(
              `⚠️ No class mapping found but CSS files exist. Creating mapping now...`,
            );

            // Create class mappings first from HTML files
            const htmlFiles = findAllHtmlFiles(outputDir);
            for (const htmlFile of htmlFiles) {
              const content = fs.readFileSync(htmlFile, "utf-8");
              const classRegex = /class=["']([^"']*)["']/g;

              let match;
              while ((match = classRegex.exec(content)) !== null) {
                const classNames = match[1].split(/\s+/);
                classNames.forEach((className) => {
                  if (className.trim()) {
                    getObfuscatedClassName(className.trim());
                  }
                });
              }
            }

            console.log(
              `📊 Created mappings for HTML classes. Map size: ${Object.keys(getClassMap()).length}`,
            );
          }
        } catch (error) {
          console.error(`❌ Error checking CSS files: ${error.message}`);
        }

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
