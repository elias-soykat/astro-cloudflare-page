import fs from "fs";
import path from "path";
import crypto from "crypto";

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
      "astro:build:done": async ({ dir, pages }) => {
        console.log("🔒 Starting obfuscation process...");

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

        // Use a consistent class map for all files
        // This ensures the same class name gets the same obfuscated value across all files
        const classMap = {};
        const salt = process.env.OBFUSCATION_SALT || "monorepo-salt";

        // Generate deterministic obfuscated name based on class name and salt
        const getObfuscatedName = (className) => {
          if (!className) return "";
          if (!classMap[className]) {
            // Create a deterministic hash based on the class name and salt
            const hash = crypto
              .createHash("md5")
              .update(`${className}-${salt}`)
              .digest("hex")
              .substring(0, 8);

            // Convert hash to valid CSS identifier (starting with a letter)
            classMap[className] = "o" + hash;
          }
          return classMap[className];
        };

        // Process all HTML and CSS files in the build output
        const processDirectory = async (directory) => {
          console.log(`🔍 Processing directory: ${directory}`);

          try {
            const entries = fs.readdirSync(directory, { withFileTypes: true });

            // First pass: collect all class names from HTML files
            for (const entry of entries) {
              const fullPath = path.join(directory, entry.name);

              if (entry.isDirectory()) {
                await processDirectory(fullPath);
              } else if (entry.name.endsWith(".html")) {
                try {
                  const content = fs.readFileSync(fullPath, "utf-8");
                  const classRegex = /class="([^"]*)"/g;

                  // Just collect class names for the mapping
                  let match;
                  while ((match = classRegex.exec(content)) !== null) {
                    const classNames = match[1].split(" ");
                    classNames.forEach((className) => {
                      if (className) getObfuscatedName(className);
                    });
                  }
                } catch (error) {
                  console.error(`❌ Error processing ${fullPath}:`, error);
                }
              }
            }

            console.log(
              `📝 Created obfuscation map with ${Object.keys(classMap).length} classes`,
            );

            // Second pass: process all HTML and CSS files
            for (const entry of entries) {
              const fullPath = path.join(directory, entry.name);

              if (entry.isDirectory()) {
                // Skip - already processed in first pass
              } else if (entry.name.endsWith(".html")) {
                processHtmlFile(fullPath, classMap);
              } else if (entry.name.endsWith(".css")) {
                processCssFile(fullPath, classMap);
              }
            }
          } catch (error) {
            console.error(`❌ Error processing directory ${directory}:`, error);
          }
        };

        const processHtmlFile = (filePath, classMap) => {
          try {
            let content = fs.readFileSync(filePath, "utf-8");
            const classRegex = /class="([^"]*)"/g;

            // Replace class names with obfuscated versions
            content = content.replace(classRegex, (match, classNames) => {
              const classes = classNames.split(" ");
              const obfuscatedClasses = classes.map((className) =>
                className ? classMap[className] || className : "",
              );
              return `class="${obfuscatedClasses.join(" ")}"`;
            });

            fs.writeFileSync(filePath, content);
            console.log(`✅ Obfuscated HTML: ${path.basename(filePath)}`);
          } catch (error) {
            console.error(`❌ Error obfuscating HTML ${filePath}:`, error);
          }
        };

        const processCssFile = (filePath, classMap) => {
          try {
            let content = fs.readFileSync(filePath, "utf-8");

            // Replace class names in CSS selectors
            // We need to be careful to only replace class selectors, not other parts of the CSS
            Object.keys(classMap).forEach((className) => {
              // Replace class selectors (e.g., .className, .className:hover, .className.otherClass)
              // Using word boundaries and escaping dots in the class name
              const escapedClassName = className.replace(/\./g, "\\.");
              const regex = new RegExp(
                `\\.${escapedClassName}([\\s:.[\\]#>+~])`,
                "g",
              );
              content = content.replace(regex, `.${classMap[className]}$1`);

              // Handle class at the end of a selector
              const endRegex = new RegExp(`\\.${escapedClassName}$`, "gm");
              content = content.replace(endRegex, `.${classMap[className]}`);
            });

            fs.writeFileSync(filePath, content);
            console.log(`✅ Obfuscated CSS: ${path.basename(filePath)}`);
          } catch (error) {
            console.error(`❌ Error obfuscating CSS ${filePath}:`, error);
          }
        };

        await processDirectory(outputDir);
        console.log("🔒 Obfuscation process completed!");
      },
    },
  };
}
