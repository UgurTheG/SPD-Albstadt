import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Separate Vitest config — avoids pulling in the Vite dev-server plugins
 * (ICS proxy, Instagram API, OAuth callback) that import Node.js server modules.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  define: {
    // Provide a dummy value so LoginScreen's CLIENT_ID is always defined in tests
    'import.meta.env.VITE_GITHUB_CLIENT_ID': JSON.stringify('test-client-id'),
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/admin/**', 'src/components/**', 'src/utils/**'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.*', 'src/admin/components/CropOverlay.tsx'],
    },
  },
})
