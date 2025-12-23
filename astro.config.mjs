import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const isDev = process.env.DEV === 'true';

export default defineConfig({
  site: isDev ? 'https://mrover.kevinjin.dev' : 'https://mrover.org',
  base: '/',
  outDir: './docs',
  publicDir: './public',
  build: {
    assets: '_astro'
  },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
