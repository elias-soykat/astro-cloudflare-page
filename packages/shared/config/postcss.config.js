module.exports = {
  plugins: {
    'postcss-obfuscator': {
      enable: process.env.NODE_ENV === 'production',
      classMethod: 'random', // Use random strings for class names
      exclude: [], // No exclusions by default
      classLength: 8, // Length of obfuscated class names
      salt: process.env.OBFUSCATION_SALT || 'monorepo-salt', // Salt for consistent obfuscation
      obfuscate: ['class', 'id'], // Obfuscate both class and id attributes
      log: false, // Don't log obfuscation details
    }
  }
}; 