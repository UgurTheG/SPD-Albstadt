import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Moon, Sun } from 'lucide-react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import PageLayout from './components/PageLayout'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'
import { useDarkMode } from './hooks/useDarkMode'
import { ROUTES, CATCH_ALL_ROUTE, PAGE_TITLES, DEPTH } from './routeConfig'

const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const location = useLocation()
  const prevPathRef = useRef(location.pathname)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const prev = prevPathRef.current
    setDirection((DEPTH[location.pathname] ?? 1) >= (DEPTH[prev] ?? 0) ? 1 : -1)
    prevPathRef.current = location.pathname
  }, [location.pathname])

  // Dynamic page title
  useEffect(() => {
    document.title = PAGE_TITLES[location.pathname] ?? PAGE_TITLES['/']
  }, [location.pathname])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isHome = location.pathname === '/'
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
      <Suspense fallback={<LoadingSpinner className="min-h-screen bg-gray-50 dark:bg-gray-950" />}>
        <AdminApp />
      </Suspense>
    )
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {isHome ? (
        <button
          onClick={toggleDarkMode}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dark mode umschalten"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      ) : (
        <Navbar />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: direction > 0 ? 36 : -28 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.46, ease: 'easeOut' } }}
          exit={{
            opacity: 0,
            y: direction > 0 ? -24 : 36,
            transition: { duration: 0.26, ease: 'easeIn' },
          }}
          className="relative min-h-screen flex flex-col"
        >
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner className="min-h-[60vh]" />}>
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <PageLayout>
                      <Hero />
                    </PageLayout>
                  }
                />
                {ROUTES.map(route => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={<PageLayout>{route.element}</PageLayout>}
                  />
                ))}
                <Route
                  path={CATCH_ALL_ROUTE.path}
                  element={<PageLayout>{CATCH_ALL_ROUTE.element}</PageLayout>}
                />
              </Routes>
            </Suspense>
          </ErrorBoundary>
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
