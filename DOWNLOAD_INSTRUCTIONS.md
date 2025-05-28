# Download and Run Bluetooth Scanner Locally

## Quick Start

1. **Download the project files** from Replit:
   - Click the three dots menu in Replit
   - Select "Download as zip"
   - Extract the zip file on your computer

2. **Install Node.js** (if you don't have it):
   - Download from https://nodejs.org
   - Choose the LTS version

3. **Open terminal/command prompt** in the project folder

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser** and go to:
   ```
   https://localhost:5173
   ```
   (Note: You MUST use https:// not http:// for Bluetooth to work)

## Alternative: Static Build

For a production build that you can host anywhere:

1. **Build the static files:**
   ```bash
   npm run build
   ```

2. **Serve with HTTPS:**
   ```bash
   # Option 1: Use serve with SSL
   npx serve dist --ssl-cert --ssl-key
   
   # Option 2: Use local-web-server with HTTPS
   npx local-web-server --directory dist --https
   ```

## Important Notes

- **HTTPS Required**: Web Bluetooth API only works over HTTPS
- **Browser Compatibility**: Use Chrome, Edge, or Opera (not Firefox/Safari)
- **Device Permissions**: Your browser will ask permission for each Bluetooth device
- **Mobile Testing**: Works great on Android Chrome, not supported on iOS

## Deployment Options

Once built, you can deploy the `dist` folder to:
- **Netlify**: Drag and drop the dist folder
- **Vercel**: Connect your GitHub repo
- **GitHub Pages**: Upload files to your repository
- **Any web host**: Upload dist folder contents

The app will work anywhere that provides HTTPS!