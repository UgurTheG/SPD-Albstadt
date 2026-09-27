import { Helmet } from 'react-helmet-async'
import type { DeepLinkSEO } from '@/seoConfig'

/**
 * Head tags for a URL that opens a detail sheet. Link-preview crawlers don't run
 * JavaScript; they read the same values from the HTML shell that
 * plugins/prerenderRoutes.ts writes for every deep link at build time.
 * Without an own image, the site default from <SEOHead> stays in place.
 */
export default function DeepLinkHead({ seo }: { seo: DeepLinkSEO }) {
  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={seo.canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta property="og:locale" content="de_DE" />
      <meta property="og:site_name" content="SPD Albstadt" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
    </Helmet>
  )
}
