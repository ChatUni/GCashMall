import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 5173,
  },
  base: process.env.CORDOVA ? './' : '/',
  build: {
    target: 'esnext',
    outDir: 'www',
  },
})
