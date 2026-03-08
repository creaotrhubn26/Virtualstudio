/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
