#!/bin/bash

echo "Building static Bluetooth scanner app..."

# Remove backend dependencies
rm -rf server/
rm -f drizzle.config.ts
rm -f shared/

# Build the frontend app
npm run build:static

echo "✅ Static build complete!"
echo ""
echo "📁 Built files are in the 'dist' directory"
echo "🌐 Deploy to any static hosting service (Netlify, Vercel, GitHub Pages)"
echo "🔒 Remember: Requires HTTPS for Web Bluetooth API to work"
echo ""
echo "To test locally:"
echo "  npm run preview"