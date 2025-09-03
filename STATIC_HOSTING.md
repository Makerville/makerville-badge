# Static Hosting Configuration for SPA Routing

This guide explains how to configure static hosting platforms to properly handle client-side routing for the Makerville Badge app.

## The Problem

When deployed as a static app, direct URLs like `https://badge.makerville.io/flash` return a 404 error because the server doesn't know about client-side routes. The files created in `client/public/` provide solutions for different hosting platforms.

## Solutions by Platform

### 🟦 **Netlify**
Uses the `_redirects` file:
```
/*    /index.html   200
```
This tells Netlify to serve `index.html` for all routes while preserving the URL.

### ▲ **Vercel** 
Uses the `vercel.json` file:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 🅰️ **Apache Server**
Uses the `.htaccess` file:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

### 📄 **GitHub Pages**
Uses the `404.html` file to redirect to `index.html` with a query parameter.
The main `index.html` has a script that processes this parameter and updates the URL.

## Build and Deploy

1. **Build for static hosting:**
   ```bash
   npm run build:static
   ```

2. **Deploy the `dist` folder** to your static hosting platform

3. The redirect files in `client/public/` will automatically be copied to the build output

## Testing Locally

Test the build locally:
```bash
npm run build:static
cd dist
python3 -m http.server 8000  # or use any static server
```

Then test direct URLs:
- http://localhost:8000/
- http://localhost:8000/flash

Both should work properly.

## Requirements

⚠️ **HTTPS Required**: The Web Serial API (for flashing) requires HTTPS to work. Make sure your hosting platform serves the app over HTTPS.

## Current Deployment

If your app is currently deployed and `/flash` returns 404:

1. Rebuild with `npm run build:static` 
2. Redeploy the `dist` folder
3. The redirect rules will be included automatically

The redirect files are now part of the build output and will resolve the direct URL issue.