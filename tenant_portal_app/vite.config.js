// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Only include visualizer in production builds to avoid dev overhead
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig(async () => {
  const plugins = [react(), tailwindcss()];

  if (isProduction) {
    // Lazy import avoids ESM/CJS config-resolution issues in some environments.
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    plugins,
  build: {
    // Keep default Rollup chunk graph + Vite vendor splitting to avoid circular init issues
    // seen with aggressive manualChunks rules.
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
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
        // Keep the /api prefix as backend expects it
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
          });
        },
      }
    }
  },
};
});
