# SPD Albstadt — Admin Panel (Daten-Editor) Documentation

## Overview

The admin panel is a **standalone, single-page HTML application** located at `/admin` that allows authorized users to
edit all website content directly through a browser-based GUI. Changes are committed to the GitHub repository via the
GitHub API, and the live website updates automatically within approximately 1 minute via Vercel redeployment.

**URL:** `https://<domain>/admin`  
**File:** `public/admin/index.html` (≈1,740 lines of vanilla HTML/CSS/JS — no build step required)  
**Styling:** Tailwind CSS v4.2.2 (pre-compiled in `public/admin/admin.css`) + inline `<style>` block

---

## Authentication

### Login Flow

1. The user is presented with a login screen requesting a **GitHub Personal Access Token (PAT)**.
2. The token is validated by calling `GET https://api.github.com/user`.
3. Repository access is verified by calling `GET https://api.github.com/repos/UgurTheG/SPD-Albstadt`.
4. On success, the token is stored in `localStorage` under the key `spd-admin-token`.
5. On subsequent visits, **auto-login** is attempted using the stored token.

### Token Requirements

- Must be a **GitHub Personal Access Token** (starts with `ghp_`).
- Requires the **`repo`** scope (full repository access).
- The token is **never sent to any third party** — only to `api.github.com`.

### Logout

- Clicking "Abmelden" removes the token from `localStorage` and returns to the login screen.

---

## Architecture

### Technology Stack

| Layer       | Technology                                                                              |
|-------------|-----------------------------------------------------------------------------------------|
| Frontend    | Vanilla HTML/JS (no framework)                                                          |
| Styling     | Tailwind CSS v4.2.2 (pre-compiled)                                                      |
| Icons       | [Lucide Static](https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/) (fetched from CDN) |
| Backend     | GitHub REST API (Contents API)                                                          |
| Hosting     | Vercel (with rewrite rules in `vercel.json`)                                            |
| Data Format | JSON files in `public/data/`                                                            |
| Images      | WebP files in `public/images/` subdirectories                                           |
| Documents   | PDF files in `public/documents/`                                                        |

### Routing

The admin page is served via Vercel rewrites defined in `vercel.json`:

```json
{
  "source": "/admin",
  "destination": "/admin/index.html"
},
{"source": "/admin/", "destination": "/admin/index.html"}
```

### GitHub Configuration

```javascript
const REPO_OWNER = 'UgurTheG'
const REPO_NAME = 'SPD-Albstadt'
const BRANCH = 'master'
```

### How Publishing Works

1. **Data edits** are held in memory (`state` object) until the user clicks "Veröffentlichen" (Publish).
2. **Image uploads** are queued in a `pendingUploads` array and committed first.
3. JSON data is committed via `PUT /repos/{owner}/{repo}/contents/{path}` (GitHub Contents API).
4. Each commit includes the file's current SHA (for update) or omits it (for creation).
5. Text content is Base64-encoded with `btoa(unescape(encodeURIComponent(content)))`.
6. Binary files (images, PDFs) are committed with raw Base64 content.

---

## UI Structure

### Header Bar

- **SPD logo** and "Daten-Editor" title
- **Status indicator** — shows success/error messages (auto-hides after 5 seconds)
- **"Alle veröffentlichen" button** — appears when any tab has unsaved changes; shows count of dirty tabs
- **Dark mode toggle** — persisted in `localStorage` under `spd-admin-dark`; respects system preference
- **Username badge** — shows the GitHub username of the logged-in user
- **"Abmelden" button** — logs out

### Tab Bar

A horizontal scrollable tab bar with the following tabs:

| Tab                              | Key              | Data File                   | Type                 |
|----------------------------------|------------------|-----------------------------|----------------------|
| Aktuelles (News)                 | `news`           | `public/data/news.json`     | Array                |
| Partei (Party)                   | `party`          | `public/data/party.json`    | Object with sections |
| Fraktion (Council Group)         | `fraktion`       | `public/data/fraktion.json` | Object with sections |
| Haushaltsreden (Budget Speeches) | `haushaltsreden` | N/A (PDF manager)           | Custom               |
| Historie (History)               | `history`        | `public/data/history.json`  | Object with sections |
| Einstellungen (Settings)         | `config`         | `public/data/config.json`   | Object with sections |

Each tab shows a **red dot badge** when it has unsaved changes.

### Info Banner

A green banner below the header:
> ✅ **Direkt-Bearbeitung aktiv.** Änderungen werden beim Klick auf „Veröffentlichen" direkt gespeichert. Die Webseite
> aktualisiert sich automatisch innerhalb von ca. 1 Minute.

---

## Tab Details

### 1. Aktuelles (News)

**Type:** Array editor  
**File:** `public/data/news.json`

Each news item has:

| Field                      | Key                | Type                                                                  | Required |
|----------------------------|--------------------|-----------------------------------------------------------------------|----------|
| Datum                      | `datum`            | Date (DD.MM.YYYY ↔ ISO)                                               | ✅        |
| Titel                      | `titel`            | Text                                                                  | ✅        |
| Zusammenfassung            | `zusammenfassung`  | Textarea                                                              |          |
| Inhalt                     | `inhalt`           | Textarea                                                              |          |
| Kategorie                  | `kategorie`        | Select: Gemeinderat, Veranstaltung, Haushalt, Ortsverein, Wahl        |          |
| Titelbild                  | `bildUrl`          | Image upload (→ `images/news/`)                                       |          |
| Bildunterschrift Titelbild | `bildBeschreibung` | Text                                                                  |          |
| Weitere Bilder             | `bildUrls`         | Image list (→ `images/news/`), with captions key `bildBeschreibungen` |          |

### 2. Partei (Party)

**Type:** Object with top-level fields and sections  
**File:** `public/data/party.json`

**Top-level fields:**

- `beschreibung` — Party description (textarea)

**Sections:**

#### Schwerpunkte (Focus Areas)

| Field        | Key            | Type                       | Required |
|--------------|----------------|----------------------------|----------|
| Titel        | `titel`        | Text                       | ✅        |
| Beschreibung | `beschreibung` | Textarea                   |          |
| Icon         | `icon`         | Icon picker (Lucide icons) |          |

#### Vorstand (Board Members)

| Field          | Key        | Type                              | Required |
|----------------|------------|-----------------------------------|----------|
| Name           | `name`     | Text                              | ✅        |
| Rolle / Amt    | `rolle`    | Text                              |          |
| E-Mail         | `email`    | Email                             |          |
| Telefon        | `phone`    | Text                              |          |
| Adresse        | `address`  | Text                              |          |
| PLZ & Ort      | `place`    | Text                              |          |
| Profilbild     | `bildUrl`  | Image (→ `images/vorstand/`)      |          |
| Weitere Bilder | `bildUrls` | Image list (→ `images/vorstand/`) |          |
| Biografie      | `bio`      | Textarea                          |          |

#### Abgeordnete (Representatives)

| Field          | Key         | Type                                 | Required |
|----------------|-------------|--------------------------------------|----------|
| Name           | `name`      | Text                                 | ✅        |
| Rolle          | `rolle`     | Text                                 |          |
| Wahlkreis      | `wahlkreis` | Text                                 |          |
| E-Mail         | `email`     | Email                                |          |
| Website        | `website`   | URL                                  |          |
| Profilbild     | `bildUrl`   | Image (→ `images/abgeordnete/`)      |          |
| Weitere Bilder | `bildUrls`  | Image list (→ `images/abgeordnete/`) |          |
| Biografie      | `bio`       | Textarea                             |          |

### 3. Fraktion (Council Group)

**Type:** Object with top-level fields and sections  
**File:** `public/data/fraktion.json`

**Top-level fields:**

- `beschreibung` — Description (textarea)

**Sections:**

#### Gemeinderäte (City Council Members)

| Field       | Key           | Type                              | Required |
|-------------|---------------|-----------------------------------|----------|
| Name        | `name`        | Text                              | ✅        |
| Beruf       | `beruf`       | Text                              |          |
| Bild        | `bildUrl`     | Image (→ `images/gemeinderaete/`) |          |
| Im Rat seit | `seit`        | Text                              |          |
| Adresse     | `address`     | Text                              |          |
| PLZ & Ort   | `zipCode`     | Text                              |          |
| E-Mail      | `email`       | Email                             |          |
| Ausschüsse  | `ausschuesse` | String list                       |          |
| Biografie   | `bio`         | Textarea                          |          |

#### Kreisräte (District Council Members)

Same fields as Gemeinderäte, images go to `images/kreisraete/`.

#### Fraktions-News (Council Group News)

| Field  | Key       | Type                     | Required |
|--------|-----------|--------------------------|----------|
| Datum  | `datum`   | Date                     |          |
| Titel  | `titel`   | Text                     | ✅        |
| Inhalt | `inhalt`  | Textarea                 |          |
| Bild   | `bildUrl` | Image (→ `images/news/`) |          |

### 4. Haushaltsreden (Budget Speeches)

**Type:** Custom PDF document manager (no JSON data file)  
**Storage:** `public/documents/fraktion/haushaltsreden/{year}.pdf`  
**Config:** `public/data/haushaltsreden.json` (stores `disabledYears` array)

This tab presents a **year-based grid** (2010 to current year) where each year card shows:

- **Status badge:** "✓ Online" (green), "Fehlt" (orange/missing), or "Aus" (gray/disabled)
- **For existing PDFs:**
    - 👁 Ansehen (View) — opens PDF in new tab
    - ↺ Replace — upload a replacement PDF
    - 🗑 Delete — removes from GitHub after confirmation
- **For missing years:**
    - \+ PDF — upload a new PDF for that year
    - 🚫 Aus / 👁 Ein — toggle visibility (disabled years are hidden from the website's "coming soon" indicator)

**How it works:**

- PDFs are fetched from `public/documents/fraktion/haushaltsreden/` via GitHub Contents API.
- Disabled years configuration is stored in `public/data/haushaltsreden.json`.
- Toggle changes are applied to the in-memory state immediately (instant UI update), then persisted to GitHub in the
  background.
- PDF uploads are committed directly (not queued like images), since this tab has no JSON dirty-state tracking.

### 5. Historie (History)

**Type:** Object with top-level fields and sections  
**File:** `public/data/history.json`

**Top-level fields:**

- `einleitung` — Introduction text (textarea)

**Sections:**

#### Chronik (Timeline)

| Field        | Key            | Type                                                                        | Required |
|--------------|----------------|-----------------------------------------------------------------------------|----------|
| Jahr(e)      | `jahr`         | Text                                                                        | ✅        |
| Titel        | `titel`        | Text                                                                        | ✅        |
| Beschreibung | `beschreibung` | Textarea                                                                    |          |
| Bilder       | `bilder`       | Image list (→ `images/historie/`), with captions key `bilderBeschreibungen` |          |

#### Kommunale Persönlichkeiten (Notable Figures)

| Field          | Key            | Type                                       | Required |
|----------------|----------------|--------------------------------------------|----------|
| Name           | `name`         | Text                                       | ✅        |
| Jahre          | `jahre`        | Text                                       |          |
| Rolle          | `rolle`        | Text                                       |          |
| Beschreibung   | `beschreibung` | Textarea                                   |          |
| Profilbild     | `bildUrl`      | Image (→ `images/persoenlichkeiten/`)      |          |
| Weitere Bilder | `bildUrls`     | Image list (→ `images/persoenlichkeiten/`) |          |

### 6. Einstellungen (Settings)

**Type:** Object with top-level fields and sections  
**File:** `public/data/config.json`

**Top-level fields:**

- `icsUrl` — Calendar URL (ICS feed URL)

**Sections:**

#### Kontaktdaten (Contact Details) — *Single object, not array*

| Field          | Key            | Type     |
|----------------|----------------|----------|
| Anschrift      | `adresse`      | Textarea |
| E-Mail-Adresse | `email`        | Email    |
| Telefon        | `telefon`      | Text     |
| Formspree-URL  | `formspreeUrl` | URL      |

#### Bürozeiten (Office Hours) — *Array*

| Field | Key    | Type | Required |
|-------|--------|------|----------|
| Tage  | `tage` | Text | ✅        |
| Zeit  | `zeit` | Text | ✅        |

#### Social Media — *Single object, not array*

| Field         | Key            | Type |
|---------------|----------------|------|
| Facebook-URL  | `facebookUrl`  | URL  |
| Instagram-URL | `instagramUrl` | URL  |

---

## Field Types Reference

| Type          | Behavior                                                                                 |
|---------------|------------------------------------------------------------------------------------------|
| `text`        | Standard text input                                                                      |
| `email`       | Email input                                                                              |
| `url`         | URL input                                                                                |
| `textarea`    | Auto-resizing textarea (min 72px height); line breaks preserved                          |
| `date`        | German date format input (DD.MM.YYYY); stored as ISO (YYYY-MM-DD); shows weekday preview |
| `time`        | Time input (HH:MM) with "Uhr" suffix                                                     |
| `select`      | Dropdown with predefined options                                                         |
| `toggle`      | Boolean toggle switch (Aktiv/Inaktiv)                                                    |
| `image`       | URL input + file upload button; converts to WebP at 85% quality; supports crop overlay   |
| `imagelist`   | Multiple images with optional captions; same upload/crop behavior as `image`             |
| `stringlist`  | Dynamic list of text inputs with add/remove                                              |
| `icon-picker` | Searchable grid of 120+ Lucide icons; fetched from CDN                                   |

---

## Image Handling

### Upload Flow

1. User clicks "📁 Hochladen" on an image field.
2. A **file picker** opens (accepts all image formats).
3. A **crop overlay** appears with:
    - Drag-to-select crop area
    - Corner resize handles
    - Three buttons: "Abbrechen" (Cancel), "Ganzes Bild" (Full image), "✓ Zuschneiden & Hochladen" (Crop & Upload)
4. The image is converted to **WebP format at 85% quality** using a canvas.
5. The upload is **queued** (not committed yet) in the `pendingUploads` array.
6. A local Base64 preview is shown immediately.
7. The actual upload happens when the user clicks "Veröffentlichen".

### File Naming

- For `image` fields: filename is derived from the item's `name` field (slugified) or the original filename.
- For `imagelist` fields: filename is slugified original name + timestamp.
- All images are saved as `.webp`.

### Image Directories

| `imageDir`          | Path                               |
|---------------------|------------------------------------|
| `news`              | `public/images/news/`              |
| `vorstand`          | `public/images/vorstand/`          |
| `abgeordnete`       | `public/images/abgeordnete/`       |
| `gemeinderaete`     | `public/images/gemeinderaete/`     |
| `kreisraete`        | `public/images/kreisraete/`        |
| `historie`          | `public/images/historie/`          |
| `persoenlichkeiten` | `public/images/persoenlichkeiten/` |

### Orphan Image Detection

When publishing, the editor compares images referenced in the **original state** vs. the **new state** across all tabs.
Images that were removed and are **not referenced anywhere else** are flagged as orphans. A modal appears allowing the
user to:

- **Select which orphan images to delete** (checkboxes, all checked by default)
- **Keep all** — skip deletion
- **Cancel** — abort the entire publish operation

Orphan deletion uses `DELETE /repos/{owner}/{repo}/contents/{path}` on the GitHub API.

---

## Dirty State Management

- Each tab maintains an `originalState` (snapshot at load time) and a live `state`.
- When `state[tabKey]` differs from `originalState[tabKey]` (deep JSON comparison), the tab is marked **dirty**.
- Dirty tabs show a red dot badge in the tab bar.
- The global "Alle veröffentlichen" button appears with a count of dirty tabs.
- Per-tab "Veröffentlichen" button is enabled only when that tab is dirty.
- After successful publish, `originalState` is updated to match `state`, clearing the dirty flag.

---

## Item Cards (Array Entries)

Each item in an array editor is rendered as a **card** with:

- **Drag handle** (⠿) — drag-and-drop reordering
- **Title preview** — shows `name`, `titel`, `jahr`, or `#index`
- **↑ / ↓ buttons** — move up/down
- **"Entfernen" button** — remove the item
- All configured fields rendered below the header
- **"+ Neuen Eintrag hinzufügen"** button at the bottom (dashed border)

New items auto-generate a UUID `id` if the existing items have one.

---

## Dark Mode

- Toggle via 🌙/☀️ button in the header.
- Persisted in `localStorage` under `spd-admin-dark`.
- Defaults to system preference (`prefers-color-scheme: dark`).
- Implemented via Tailwind's `dark:` variant with a `.dark` class on `<html>`.

---

## Icon Picker

- Displays a searchable grid of **120+ Lucide icons**.
- Icons are fetched as SVG from `cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/`.
- SVGs are cached in memory (`iconSvgCache`).
- Icon names are stored as PascalCase (e.g., `GraduationCap`) and converted to kebab-case for the CDN URL.
- Three icon aliases handle renamed icons: `home` → `house`, `bar-chart` → `chart-bar`, `train` → `train-front`.

---

## Data Files Summary

| File                              | Content                                                                     |
|-----------------------------------|-----------------------------------------------------------------------------|
| `public/data/news.json`           | News articles array                                                         |
| `public/data/party.json`          | Party info: description, focus areas, board, representatives                |
| `public/data/fraktion.json`       | Council group: description, council members, district council, faction news |
| `public/data/history.json`        | History: introduction, timeline, notable figures                            |
| `public/data/config.json`         | Site settings: calendar URL, contact, office hours, social media            |
| `public/data/haushaltsreden.json` | Budget speeches config: `{ disabledYears: [2015, 2016, ...] }`              |

---

## Security Considerations

- The GitHub token is stored **only in the browser's localStorage** — never sent to the application server.
- All API calls go directly from the browser to `api.github.com` over HTTPS.
- The admin page itself is publicly accessible (no server-side auth), but is non-functional without a valid token.
- Token validity is checked on every page load (auto-login attempt).
- Invalid/expired tokens are automatically cleared from storage.

