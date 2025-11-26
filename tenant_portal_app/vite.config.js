// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Only include visualizer in production builds to avoid dev overhead
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Bundle analyzer - only in production builds
    // Run `npm run build` then check `dist/stats.html`
    ...(isProduction ? [
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ] : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React vendor chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          // NextUI vendor chunk - separate large UI library
          if (id.includes('node_modules/@nextui-org')) {
            return 'nextui-vendor';
          }
          // Framer Motion (animation library - can be large)
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          // Utils vendor chunk
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/jwt-decode')) {
            return 'utils-vendor';
          }
          // Lucide icons (can be large if importing many icons)
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'esbuild',
    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: false,
  },
  server: {
    port: 3000,
    cors: {
      origin: 'http://localhost:3001',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
});
