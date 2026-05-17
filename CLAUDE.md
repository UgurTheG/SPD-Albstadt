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

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| Framework     | React 19, TypeScript 6, Vite 8              |
| Routing       | react-router-dom v7                         |
| Styling       | Tailwind CSS v4 (via `@tailwindcss/vite`)   |
| Animation     | Framer Motion                               |
| State (admin) | Zustand                                     |
| Data fetching | SWR                                         |
| Icons         | Lucide React                                |
| Drag & Drop   | @dnd-kit                                    |
| Toasts        | Sonner                                      |
| Lightbox      | yet-another-react-lightbox                  |
| Calendar      | ical.js                                     |
| Testing       | Vitest + @testing-library/react + happy-dom |
| Linting       | ESLint + typescript-eslint                  |
| Formatting    | Prettier                                    |
| Dead code     | knip                                        |
| Orphan assets | scripts/find-unused-assets.mjs              |
| Node          | ≥ 20                                        |

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

| Where the type is used       | Where to define it                           |
| ---------------------------- | -------------------------------------------- |
| One section only (public)    | `src/components/sections/<Section>/types.ts` |
| Cross-section or cross-layer | `src/types/`                                 |
| Admin-only                   | `src/admin/types.ts`                         |

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
- **No comments explaining what the code does** — only add a comment when the _why_ is non-obvious

---

## Admin-specific rules

- The admin editor publishes via the GitHub Trees API — changes are real Git commits on `main`
- The `useTabPublisher` hook handles the publish flow; use it instead of calling the GitHub API directly
- Undo/redo is per-tab via the Zustand store — use `useUndoRedoShortcuts` for keyboard shortcuts
- Image uploads go through `ImageField` / `ImageListField`; they convert to WebP before committing
- Presence state (`src/admin/store/presenceSlice.ts`) uses Vercel KV in production — do not add polling; heartbeats are already on a 30-second interval

---

## Content data model

| File                               | Section                                      |
| ---------------------------------- | -------------------------------------------- |
| `public/data/config.json`          | ICS URL, Elfsight App ID                     |
| `public/data/startseite.json`      | Hero slogan and badge                        |
| `public/data/news.json`            | Aktuelles news items                         |
| `public/data/party.json`           | Vorstand, Abgeordnete, Schwerpunkte          |
| `public/data/fraktion.json`        | Gemeinderäte, Kreisräte                      |
| `public/data/kommunalpolitik.json` | Kommunalpolitik years and candidates         |
| `public/data/kontakt.json`         | Contact details, Formspree URL, social links |
| `public/data/history.json`         | Timeline and Persönlichkeiten                |
| `public/data/impressum.json`       | Impressum sections                           |
| `public/data/datenschutz.json`     | Datenschutz sections                         |
| `public/data/haushaltsreden.json`  | Disabled years config                        |

Date format: `YYYY-MM-DD`. Image paths: `/images/<dir>/<file>.webp`. PDF paths: `/documents/<dir>/<file>.pdf`.

---

## Environment variables

Copy `.env.example` to `.env` for local development. All secrets stay server-side only.

| Variable                | Required    | Purpose                                                                                 |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `VITE_GITHUB_CLIENT_ID` | Yes         | GitHub OAuth App client ID (public, used in frontend)                                   |
| `GITHUB_CLIENT_SECRET`  | Yes         | GitHub OAuth App client secret (server-side only)                                       |
| `OAUTH_REDIRECT_URI`    | Yes         | Full callback URL, e.g. `https://<domain>/api/auth/callback`                            |
| `STATE_SIGNING_SECRET`  | Recommended | HMAC key for CSRF state signing; falls back to `GITHUB_CLIENT_SECRET` if unset          |
| `ALLOWED_GITHUB_LOGINS` | Optional    | Comma-separated GitHub usernames; defence-in-depth allowlist on top of repo permissions |
| `KV_REST_API_URL`       | Optional    | Vercel KV URL for shared admin presence state across instances                          |
| `KV_REST_API_TOKEN`     | Optional    | Vercel KV token (required when `KV_REST_API_URL` is set)                                |

`VITE_*` variables are bundled into the frontend. Never prefix server secrets with `VITE_`.

---

## Section architecture pattern

Every public data-fetching section follows the same three-hook composition:

```tsx
// 1. Data + view trigger + error redirect in one call
const { ref, isInView, data } = useSectionPage<MyData>('/data/my.json')

// 2. Sheet/modal state — pass the "closed" sentinel as initial value
//    Use null for single-type sheets, { type: 'none' } for discriminated unions
const {
  state: sheet,
  set: setSheet,
  close: closeSheet,
} = useSheetState<SheetState>({ type: 'none' })

// 3. Wrap in SectionContainer + SectionHeader
return (
  <SectionContainer id="mysection">
    <SectionHeader
      sectionRef={ref}
      isInView={isInView}
      label="…"
      title="…"
      description={data?.beschreibung}
    />
    {/* section content */}
  </SectionContainer>
)
```

`useSectionPage` composes `useSectionView` (IntersectionObserver ref + `isInView`), `useData` (SWR fetch), and `useHttpErrorRedirect` (redirects on 4xx/5xx). Do not inline these separately — always use `useSectionPage`.

`data` is `undefined` while loading and typed as `T | undefined`. Render skeletons when `!data`; hide sections when the relevant array is empty.

---

## Admin tab registration

Every editor tab is declared in `src/admin/config/tabs.ts` as a `TabConfig`. To add a new tab:

1. Add a `TabConfig` entry to the `TABS` array in `src/admin/config/tabs.ts`
2. Create the corresponding JSON file in `public/data/`
3. Add a section entry to `seoConfig.ts` if the tab has a public route

**`TabConfig` shape:**

```ts
{
  key: string           // matches the JSON filename stem and store key
  label: string         // displayed in the admin sidebar
  file: string          // public fetch path, e.g. '/data/news.json'
  ghPath: string        // GitHub repo path, e.g. 'public/data/news.json'
  type: 'object'        // single JSON object — use topFields + sections
       | 'array'        // flat array of items — use fields
       | 'kommunalpolitik'  // custom editor (KommunalpolitikEditor)
       | 'haushaltsreden'   // custom editor (HaushaltsredenEditor)
  previewPath?: string  // opens this route in the preview modal
  topFields?: FieldConfig[]   // top-level scalar fields (object tabs)
  sections?: SectionConfig[]  // named array sub-sections (object tabs)
  fields?: FieldConfig[]      // item fields (array tabs)
}
```

**`FieldConfig` types:** `text`, `textarea`, `date`, `email`, `url`, `select`, `image`, `imagelist`, `icon-picker`, `stringlist`

For `image` fields, set `imageDir` to the target subdirectory under `public/images/` (e.g. `imageDir: 'vorstand'`).  
For `imagelist` fields, set `captionsKey` to the companion string-array field if captions are supported.

---

## SEO and sitemap

All public routes must have an entry in `src/seoConfig.ts` → `SEO_CONFIG`. Routes missing from this map will not appear in the generated `sitemap.xml` and will have no `<title>` or Open Graph tags.

```ts
'/myroute': {
  title: 'Page Title – SPD Albstadt',
  description: 'Meta description…',
  canonical: `${BASE_URL}/myroute`,
  ogImage: DEFAULT_OG_IMAGE,
  ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
  ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
  changefreq: 'monthly',
  priority: 0.7,
}
```

The `<SEOHead>` component reads from `SEO_CONFIG` by current pathname. The Vite PWA plugin generates the sitemap from the same map at build time.

---

## Runtime config (`public/data/config.json`)

Only two keys are consumed at runtime — do not add arbitrary keys here:

| Key             | Purpose                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `icsUrl`        | Calendar feed URL; `webcal://` is automatically converted to `https://` by the ICS proxy |
| `elfsightAppId` | Elfsight widget UUID for the Instagram feed; if absent, the Instagram section is hidden  |

Both are editable via the admin editor under **Einstellungen**.

---

## Knip configuration notes (`knip.config.ts`)

Two dependency categories are excluded from knip's unused-dependency check because knip cannot trace CSS `@import` statements:

- `@fontsource-variable/inter` — imported in `src/index.css` via `@import`
- `tailwindcss` — consumed by `@tailwindcss/vite` plugin and `@import 'tailwindcss'` in CSS

Do not remove these from `ignoreDependencies` without first verifying knip can trace CSS imports in the version being used.

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
