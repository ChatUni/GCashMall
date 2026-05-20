// Netlify Edge Function to inject dynamic Open Graph meta tags for player pages.
// Social media crawlers (Facebook, Twitter, WhatsApp, Pinterest) read OG tags
// from the HTML. Since this is an SPA, we intercept the response for bot
// user-agents and replace the default OG tags with series-specific data
// fetched from the existing API.

// ── Bot Detection ──

const SOCIAL_BOT_PATTERNS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'whatsapp',
  'pinterest',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'discordbot',
]

const isSocialBot = (userAgent) => {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return SOCIAL_BOT_PATTERNS.some((bot) => ua.includes(bot))
}

// ── URL Parsing ──

const extractSeriesIdFromPath = (pathname) => {
  const match = pathname.match(/^\/player\/([a-f0-9]{24})$/i)
  return match ? match[1] : null
}

// ── Fetch Series from API ──

const fetchSeriesData = async (seriesId, origin) => {
  try {
    const apiUrl = `${origin}/.netlify/functions/api?type=series&id=${seriesId}`
    const res = await fetch(apiUrl)
    if (!res.ok) return null
    const json = await res.json()
    return json.success ? json.data : null
  } catch (e) {
    console.error('Failed to fetch series from API:', e)
    return null
  }
}

// ── HTML Manipulation ──

const escapeHtml = (str) => {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const buildOgTags = (series, url, siteName) => {
  const title = escapeHtml(series.name)
  const description = escapeHtml(
    series.description
      ? series.description.substring(0, 200)
      : `Watch ${series.name} on ${siteName}`,
  )
  const image = series.cover || ''

  return { title, description, image, url, siteName, type: 'video.other' }
}

const replaceMetaTag = (html, property, content, isName = false) => {
  const attr = isName ? 'name' : 'property'
  const regex = new RegExp(
    `<meta\\s+${attr}="${property}"\\s+content="[^"]*"\\s*/?>`,
    'i',
  )
  const replacement = `<meta ${attr}="${property}" content="${content}" />`

  if (regex.test(html)) {
    return html.replace(regex, replacement)
  }
  return html.replace('</head>', `    ${replacement}\n  </head>`)
}

const injectOgMeta = (html, og) => {
  let result = html

  // OG tags
  result = replaceMetaTag(result, 'og:type', og.type)
  result = replaceMetaTag(result, 'og:title', og.title)
  result = replaceMetaTag(result, 'og:description', og.description)
  result = replaceMetaTag(result, 'og:image', og.image)
  result = replaceMetaTag(result, 'og:url', og.url)
  result = replaceMetaTag(result, 'og:site_name', og.siteName)

  // Twitter tags
  result = replaceMetaTag(result, 'twitter:card', 'summary_large_image', true)
  result = replaceMetaTag(result, 'twitter:title', og.title, true)
  result = replaceMetaTag(result, 'twitter:description', og.description, true)
  result = replaceMetaTag(result, 'twitter:image', og.image, true)

  // Page title
  result = result.replace(
    /<title>[^<]*<\/title>/,
    `<title>${og.title} - ${og.siteName}</title>`,
  )

  return result
}

// ── Edge Function Handler ──

export default async (request, context) => {
  const url = new URL(request.url)
  const seriesId = extractSeriesIdFromPath(url.pathname)

  // Only process /player/:id routes
  if (!seriesId) return context.next()

  // Only inject OG tags for social media bots
  const userAgent = request.headers.get('user-agent') || ''
  if (!isSocialBot(userAgent)) return context.next()

  // Get the original SPA response (index.html)
  const response = await context.next()
  const html = await response.text()

  // Fetch series data via existing API
  const series = await fetchSeriesData(seriesId, url.origin)

  if (!series) {
    return new Response(html, {
      status: response.status,
      headers: response.headers,
    })
  }

  const siteName = Deno.env.get('VITE_APP_DISPLAY_NAME') || 'GAnime'
  const og = buildOgTags(series, url.toString(), siteName)
  const modifiedHtml = injectOgMeta(html, og)

  return new Response(modifiedHtml, {
    status: response.status,
    headers: response.headers,
  })
}

export const config = {
  path: '/player/*',
}
