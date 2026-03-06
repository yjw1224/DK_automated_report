import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { writeFileSync } from 'fs';

const buildVersion = Date.now().toString();

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'generate-version',
      writeBundle() {
        writeFileSync('dist/version.json', JSON.stringify({ version: buildVersion }));
      }
    }
  ],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion)
  }
});
