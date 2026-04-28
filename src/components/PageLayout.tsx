import type { ReactNode } from 'react'
import Footer from './Footer'

/** Wraps a page element with a shared Footer. Used by App route definitions. */
export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
