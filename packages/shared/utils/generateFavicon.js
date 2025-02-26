/**
 * Favicon generation plugin for Vite
 * This is a placeholder implementation to fix the build error
 */
export function faviconPlugin() {
  return {
    name: 'favicon-plugin',
    // This is a minimal implementation to prevent build errors
    // You can expand this with actual favicon generation logic if needed
    configureServer(server) {
      // No-op for development server
    }
  };
} 