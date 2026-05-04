import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://rexarski.github.io',
  base: '/resume',
  output: 'static',
  trailingSlash: 'ignore',
});
