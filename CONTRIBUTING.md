# Contributing to SPD Albstadt

Thank you for your interest in contributing!

## Prerequisites

- **Node.js** ≥ 20 (see `engines` in `package.json`)
- **npm** (comes with Node.js)

## Setup

```bash
git clone <repo-url>
cd SPD-Albstadt
npm ci
```

## Development

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check + production build
npm run preview    # Preview production build locally
```

## Linting & Formatting

```bash
npm run lint           # ESLint
npm run format         # Prettier (auto-fix)
npm run format:check   # Prettier (check only)
```

Pre-commit hooks (via Husky + lint-staged) automatically format staged files.

## Testing

```bash
npm test          # Run all tests once
npm run test:watch # Watch mode
npm run coverage   # Generate coverage report
```

Coverage reports are saved to `./coverage/`.

## Project Structure

```
src/
├── admin/          # Admin CMS (lazy-loaded, Vercel-only)
├── components/     # Reusable UI components
│   └── sections/   # Page-level section components
├── hooks/          # Custom React hooks
├── shared/         # Shared constants/types across modules
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

api/                # Vercel serverless API routes
public/data/        # JSON content files (CMS-managed)
```

## Pull Request Guidelines

1. Create a feature branch from `main`
2. Make your changes with descriptive commits
3. Ensure `npm run lint`, `npm run format:check`, and `npm test` all pass
4. Open a PR against `main` with a clear description
5. CI will automatically run type-check, lint, format, test, and build

## Code Style

- TypeScript strict mode enabled
- Tailwind CSS for styling (no custom CSS unless necessary)
- Functional components with hooks
- Custom hooks for reusable logic
- Lazy-loaded route components
