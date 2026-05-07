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
    build: {
      // Don't eagerly preload vendor chunks — only preload the direct entry deps.
      modulePreload: {
        resolveDependencies(_url, deps) {
          return deps.filter(dep => !dep.includes('admin'))
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // NOTE: Do NOT manually chunk /src/admin/ here — let Rolldown create
            // a natural dynamic-import chunk for it. Forcing it into a named chunk
            // causes Rolldown (Vite 8) to inline all its dependencies (React,
            // framer-motion, etc.) and then re-export them, making the main entry
            // statically import the admin chunk on every page.

            // Admin-only node_modules — never preloaded on non-admin pages.
            // These are exclusively imported by src/admin/** code.
            if (
              id.includes('node_modules/@dnd-kit/') ||
              id.includes('node_modules/sonner/') ||
              id.includes('node_modules/zustand/') ||
              id.includes('node_modules/@reduxjs/') ||
              id.includes('node_modules/immer/')
            )
              return 'admin-vendor'
            // Lightbox — only rendered when a Sheet/gallery opens (user interaction).
            // Keeping it out of vendor prevents it from being eagerly preloaded on all pages.
            if (id.includes('yet-another-react-lightbox')) return 'lightbox'
            // Calendar libs — only needed on /aktuelles (lazy chunk).
            // ical.js parses ICS feeds; ics generates downloadable ICS files.
            if (id.includes('node_modules/ical.js/') || id.includes('node_modules/ics/'))
              return 'calendar'
            // Heavy animation library
            if (id.includes('framer-motion')) return 'framer-motion'
            // Lucide icons (large icon set)
            if (id.includes('lucide-react')) return 'lucide'
            // React ecosystem core
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router')
            )
              return 'react-vendor'
            // Everything else in node_modules → vendor chunk
            if (id.includes('node_modules/')) return 'vendor'
          },
        },
      },
    },
    plugins: [
      serveIcsProxy(),
      serveOAuthCallback(env),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script-defer',
        manifest: false, // use existing public/manifest.json
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
          // Don't precache admin JS — it's a large lazy chunk only needed on /admin.
          // It will be cached on first access to /admin via the navigation handler.
          globIgnores: ['**/AdminApp*.js', '**/admin*.js'],
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
      // ── Non-render-blocking CSS ────────────────────────────────────────────
      // Vite injects the main stylesheet as a render-blocking <link rel="stylesheet">.
      // For this client-side SPA the HTML body is empty until JS runs (~2s on slow 4G),
      // so the CSS doesn't need to block rendering — React will finish long after it loads.
      // Using the print-media trick makes CSS async: browser fetches it immediately but
      // doesn't hold up the critical-path, saving ~300ms on FCP/LCP (Lighthouse 4G sim).
      {
        name: 'async-css',
        enforce: 'post',
        transformIndexHtml(html: string) {
          return html.replace(
            /<link rel="stylesheet"([^>]+)>/g,
            (_match: string, attrs: string) =>
              `<link rel="stylesheet" media="print" onload="this.media='all'"${attrs}>` +
              `<noscript><link rel="stylesheet"${attrs}></noscript>`,
          )
        },
      },
    ],
  }
})
