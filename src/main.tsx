import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import { LazyMotion, MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'

// Drag and layout animations are only needed after the first render; loading
// them lazily keeps ~18 kB (gzip) off the critical path. `strict` makes any
// leftover `motion.*` component (which would bundle everything) throw.
const loadMotionFeatures = () => import('./motionFeatures').then(mod => mod.default)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      {/* The reduced-motion rule in index.css only covers CSS animations. */}
      <MotionConfig reducedMotion="user">
        <HelmetProvider>
          <BrowserRouter>
            <App />
            <Analytics />
          </BrowserRouter>
        </HelmetProvider>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
