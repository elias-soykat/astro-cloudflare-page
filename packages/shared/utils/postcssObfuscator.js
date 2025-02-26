import { getObfuscatedClassName } from "./obfuscationManager.js";

const postcssObfuscator = (opts = {}) => {
  // Track processed classes for debugging
  const processedClasses = new Set();

  return {
    postcssPlugin: "postcss-tailwind-obfuscator",

    Once(root) {
      // Process at the start to ensure all CSS is handled
      console.log("🔍 Starting CSS obfuscation process...");
    },

    // Process CSS rules
    Rule(rule) {
      // Skip keyframes and other at-rules
      if (rule.selector && rule.selector.includes(".")) {
        // Store original for logging
        const originalSelector = rule.selector;

        // Handle more complex Tailwind selectors
        rule.selector = rule.selector.replace(
          /\.([a-zA-Z0-9_-]+)(?![^{]*\})/g,
          (match, className) => {
            processedClasses.add(className);
            const obfuscated = getObfuscatedClassName(className);
            return obfuscated ? `.${obfuscated}` : match;
          },
        );

        // Also handle Tailwind utility variants like hover:, focus:, etc.
        rule.selector = rule.selector.replace(
          /\.([\w-]+:[a-zA-Z0-9_-]+)(?![^{]*\})/g,
          (match, className) => {
            processedClasses.add(className);
            const obfuscated = getObfuscatedClassName(className);
            return obfuscated ? `.${obfuscated}` : match;
          },
        );

        if (originalSelector !== rule.selector) {
          if (opts.debug) {
            console.log(
              `🔄 Transformed: ${originalSelector} → ${rule.selector}`,
            );
          }
        }
      }
    },

    OnceExit(root) {
      // Report statistics at the end
      console.log(
        `✅ CSS obfuscation complete. Processed ${processedClasses.size} unique classes.`,
      );
    },
  };
};

postcssObfuscator.postcss = true;

export default postcssObfuscator;
