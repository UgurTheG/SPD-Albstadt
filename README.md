# SPD Albstadt – Homepage und Admin-Editor

Dieses Repository enthält die öffentliche Website des SPD-Ortsvereins Albstadt sowie eine integrierte Admin-Seite unter `/admin`, mit der Inhalte direkt im Browser gepflegt und in das GitHub-Repository veröffentlicht werden können.

## Inhalt

- [1. Ziel und Funktionsumfang](#1-ziel-und-funktionsumfang)
- [2. Technologie-Stack](#2-technologie-stack)
- [3. Projektstruktur](#3-projektstruktur)
- [4. Lokale Entwicklung](#4-lokale-entwicklung)
- [5. Konfiguration und Umgebungsvariablen](#5-konfiguration-und-umgebungsvariablen)
- [6. Homepage nutzen und verstehen](#6-homepage-nutzen-und-verstehen)
- [7. Admin-Seite nutzen](#7-admin-seite-nutzen)
- [8. Inhalte und Datenmodell](#8-inhalte-und-datenmodell)
- [9. Medien und Dokumente](#9-medien-und-dokumente)
- [10. API-Endpunkte](#10-api-endpunkte)
- [11. Deployment](#11-deployment)
- [12. Sicherheit und Betriebshinweise](#12-sicherheit-und-betriebshinweise)
- [13. Typische Workflows](#13-typische-workflows)
- [14. Fehlerbehebung](#14-fehlerbehebung)

## 1. Ziel und Funktionsumfang

Die Anwendung besteht aus zwei Teilen:

- Öffentliche Website (One-Pager mit Unterseiten-Charakter über Routen)
- Admin-Editor unter `/admin` zur redaktionellen Pflege ohne lokalen Build oder direkten Dateizugriff

Umgesetzte Hauptfunktionen:

- Abschnittsseiten für `Aktuelles`, `Partei`, `Fraktion`, `Historie`, `Kontakt`, `Datenschutz`, `Impressum`
- News mit Kategorien, Suche und Detailansicht
- Kalenderansicht auf Basis eines ICS-Feeds über `/api/ics`
- Optionaler Instagram-Feed über `/api/instagram` mit automatischem Fallback
- Kontaktformular (Formspree-URL über Konfiguration)
- Admin-Editor mit Login per GitHub OAuth 2.0, Drafts, Undo/Redo, Drag-and-Drop-Sortierung, Bild-Upload, Sammel-Veröffentlichung und Orphan-Bild-Erkennung

## 2. Technologie-Stack

- Frontend: React 19, TypeScript, Vite
- Routing: `react-router-dom`
- Styling: Tailwind CSS v4
- Animationen: Framer Motion
- State Management (Admin): Zustand
- Datenabruf: SWR
- Icons: Lucide
- Drag & Drop (Admin): `@dnd-kit`
- Toast-Benachrichtigungen (Admin): `sonner`
- Bild-Lightbox: `yet-another-react-lightbox`
- Kalender-Parsing: `ical.js`
- Deployment-Ziel: Vercel
- Serverless-Endpunkte: `api/ics.ts`, `api/instagram.ts`, `api/auth/callback.ts`

## 3. Projektstruktur

Wichtige Verzeichnisse:

- `src/`: React-Anwendung (Homepage und Admin-App)
- `src/admin/`: Admin-Editor (React-basiert)
- `public/data/`: redaktionelle Inhalte als JSON
- `public/images/`: Bilder
- `public/documents/`: PDFs und andere Dokumente
- `api/`: serverseitige Endpunkte (Vercel Functions)
- `server/`: servernahe Logik (z. B. Instagram-Feed-Aufbereitung)
- `vercel.json`: Rewrites und Cache-Header

## 4. Lokale Entwicklung

### Voraussetzungen

- Node.js (empfohlen: aktuelle LTS-Version)
- npm

### Installation und Start

```bash
npm install
npm run dev
```

Standardmäßig läuft Vite unter `http://localhost:5173`.

### Wichtige Skripte

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

- `dev`: Entwicklungsserver
- `build`: TypeScript-Build und Produktionsbundle
- `preview`: Lokale Vorschau des Produktionsbuilds
- `lint`: ESLint-Prüfung

## 5. Konfiguration und Umgebungsvariablen

### GitHub OAuth (Admin-Login)

Für den Admin-Login wird eine GitHub OAuth App benötigt. Erstellen unter: https://github.com/settings/developers

Callback-URLs eintragen:

- Produktion: `https://<deine-domain>/api/auth/callback`
- Lokal: `http://localhost:5173/api/auth/callback`

Benötigte Umgebungsvariablen (in Vercel und lokal in `.env`):

```bash
VITE_GITHUB_CLIENT_ID=     # Client-ID der OAuth App (öffentlich, wird im Frontend verwendet)
GITHUB_CLIENT_SECRET=      # Client-Secret der OAuth App (privat, nur serverseitig)
```

### Instagram-Integration

```bash
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
```

Lokale Einrichtung:

```bash
cp .env.example .env
```

Hinweise:

- Zielprofil ist in `src/shared/instagram.ts` definiert (`spdalbstadt`)
- Fehlen Variablen oder schlägt die API fehl, wird automatisch ein Fallback ohne Feed-Karten angezeigt (Link zum Profil bleibt sichtbar)

### Inhaltskonfiguration

Zentrale Laufzeit-Konfiguration erfolgt über `public/data/config.json`, unter anderem:

- `icsUrl` für Kalenderimport
- `features.instagramFeed` zum Ein-/Ausblenden des Instagram-Feeds
- `kontakt.formspreeUrl` für Kontaktformular

## 6. Homepage nutzen und verstehen

### Routing

Die Hauptseiten werden clientseitig geroutet:

- `/`
- `/aktuelles`
- `/partei`
- `/fraktion`
- `/historie`
- `/kontakt`
- `/datenschutz`
- `/impressum`

Zusätzlich existieren Fehlerseiten (`/400`, `/401`, `/403`, `/405`, `/408`, `/429`, `/500`, `/502`, `/503`, `/504`) mit Catch-All auf 404.

### Datenquelle der Homepage

Die JSON-Dateien unter `/data/` werden direkt über SWR abgerufen. Durch `no-store`-Cache-Header in `vercel.json` stehen Änderungen nach dem nächsten Deployment sofort zur Verfügung.

## 7. Admin-Seite nutzen

### Aufruf

- Lokal: `http://localhost:5173/admin`
- Deployment: `https://<deine-domain>/admin`

Die Route `/admin` wird über SPA-Rewrite auf `index.html` geführt; die React-App lädt dann `src/admin/AdminApp.tsx`.

### Login

Der Admin-Editor nutzt GitHub OAuth 2.0:

1. Auf der Login-Seite „Mit GitHub anmelden" klicken
2. GitHub-Autorisierungsseite bestätigen
3. Weiterleitung zurück zur Admin-Seite; Token wird im Browser-`localStorage` unter `spd-admin-token` gespeichert
4. Bei nachfolgenden Besuchen erfolgt automatischer Login über den gespeicherten Token

Zugangsberechtigung: Nur GitHub-Konten mit **Push-Zugriff** auf das Repository können sich erfolgreich anmelden. Unbefugte Konten werden auf die entsprechende Fehlerseite weitergeleitet (`/401`, `/403` oder `/404`).

### Funktionen im Admin-Editor

- Bearbeiten der Tabs `Aktuelles`, `Partei`, `Fraktion`, `Haushaltsreden`, `Historie`, `Einstellungen`
- Ungespeicherte Änderungen pro Tab (Dirty-State mit rotem Indikator)
- Entwürfe (Drafts) in `localStorage` (`spd-admin-drafts`)
- Undo/Redo pro Tab (Schaltflächen und Tastaturkürzel Ctrl+Z / Ctrl+Shift+Z bzw. Ctrl+Y)
- Dark-Mode-Einstellung im Browser (`spd-darkmode`)
- Drag-and-Drop-Sortierung von Listeneinträgen
- Gesamtansicht der Änderungen (Diff) mit Option zum Zurücksetzen einzelner Felder
- Vorschau-Funktion pro Tab
- Veröffentlichung einzelner Tabs oder aller Änderungen in einem Commit
- Erkennung verwaister Bilder mit optionaler Löschung
- URL-Hash-Navigation (z. B. `/admin#news`) zum direkten Aufrufen eines Tabs
- Mobilfreundliche Sidebar mit Swipe-Geste zum Schließen
- Warnung beim Verlassen der Seite mit ungespeicherten Änderungen
- Fehler-Banner bei fehlgeschlagenem Datenladen (verhindert versehentliches Überschreiben)

### Veröffentlichungslogik

Beim Veröffentlichen werden folgende Änderungen als Git-Commit auf den Branch `main` geschrieben:

- geänderte JSON-Dateien aus `public/data/`
- hochgeladene Bilder (zuerst in Upload-Warteschlange, dann Commit)
- optional gelöschte verwaiste Bilder

Die Commit-Erstellung ist gebündelt (Git Trees API), damit mehrere Dateiänderungen atomar zusammen veröffentlicht werden.

## 8. Inhalte und Datenmodell

Wichtige Dateien in `public/data/`:

- `config.json`: globale Einstellungen (Features, Kontakt, Bürozeiten, Social, ICS-URL)
- `news.json`: Beiträge für `Aktuelles`
- `party.json`: Partei-Bereich, Vorstand, Abgeordnete, Schwerpunkte
- `fraktion.json`: Fraktionsdaten, Gemeinderäte, Kreisräte
- `history.json`: Historie, Chronik, Persönlichkeiten
- `haushaltsreden.json`: Konfiguration deaktivierter Jahre (Haushaltsreden)

Datumsformat in Datenobjekten: `YYYY-MM-DD`.

### Besonderheit Haushaltsreden

- PDF-Ablage in `public/documents/fraktion/haushaltsreden/`
- Jahre ohne Datei können über `disabledYears` in `public/data/haushaltsreden.json` gezielt ausgeblendet werden

## 9. Medien und Dokumente

Typische Bildziele:

- `public/images/news/`
- `public/images/vorstand/`
- `public/images/abgeordnete/`
- `public/images/gemeinderaete/`
- `public/images/kreisraete/`
- `public/images/historie/`
- `public/images/persoenlichkeiten/`
- `public/images/kontakt/`

Der Admin-Editor konvertiert Uploads nach WebP und referenziert sie in den JSON-Dateien als `/images/...`-Pfad.

## 10. API-Endpunkte

### `GET /api/ics`

- Liest `icsUrl` aus `public/data/config.json`
- Holt den Kalender serverseitig und gibt `text/calendar` zurück
- Fehlerfall: HTTP 502 mit JSON-Fehlerobjekt

### `GET /api/instagram`

- Lädt Instagram-Feed über Meta Graph API (Business Discovery)
- Nutzt `INSTAGRAM_USER_ID` und `INSTAGRAM_ACCESS_TOKEN`
- Liefert normalisierte Feed-Objekte für die Website
- Bei Fehlern oder fehlender Konfiguration: Fallback-Antwort mit leerer Liste und Profil-Link

### `GET /api/auth/callback`

- OAuth 2.0 Callback-Endpunkt für den Admin-Login
- Empfängt `code` und `state` von GitHub nach Nutzerbestätigung
- Tauscht den Code serverseitig gegen ein GitHub Access Token (nutzt `GITHUB_CLIENT_SECRET`)
- Leitet bei Erfolg zu `/admin#token=...` weiter, bei Fehler zu `/admin#error=...`

## 11. Deployment

Das Repository ist für Vercel konfiguriert.

`vercel.json` enthält:

- Rewrites für `/admin` und SPA-Routen
- Cache-Header mit `no-store` für `/admin` und `/data/*`

### Produktionsbuild lokal prüfen

```bash
npm run build
npm run preview
```

## 12. Sicherheit und Betriebshinweise

- Login erfolgt über GitHub OAuth 2.0 — kein manuelles Token-Management nötig
- Das GitHub Access Token liegt ausschließlich im Browser-`localStorage`
- API-Aufrufe für Veröffentlichung laufen direkt gegen `api.github.com`
- Das OAuth Client-Secret (`GITHUB_CLIENT_SECRET`) ist ausschließlich serverseitig verfügbar
- `/admin` ist öffentlich erreichbar, aber ohne gültigen Token funktional gesperrt
- Ungültige Logins (kein Repo-Zugriff, ungültiges Token) werden auf Fehlerseiten weitergeleitet
- Zugriffskontrolle erfolgt über GitHub-Repository-Kollaboratoren (Settings → Collaborators)

## 13. Typische Workflows

### A) Redaktion über Admin-Seite

1. `/admin` öffnen
2. „Mit GitHub anmelden" klicken und auf GitHub bestätigen
3. Inhalte in gewünschten Tabs bearbeiten
4. Optional Änderungen prüfen (Diff)
5. `Alle veröffentlichen`
6. Nach kurzer Zeit Website prüfen

### B) Inhalt direkt im Repository pflegen

1. JSON-Dateien in `public/data/` bearbeiten
2. Bilder in passende Ordner unter `public/images/` legen
3. Pfade in JSON setzen (z. B. `/images/news/beispiel.webp`)
4. Commit und Deployment abwarten

### C) Kontaktformular konfigurieren

1. Formspree-Formular erstellen
2. URL in `public/data/config.json` unter `kontakt.formspreeUrl` eintragen
3. Über `/kontakt` testen

### D) Instagram-Feed aktivieren

1. `INSTAGRAM_USER_ID` und `INSTAGRAM_ACCESS_TOKEN` setzen
2. In `public/data/config.json` `features.instagramFeed` auf `true`
3. Deployment prüfen und Feed unter `/aktuelles` kontrollieren

### E) Neuen Admin-Nutzer hinzufügen

1. GitHub-Konto der Person als Kollaborator einladen: Repository → Settings → Collaborators
2. Scope `repo` (Write-Zugriff) vergeben
3. Person kann sich danach über „Mit GitHub anmelden" einloggen

## 14. Fehlerbehebung

- Admin-Login scheitert mit Fehlerseite 403: GitHub-Konto hat keinen Push-Zugriff auf das Repository — unter Settings → Collaborators prüfen
- Admin-Login scheitert mit Fehlerseite 401: Token ist ungültig oder abgelaufen — erneut einloggen
- Änderungen erscheinen nicht: Veröffentlichung im Admin ausführen und kurz auf Redeploy warten
- Kalender leer: `icsUrl` in `public/data/config.json` prüfen, Erreichbarkeit des ICS-Feeds testen
- Instagram leer: Feature-Flag und ENV-Variablen prüfen; Fallback ohne Karten ist vorgesehen
- Kontaktformular ohne Versand: `kontakt.formspreeUrl` in `public/data/config.json` prüfen
- Admin zeigt „Daten konnten nicht geladen werden": Seite neu laden; Veröffentlichen ist in diesem Zustand gesperrt, um Live-Daten nicht zu überschreiben
- OAuth funktioniert nicht lokal: `VITE_GITHUB_CLIENT_ID` und `GITHUB_CLIENT_SECRET` in `.env` prüfen; Callback-URL `http://localhost:5173/api/auth/callback` in der GitHub OAuth App eintragen

---

Wenn du die Pflegeprozesse für Redaktion oder Deployment teamweit standardisieren möchtest, bietet sich als nächster Schritt eine ergänzende Betriebsdokumentation mit Rollen, Freigabeprozess und Backup-Strategie an.
