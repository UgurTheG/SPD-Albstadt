import { Helmet } from 'react-helmet-async'
import { BASE_URL_EXPORT as BASE_URL } from '../seoConfig'

interface Props {
  title: string
  description: string
  url: string
  image?: string
}

/** Shared Helmet block for detail sheets (news articles, policy topics, etc.). */
export function DetailHelmet({ title, description, url, image }: Props) {
  const fullTitle = `${title} – SPD Albstadt`
  const canonical = `${BASE_URL}${url}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:locale" content="de_DE" />
      <meta property="og:site_name" content="SPD Albstadt" />
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}
