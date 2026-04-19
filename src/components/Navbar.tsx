import {useEffect, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {ChevronLeft, Menu, Moon, Sun, X} from 'lucide-react'

interface NavbarProps {
  darkMode: boolean
  toggleDarkMode: () => void
  navigateTo: (id: string) => void
  activePage: string
}

const NAV_ITEMS = [
  { id: 'aktuelles', label: 'Aktuelles' },
  { id: 'partei', label: 'Partei' },
  { id: 'fraktion', label: 'Fraktion' },
  { id: 'historie', label: 'Historie' },
  { id: 'kontakt', label: 'Kontakt' },
]

const SECTION_LABELS: Record<string, string> = {
  aktuelles: 'Aktuelles',
  partei: 'Partei',
  fraktion: 'Fraktion',
  historie: 'Historie',
  kontakt: 'Kontakt',
}

export default function Navbar({ darkMode, toggleDarkMode, navigateTo, activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isHome = activePage === 'home'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  const handleNav = (id: string) => {
    navigateTo(id)
    setMenuOpen(false)
  }

  // Navbar is always solid when on a section page; transparent on home when not scrolled
  const solid = !isHome || scrolled

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        solid
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/30'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: logo + optional back button */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="Startseite"
            >
              <img src="/spd-logo.svg" alt="SPD" className="w-9 h-9 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
              <span className={`font-bold text-lg tracking-tight transition-colors duration-300 ${
                solid ? 'text-gray-900 dark:text-white' : 'text-white'
              }`}>
                Albstadt
              </span>
            </button>

            {/* Breadcrumb separator when on a section */}
            <AnimatePresence>
              {!isHome && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 min-w-0"
                >
                  <span className="text-gray-300 dark:text-gray-600 hidden sm:block">/</span>
                  <span className="font-semibold text-spd-red text-sm truncate">
                    {SECTION_LABELS[activePage]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Centre: desktop nav — hidden on home page */}
          <AnimatePresence>
            {!isHome && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex items-center gap-1"
              >
                <button
                  onClick={() => handleNav('home')}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:text-spd-red hover:bg-gray-100 dark:hover:bg-gray-800 transition-all mr-1"
                >
                  <ChevronLeft size={14} />
                  Home
                </button>
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      activePage === item.id
                        ? 'text-spd-red bg-spd-red/5'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                    {activePage === item.id && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-spd-red"
                      />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: dark mode + hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                solid
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Dark mode umschalten"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-2.5 rounded-xl transition-all duration-200 ${
                solid
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Menü öffnen"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-white/98 dark:bg-gray-950/98 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {!isHome && (
                <motion.button
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleNav('home')}
                  className="text-left flex items-center gap-2 font-medium py-3 px-4 rounded-xl text-gray-500 dark:text-gray-400 hover:text-spd-red hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <ChevronLeft size={15} />
                  Startseite
                </motion.button>
              )}
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNav(item.id)}
                  className={`text-left font-medium py-3 px-4 rounded-xl transition-colors ${
                    activePage === item.id
                      ? 'text-spd-red bg-spd-red/5'
                      : 'text-gray-700 dark:text-gray-300 hover:text-spd-red hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
