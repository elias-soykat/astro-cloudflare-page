# Astro Obfuscation in Monorepo

This document explains how the obfuscation process works in this monorepo for Astro projects.

## Overview

The obfuscation process is designed to:

1. Obfuscate all Astro files (`.astro`) and their compiled HTML output
2. Obfuscate CSS class names and HTML class attributes
3. Ensure inline scripts are handled correctly
4. Trigger automatically during the build process

## How It Works

The obfuscation is implemented using:

1. **postcss-obfuscator**: A PostCSS plugin that obfuscates CSS class names and HTML class attributes
2. **Custom Astro Integration**: A custom integration that processes HTML files after the build process
3. **Automated Scripts**: Scripts to automate the obfuscation process for all apps in the monorepo

## Configuration

The obfuscation is configured in the following files:

- `packages/shared/config/postcss.config.js`: PostCSS configuration with the obfuscator plugin
- `packages/shared/utils/obfuscationIntegration.js`: Custom Astro integration for obfuscating HTML files
- `packages/shared/scripts/obfuscate.js`: Script to automate the obfuscation process

## Usage

### Building with Obfuscation

To build an app with obfuscation:

```bash
# Build a specific app with obfuscation
pnpm obfuscate:domain.com

# Build all apps with obfuscation
pnpm obfuscate:all
```

### Cloudflare Pages Deployment

The obfuscation process is automatically triggered during Cloudflare Pages deployment. The configuration is in:

- `apps/niche1/domain.com/cloudflare-pages.json`

## Customization

You can customize the obfuscation process by:

1. Modifying the PostCSS configuration in `packages/shared/config/postcss.config.js`
2. Updating the obfuscation integration in `packages/shared/utils/obfuscationIntegration.js`
3. Setting environment variables:
   - `NODE_ENV=production`: Enables obfuscation
   - `OBFUSCATION_SALT`: Sets a custom salt for consistent obfuscation (a random salt is generated if not provided)

## Troubleshooting

If you encounter issues with the obfuscation process:

1. Check the console output for error messages
2. Verify that the PostCSS plugin is correctly installed
3. Ensure that the Astro integration is properly configured
4. Check that the environment variables are set correctly

## Notes

- The obfuscation process is only applied in production mode (`NODE_ENV=production`)
- A random salt is generated for each build to ensure unique obfuscation
- The salt can be set manually using the `OBFUSCATION_SALT` environment variable for consistent obfuscation across builds 