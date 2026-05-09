# Feature-Ideen für die SPD Albstadt Website

Gesammelte Ideen für zukünftige Erweiterungen der Webseite.

---

## Transparenz & Politik

### Abstimmungsprotokoll

Wie hat die Fraktion bei wichtigen Gemeinderatsbeschlüssen abgestimmt?

- Tabelle mit Datum, Thema, Abstimmungsergebnis und Position der SPD-Fraktion
- Filterfunktion nach Jahr oder Themenbereich
- Schafft Transparenz und Vertrauen bei Bürgerinnen und Bürgern

### Anfragen & Anträge

Liste der von der SPD-Fraktion eingereichten Gemeinderatsanträge.

- Status pro Antrag: offen / angenommen / abgelehnt
- Verlinkung auf offizielle Gemeinderatsprotokolle (sofern öffentlich)
- Zeigt aktive politische Arbeit

### Wahlprogramm-Tracker

Versprechen aus dem Wahlprogramm mit aktuellem Umsetzungsstatus.

- Ähnlich einem Koalitionsvertrag-Tracker
- Status: geplant / in Arbeit / umgesetzt / nicht umgesetzt
- Mit Verweis auf entsprechende Beschlüsse oder Artikel

---

## Bürger-Engagement

### Veranstaltungsanmeldung

Direkte Anmeldung zu Veranstaltungen über die Webseite, ohne externe Tools.

- Formular mit Name, E-Mail, Veranstaltungsauswahl
- Bestätigungs-E-Mail automatisch
- Passt gut ins bestehende Admin-Panel

### Mitglied werden

Formular mit Direktweiterleitung zum offiziellen SPD-Beitrittslink.

- Kurze Erklärung der Vorteile einer Mitgliedschaft
- Lokale Kontaktperson als Ansprechpartner

### Newsletter-Anmeldung

Einfaches Opt-in für Neuigkeiten aus der Fraktion und dem Ortsverein.

- E-Mail-Adresse + Einwilligung (DSGVO-konform)
- Verwaltung über bestehendes Admin-Panel oder externen Anbieter (z.B. Brevo)

---

## Inhaltliche Erweiterungen

### Pressemitteilungen

Eigene Sektion, klar getrennt von allgemeinen Neuigkeiten.

- Filterbar nach Datum und Thema
- Als eigenständige Seite oder als Kategorie im Aktuelles-Bereich

### Stadtteile & Zuständigkeiten

Welche Gemeinderäte sind für welche Stadtteile von Albstadt zuständig / ansprechbar?

- Karte oder Liste der Stadtteile
- Zugeordnete Kontaktperson aus der Fraktion

### Haushalt verständlich erklärt

Infografiken und kurze Erklärungen zum Stadthaushalt.

- Was beantragt die SPD, was kritisiert sie?
- Einfache Visualisierungen (Balkendiagramme, Tortendiagramme)

---

## Liveticker: Wahlergebnisse

Für Bundestagswahlen, Landtagswahlen, Kommunalwahlen etc.

### Empfohlener Ansatz: Kombination aus zwei Elementen

#### 1. Wahlergebnis-Widget (automatisch, kein Aufwand)

Einbetten eines offiziellen Ergebnis-Widgets per `<iframe>`:

- **Bundeswahl**: Bundeswahlleiter stellt offizielle Widgets bereit (wahl.de)
- **ARD/tagesschau**: Ergebnis-Widget einbettbar, immer live aktualisiert
- Kein eigener Datenpflegeaufwand, professionell und zuverlässig
- Einfach ein- und ausblendbar nach der Wahl

#### 2. Eigener Kommentar-Ticker (Admin-gesteuert)

Manuell gepflegte Meldungen vom Wahlabend — lokale Einschätzungen, Reaktionen.

- Admin trägt Meldungen über das Admin-Panel ein (wie ein Newsfeed-Eintrag)
- Frontend pollt alle 30 Sekunden auf neue Einträge (einfach, stabil)
- Gibt der Seite eine eigene Stimme neben den reinen Zahlen
- Nach der Wahl einfach deaktivierbar oder archivierbar

#### Technische Umsetzung Ticker

```
Frontend: useInterval-Hook mit fetch auf /data/ticker.json
Admin: neuer Tab im Admin-Panel "Wahlticker" (Datum, Uhrzeit, Text)
Deployment: ticker.json wird wie andere JSON-Daten über das Admin-Panel gespeichert
```

#### Variante: Bundeswahlleiter API (komplex, nur Bundestagswahl)

Der Bundeswahlleiter stellt Rohdaten als JSON bereit — für eine vollautomatische
Ergebnisanzeige. Aufwändig in der Implementierung, lohnt sich nur wenn eine
eigene Visualisierung gewünscht ist.

---

## Priorisierung

| Idee                         | Aufwand | Nutzen | Empfehlung        |
| ---------------------------- | ------- | ------ | ----------------- |
| Newsletter-Anmeldung         | Niedrig | Hoch   | Bald umsetzen     |
| Mitglied werden              | Niedrig | Hoch   | Bald umsetzen     |
| Anfragen & Anträge           | Mittel  | Hoch   | Mittelfristig     |
| Veranstaltungsanmeldung      | Mittel  | Mittel | Mittelfristig     |
| Wahlticker (Widget + Ticker) | Mittel  | Hoch   | Vor nächster Wahl |
| Wahlprogramm-Tracker         | Mittel  | Hoch   | Mittelfristig     |
| Abstimmungsprotokoll         | Hoch    | Hoch   | Langfristig       |
| Haushalt-Infografiken        | Hoch    | Mittel | Langfristig       |
| Pressemitteilungen           | Niedrig | Mittel | Optional          |
| Stadtteile & Zuständigkeiten | Mittel  | Mittel | Optional          |
