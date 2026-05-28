import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-dock',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/dock-widget.tsx'),
      name: 'DockWidget',
      fileName: 'dock-widget',
      formats: ['iife'],
    },
  },
})
