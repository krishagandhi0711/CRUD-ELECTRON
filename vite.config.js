import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    electron({
      main: {
        entry: 'electron/main.js', // updated from main.ts
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.js'), // updated from preload.ts
      },
      // Polyfill the Electron and Node.js API for Renderer process.
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
