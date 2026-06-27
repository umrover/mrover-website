import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

export default defineConfig({
  site: 'https://mrover.org',
  base: '/',
  outDir: './dist',
  publicDir: './public',
  build: {
    assets: '_astro'
  },
  integrations: [
    react(),
    sitemap(),
    compress({ CSS: false }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false
    }
  }
});
