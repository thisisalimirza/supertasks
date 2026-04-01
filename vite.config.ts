import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vite adds `crossorigin` to <script> and <link> tags for browser CORS module
// preloading. In Electron's packaged asar, file:// CORS fetches bypass asar
// interception and produce ERR_FILE_NOT_FOUND. Strip the attribute at build time.
const removeElectronCrossorigin = {
  name: 'remove-crossorigin-attrs',
  transformIndexHtml(html: string) {
    return html.replace(/ crossorigin/g, '')
  },
}

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: path.resolve(__dirname, 'src/main/main.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['better-sqlite3', 'electron'],
            },
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, 'src/main/preload.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      renderer: {},
    }),
    removeElectronCrossorigin,
  ],
  base: './',
  root: path.resolve(__dirname, 'src/renderer'),
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
