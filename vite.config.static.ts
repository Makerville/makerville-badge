import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-pages-to-folders',
      writeBundle() {
        const distPath = path.resolve(__dirname, 'dist')

        // Create flash/index.html for /flash route
        const flashDir = path.resolve(distPath, 'flash')
        const flashHtml = path.resolve(distPath, 'flash.html')
        const flashIndex = path.resolve(flashDir, 'index.html')

        if (!fs.existsSync(flashDir)) {
          fs.mkdirSync(flashDir)
        }

        if (fs.existsSync(flashHtml)) {
          fs.copyFileSync(flashHtml, flashIndex)
        }

        // Create pcb/index.html for /pcb route
        const pcbDir = path.resolve(distPath, 'pcb')
        const pcbHtml = path.resolve(distPath, 'pcb.html')
        const pcbIndex = path.resolve(pcbDir, 'index.html')

        if (!fs.existsSync(pcbDir)) {
          fs.mkdirSync(pcbDir)
        }

        if (fs.existsSync(pcbHtml)) {
          fs.copyFileSync(pcbHtml, pcbIndex)
        }

        // Copy functions directory for Cloudflare Pages Functions
        const functionsSource = path.resolve(__dirname, 'functions')
        const functionsDest = path.resolve(distPath, 'functions')

        if (fs.existsSync(functionsSource)) {
          // Recursively copy functions directory
          const copyRecursive = (src: string, dest: string) => {
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true })
            }
            const entries = fs.readdirSync(src, { withFileTypes: true })
            for (const entry of entries) {
              const srcPath = path.join(src, entry.name)
              const destPath = path.join(dest, entry.name)
              if (entry.isDirectory()) {
                copyRecursive(srcPath, destPath)
              } else {
                fs.copyFileSync(srcPath, destPath)
              }
            }
          }
          copyRecursive(functionsSource, functionsDest)
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
        flash: path.resolve(__dirname, 'client/flash.html'),
        pcb: path.resolve(__dirname, 'client/pcb.html')
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