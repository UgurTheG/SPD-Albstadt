import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { serveIcsProxy } from './plugins/serveIcsProxy'
import { serveOAuthCallback } from './plugins/serveOAuthCallback'
import { generateSitemap } from './plugins/generateSitemap'
import { prerenderRoutes } from './plugins/prerenderRoutes'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    plugins: [
      serveIcsProxy(),
      serveOAuthCallback(env),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false, // use existing public/manifest.json
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/data\//, /^\/admin/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/static\.elfsight\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'elfsight-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
      }),
      generateSitemap(),
      prerenderRoutes(),
    ],
  }
})
