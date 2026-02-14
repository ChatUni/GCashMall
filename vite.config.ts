import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  base: './',
  esbuild: {
    // Preserve console.log in production for debugging
    drop: [],
  },
})
