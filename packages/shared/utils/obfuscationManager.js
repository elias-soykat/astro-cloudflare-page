import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Class map for storing original to obfuscated mappings
let classMap = {};
const salt = process.env.OBFUSCATION_SALT || 'monorepo-salt';

// Generate a deterministic hash based class name
export function getObfuscatedClassName(className) {
  if (!className || !className.trim()) return '';
  
  if (!classMap[className]) {
    // Create a deterministic hash based on the class name and salt
    const hash = crypto
      .createHash('md5')
      .update(`${className}-${salt}`)
      .digest('hex')
      .substring(0, 8);
    
    classMap[className] = 'o' + hash;
  }
  
  return classMap[className];
}

// Save the mapping to a file
export function saveClassMap(outputDir) {
  try {
    const mapPath = path.join(outputDir, 'obfuscation-map.json');
    fs.writeFileSync(mapPath, JSON.stringify(classMap, null, 2));
    console.log(`📝 Saved obfuscation map to ${mapPath}`);
    return mapPath;
  } catch (error) {
    console.error('❌ Error saving obfuscation map:', error);
    return null;
  }
}

// Load an existing map from file
export function loadClassMap(mapPath) {
  try {
    if (fs.existsSync(mapPath)) {
      const content = fs.readFileSync(mapPath, 'utf-8');
      classMap = JSON.parse(content);
      console.log(`📝 Loaded obfuscation map from ${mapPath}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error loading obfuscation map:', error);
  }
  return false;
}

// Get the current map
export function getClassMap() {
  return { ...classMap };
}

// Process HTML files to replace class names
export function processHtmlFiles(directory) {
  const processFile = (filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;
      let replacedCount = 0;
      
      // Replace class attributes with more robust handling
      const classRegex = /class=["']([^"']*)["']/g;
      content = content.replace(classRegex, (match, classNames) => {
        const classes = classNames.split(/\s+/);
        const obfuscatedClasses = classes.map(className => {
          if (!className.trim()) return '';
          
          // Check if we have an obfuscated version
          const obfuscated = classMap[className.trim()];
          if (obfuscated) {
            replacedCount++;
            return obfuscated;
          }
          
          // If not found in map, generate it now
          if (className.trim()) {
            const newObfuscated = getObfuscatedClassName(className.trim());
            replacedCount++;
            return newObfuscated;
          }
          
          return className;
        }).filter(Boolean);
        
        modified = true;
        return `class="${obfuscatedClasses.join(' ')}"`;
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated HTML file: ${path.basename(filePath)} (replaced ${replacedCount} classes)`);
      }
    } catch (error) {
      console.error(`❌ Error processing HTML file ${filePath}:`, error);
    }
  };
  
  // Similar to existing code, but with more logging
  const processDir = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          processDir(fullPath);
        } else if (entry.name.endsWith('.html')) {
          processFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dir}:`, error);
    }
  };
  
  // Check for temporary mapping file first
  try {
    const tempMapPath = path.join(process.cwd(), 'temp-obfuscation-map.json');
    if (fs.existsSync(tempMapPath)) {
      console.log(`📋 Loading temporary class mapping from PostCSS processing`);
      const content = fs.readFileSync(tempMapPath, 'utf-8');
      const tempMap = JSON.parse(content);
      
      // Merge with existing map
      Object.assign(classMap, tempMap);
      console.log(`📊 Combined mapping now has ${Object.keys(classMap).length} classes`);
      
      // Clean up temp file
      fs.unlinkSync(tempMapPath);
    }
  } catch (error) {
    console.warn(`⚠️ Could not load temporary mapping: ${error.message}`);
  }
  
  console.log(`🔍 Starting HTML processing with ${Object.keys(classMap).length} mapped classes`);
  processDir(directory);
}

// Add this function to the existing file
export function collectTailwindClasses(content) {
  // This regex matches Tailwind classes in HTML content
  const tailwindClassRegex = /class="([^"]*)"|className="([^"]*)"/g;
  const classesFound = new Set();
  
  let match;
  while ((match = tailwindClassRegex.exec(content)) !== null) {
    const classNames = (match[1] || match[2]).split(/\s+/);
    classNames.forEach(className => {
      if (className && className.trim()) {
        classesFound.add(className.trim());
      }
    });
  }
  
  return Array.from(classesFound);
}

// Add this to preprocess source files before build
export function preprocessSourceFiles(directory) {
  console.log(`🔍 Pre-processing source files in ${directory} to collect Tailwind classes`);
  
  const collectClasses = (dir) => {
    const allClasses = new Set();
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively process directories
          const subClasses = collectClasses(fullPath);
          subClasses.forEach(c => allClasses.add(c));
        } else if (
          entry.name.endsWith('.astro') || 
          entry.name.endsWith('.jsx') || 
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.html')
        ) {
          // Read file content
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Collect all Tailwind classes
          const foundClasses = collectTailwindClasses(content);
          foundClasses.forEach(c => {
            allClasses.add(c);
            // Pre-generate all obfuscated class names
            getObfuscatedClassName(c);
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dir}:`, error);
    }
    
    return allClasses;
  };
  
  const classes = collectClasses(directory);
  console.log(`📊 Pre-collected ${classes.size} unique Tailwind classes`);
  return classes;
}

// Force a specific mapping for common Tailwind classes
export function ensureCommonTailwindClasses() {
  // List of common Tailwind classes that might be used
  const commonClasses = [
    // Layout
    'container', 'flex', 'grid', 'block', 'inline', 'inline-block', 'hidden',
    'flex-row', 'flex-col', 'relative', 'absolute', 'static', 'fixed', 'sticky',
    
    // Spacing (more comprehensive)
    ...Array.from({length: 24}, (_, i) => `p-${i}`),
    ...Array.from({length: 24}, (_, i) => `m-${i}`),
    ...Array.from({length: 24}, (_, i) => `px-${i}`),
    ...Array.from({length: 24}, (_, i) => `py-${i}`),
    ...Array.from({length: 24}, (_, i) => `mx-${i}`),
    ...Array.from({length: 24}, (_, i) => `my-${i}`),
    ...Array.from({length: 24}, (_, i) => `pt-${i}`),
    ...Array.from({length: 24}, (_, i) => `pr-${i}`),
    ...Array.from({length: 24}, (_, i) => `pb-${i}`),
    ...Array.from({length: 24}, (_, i) => `pl-${i}`),
    ...Array.from({length: 24}, (_, i) => `mt-${i}`),
    ...Array.from({length: 24}, (_, i) => `mr-${i}`),
    ...Array.from({length: 24}, (_, i) => `mb-${i}`),
    ...Array.from({length: 24}, (_, i) => `ml-${i}`),
    
    // Typography
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-bold', 'font-extrabold',
    'text-left', 'text-center', 'text-right', 'text-justify',
    
    // Common text colors
    'text-white', 'text-black', 'text-gray-50', 'text-gray-100', 'text-gray-200',
    'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700',
    'text-gray-800', 'text-gray-900',
    
    // Common background colors
    'bg-white', 'bg-black', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200',
    'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700',
    'bg-gray-800', 'bg-gray-900',
    
    // Flexbox
    'justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly',
    'items-start', 'items-center', 'items-end', 'items-baseline', 'items-stretch',
    
    // Sizing
    'w-full', 'h-full', 'w-screen', 'h-screen', 'max-w-full', 'max-h-full',
    ...Array.from({length: 12}, (_, i) => `w-${i}`),
    ...Array.from({length: 12}, (_, i) => `h-${i}`),
    
    // Common utilities
    'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full',
  ];
  
  console.log('📝 Pre-generating obfuscated names for common Tailwind classes');
  commonClasses.forEach(className => {
    getObfuscatedClassName(className);
  });
  console.log(`✅ Pre-generated ${commonClasses.length} class mappings`);
}

// Add this new function to directly process CSS files
export function processCssFiles(directory) {
  console.log("🔄 Processing CSS files to match HTML obfuscation...");
  
  const processCssFile = (filePath) => {
    try {
      let content = fs.readFileSync(filePath, "utf-8");
      const originalContent = content;
      let replacementCount = 0;
      
      // Get all keys from the class map to process
      const classNames = Object.keys(classMap);
      
      // Sort by length (longest first) to prevent partial replacements
      classNames.sort((a, b) => b.length - a.length);
      
      // Replace each class selector in the CSS
      for (const className of classNames) {
        // Skip empty class names
        if (!className.trim()) continue;
        
        const obfuscatedName = classMap[className];
        if (!obfuscatedName) continue;
        
        // Handle various CSS selector patterns
        // 1. Standard class selector: .class { ... }
        const pattern1 = new RegExp(`\\.${className}([\\s{,:>+~\\[])`, "g");
        content = content.replace(pattern1, (match, suffix) => {
          replacementCount++;
          return `.${obfuscatedName}${suffix}`;
        });
        
        // 2. End of selector: .class, or just .class
        const pattern2 = new RegExp(`\\.${className}$`, "gm");
        content = content.replace(pattern2, (match) => {
          replacementCount++;
          return `.${obfuscatedName}`;
        });
        
        // 3. Tailwind variants: .hover\:class, .md\:class, etc.
        const pattern3 = new RegExp(`\\.(\\w+)\\\\:${className}([\\s{,:>+~\\[])`, "g");
        content = content.replace(pattern3, (match, variant, suffix) => {
          replacementCount++;
          return `.${variant}\\:${obfuscatedName}${suffix}`;
        });
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated CSS file: ${path.basename(filePath)} (replaced ${replacementCount} selectors)`);
      } else {
        console.warn(`⚠️ No changes made to CSS file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing CSS file ${filePath}:`, error);
      console.error(error.stack);
    }
  };
  
  const findCssFiles = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          findCssFiles(fullPath);
        } else if (entry.name.endsWith(".css")) {
          console.log(`🔍 Found CSS file: ${path.basename(fullPath)}`);
          processCssFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error finding CSS files in ${dir}:`, error);
    }
  };
  
  findCssFiles(directory);
}

// Also add this helper function for better debugging
export function findAllHtmlFiles(directory) {
  const htmlFiles = [];
  
  const findFiles = (dir) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          findFiles(fullPath);
        } else if (entry.name.endsWith(".html")) {
          htmlFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error finding HTML files in ${dir}:`, error);
    }
  };
  
  findFiles(directory);
  return htmlFiles;
} 