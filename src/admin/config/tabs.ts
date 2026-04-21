import type {TabConfig} from '../types'


export const TABS: TabConfig[] = [
    {
        key: 'news', label: 'Aktuelles', file: '/data/news.json', ghPath: 'public/data/news.json', type: 'array',
        fields: [
            {key: 'datum', label: 'Datum', type: 'date', required: true},
            {key: 'titel', label: 'Titel', type: 'text', required: true},
            {key: 'zusammenfassung', label: 'Zusammenfassung', type: 'textarea'},
            {key: 'inhalt', label: 'Inhalt', type: 'textarea'},
            {
                key: 'kategorie',
                label: 'Kategorie',
                type: 'select',
                options: ['Gemeinderat', 'Veranstaltung', 'Haushalt', 'Ortsverein', 'Wahl']
            },
            {key: 'bildUrl', label: 'Titelbild', type: 'image', imageDir: 'news'},
            {key: 'bildBeschreibung', label: 'Bildunterschrift Titelbild', type: 'text'},
            {
                key: 'bildUrls',
                label: 'Weitere Bilder',
                type: 'imagelist',
                imageDir: 'news',
                captionsKey: 'bildBeschreibungen'
            },
        ]
    },
    {
        key: 'party', label: 'Partei', file: '/data/party.json', ghPath: 'public/data/party.json', type: 'object',
        topFields: [{key: 'beschreibung', label: 'Beschreibung', type: 'textarea'}],
        sections: [
            {
                key: 'schwerpunkte', label: 'Schwerpunkte',
                fields: [
                    {key: 'titel', label: 'Titel', type: 'text', required: true},
                    {key: 'beschreibung', label: 'Beschreibung', type: 'textarea'},
                    {key: 'icon', label: 'Icon', type: 'icon-picker'},
                ]
            },
            {
                key: 'vorstand', label: 'Vorstand',
                fields: [
                    {key: 'name', label: 'Name', type: 'text', required: true},
                    {key: 'rolle', label: 'Rolle / Amt', type: 'text'},
                    {key: 'email', label: 'E-Mail', type: 'email'},
                    {key: 'phone', label: 'Telefon', type: 'text'},
                    {key: 'address', label: 'Adresse', type: 'text'},
                    {key: 'place', label: 'PLZ & Ort', type: 'text'},
                    {key: 'bildUrl', label: 'Profilbild', type: 'image', imageDir: 'vorstand'},
                    {key: 'bildUrls', label: 'Weitere Bilder', type: 'imagelist', imageDir: 'vorstand'},
                    {key: 'bio', label: 'Biografie', type: 'textarea'},
                ]
            },
            {
                key: 'abgeordnete', label: 'Abgeordnete',
                fields: [
                    {key: 'name', label: 'Name', type: 'text', required: true},
                    {key: 'rolle', label: 'Rolle', type: 'text'},
                    {key: 'wahlkreis', label: 'Wahlkreis', type: 'text'},
                    {key: 'email', label: 'E-Mail', type: 'email'},
                    {key: 'website', label: 'Website', type: 'url'},
                    {key: 'bildUrl', label: 'Profilbild', type: 'image', imageDir: 'abgeordnete'},
                    {key: 'bildUrls', label: 'Weitere Bilder', type: 'imagelist', imageDir: 'abgeordnete'},
                    {key: 'bio', label: 'Biografie', type: 'textarea'},
                ]
            },
        ]
    },
    {
        key: 'fraktion',
        label: 'Fraktion',
        file: '/data/fraktion.json',
        ghPath: 'public/data/fraktion.json',
        type: 'object',
        topFields: [{key: 'beschreibung', label: 'Beschreibung', type: 'textarea'}],
        sections: [
            {
                key: 'gemeinderaete', label: 'Gemeinderäte',
                fields: [
                    {key: 'name', label: 'Name', type: 'text', required: true},
                    {key: 'beruf', label: 'Beruf', type: 'text'},
                    {key: 'bildUrl', label: 'Bild', type: 'image', imageDir: 'gemeinderaete'},
                    {key: 'seit', label: 'Im Rat seit', type: 'text'},
                    {key: 'address', label: 'Adresse', type: 'text'},
                    {key: 'zipCode', label: 'PLZ & Ort', type: 'text'},
                    {key: 'email', label: 'E-Mail', type: 'email'},
                    {key: 'ausschuesse', label: 'Ausschüsse', type: 'stringlist'},
                    {key: 'bio', label: 'Biografie', type: 'textarea'},
                ]
            },
            {
                key: 'kreisraete', label: 'Kreisräte',
                fields: [
                    {key: 'name', label: 'Name', type: 'text', required: true},
                    {key: 'beruf', label: 'Beruf', type: 'text'},
                    {key: 'bildUrl', label: 'Bild', type: 'image', imageDir: 'kreisraete'},
                    {key: 'seit', label: 'Im Rat seit', type: 'text'},
                    {key: 'address', label: 'Adresse', type: 'text'},
                    {key: 'zipCode', label: 'PLZ & Ort', type: 'text'},
                    {key: 'email', label: 'E-Mail', type: 'email'},
                    {key: 'ausschuesse', label: 'Ausschüsse', type: 'stringlist'},
                    {key: 'bio', label: 'Biografie', type: 'textarea'},
                ]
            },
            {
                key: 'news', label: 'Fraktions-News',
                fields: [
                    {key: 'datum', label: 'Datum', type: 'date'},
                    {key: 'titel', label: 'Titel', type: 'text', required: true},
                    {key: 'inhalt', label: 'Inhalt', type: 'textarea'},
                    {key: 'bildUrl', label: 'Bild', type: 'image', imageDir: 'news'},
                ]
            },
        ]
    },
    {
        key: 'haushaltsreden', label: 'Haushaltsreden', type: 'haushaltsreden',
        file: null, ghPath: null,
    },
    {
        key: 'history',
        label: 'Historie',
        file: '/data/history.json',
        ghPath: 'public/data/history.json',
        type: 'object',
        topFields: [{key: 'einleitung', label: 'Einleitung', type: 'textarea'}],
        sections: [
            {
                key: 'timeline', label: 'Chronik',
                fields: [
                    {key: 'jahr', label: 'Jahr(e)', type: 'text', required: true},
                    {key: 'titel', label: 'Titel', type: 'text', required: true},
                    {key: 'beschreibung', label: 'Beschreibung', type: 'textarea'},
                    {
                        key: 'bilder',
                        label: 'Bilder',
                        type: 'imagelist',
                        imageDir: 'historie',
                        captionsKey: 'bilderBeschreibungen'
                    },
                ]
            },
            {
                key: 'persoenlichkeiten', label: 'Kommunale Persönlichkeiten',
                fields: [
                    {key: 'name', label: 'Name', type: 'text', required: true},
                    {key: 'jahre', label: 'Jahre', type: 'text'},
                    {key: 'rolle', label: 'Rolle', type: 'text'},
                    {key: 'beschreibung', label: 'Beschreibung', type: 'textarea'},
                    {key: 'bildUrl', label: 'Profilbild', type: 'image', imageDir: 'persoenlichkeiten'},
                    {key: 'bildUrls', label: 'Weitere Bilder', type: 'imagelist', imageDir: 'persoenlichkeiten'},
                ]
            },
        ]
    },
    {
        key: 'config',
        label: 'Einstellungen',
        file: '/data/config.json',
        ghPath: 'public/data/config.json',
        type: 'object',
        topFields: [{key: 'icsUrl', label: 'Kalender-URL (ICS)', type: 'text'}],
        sections: [
            {
                key: 'kontakt', label: 'Kontaktdaten', isSingleObject: true,
                fields: [
                    {key: 'adresse', label: 'Anschrift (Zeilenumbrüche mit Enter)', type: 'textarea'},
                    {key: 'email', label: 'E-Mail-Adresse', type: 'email'},
                    {key: 'telefon', label: 'Telefon', type: 'text'},
                    {key: 'formspreeUrl', label: 'Formspree-URL (Kontaktformular)', type: 'url'},
                ]
            },
            {
                key: 'buerozeiten', label: 'Bürozeiten',
                fields: [
                    {key: 'tage', label: 'Tage', type: 'text', required: true},
                    {key: 'zeit', label: 'Zeit', type: 'text', required: true},
                ]
            },
            {
                key: 'social', label: 'Social Media', isSingleObject: true,
                fields: [
                    {key: 'facebookUrl', label: 'Facebook-URL', type: 'url'},
                    {key: 'instagramUrl', label: 'Instagram-URL', type: 'url'},
                ]
            },
        ]
    },
]
