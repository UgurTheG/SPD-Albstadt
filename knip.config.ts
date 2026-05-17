import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'src/admin/AdminApp.tsx',
    // Vercel serverless functions — not imported, called via HTTP
    'api/**/*.ts',
  ],
  project: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
  ignoreDependencies: [
    // Imported via CSS (@import), not JS — knip can't trace CSS imports
    '@fontsource-variable/inter',
    'tailwindcss',
  ],
}

export default config
