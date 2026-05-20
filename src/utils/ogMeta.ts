// Client-side Open Graph meta tag management
// Updates OG meta tags dynamically when navigating to player pages,
// so that share dialogs (and the browser share API) pick up the correct
// title, description, and image for the current series/episode.

const setMetaTag = (
  property: string,
  content: string,
  isName = false,
): void => {
  const attr = isName ? 'name' : 'property'
  let element = document.querySelector(
    `meta[${attr}="${property}"]`,
  ) as HTMLMetaElement | null

  if (element) {
    element.setAttribute('content', content)
  } else {
    element = document.createElement('meta')
    element.setAttribute(attr, property)
    element.setAttribute('content', content)
    document.head.appendChild(element)
  }
}

export const updateOgMeta = (
  title: string,
  description: string,
  image: string,
  url?: string,
): void => {
  const siteName =
    import.meta.env.VITE_APP_DISPLAY_NAME || document.title || 'GAnime'
  const pageUrl = url || window.location.href
  const truncatedDesc = description ? description.substring(0, 200) : ''

  // Update page title
  document.title = `${title} - ${siteName}`

  // OG tags
  setMetaTag('og:type', 'video.other')
  setMetaTag('og:title', title)
  setMetaTag('og:description', truncatedDesc)
  setMetaTag('og:image', image)
  setMetaTag('og:url', pageUrl)
  setMetaTag('og:site_name', siteName)

  // Twitter tags
  setMetaTag('twitter:card', 'summary_large_image', true)
  setMetaTag('twitter:title', title, true)
  setMetaTag('twitter:description', truncatedDesc, true)
  setMetaTag('twitter:image', image, true)
}

export const resetOgMeta = (): void => {
  const siteName =
    import.meta.env.VITE_APP_DISPLAY_NAME || 'GAnime'
  document.title = siteName

  setMetaTag('og:type', 'website')
  setMetaTag('og:title', siteName)
  setMetaTag('og:description', `Watch anime series on ${siteName}`)
  setMetaTag('og:image', '')
  setMetaTag('og:url', window.location.href)

  setMetaTag('twitter:title', siteName, true)
  setMetaTag('twitter:description', `Watch anime series on ${siteName}`, true)
  setMetaTag('twitter:image', '', true)
}
