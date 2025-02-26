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
      
      // Replace class attributes
      const classRegex = /class="([^"]*)"/g;
      content = content.replace(classRegex, (match, classNames) => {
        const classes = classNames.split(' ');
        const obfuscatedClasses = classes.map(className => 
          className.trim() ? (classMap[className.trim()] || className) : ''
        ).filter(Boolean);
        
        modified = true;
        return `class="${obfuscatedClasses.join(' ')}"`;
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated HTML file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing HTML file ${filePath}:`, error);
    }
  };
  
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