import { Helmet } from 'react-helmet-async'
import { BASE_URL } from '../seoConfig'

interface ArticleMetaProps {
  /** Page title without the " – SPD Albstadt" suffix. */
  title: string
  description: string
  /** Site-relative path of the deep link, e.g. `/aktuelles/<uuid>`. */
  path: string
  /** Absolute or site-relative image URL for og:image / twitter:image. */
  image?: string
}

/** <head> tags for a deep-linkable detail sheet (news item, Schwerpunkt, timeline event). */
export default function ArticleMeta({ title, description, path, image }: ArticleMetaProps) {
  const fullTitle = `${title} – SPD Albstadt`
  const url = `${BASE_URL}${path}`
  const ogImage = image && (image.startsWith('http') ? image : `${BASE_URL}${image}`)

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:locale" content="de_DE" />
      <meta property="og:site_name" content="SPD Albstadt" />
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  )
}
