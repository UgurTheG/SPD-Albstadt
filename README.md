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
- Admin-Editor mit Login per GitHub Personal Access Token, Drafts, Undo/Redo, Bild-Upload, Sammel-Veröffentlichung und Orphan-Bild-Erkennung

## 2. Technologie-Stack

- Frontend: React 19, TypeScript, Vite
- Routing: `react-router-dom`
- Styling: Tailwind CSS v4
- Animationen: Framer Motion
- State Management (Admin): Zustand
- Datenabruf: SWR
- Icons: Lucide
- Deployment-Ziel: Vercel
- Serverless-Endpunkte: `api/ics.ts`, `api/instagram.ts`

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

### Instagram-Integration

Die Variablen sind in `.env.example` dokumentiert:

```bash
INSTAGRAM_USER_ID=
INSTAGRAM_ACCESS_TOKEN=
```

Lokale Einrichtung:

```bash
cp .env.example .env.local
```

Hinweise:

- Zielprofil ist in `src/shared/instagram.ts` definiert (`spdalbstadt`)
- Fehlen Variablen oder schlägt die API fehl, wird automatisch ein Fallback ohne Feed-Karten angezeigt (Link zum Profil bleibt sichtbar)

### Inhaltskonfiguration

Zentrale Laufzeit-Konfiguration erfolgt über `public/data/config.json`, unter anderem:

- `icsUrl` für Kalenderimport
- `features.instagramFeed` und `features.fraktionNews`
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

Zusätzlich existieren Fehlerseiten (`/400`, `/401`, `/403`, `/404`, `/500` usw.) mit Catch-All auf 404.

### Datenquelle der Homepage

Für Dateien unter `/data/*` wird zuerst GitHub Raw genutzt (`main`-Branch, Verzeichnis `public`), damit Änderungen sofort sichtbar sind. Falls GitHub temporär nicht erreichbar ist, wird auf die lokal ausgelieferte Kopie (`/data/*.json`) zurückgefallen.

## 7. Admin-Seite nutzen

### Aufruf

- Lokal: `http://localhost:5173/admin`
- Deployment: `https://<deine-domain>/admin`

Die Route `/admin` wird über SPA-Rewrite auf `index.html` geführt; die React-App lädt dann `src/admin/AdminApp.tsx`.

### Login

Der Admin-Editor nutzt einen GitHub Personal Access Token (PAT):

- Format: klassischer PAT (`ghp_...`)
- Scope: `repo`
- Validierung über GitHub API (`/user` und Repository-Zugriff)
- Token-Speicherung im Browser-`localStorage` unter `spd-admin-token`

Ohne gültigen Token ist keine Veröffentlichung möglich.

### Funktionen im Admin-Editor

- Bearbeiten der Tabs `Aktuelles`, `Partei`, `Fraktion`, `Haushaltsreden`, `Historie`, `Einstellungen`
- Ungespeicherte Änderungen pro Tab (Dirty-State)
- Entwürfe (Drafts) in `localStorage` (`spd-admin-drafts`)
- Undo/Redo pro Tab
- Dark-Mode-Einstellung im Browser (`spd-admin-dark`)
- Gesamtansicht der Änderungen (Diff)
- Veröffentlichung einzelner Tabs oder aller Änderungen in einem Commit
- Erkennung verwaister Bilder mit optionaler Löschung

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
- `fraktion.json`: Fraktionsdaten, Gremienmitglieder, Fraktionsnews
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

- Der Admin-Token liegt ausschließlich im Browser-`localStorage`
- API-Aufrufe für Veröffentlichung laufen direkt gegen `api.github.com`
- `/admin` ist öffentlich erreichbar, aber ohne gültigen Token funktional gesperrt
- Für den produktiven Betrieb sollte der Token nur auf vertrauenswürdigen Geräten verwendet werden

## 13. Typische Workflows

### A) Redaktion über Admin-Seite

1. `/admin` öffnen
2. Mit GitHub PAT anmelden
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

## 14. Fehlerbehebung

- Admin-Login scheitert: Token-Scope `repo` prüfen, Repo-Zugriff verifizieren
- Änderungen erscheinen nicht: Veröffentlichung im Admin ausführen und kurz auf Redeploy warten
- Kalender leer: `icsUrl` in `public/data/config.json` prüfen, Erreichbarkeit des ICS-Feeds testen
- Instagram leer: Feature-Flag und ENV-Variablen prüfen; Fallback ohne Karten ist vorgesehen
- Kontaktformular ohne Versand: `kontakt.formspreeUrl` in `public/data/config.json` prüfen

---

Wenn du die Pflegeprozesse für Redaktion oder Deployment teamweit standardisieren möchtest, bietet sich als nächster Schritt eine ergänzende Betriebsdokumentation mit Rollen, Freigabeprozess und Backup-Strategie an.
