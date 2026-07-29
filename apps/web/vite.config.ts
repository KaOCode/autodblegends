import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Scaffolded now so the app is "PWA-ready"; disabled in dev to avoid
    // service-worker caching fighting with HMR. Flip `devOptions.enabled`
    // to true (or just `vite build && vite preview`) to try it locally.
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AutoDBLegends - Team Builder',
        short_name: 'AutoDBLegends',
        description: 'Automatischer Team Builder für Dragon Ball Legends',
        theme_color: '#0b0e1a',
        background_color: '#0b0e1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // characters.json et al can be large-ish; cache them so the app
        // still opens (with the last-synced data) when offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'dbl-data-cache' },
          },
        ],
      },
    }),
  ],
})
