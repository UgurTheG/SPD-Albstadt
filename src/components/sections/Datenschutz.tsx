import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Shield } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Einleitung',
    content: (
      <p>
        Uns ist der verantwortungsvolle Umgang mit personenbezogenen Daten wichtig. Die Vorgaben durch Gesetze und
        Verordnungen – Bundesdatenschutzgesetz (BDSG), Telemediengesetz (TMG) und
        Datenschutzgrundverordnung (DSGVO) – sind Grundlage unseres Handelns. Im Folgenden informieren wir Sie, wie
        mit Ihren Daten umgegangen wird bzw. was über Sie gespeichert wird.
      </p>
    ),
  },
  {
    title: 'Verantwortlich',
    content: (
      <p>
        SPD Stadtverband Albstadt<br />
        vertreten durch Stadtverbandsvorsitzende Marianne Roth<br />
        Flanderstraße 35<br />
        72458 Albstadt<br />
        <br />
        Telefon: (07431) 51822<br />
        E-Mail:{' '}
        <a href="mailto:jumroth@t-online.de" className="text-spd-red hover:underline">
          jumroth@t-online.de
        </a>
      </p>
    ),
  },
  {
    title: 'Hosting',
    content: (
      <p>
        Die verwendeten Server-Domains werden von Hostinger International Ltd (
        <a href="https://www.hostinger.de" target="_blank" rel="noopener noreferrer" className="text-spd-red hover:underline">
          https://www.hostinger.de
        </a>
        ) bereitgestellt. Nähere Informationen zur Erhebung und Nutzung der Daten durch Hostinger finden sich in den
        Datenschutzhinweisen von Hostinger:{' '}
        <a
          href="https://www.hostinger.de/datenschutz-bestimmungen"
          target="_blank"
          rel="noopener noreferrer"
          className="text-spd-red hover:underline"
        >
          https://www.hostinger.de/datenschutz-bestimmungen
        </a>
        .
      </p>
    ),
  },
  {
    title: 'Cookies',
    content: (
      <p>
        Auf der Seite{' '}
        <a href="https://www.spd-albstadt.de" target="_blank" rel="noopener noreferrer" className="text-spd-red hover:underline">
          www.spd-albstadt.de
        </a>{' '}
        werden Cookies verwendet. Wir nutzen nur technisch erforderliche Cookies.
      </p>
    ),
  },
  {
    title: 'Soziale Medien und Plugins',
    content: (
      <p>
        Auf den Detailseiten der aktuellen Meldungen finden Sie Links zu Instagram und Facebook. Hierbei handelt es
        sich lediglich um gewöhnliche Links und keine Plugins. Hier werden also keine Dienste von einem anderen Server
        eingebunden, geschweige denn Daten übertragen und gespeichert, solange Sie den entsprechenden Link nicht
        anklicken.
      </p>
    ),
  },
  {
    title: 'Webanalyse',
    content: (
      <p>
        Die Webseite{' '}
        <a href="https://www.spd-albstadt.de" target="_blank" rel="noopener noreferrer" className="text-spd-red hover:underline">
          www.spd-albstadt.de
        </a>{' '}
        benutzt kein Analysetool.
      </p>
    ),
  },
  {
    title: 'Kontaktformular',
    content: (
      <p>
        Auf der Seite{' '}
        <a href="https://www.spd-albstadt.de" target="_blank" rel="noopener noreferrer" className="text-spd-red hover:underline">
          www.spd-albstadt.de
        </a>{' '}
        wird ein Kontaktformular zur Verfügung gestellt. Senden Sie dieses ab, werden folgende Informationen
        gespeichert: Ihr Name, Ihre E-Mail-Adresse und die übermittelte Nachricht samt angegebenem Betreff. Die
        Eingaben im Kontaktformular werden per E-Mail an ein E-Mail-Postfach gesendet, gespeichert und nach
        Beantwortung rückstandslos gelöscht. Eine andersartige Verwertung der Daten findet nicht statt. Sollten Sie
        mit dieser temporären Speicherung nicht einverstanden sein, können Sie das Kontaktformular nicht nutzen. Falls
        es gesetzliche Bestimmungen zu Aufbewahrungsfristen gibt, werden diese angewendet.
      </p>
    ),
  },
  {
    title: 'Nutzerrechte',
    content: (
      <p>
        Gemäß der{' '}
        <a
          href="https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04"
          target="_blank"
          rel="noopener noreferrer"
          className="text-spd-red hover:underline"
        >
          Datenschutzgrundverordnung
        </a>{' '}
        Artikel 7.3, 15–20 hat jeder Nutzer, von dem personenbezogene Daten erhoben werden, das Auskunftsrecht, das
        Recht auf Berichtigung, das Recht auf Löschung, das Recht auf Einschränkung der Verarbeitung, das Recht auf
        Unterrichtung und das Recht auf Datenübertragbarkeit sowie das Widerspruchsrecht für diese Daten gegenüber
        dem Datenerheber. Da auf dieser Seite keine personenbezogenen Daten erhoben werden, kann es auch keine
        Auskünfte zu den jeweiligen oben genannten Punkten geben. Falls Nutzer dieser Website hier anderer Meinung
        sind, können Sie Beschwerde bei einer datenschutzrechtlichen Aufsichtsbehörde einreichen. Hier sind die
        Landesbeauftragten der Bundesländer zuständig. Hier geht's zum Beschwerdeformular:{' '}
        <a
          href="https://www.baden-wuerttemberg.datenschutz.de/beschwerde/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-spd-red hover:underline"
        >
          https://www.baden-wuerttemberg.datenschutz.de/beschwerde/
        </a>
        .
      </p>
    ),
  },
  {
    title: 'Widerspruch gegen Werbe-Mails',
    content: (
      <p>
        Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur Übersendung von nicht
        ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit widersprochen. Die Betreiber der
        Seiten behalten sich ausdrücklich rechtliche Schritte im Falle der unverlangten Zusendung von
        Werbeinformationen, etwa durch Spam-E-Mails, vor.
      </p>
    ),
  },
]

export default function Datenschutz() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <main className="flex-1 pt-20 pb-16">
      {/* Header */}
      <section className="bg-linear-to-br from-spd-red via-spd-red to-red-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Shield size={22} />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-red-200">Rechtliches</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-left"
          >
            Datenschutz
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-red-100 text-lg max-w-2xl"
          >
            Informationen zum Umgang mit Ihren personenbezogenen Daten gemäß DSGVO.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section ref={ref} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="space-y-10">
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="border-b border-gray-200 dark:border-gray-800 pb-8 last:border-0"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h2>
              <div className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm sm:text-base">
                {section.content}
              </div>
            </motion.div>
          ))}

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: SECTIONS.length * 0.06 }}
            className="text-xs text-gray-400 dark:text-gray-600 pt-2"
          >
            Stand: 25.07.2023
          </motion.p>
        </div>
      </section>
    </main>
  )
}

