import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-flash-to-folder',
      writeBundle() {
        // Create flash/index.html for /flash route
        const distPath = path.resolve(__dirname, 'dist')
        const flashDir = path.resolve(distPath, 'flash')
        const flashHtml = path.resolve(distPath, 'flash.html')
        const flashIndex = path.resolve(flashDir, 'index.html')
        
        if (!fs.existsSync(flashDir)) {
          fs.mkdirSync(flashDir)
        }
        
        if (fs.existsSync(flashHtml)) {
          fs.copyFileSync(flashHtml, flashIndex)
        }
      }
    }
  ],
  root: 'client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html'),
        flash: path.resolve(__dirname, 'client/flash.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})