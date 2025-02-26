import {
  getObfuscatedClassName,
  getClassMap,
  saveClassMap,
} from "./obfuscationManager.js";
import fs from "fs";
import path from "path";

const postcssObfuscator = (opts = {}) => {
  // Track processed classes for debugging
  const processedClasses = new Set();

  return {
    postcssPlugin: "postcss-tailwind-obfuscator",

    Once(root) {
      console.log("🔍 Starting CSS obfuscation process...");

      // Optional: Load any existing class mappings first
      try {
        // This ensures we're using any mappings that might have been created in preprocessing
        const projectRoot = process.cwd();
        const possibleMapPaths = [
          path.join(projectRoot, "obfuscation-map.json"),
          path.join(projectRoot, "dist", "obfuscation-map.json"),
        ];

        for (const mapPath of possibleMapPaths) {
          if (fs.existsSync(mapPath)) {
            console.log(`📋 Found existing class mapping at ${mapPath}`);
            break;
          }
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not find existing class mapping, creating new one",
        );
      }
    },

    // Process CSS rules
    Rule(rule) {
      if (!rule.selector || !rule.selector.includes(".")) return;

      const originalSelector = rule.selector;

      // More comprehensive replacement for all types of CSS selectors
      // 1. Handle standard selectors
      rule.selector = rule.selector.replace(
        /\.([a-zA-Z0-9_-]+)(?!\w*[{}])/g,
        (match, className) => {
          processedClasses.add(className);
          const obfuscated = getObfuscatedClassName(className);
          if (obfuscated) {
            if (opts.debug) console.log(`🔄 ${className} → ${obfuscated}`);
            return `.${obfuscated}`;
          }
          return match;
        },
      );

      // 2. Handle Tailwind variant selectors like hover:, focus:, etc.
      rule.selector = rule.selector.replace(
        /\.([\w-]+)\\:([\w-]+)/g,
        (match, variant, className) => {
          const fullClass = `${variant}:${className}`;
          processedClasses.add(fullClass);
          const obfuscated = getObfuscatedClassName(fullClass);
          if (obfuscated) {
            if (opts.debug) console.log(`🔄 ${fullClass} → ${obfuscated}`);
            return `.${obfuscated}`;
          }
          return match;
        },
      );

      if (originalSelector !== rule.selector && opts.debug) {
        console.log(
          `🔄 Full selector transform: ${originalSelector} → ${rule.selector}`,
        );
      }
    },

    OnceExit(root) {
      // After processing CSS, save the mapping for HTML processing
      try {
        const classMap = getClassMap();
        const mapCount = Object.keys(classMap).length;
        console.log(
          `✅ CSS obfuscation complete. Processed ${processedClasses.size} unique classes, total mapping: ${mapCount}`,
        );

        // Save map in current working directory for the HTML processor to find
        const tempMapPath = path.join(
          process.cwd(),
          "temp-obfuscation-map.json",
        );
        fs.writeFileSync(tempMapPath, JSON.stringify(classMap, null, 2));
        console.log(`💾 Saved temporary obfuscation map to ${tempMapPath}`);
      } catch (error) {
        console.error("❌ Error saving temporary mapping:", error);
      }
    },
  };
};

postcssObfuscator.postcss = true;

export default postcssObfuscator;
