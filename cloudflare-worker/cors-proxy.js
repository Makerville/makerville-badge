/**
 * CORS Proxy Cloudflare Worker
 *
 * This worker proxies requests to GitHub releases to bypass CORS restrictions
 * when downloading firmware binaries from the browser.
 *
 * Deploy this to Cloudflare Workers at: https://dash.cloudflare.com/
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get the URL parameter
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response('Missing url parameter', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Validate that the URL is from GitHub (security measure)
    const parsedUrl = new URL(targetUrl)
    if (!parsedUrl.hostname.endsWith('github.com') &&
        !parsedUrl.hostname.endsWith('githubusercontent.com')) {
      return new Response('Only GitHub URLs are allowed', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Fetch the resource
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Makerville-Badge-Flash-Tool/1.0'
      }
    })

    // Create a new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })

    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    // Cache for 1 hour
    newResponse.headers.set('Cache-Control', 'public, max-age=3600')

    return newResponse

  } catch (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// Handle OPTIONS requests for CORS preflight
addEventListener('fetch', event => {
  if (event.request.method === 'OPTIONS') {
    event.respondWith(handleOptions())
  }
})

function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  })
}
