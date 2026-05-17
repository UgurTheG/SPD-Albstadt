# CLAUDE.md — SPD Albstadt

Project memory and behavioural contract for Claude Code sessions on this repository.

---

## Project overview

Public website and browser-based content editor for the SPD Ortsverein Albstadt.

- **Public site** (`src/`) — React SPA with sections: Aktuelles, Partei, Fraktion, Kommunalpolitik, Historie, Kontakt, Datenschutz, Impressum
- **Admin editor** (`src/admin/`) — GitHub OAuth-authenticated CMS at `/admin`; edits JSON in `public/data/`, commits via GitHub API
- **Serverless API** (`api/`) — Vercel Functions for ICS proxy, GitHub API proxy, OAuth flow, admin presence
- **Content** — JSON files in `public/data/`, images in `public/images/`, PDFs in `public/documents/`
- **Deployed to** — Vercel; branch `main` is production

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript 6, Vite 8 |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | Framer Motion |
| State (admin) | Zustand |
| Data fetching | SWR |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit |
| Toasts | Sonner |
| Lightbox | yet-another-react-lightbox |
| Calendar | ical.js |
| Testing | Vitest + @testing-library/react + happy-dom |
| Linting | ESLint + typescript-eslint |
| Formatting | Prettier |
| Dead code | knip |
| Orphan assets | scripts/find-unused-assets.mjs |
| Node | ≥ 20 |

---

## Development commands

```bash
npm run dev              # Vite dev server on http://localhost:5173
npm run build            # tsc -b && vite build
npm run preview          # Local preview of production build
npm run lint             # ESLint
npm run format           # Prettier --write
npm run format:check     # Prettier --check (runs in CI)
npm run test             # Vitest (run once)
npm run test:watch       # Vitest (watch mode)
npm run coverage         # Vitest with v8 coverage
npm run knip             # Detect unused TS/JS code
npm run find-unused-assets  # Detect unreferenced images/documents
```

Path alias: `@/` resolves to `src/`.

---

## Pre-push checklist — ALL must pass before pushing any branch

```bash
npm run build            # No TypeScript or Vite errors
npm run test             # All tests green
npm run format:check     # Prettier clean (CI gate)
npm run knip             # Zero unused files, exports, or types
npm run find-unused-assets  # Zero orphaned images or documents
```

Never push a branch that breaks any of these. Fix formatting with `npm run format` before committing.

---

## Git workflow

- **Branch naming** — `feature/short-description`, `fix/short-description`, or the Claude-generated `claude/...` pattern
- **Always** — feature branch → PR → squash merge into `main`
- **Never** — push directly to `main` (branch is protected)
- **Commit messages** — imperative mood, concise subject line, body only if the why is non-obvious
- **One logical change per PR** — don't bundle unrelated fixes

---

## Code conventions

### TypeScript
- Use strict TypeScript throughout — no `any`, no type assertions unless unavoidable
- Prefer `type` imports (`import type { ... }`) for type-only imports
- Use inference where obvious; annotate where the type adds clarity for a reader
- Use `interface` for object shapes that may be extended; `type` for unions, aliases, and mapped types

### React
- **Functional components only** — no class components
- **Hooks only** — no legacy lifecycle methods, no `forwardRef` unless strictly necessary
- Keep components as thin render layers; extract logic into custom hooks
- Co-locate hooks with their section when domain-specific; put reusable hooks in `src/hooks/`
- Use `useCallback` only when the callback is a dependency of another hook or memo — not by default

### Modern patterns — always prefer
- `crypto.randomUUID()` over `Math.random()` for IDs
- `structuredClone()` over JSON parse/stringify for deep copies
- Native `fetch` over third-party HTTP clients
- `Array.at(-1)` over `arr[arr.length - 1]`
- Optional chaining (`?.`) and nullish coalescing (`??`) over explicit null checks
- `const` by default; `let` only when reassignment is required
- Template literals over string concatenation

### Styling
- Tailwind utility classes only — no inline `style={{}}` unless for dynamic values that can't be expressed in Tailwind
- Use the `cn()` utility (`src/utils/cn.ts`) for conditional class merging
- Dark mode via `dark:` variants — never via JS-toggled class names

---

## Type sharing rules

Types must have a single canonical source. Never define the same shape twice.

| Where the type is used | Where to define it |
|---|---|
| One section only (public) | `src/components/sections/<Section>/types.ts` |
| Cross-section or cross-layer | `src/types/` |
| Admin-only | `src/admin/types.ts` |

**Hard boundary:** `src/components/` (public) must **never** import from `src/admin/`. The admin layer may import shared types from `src/components/sections/*/types.ts` or `src/types/`.

When the admin needs the same type as a public section (e.g. `KommunalpolitikPerson`), import it from the section's `types.ts` — do not redefine it in the admin hook.

---

## Testing rules

- Every new utility function, hook, or shared logic must have a test
- Tests live in `__tests__/` next to the code they cover
- Use `describe` + `it` with clear English descriptions
- Mock at the boundary (GitHub API, fetch, browser APIs) — never mock the code under test
- Do not test implementation details — test behaviour and return values
- Aim to keep all 39 test files passing; never reduce the test count without a clear reason

---

## Code quality rules

- **Leave the codebase better than you found it** — if you encounter a bug, dead code, formatting issue, or type duplication while working on something else, fix it in the same PR (if small) or open a follow-up note (if large)
- **No dead exports** — if you add an export, something must import it; run `knip` to verify
- **No duplicate types** — always import from the canonical types file; never copy-paste an interface
- **No unused assets** — if you add an image or document, it must be referenced; if you remove a reference, delete the file too
- **No comments explaining what the code does** — only add a comment when the *why* is non-obvious

---

## Admin-specific rules

- The admin editor publishes via the GitHub Trees API — changes are real Git commits on `main`
- The `useTabPublisher` hook handles the publish flow; use it instead of calling the GitHub API directly
- Undo/redo is per-tab via the Zustand store — use `useUndoRedoShortcuts` for keyboard shortcuts
- Image uploads go through `ImageField` / `ImageListField`; they convert to WebP before committing
- Presence state (`src/admin/store/presenceSlice.ts`) uses Vercel KV in production — do not add polling; heartbeats are already on a 30-second interval

---

## Content data model

| File | Section |
|---|---|
| `public/data/config.json` | ICS URL, Elfsight App ID |
| `public/data/startseite.json` | Hero slogan and badge |
| `public/data/news.json` | Aktuelles news items |
| `public/data/party.json` | Vorstand, Abgeordnete, Schwerpunkte |
| `public/data/fraktion.json` | Gemeinderäte, Kreisräte |
| `public/data/kommunalpolitik.json` | Kommunalpolitik years and candidates |
| `public/data/kontakt.json` | Contact details, Formspree URL, social links |
| `public/data/history.json` | Timeline and Persönlichkeiten |
| `public/data/impressum.json` | Impressum sections |
| `public/data/datenschutz.json` | Datenschutz sections |
| `public/data/haushaltsreden.json` | Disabled years config |

Date format: `YYYY-MM-DD`. Image paths: `/images/<dir>/<file>.webp`. PDF paths: `/documents/<dir>/<file>.pdf`.

---

## What to avoid

- `any` type — use `unknown` and narrow, or use a proper type
- `console.log` left in committed code
- Hardcoded secrets or tokens anywhere in `src/` or `api/` — use environment variables
- Importing from `src/admin/` in public-facing components
- Defining types that already exist in a `types.ts` file
- Adding npm dependencies without a clear reason — check if the standard library or an existing dependency already covers the need
- Amending pushed commits — always create a new commit
- Force-pushing to any branch without explicit user confirmation
