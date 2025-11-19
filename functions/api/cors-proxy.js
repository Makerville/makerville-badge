/**
 * Cloudflare Pages Function - CORS Proxy
 *
 * This function proxies requests to GitHub releases to bypass CORS restrictions
 * when downloading firmware binaries from the browser.
 *
 * Automatically deployed with Cloudflare Pages at /api/cors-proxy
 */

export async function onRequest(context) {
  const { request } = context;

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Get the URL parameter
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate that the URL is from GitHub (security measure)
    const parsedUrl = new URL(targetUrl);
    if (!parsedUrl.hostname.endsWith('github.com') &&
        !parsedUrl.hostname.endsWith('githubusercontent.com')) {
      return new Response('Only GitHub URLs are allowed', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fetch the resource
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Makerville-Badge-Flash-Tool/1.0'
      }
    });

    // Create a new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    // Cache for 1 hour
    newResponse.headers.set('Cache-Control', 'public, max-age=3600');

    return newResponse;

  } catch (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
