# SPD Albstadt — Admin Panel (Daten-Editor) Documentation

## Overview

The admin panel is a **React/TypeScript single-page application** located at `/admin` that allows authorized users to
edit all website content directly through a browser-based GUI. Changes are committed to the GitHub repository via the
GitHub API, and the live website updates automatically within approximately 1 minute via Vercel redeployment.

**URL:** `https://<domain>/admin`  
**Entry point:** `src/admin/AdminApp.tsx`  
**Built with:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Framer Motion

---

## Authentication

### Login Flow

1. The user clicks **„Mit GitHub anmelden"** on the login screen.
2. The browser redirects to GitHub's OAuth authorization page (`https://github.com/login/oauth/authorize`).
3. After the user grants access, GitHub redirects to `/api/auth/callback?code=...&state=...`.
4. The serverless function (`api/auth/callback.ts`) exchanges the code for an access token using the `GITHUB_CLIENT_SECRET`.
5. The browser is redirected to `/admin#token=...`.
6. The React app reads the token from the URL hash, validates it against the GitHub API, and stores it in `localStorage` under `spd-admin-token`.
7. On subsequent visits, **auto-login** is attempted using the stored token.

### Access Control

Only GitHub accounts with **push access** to the repository can log in. Unauthorized logins are redirected:

| Situation               | Redirect |
| ----------------------- | -------- |
| Token invalid / revoked | `/401`   |
| No repository access    | `/403`   |
| Repository not found    | `/404`   |

Access is managed via GitHub repository collaborators: **Settings → Collaborators**.

### Required Environment Variables

| Variable                | Where           | Purpose                                             |
| ----------------------- | --------------- | --------------------------------------------------- |
| `VITE_GITHUB_CLIENT_ID` | Vercel + `.env` | OAuth App Client ID (public)                        |
| `GITHUB_CLIENT_SECRET`  | Vercel + `.env` | OAuth App Client Secret (private, server-side only) |

OAuth App setup: https://github.com/settings/developers  
Callback URLs: `https://<domain>/api/auth/callback` and `http://localhost:5173/api/auth/callback` (dev)

### Logout

Clicking the logout button removes the token from `localStorage` and returns to the login screen.

---

## Architecture

### Technology Stack

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Frontend         | React 19, TypeScript                           |
| Build            | Vite                                           |
| Styling          | Tailwind CSS v4                                |
| Animations       | Framer Motion                                  |
| State Management | Zustand                                        |
| Icons            | Lucide React                                   |
| Drag & Drop      | `@dnd-kit`                                     |
| Notifications    | `sonner`                                       |
| Backend          | GitHub REST API (Contents API + Git Trees API) |
| Hosting          | Vercel                                         |
| Auth             | GitHub OAuth 2.0 (`api/auth/callback.ts`)      |
| Data Format      | JSON files in `public/data/`                   |

### Key Files

- `src/admin/AdminApp.tsx` — main shell, sidebar, routing between tabs
- `src/admin/store.ts` — Zustand store: auth state, editor state, publish logic
- `src/admin/components/LoginScreen.tsx` — OAuth login UI and callback token handling
- `src/admin/lib/github.ts` — GitHub API wrapper (`validateToken`, `commitTree`, etc.)
- `src/admin/config/tabs.ts` — tab definitions
- `api/auth/callback.ts` — Vercel serverless function for OAuth code exchange

### GitHub Configuration

```typescript
const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'main'
```

### How Publishing Works

1. **Data edits** are held in the Zustand store until the user clicks "Veröffentlichen".
2. **Image uploads** are queued in `pendingUploads` and committed together with data changes.
3. All changes are committed atomically via the **Git Trees API** (`api/git/trees`) — one commit per publish action.
4. Text content (JSON) is UTF-8 → Base64 encoded. Binary files (images, PDFs) use raw Base64.

---

## UI Structure

### Sidebar

- **SPD logo** and "Daten-Editor" title
- **Tab navigation** — one button per content area, with red dot badge for dirty tabs
- **„Alle Änderungen" button** — opens global diff view (appears when any tab is dirty)
- **„Alle veröffentlichen" button** — publishes all dirty tabs in one commit (appears when any tab is dirty)
- **User avatar + username** — from GitHub profile
- **Dark mode toggle** — persisted in `localStorage` under `spd-darkmode`
- **Logout button**

### Tabs

| Tab                              | Key               | Data File                          | Type                 |
| -------------------------------- | ----------------- | ---------------------------------- | -------------------- |
| Aktuelles (News)                 | `news`            | `public/data/news.json`            | Array                |
| Partei (Party)                   | `party`           | `public/data/party.json`           | Object with sections |
| Fraktion (Council Group)         | `fraktion`        | `public/data/fraktion.json`        | Object with sections |
| Kommunalpolitik                  | `kommunalpolitik` | `public/data/kommunalpolitik.json` | Custom               |
| Haushaltsreden (Budget Speeches) | `haushaltsreden`  | N/A (PDF manager)                  | Custom               |
| Historie (History)               | `history`         | `public/data/history.json`         | Object with sections |
| Impressum                        | `impressum`       | `public/data/impressum.json`       | Object               |
| Datenschutz                      | `datenschutz`     | `public/data/datenschutz.json`     | Object               |
| Einstellungen (Settings)         | `config`          | `public/data/config.json`          | Object with sections |

Each tab shows a **red dot badge** when it has unsaved changes.

---

## Tab Details

### 1. Aktuelles (News)

**Type:** Array editor  
**File:** `public/data/news.json`

Each news item has:

| Field                      | Key                | Type                                                            | Required |
| -------------------------- | ------------------ | --------------------------------------------------------------- | -------- |
| Datum                      | `datum`            | Date (DD.MM.YYYY ↔ ISO)                                         | ✅       |
| Titel                      | `titel`            | Text                                                            | ✅       |
| Zusammenfassung            | `zusammenfassung`  | Textarea                                                        |          |
| Inhalt                     | `inhalt`           | Textarea                                                        |          |
| Kategorie                  | `kategorie`        | Select: Gemeinderat, Veranstaltung, Haushalt, Ortsverein, Wahl  |          |
| Titelbild                  | `bildUrl`          | Image upload (→ `images/news/`)                                 |          |
| Bildunterschrift Titelbild | `bildBeschreibung` | Text                                                            |          |
| Weitere Bilder             | `bildUrls`         | Image list (→ `images/news/`), captions in `bildBeschreibungen` |          |

### 2. Partei (Party)

**Type:** Object with top-level fields and sections  
**File:** `public/data/party.json`

**Top-level fields:** `beschreibung` (textarea)

**Sections:** Schwerpunkte, Vorstand, Abgeordnete

### 3. Fraktion (Council Group)

**Type:** Object with top-level fields and sections  
**File:** `public/data/fraktion.json`

**Top-level fields:** `beschreibung` (textarea)

**Sections:** Gemeinderäte, Kreisräte, Fraktions-News

### 4. Haushaltsreden (Budget Speeches)

**Type:** Custom PDF document manager  
**Storage:** `public/documents/fraktion/haushaltsreden/{year}.pdf`  
**Config:** `public/data/haushaltsreden.json` (stores `disabledYears` array)

Year-based grid (2010 to current year). Each card shows upload, replace, delete, and visibility toggle controls.

### 5. Historie (History)

**Type:** Object with top-level fields and sections  
**File:** `public/data/history.json`

**Top-level fields:** `einleitung` (textarea)

**Sections:** Chronik (Timeline), Kommunale Persönlichkeiten (Notable Figures)

### 6. Einstellungen (Settings)

**Type:** Object with top-level fields and sections  
**File:** `public/data/config.json`

**Top-level fields:** `icsUrl` (calendar feed URL)

**Sections:** Kontaktdaten, Bürozeiten, Social Media

---

## Field Types Reference

| Type          | Behavior                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| `text`        | Standard text input                                                                |
| `email`       | Email input                                                                        |
| `url`         | URL input                                                                          |
| `textarea`    | Auto-resizing textarea; line breaks preserved                                      |
| `date`        | German date format (DD.MM.YYYY); stored as ISO (YYYY-MM-DD); shows weekday preview |
| `select`      | Dropdown with predefined options                                                   |
| `toggle`      | Boolean toggle switch                                                              |
| `image`       | URL input + file upload; converts to WebP at 85% quality; supports crop overlay    |
| `imagelist`   | Multiple images with optional captions                                             |
| `stringlist`  | Dynamic list of text inputs                                                        |
| `icon-picker` | Searchable grid of Lucide icons                                                    |

---

## Image Handling

### Upload Flow

1. User clicks "Hochladen" on an image field.
2. A **crop overlay** appears with drag-to-select area and corner resize handles.
3. The image is converted to **WebP format at 85% quality** using a canvas.
4. The upload is **queued** in `pendingUploads` (not committed yet).
5. A local Base64 preview is shown immediately.
6. The actual upload happens when the user clicks "Veröffentlichen".

### Image Directories

| `imageDir`          | Path                               |
| ------------------- | ---------------------------------- |
| `news`              | `public/images/news/`              |
| `vorstand`          | `public/images/vorstand/`          |
| `abgeordnete`       | `public/images/abgeordnete/`       |
| `gemeinderaete`     | `public/images/gemeinderaete/`     |
| `kreisraete`        | `public/images/kreisraete/`        |
| `historie`          | `public/images/historie/`          |
| `persoenlichkeiten` | `public/images/persoenlichkeiten/` |

### Orphan Image Detection

Before publishing, the editor compares images referenced in the original state vs. the new state. Removed images no longer referenced anywhere are flagged as orphans. A modal lets the user select which orphans to delete or keep.

---

## Dirty State Management

- Each tab maintains `originalState` (snapshot at load time) and live `state`.
- When `state[tabKey]` differs from `originalState[tabKey]` (deep JSON comparison), the tab is **dirty**.
- Dirty tabs show a red dot in the sidebar.
- After successful publish, `originalState` is updated to match `state`, clearing the dirty flag.
- Drafts are auto-saved to `localStorage` under `spd-admin-drafts` and restored on next visit.

---

## Undo / Redo

- Each tab has its own undo/redo stack (up to 50 entries).
- Snapshots are debounced (600 ms) to avoid pushing on every keystroke.
- Keyboard shortcuts: `Ctrl+Z` (undo), `Ctrl+Shift+Z` / `Ctrl+Y` (redo).

---

## Security

- The GitHub access token is stored **only in the browser's `localStorage`** — never sent to the application server.
- The OAuth `GITHUB_CLIENT_SECRET` is **only available server-side** (`api/auth/callback.ts`) and is never exposed to the browser.
- All GitHub API calls for publishing go directly from the browser to `api.github.com` over HTTPS.
- CSRF protection via `state` parameter in the OAuth flow (stored in `sessionStorage`, validated on callback).
- Invalid/expired tokens are automatically cleared from storage on failed auto-login.
