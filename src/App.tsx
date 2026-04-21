import {lazy, Suspense, useEffect, useState} from 'react'
import {Route, Routes, useLocation, useNavigate} from 'react-router-dom'
import {AnimatePresence, motion} from 'framer-motion'
import {ArrowUp, Moon, Sun} from 'lucide-react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Footer from './components/Footer'

const AdminApp = lazy(() => import('./admin/AdminApp'))
const Aktuelles   = lazy(() => import('./components/sections/Aktuelles'))
const Partei      = lazy(() => import('./components/sections/Partei'))
const Fraktion    = lazy(() => import('./components/sections/Fraktion'))
const Historie    = lazy(() => import('./components/sections/Historie'))
const Kontakt     = lazy(() => import('./components/sections/Kontakt'))
const Datenschutz = lazy(() => import('./components/sections/Datenschutz'))
const Impressum   = lazy(() => import('./components/sections/Impressum'))
const ErrorPage = lazy(() => import('./components/sections/ErrorPage'))

const PAGE_TITLES: Record<string, string> = {
  '/':            'SPD Albstadt',
  '/aktuelles':   'SPD Albstadt / Aktuelles',
  '/partei':      'SPD Albstadt / Partei',
  '/fraktion':    'SPD Albstadt / Fraktion',
  '/historie':    'SPD Albstadt / Historie',
  '/kontakt':     'SPD Albstadt / Kontakt',
  '/datenschutz': 'SPD Albstadt / Datenschutz',
  '/impressum':   'SPD Albstadt / Impressum',
}

// Direction: 1 = going deeper, -1 = going back to home
const DEPTH: Record<string, number> = {
  '/': 0, '/aktuelles': 1, '/partei': 1, '/fraktion': 1,
  '/historie': 1, '/kontakt': 1, '/datenschutz': 1, '/impressum': 1,
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('spd-darkmode')
    if (saved !== null) return JSON.parse(saved) as boolean
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [showScrollTop, setShowScrollTop] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [prevPath, setPrevPath] = useState(location.pathname)
  const [direction, setDirection] = useState(1)

  if (prevPath !== location.pathname) {
    const newDir = (DEPTH[location.pathname] ?? 1) >= (DEPTH[prevPath] ?? 0) ? 1 : -1
    setPrevPath(location.pathname)
    setDirection(newDir)
  }

  // Dynamic page title
  useEffect(() => {
    document.title = PAGE_TITLES[location.pathname] ?? PAGE_TITLES['/']
  }, [location.pathname])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('spd-darkmode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigateTo = (id: string) => navigate(id === 'home' ? '/' : `/${id}`)
  const isHome = location.pathname === '/'
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="w-10 h-10 border-4 border-spd-red/30 border-t-spd-red rounded-full animate-spin"/>
          </div>
        }>
          <AdminApp/>
        </Suspense>
    )
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {isHome ? (
        <button
          onClick={() => setDarkMode(d => !d)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dark mode umschalten"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      ) : (
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(d => !d)}
          navigateTo={navigateTo}
          activePage={location.pathname.slice(1)}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: direction > 0 ? 36 : -28 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.46, ease: 'easeOut' } }}
          exit={{ opacity: 0, y: direction > 0 ? -24 : 36, transition: { duration: 0.26, ease: 'easeIn' } }}
          className="relative min-h-screen flex flex-col"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="w-10 h-10 border-4 border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
            </div>
          }>
            <Routes location={location}>
              <Route path="/" element={<><Hero navigateTo={navigateTo} /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/aktuelles"   element={<><Aktuelles /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/partei"      element={<><Partei /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/fraktion"    element={<><Fraktion /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/historie"    element={<><Historie /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/kontakt"     element={<><Kontakt /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/datenschutz" element={<><Datenschutz /><Footer navigateTo={navigateTo} /></>} />
              <Route path="/impressum"   element={<><Impressum /><Footer navigateTo={navigateTo} /></>} />
              {/* Error pages */}
              <Route path="/400"
                     element={<><ErrorPage code={400} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/401"
                     element={<><ErrorPage code={401} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/403"
                     element={<><ErrorPage code={403} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/405"
                     element={<><ErrorPage code={405} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/408"
                     element={<><ErrorPage code={408} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/429"
                     element={<><ErrorPage code={429} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/500"
                     element={<><ErrorPage code={500} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/502"
                     element={<><ErrorPage code={502} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/503"
                     element={<><ErrorPage code={503} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              <Route path="/504"
                     element={<><ErrorPage code={504} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
              {/* Catch-all → 404 */}
              <Route path="*"
                     element={<><ErrorPage code={404} navigateTo={navigateTo}/><Footer navigateTo={navigateTo}/></>}/>
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-spd-red text-white rounded-xl shadow-lg shadow-spd-red/30 flex items-center justify-center hover:bg-spd-red-dark transition-colors cursor-pointer"
            aria-label="Nach oben scrollen"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
