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
2. The browser is redirected to `GET /api/auth/start`, which generates a cryptographically random CSRF state, signs it with HMAC-SHA256, stores the signed value in a short-lived HttpOnly cookie, and redirects to GitHub's OAuth authorization page.
3. After the user grants access, GitHub redirects to `/api/auth/callback?code=...&state=...`.
4. The serverless function (`api/auth/callback.ts`) validates the CSRF state against the signed cookie (constant-time comparison), exchanges the code for an access token using `GITHUB_CLIENT_SECRET`, and optionally checks the user against the `ALLOWED_GITHUB_LOGINS` allowlist.
5. On success, authentication cookies (access token, refresh token, expiry timestamps) are set as **HttpOnly / Secure / SameSite=Lax** cookies — the token is **never** exposed to browser JavaScript.
6. The browser is redirected to `/admin?auth=ok`.
7. The React app checks session status via `GET /api/auth/session` (which returns `{ authenticated, expires_at }` without ever revealing the token).
8. All subsequent GitHub API calls go through the server-side proxy at `POST /api/github`, which reads the token from the HttpOnly cookie and forwards it to `api.github.com`.

### Token Refresh

- When the access token nears expiry, the frontend calls `POST /api/auth/refresh`.
- The server reads the refresh token from its HttpOnly cookie and exchanges it at GitHub for a new access/refresh token pair.
- On any refresh failure (expired, revoked, invalid), **all auth cookies are cleared** and the user must re-authenticate.

### Access Control

Only GitHub accounts with **push access** to the repository can log in successfully.

Additionally, if the `ALLOWED_GITHUB_LOGINS` environment variable is set (comma-separated GitHub usernames), only those exact accounts may log in — as a defence-in-depth measure on top of GitHub's own repo-level permissions.

| Situation               | Behavior                                              |
| ----------------------- | ----------------------------------------------------- |
| Token invalid / revoked | Redirect to error page                                |
| No repository access    | GitHub API returns 403/404                            |
| User not in allowlist   | Redirect to `/admin?auth=error&msg=unauthorized_user` |

### Required Environment Variables

| Variable                | Where           | Purpose                                                         |
| ----------------------- | --------------- | --------------------------------------------------------------- |
| `VITE_GITHUB_CLIENT_ID` | Vercel + `.env` | OAuth App Client ID (public, embedded in frontend)              |
| `GITHUB_CLIENT_SECRET`  | Vercel + `.env` | OAuth App Client Secret (private, server-side only)             |
| `OAUTH_REDIRECT_URI`    | Vercel + `.env` | Callback URL (e.g. `https://<domain>/api/auth/callback`)        |
| `STATE_SIGNING_SECRET`  | Vercel + `.env` | Dedicated HMAC key for CSRF state signing (recommended)         |
| `ALLOWED_GITHUB_LOGINS` | Vercel + `.env` | Comma-separated GitHub usernames permitted to log in (optional) |
| `KV_REST_API_URL`       | Vercel          | Vercel KV REST URL for shared admin presence state (optional)   |
| `KV_REST_API_TOKEN`     | Vercel          | Vercel KV REST token (required when `KV_REST_API_URL` is set)   |

> **Note:** If `STATE_SIGNING_SECRET` is not set, `GITHUB_CLIENT_SECRET` is used as a fallback (with a warning in server logs). Generate a dedicated secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

OAuth App setup: https://github.com/settings/developers  
Callback URLs: `https://<domain>/api/auth/callback` and `http://localhost:5173/api/auth/callback` (dev)

### Logout

Clicking the logout button calls `POST /api/auth/logout`, which clears all HttpOnly auth cookies. The endpoint requires a valid Origin header to prevent cross-site CSRF logout attacks.

---

## Architecture

### Technology Stack

| Layer            | Technology                                                           |
| ---------------- | -------------------------------------------------------------------- |
| Frontend         | React 19, TypeScript                                                 |
| Build            | Vite                                                                 |
| Styling          | Tailwind CSS v4                                                      |
| Animations       | Framer Motion                                                        |
| State Management | Zustand                                                              |
| Icons            | Lucide React                                                         |
| Drag & Drop      | `@dnd-kit`                                                           |
| Notifications    | `sonner`                                                             |
| Backend          | GitHub REST API (Contents API + Git Trees API)                       |
| Hosting          | Vercel                                                               |
| Auth             | GitHub OAuth 2.0 (server-side token management via HttpOnly cookies) |
| Data Format      | JSON files in `public/data/`                                         |

### Key Files

- `src/admin/AdminApp.tsx` — main shell, sidebar, routing between tabs
- `src/admin/store.ts` — Zustand store: auth state, editor state, publish logic
- `src/admin/components/LoginScreen.tsx` — OAuth login UI
- `src/admin/lib/github.ts` — GitHub API wrapper (`validateToken`, `commitTree`, etc.) — calls via `/api/github` proxy
- `src/admin/config/tabs.ts` — tab definitions
- `api/auth/start.ts` — generates CSRF state and redirects to GitHub
- `api/auth/callback.ts` — OAuth code exchange, user allowlist check, sets auth cookies
- `api/auth/session.ts` — returns authentication status (never exposes token)
- `api/auth/refresh.ts` — refreshes access token using refresh token
- `api/auth/logout.ts` — clears all auth cookies
- `api/auth/cookies.ts` — HMAC signing, cookie serialisation, origin allowlist
- `api/auth/rateLimit.ts` — in-memory rate limiter
- `api/github.ts` — server-side proxy for all GitHub API calls (path-restricted)
- `api/admin-presence.ts` — real-time admin presence tracking (active tab, dirty tabs)

### GitHub Configuration

```typescript
const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'main'
```

### Admin Presence

The admin panel tracks which users are currently active and which tabs they have open or marked as dirty. This prevents two editors from accidentally overwriting each other's changes.

- **Endpoint:** `GET / POST / DELETE /api/admin-presence`
- **Storage:** In-memory (single-instance / local dev) or **Vercel KV** (production multi-instance). To enable KV, link a Vercel KV database via the dashboard and set `KV_REST_API_URL` + `KV_REST_API_TOKEN`.
- **Heartbeat:** The frontend sends a `POST` every 30 seconds with the active tab and dirty-tab list.
- **Version polling:** A lightweight `GET ?since=<version>` check runs every 500 ms so presence updates are near-real-time without a full KV scan on every tick.
- **Identity binding:** The user's `login` is always read from the server-side `USER_LOGIN_COOKIE` set during OAuth — client-supplied values are ignored, preventing impersonation.
- **TTL:** Presence entries expire after 45 s of inactivity (KV TTL: 50 s).

### How Publishing Works

1. **Data edits** are held in the Zustand store until the user clicks "Veröffentlichen".
2. **Image uploads** are queued in `pendingUploads` and committed together with data changes.
3. All changes are committed atomically via the **Git Trees API** — one commit per publish action. API calls go through the server-side proxy (`/api/github`).
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
| Startseite                       | `startseite`      | `public/data/startseite.json`      | Object               |
| Aktuelles (News)                 | `news`            | `public/data/news.json`            | Array                |
| Partei (Party)                   | `party`           | `public/data/party.json`           | Object with sections |
| Fraktion (Council Group)         | `fraktion`        | `public/data/fraktion.json`        | Object with sections |
| Kommunalpolitik                  | `kommunalpolitik` | `public/data/kommunalpolitik.json` | Custom               |
| Haushaltsreden (Budget Speeches) | `haushaltsreden`  | N/A (PDF manager)                  | Custom               |
| Historie (History)               | `history`         | `public/data/history.json`         | Object with sections |
| Impressum                        | `impressum`       | `public/data/impressum.json`       | Object with sections |
| Datenschutz                      | `datenschutz`     | `public/data/datenschutz.json`     | Object with sections |
| Kontakt                          | `kontakt`         | `public/data/kontakt.json`         | Object with sections |
| Einstellungen (Settings)         | `config`          | `public/data/config.json`          | Object               |

Each tab shows a **red dot badge** when it has unsaved changes.

---

## Tab Details

### 0. Startseite

**Type:** Object editor  
**File:** `public/data/startseite.json`

| Field       | Key          | Type     |
| ----------- | ------------ | -------- |
| Hero-Slogan | `heroSlogan` | Textarea |
| Badge-Text  | `heroBadge`  | Text     |

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

**Sections:** Gemeinderäte, Kreisräte

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

**Type:** Object  
**File:** `public/data/config.json`

**Top-level fields:**

| Field           | Key             | Type |
| --------------- | --------------- | ---- |
| Kalender-URL    | `icsUrl`        | URL  |
| Elfsight App-ID | `elfsightAppId` | Text |

### 7. Kontakt

**Type:** Object with top-level fields and sections  
**File:** `public/data/kontakt.json`

**Top-level fields:** `adresse`, `email`, `telefon`, `formspreeUrl`, `gruppenbild`, `footerBeschreibung`, `facebookUrl`, `instagramUrl`

**Sections:** Bürozeiten

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
| `kontakt`           | `public/images/kontakt/`           |

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

- The GitHub access token is stored **only in HttpOnly / Secure / SameSite=Lax cookies** — browser JavaScript has no access to the token at any point.
- All GitHub API calls go through the **server-side proxy** at `POST /api/github`, which reads the token from the cookie and forwards it. The token never leaves the server.
- The proxy restricts API paths to the one managed repository (`/repos/UgurTheG/SPD-Albstadt/`) and the `/user` identity endpoint — even a compromised token cannot access other repos via the app.
- **CSRF protection** in the OAuth flow: cryptographic state parameter, HMAC-SHA256-signed, stored in a short-lived HttpOnly cookie (10 min), validated with constant-time comparison.
- **Origin allowlist** on all mutating auth and proxy endpoints (`/api/auth/refresh`, `/api/auth/logout`, `/api/github`).
- **Rate limiting** on login (5/min), callback (10/min), and refresh (10/min) per IP address.
- **User allowlist** (optional): the `ALLOWED_GITHUB_LOGINS` env var restricts login to specific GitHub accounts, as a defence-in-depth measure on top of GitHub's own repository permissions.
- GitHub error messages are mapped to **opaque safe error codes** — internal details are never exposed in the browser URL bar or history.
- The OAuth `GITHUB_CLIENT_SECRET` is **only available server-side** and is never exposed to the browser.
- Invalid/expired tokens trigger automatic cookie cleanup and force re-authentication.
- Token refresh via `POST /api/auth/refresh`; on any refresh failure, all auth cookies are cleared (force-logout).
- Logout via `POST /api/auth/logout` with origin check to prevent cross-site CSRF logout attacks.
