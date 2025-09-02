import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Sentry plugin for source maps and release tracking
    sentryVitePlugin({
      org: process.env.VITE_SENTRY_ORG,
      project: process.env.VITE_SENTRY_PROJECT,
      authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
      
      // Only upload source maps in production builds
      disable: process.env.NODE_ENV !== 'production',
      
      // Performance optimization
      silent: true,
      
      // Security: Don't include sensitive files
      ignore: ['node_modules', 'src/test'],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5177,
  },
})