import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { SEO_CONFIG } from '../seoConfig'

/**
 * Renders per-route <head> meta tags via react-helmet-async.
 * Falls back to homepage SEO config for unknown routes.
 */
export default function SEOHead() {
  const { pathname } = useLocation()
  const seo = SEO_CONFIG[pathname] ?? SEO_CONFIG['/']

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      {seo.ogImageWidth && <meta property="og:image:width" content={String(seo.ogImageWidth)} />}
      {seo.ogImageHeight && <meta property="og:image:height" content={String(seo.ogImageHeight)} />}
      <meta property="og:image:alt" content={seo.title} />
      <meta property="og:locale" content="de_DE" />
      <meta property="og:site_name" content="SPD Albstadt" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
    </Helmet>
  )
}
