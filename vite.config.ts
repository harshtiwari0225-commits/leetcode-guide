import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './public/manifest.json' with { type: 'json' };

// @crxjs handles MV3 bundling: it reads manifest.json, rewrites paths,
// produces a Web Store-ready build in dist/, and supports HMR for the popup.
export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    // Required by @crxjs for HMR over a fixed origin
    hmr: { port: 5173 },
  },
});