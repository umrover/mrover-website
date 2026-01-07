import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
// import compress from 'astro-compress';

const isDev = process.env.DEV === 'true';

export default defineConfig({
  site: isDev ? 'https://mrover.kevinjin.dev' : 'https://mrover.org',
  base: '/',
  outDir: './docs',
  publicDir: './public',
  build: {
    assets: '_astro'
  },
  integrations: [
    react(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three') && !id.includes('@react-three')) {
                return 'three-core'
              }
              if (id.includes('@react-three')) {
                return 'react-three'
              }
              if (id.includes('gsap')) {
                return 'gsap'
              }
              if (id.includes('react') || id.includes('scheduler')) {
                return 'react-vendor'
              }
            }
          }
        }
      }
    }
  }
});
