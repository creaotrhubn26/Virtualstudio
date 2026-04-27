/// <reference types="vitest" />
import { createReadStream, existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPlaceholderSvg(pathname: string): string {
  const fileName = basename(pathname).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Missing asset';
  const label = escapeSvgText(fileName.slice(0, 32));
  const isTexture = pathname.startsWith('/textures/');
  const accent = isTexture ? '#d97706' : pathname.startsWith('/images/presets/') ? '#0f766e' : '#1d4ed8';
  const subtitle = isTexture ? 'procedural fallback' : 'placeholder preview';
  const pattern = isTexture
    ? `
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.35" />
      <circle cx="76" cy="76" r="34" fill="${accent}" opacity="0.18" />
      <circle cx="436" cy="436" r="64" fill="${accent}" opacity="0.12" />
    `
    : `
      <rect x="42" y="48" width="428" height="252" rx="22" fill="${accent}" opacity="0.14" />
      <rect x="68" y="80" width="376" height="120" rx="16" fill="${accent}" opacity="0.18" />
      <rect x="68" y="222" width="218" height="20" rx="10" fill="${accent}" opacity="0.22" />
      <rect x="68" y="256" width="160" height="16" rx="8" fill="${accent}" opacity="0.12" />
    `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#1f2937" />
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f8fafc" stroke-opacity="0.12" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  ${pattern}
  <rect x="32" y="360" width="448" height="120" rx="24" fill="#020617" opacity="0.84" />
  <text x="52" y="412" fill="#f8fafc" font-size="28" font-family="Arial, sans-serif" font-weight="700">${label}</text>
  <text x="52" y="446" fill="#cbd5e1" font-size="18" font-family="Arial, sans-serif">${subtitle}</text>
</svg>`;
}

function devAssetFallbackPlugin() {
  const publicDir = resolve(process.cwd(), 'public');
  const attachedAssetsDir = resolve(process.cwd(), 'attached_assets');

  const getContentType = (pathname: string): string => {
    const extension = extname(pathname).toLowerCase();
    switch (extension) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      case '.svg':
        return 'image/svg+xml';
      case '.json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  };

  return {
    name: 'virtualstudio-dev-asset-fallbacks',
    configureServer(server: any) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || !req.url) {
          next();
          return;
        }

        const pathname = req.url.split('?')[0];
        const shouldHandle = pathname.startsWith('/images/') || pathname.startsWith('/textures/');
        if (!shouldHandle) {
          next();
          return;
        }

        const localPath = resolve(publicDir, `.${pathname}`);
        if (existsSync(localPath)) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-store');
        res.end(buildPlaceholderSvg(pathname));
      });

      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || !req.url) {
          next();
          return;
        }

        const pathname = req.url.split('?')[0];
        if (!pathname.startsWith('/attached_assets/')) {
          next();
          return;
        }

        const localPath = resolve(attachedAssetsDir, `.${pathname.slice('/attached_assets'.length)}`);
        if (!existsSync(localPath)) {
          next();
          return;
        }

        res.setHeader('Content-Type', getContentType(localPath));
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(localPath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devAssetFallbackPlugin()],
  resolve: {
    alias: {
      '@': '/src',
      '@assets': '/attached_assets',
      '@shared': '/src/shared',
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  appType: 'mpa',
  optimizeDeps: {
    // Include babylon packages in pre-bundling for better compatibility
    include: [
      '@babylonjs/core',
      '@babylonjs/loaders',
      '@babylonjs/gui',
      // Pre-bundle so location-test.html / director-scene.html don't
      // trigger a mid-navigation re-optimization (which 504s and breaks
      // the GLTFFileLoader registration in the new tab).
      '3d-tiles-renderer',
      '3d-tiles-renderer/babylonjs',
      '3d-tiles-renderer/core/plugins',
      // Used by LocationScene's dropToGround raycast, HDRI env map,
      // and Meshy default-material repaint. Pre-bundle to avoid
      // mid-mount reloads when these are first hit.
      '@babylonjs/core/Culling/ray',
      '@babylonjs/core/Materials/Textures/hdrCubeTexture',
      '@babylonjs/core/Materials/PBR/pbrMaterial',
      'suncalc',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material',
      'react',
      'react-dom',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
    force: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy R2 CDN requests to avoid CORS issues in development
      '/r2-assets': {
        target: 'https://pub-957cc1572eca43cfb57af6fc3a8a4394.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2-assets/, ''),
        secure: true,
      }
    },
    watch: {
      ignored: [
        '**/.pythonlibs/**', 
        '**/node_modules/**', 
        '**/.git/**', 
        '**/.cache/**', 
        '**/DECA/**', 
        '**/backend/models/**',
        '**/.config/**',  // Ignore VS Code config and extensions
        '**/.vscode-server/**',  // Explicitly ignore VS Code server files
        '**/.cursor/**'  // Ignore Cursor IDE files
      ]
    },
    // Disable HMR in dev container/remote environment - can cause WebSocket connection issues
    hmr: false,
    middlewareMode: false,
  },
  build: {
    outDir: 'dist',
    // Increase chunk size warning limit for large Babylon.js bundles
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: 'index.html',
        // Multi-page entries — Vite pre-optimises deps for each so the
        // dev server doesn't trigger a mid-navigation 504 "Outdated
        // Optimize Dep" when the user clicks "Apply" and the studio
        // tab pops open the location tab.
        locationTest: 'location-test.html',
        directorScene: 'director-scene.html',
      },
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'babylon-core': ['@babylonjs/core'],
          'babylon-loaders': ['@babylonjs/loaders'],
          'babylon-gui': ['@babylonjs/gui'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
