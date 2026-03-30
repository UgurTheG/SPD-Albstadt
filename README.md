# SPD Albstadt – Website

Moderne One-Pager-Website für den SPD Ortsverein Albstadt.

## 🚀 Entwicklungsserver starten

```bash
npm install
npm run dev
```

Die Website ist dann unter **http://localhost:5173** erreichbar.

## 📝 Inhalte bearbeiten (ohne Programmierkenntnisse)

Alle Inhalte der Website befinden sich im Ordner **`public/data/`** als einfache JSON-Dateien.
Diese können mit jedem Texteditor bearbeitet werden (z.B. Notepad, TextEdit, VS Code).

> 💡 **Tipp:** Benutzen Sie https://jsoneditoronline.org/ für einen komfortablen JSON-Editor im Browser.

---

### 📰 Neuigkeiten bearbeiten → `public/data/news.json`

**Neuen Artikel hinzufügen:**
```json
{
  "id": "5",
  "datum": "2026-04-01",
  "titel": "Titel des Artikels",
  "zusammenfassung": "Kurze Zusammenfassung (wird in der Übersicht angezeigt)",
  "inhalt": "Vollständiger Text des Artikels (wird beim Klick angezeigt)",
  "kategorie": "Gemeinderat",
  "bildUrl": ""
}
```

**Mögliche Kategorien:** `Gemeinderat`, `Veranstaltung`, `Haushalt`, `Ortsverein`

**Artikel löschen:** Einfach den gesamten `{ ... }` Block entfernen.

---

### 📅 Veranstaltungen bearbeiten → `public/data/events.json`

**Neue Veranstaltung hinzufügen:**
```json
{
  "id": "7",
  "datum": "2026-08-15",
  "uhrzeit": "19:30",
  "titel": "Name der Veranstaltung",
  "ort": "Gasthaus Ochsen, Ebingen",
  "beschreibung": "Kurze Beschreibung der Veranstaltung"
}
```

**Datum-Format:** `JJJJ-MM-TT` (z.B. `2026-12-24` für den 24. Dezember 2026)

Vergangene Veranstaltungen werden automatisch ausgeblendet.

---

### 🏛️ Partei-Infos bearbeiten → `public/data/party.json`

Diese Datei enthält:
- **`beschreibung`** – Einleitungstext über den Ortsverein
- **`schwerpunkte`** – Die 6 politischen Schwerpunkte (mit Icon-Namen aus [lucide.dev](https://lucide.dev))
- **`vorstand`** – Mitglieder des Vorstands
- **`abgeordnete`** – Abgeordnete auf höherer Ebene

**Vorstandsmitglied hinzufügen:**
```json
{
  "name": "Vorname Nachname",
  "rolle": "Beisitzerin",
  "email": "email@spd-albstadt.de",
  "bildUrl": "",
  "bio": "Kurze Biographie..."
}
```

---

### 🗳️ Fraktion bearbeiten → `public/data/fraktion.json`

Enthält:
- **`beschreibung`** – Einleitungstext
- **`gemeinderaete`** – Liste der Gemeinderäte
- **`kreisraete`** – Liste der Kreisräte
- **`news`** – Aktuelle Meldungen aus der Fraktion

---

### 📖 Historie bearbeiten → `public/data/history.json`

Enthält:
- **`einleitung`** – Einführungstext
- **`timeline`** – Chronik-Einträge (nach Jahr sortiert)
- **`persoenlichkeiten`** – Kommunale Persönlichkeiten

---

### 🖼️ Bilder hinzufügen

1. Bild in den Ordner `public/images/` hochladen
2. Im JSON den `bildUrl` Wert setzen: `"bildUrl": "/images/mein-bild.jpg"`

---

## 🔧 Technische Details

- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (kein eigenes CSS)
- **Animationen:** Framer Motion
- **Icons:** Lucide React

## 📦 Produktion bauen

```bash
npm run build
```

Der fertige Build liegt im Ordner `dist/` und kann auf jedem Webserver deployed werden.

## 📸 Instagram-Feed aktivieren (Graph API)

Der Instagram-Bereich in `Aktuelles` lädt Beiträge serverseitig über die Meta Graph API.
Aktuell ist der Ziel-Account zentral in `src/shared/instagram.ts` konfiguriert und auf `spdalbstadt` gesetzt.

Benötigte Umgebungsvariablen:

```bash
INSTAGRAM_USER_ID=...
INSTAGRAM_ACCESS_TOKEN=...
```

- `INSTAGRAM_USER_ID`: Instagram Graph User ID des **authentifizierten Business-/Creator-Accounts**, der für die Abfrage verwendet wird
- `INSTAGRAM_ACCESS_TOKEN`: passender Meta Graph API Token für denselben Account

Die App verwendet dafür **Business Discovery** und fragt gezielt den in `src/shared/instagram.ts` hinterlegten öffentlichen Account ab.
Damit lassen sich öffentliche **Business-/Creator-Profile** per Username abfragen, aber nicht beliebige private Accounts.

### Lokal entwickeln

1. `.env.example` nach `.env.local` kopieren
2. Die beiden Werte eintragen
3. Den Entwicklungsserver neu starten

```bash
cp .env.example .env.local
npm run dev
```

### Auf Vercel

Die gleichen Variablen in den Projekt-Umgebungsvariablen hinterlegen:

- `INSTAGRAM_USER_ID`
- `INSTAGRAM_ACCESS_TOKEN`

Wenn die Variablen fehlen oder die Graph API vorübergehend nicht erreichbar ist, zeigt die Website automatisch einen Fallback mit Link zum Instagram-Profil statt einer Fehlermeldung.

## 📬 Kontaktformular aktivieren

Das Kontaktformular ist vorbereitet für [Formspree](https://formspree.io):
1. Kostenloses Konto auf formspree.io erstellen
2. Ein neues Formular anlegen
3. Die Formular-URL in `src/components/sections/Kontakt.tsx` bei `FORMSPREE_URL` eintragen
