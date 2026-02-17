import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  // Base relativa para que Electron cargue los archivos correctamente
  base: './',
  define: {
    // simple-peer / y-webrtc reliance on global/process
    global: 'window',
  },
  resolve: {
    alias: {
      // stream polyfill might be needed if nodePolyfills doesn't catch all
      // 'stream': 'stream-browserify',
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
