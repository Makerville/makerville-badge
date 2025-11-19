# Cloudflare CORS Proxy Worker

This Cloudflare Worker acts as a CORS proxy to allow downloading firmware binaries from GitHub releases directly from the browser.

## Features

- ✅ Proxies requests to GitHub releases
- ✅ Adds CORS headers to enable browser downloads
- ✅ Security: Only allows GitHub URLs
- ✅ Caching: 1-hour cache for better performance
- ✅ Free tier compatible (100,000 requests/day)

## Setup Instructions

### Prerequisites

1. A Cloudflare account (free tier is fine): https://dash.cloudflare.com/sign-up
2. Node.js and npm installed

### Deployment Steps

#### Option 1: Deploy via Dashboard (Easiest)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it `makerville-cors-proxy` (or any name you prefer)
4. Click **Deploy**
5. Click **Edit Code**
6. Copy the contents of `cors-proxy.js` and paste it into the editor
7. Click **Save and Deploy**
8. Copy your worker URL (it will be something like `https://makerville-cors-proxy.YOUR-SUBDOMAIN.workers.dev`)

#### Option 2: Deploy via Wrangler CLI (Recommended for updates)

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy the worker:
```bash
cd cloudflare-worker
wrangler deploy
```

4. Your worker will be deployed and you'll get a URL like:
   `https://makerville-cors-proxy.YOUR-SUBDOMAIN.workers.dev`

### Update Your Application

After deploying, update the proxy URL in your application:

1. Open `client/src/hooks/use-esptool.ts`
2. Update line 218 to use your worker URL:
```typescript
const proxyUrl = `https://makerville-cors-proxy.YOUR-SUBDOMAIN.workers.dev?url=${encodeURIComponent(downloadUrl)}`;
```

Or create an environment variable:
```typescript
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || 'https://makerville-cors-proxy.YOUR-SUBDOMAIN.workers.dev';
const proxyUrl = `${CORS_PROXY}?url=${encodeURIComponent(downloadUrl)}`;
```

## Usage

The worker accepts a `url` query parameter:

```
https://your-worker.workers.dev?url=https://github.com/owner/repo/releases/download/v1.0/firmware.bin
```

## Security

The worker only allows URLs from:
- `*.github.com`
- `*.githubusercontent.com`

This prevents abuse and ensures it's only used for its intended purpose.

## Monitoring

1. Go to your Cloudflare Dashboard
2. Navigate to **Workers & Pages**
3. Click on your worker
4. View metrics, logs, and request analytics

## Costs

Cloudflare Workers Free Tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- First 100,000 requests/day are free

For most use cases, this is more than sufficient and completely free.

## Custom Domain (Optional)

To use a custom domain:

1. Add your domain to Cloudflare
2. Update `wrangler.toml` with your route configuration
3. Redeploy with `wrangler deploy`

## Troubleshooting

### Worker returns 403 error
- Ensure the URL is from GitHub
- Check that the URL is properly encoded

### Worker returns 500 error
- Check the worker logs in Cloudflare Dashboard
- Verify the GitHub URL is accessible

### CORS errors still occur
- Verify the worker is deployed and accessible
- Check browser console for the actual error
- Ensure you're using the correct worker URL
