import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { serveIcsProxy } from './plugins/serveIcsProxy'
import { serveOAuthCallback } from './plugins/serveOAuthCallback'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    plugins: [serveIcsProxy(), serveOAuthCallback(env), react(), tailwindcss()],
  }
})
