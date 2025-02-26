import { getObfuscatedClassName } from './obfuscationManager.js';

export default (opts = {}) => {
  return {
    postcssPlugin: 'postcss-tailwind-obfuscator',
    
    // Process CSS rules
    Rule(rule) {
      // Skip keyframes and other at-rules
      if (rule.selector && rule.selector.includes('.')) {
        // Process each selector with class names
        rule.selector = rule.selector.replace(/\.([\w-]+)/g, (match, className) => {
          const obfuscated = getObfuscatedClassName(className);
          return obfuscated ? `.${obfuscated}` : match;
        });
      }
    }
  };
};

postcssObfuscator.postcss = true; 