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
  },
  appType: 'mpa',
  optimizeDeps: {
    // Exclude Babylon.js from pre-bundling - it uses dynamic imports that conflict with Vite's pre-bundling
    // Babylon.js modules are already optimized and work better as ESM
    exclude: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
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
    // Increase timeout for HMR and module requests
    hmr: {
      timeout: 30000,
    },
  },
  build: {
    outDir: 'dist',
    // Increase chunk size warning limit for large Babylon.js bundles
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: 'index.html',
        casting: 'casting.html',
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
