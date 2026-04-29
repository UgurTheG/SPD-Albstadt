# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-29

### Added

- **Accessibility**: Skip-to-content link for keyboard users
- **Accessibility**: `<main>` landmark wrapping page content
- **Accessibility**: `aria-live` region announcing route changes to screen readers
- **Accessibility**: `aria-expanded` on mobile hamburger menu
- **Accessibility**: `aria-current="page"` on active navigation items
- **Accessibility**: `aria-label` on `<nav>` element
- **Accessibility**: `aria-hidden` on decorative SVG elements
- **Accessibility**: Minimum 44×44px touch targets on all interactive elements
- **Accessibility**: `prefers-reduced-motion` support — disables animations
- **Accessibility**: Visible `:focus-visible` outlines for keyboard navigation
- **Security**: Content-Security-Policy header
- **Security**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers
- **Security**: Permissions-Policy restricting camera/microphone/geolocation
- **Performance**: Long-term immutable caching for hashed build assets
- **Performance**: Scoped Elfsight MutationObserver (only active on /aktuelles)
- **Performance**: Preconnect hints for external origins
- **PWA**: Service worker via vite-plugin-pwa for offline support
- **PWA**: Auto-update registration for seamless updates
- **SEO**: Missing pages added to sitemap.xml (kommunalpolitik, datenschutz, impressum)
- **SEO**: `<lastmod>` dates on all sitemap entries
- **SEO**: `hreflang` tag for German language
- **SEO**: `<noscript>` fallback message
- **DX**: Dark-mode FOUC prevention (inline script in `<head>`)
- **DX**: Test files excluded from `tsconfig.app.json` for cleaner type-checking
- **DX**: `engines` field in package.json (Node ≥ 20)
- **DX**: Enhanced CI workflow with coverage report and build artifact upload
- **DX**: CONTRIBUTING.md with setup and PR guidelines
- **Testing**: Hook tests (useDarkMode, useNavigateTo)
- **Testing**: Integration tests (App accessibility, routing)
- **Testing**: Component tests (Navbar ARIA, Hero accessibility)
- **Testing**: Coverage includes hooks directory
