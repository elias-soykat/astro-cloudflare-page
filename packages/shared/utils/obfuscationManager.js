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
    // Spacing
    'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5',
    'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5',
    'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'my-1', 'my-2', 'my-3', 'my-4', 'my-5',
    // Typography
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl',
    'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-bold',
    // Colors
    'text-black', 'text-white', 'text-gray-100', 'text-gray-200', 'text-gray-300',
    'bg-white', 'bg-black', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300',
    // Flexbox
    'justify-start', 'justify-end', 'justify-center', 'items-start', 'items-center',
    // Add more as needed
  ];
  
  console.log('📝 Pre-generating obfuscated names for common Tailwind classes');
  commonClasses.forEach(className => {
    getObfuscatedClassName(className);
  });
  console.log(`✅ Pre-generated ${commonClasses.length} class mappings`);
} 