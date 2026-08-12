import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 5173,
    // Allow dev tunnels (localtunnel, ngrok, etc.) to load the app through the dev server,
    // e.g. for testing payment redirects/webhooks. A leading dot allows all subdomains.
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io', '.trycloudflare.com'],
  },
  base: process.env.CORDOVA ? './' : '/',
  build: {
    target: 'esnext',
    outDir: 'www',
  },
})
