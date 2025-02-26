#!/usr/bin/env node

/**
 * Obfuscation script for Astro projects in the monorepo
 * This script will:
 * 1. Set the NODE_ENV to production to enable obfuscation
 * 2. Generate a random salt for obfuscation if not provided
 * 3. Run the build process for the specified app
 */

import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import fs from 'fs';

// Generate a random salt if not provided
const salt = process.env.OBFUSCATION_SALT || randomBytes(16).toString('hex');

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.OBFUSCATION_SALT = salt;

// Get the app path from command line arguments
const appPath = process.argv[2];

if (!appPath) {
  console.error('❌ Please provide an app path (e.g., apps/niche1/domain.com)');
  process.exit(1);
}

// Check if the app path exists
if (!fs.existsSync(appPath)) {
  console.error(`❌ App path does not exist: ${appPath}`);
  process.exit(1);
}

console.log(`🔒 Starting obfuscation process for ${appPath}...`);
console.log(`🔑 Using salt: ${salt}`);

try {
  // Run the build process
  console.log('🏗️ Building the app...');
  execSync(`cd ${appPath} && pnpm install --no-frozen-lockfile && pnpm build`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      OBFUSCATION_SALT: salt,
    },
  });

  console.log('✅ Obfuscation process completed successfully!');
} catch (error) {
  console.error('❌ Error during obfuscation process:', error);
  process.exit(1);
} 