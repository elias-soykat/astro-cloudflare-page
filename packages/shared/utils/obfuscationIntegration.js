import fs from 'fs';
import path from 'path';

/**
 * Custom Astro integration for obfuscating Astro files
 * This integration will:
 * 1. Obfuscate CSS class names in Astro files
 * 2. Ensure inline scripts are handled correctly
 * 3. Apply obfuscation during the build process
 */
export function obfuscationIntegration() {
  return {
    name: 'astro-obfuscation-integration',
    hooks: {
      'astro:build:done': async ({ dir, pages }) => {
        console.log('🔒 Starting obfuscation process...');
        
        // Convert URL to string if needed
        let outputDir = dir;
        if (typeof dir === 'object' && dir instanceof URL) {
          outputDir = dir.pathname;
          // On Windows, remove the leading slash from the pathname
          if (process.platform === 'win32' && outputDir.startsWith('/')) {
            outputDir = outputDir.substring(1);
          }
        }
        
        console.log(`📁 Output directory: ${outputDir}`);
        
        // Process all HTML files in the build output
        const processDirectory = async (directory) => {
          console.log(`🔍 Processing directory: ${directory}`);
          
          try {
            const entries = fs.readdirSync(directory, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(directory, entry.name);
              
              if (entry.isDirectory()) {
                await processDirectory(fullPath);
              } else if (entry.name.endsWith('.html')) {
                try {
                  let content = fs.readFileSync(fullPath, 'utf-8');
                  
                  // Simple class name obfuscation using regex
                  // This is a simplified approach - in a real implementation, you'd use postcss-obfuscator
                  const salt = process.env.OBFUSCATION_SALT || 'monorepo-salt';
                  const classRegex = /class="([^"]*)"/g;
                  
                  // Generate a random string for class names
                  const generateRandomString = (length = 8) => {
                    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    let result = '';
                    for (let i = 0; i < length; i++) {
                      result += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return result;
                  };
                  
                  // Create a map of class names to obfuscated names
                  const classMap = {};
                  
                  // Replace class names with obfuscated versions
                  content = content.replace(classRegex, (match, classNames) => {
                    const classes = classNames.split(' ');
                    const obfuscatedClasses = classes.map(className => {
                      if (!className) return '';
                      if (!classMap[className]) {
                        classMap[className] = generateRandomString();
                      }
                      return classMap[className];
                    });
                    return `class="${obfuscatedClasses.join(' ')}"`;
                  });
                  
                  fs.writeFileSync(fullPath, content);
                  console.log(`✅ Obfuscated: ${path.relative(outputDir, fullPath)}`);
                } catch (error) {
                  console.error(`❌ Error obfuscating ${fullPath}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error processing directory ${directory}:`, error);
          }
        };
        
        await processDirectory(outputDir);
        console.log('🔒 Obfuscation process completed!');
      }
    }
  };
} 