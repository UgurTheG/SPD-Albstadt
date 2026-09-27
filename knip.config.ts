import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/admin/AdminApp.tsx',
    // Vercel serverless functions — not imported, called via HTTP
    'api/**/*.ts',
  ],
  project: ['src/**/*.{ts,tsx,css}', 'api/**/*.ts'],
}

export default config
