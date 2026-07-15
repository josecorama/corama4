import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/static/app/',
  build: {
    outDir: '../static/app',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep Rollup/Vite's shared helpers (preload + CommonJS interop) with
          // the always-loaded vendor chunk so they never drag a heavy lib chunk
          // into the initial load via a circular helper import.
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) {
            return 'react-vendor'
          }
          if (!id.includes('node_modules')) return
          if (id.includes('pdfjs-dist') || id.includes('@react-pdf-viewer')) return 'pdf-viewer'
          if (id.includes('/jspdf') || id.includes('html2canvas')) return 'jspdf'
          if (id.includes('lottie')) return 'lottie'
          if (id.includes('react-markdown')) return 'markdown'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
