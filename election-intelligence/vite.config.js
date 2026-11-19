import { defineConfig } from 'vite';

// base relativa: o mesmo build funciona em GitHub Pages (subpasta), Netlify e Vercel.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
          d3: ['d3-geo', 'd3-selection', 'd3-zoom', 'topojson-client'],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
