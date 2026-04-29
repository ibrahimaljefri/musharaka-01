import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-d3':    ['d3-selection', 'd3-scale', 'd3-axis', 'd3-array', 'd3-shape'],
          'vendor-ui':       ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
