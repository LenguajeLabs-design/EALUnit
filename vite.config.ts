import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function pdfAssets(): Plugin {
  let output: string;
  return {
    name: 'curriculum-pdf-assets',
    apply: 'build',
    configResolved(config) {
      output = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const root = path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
      await Promise.all(
        ['cmaps', 'standard_fonts', 'wasm'].map((folder) =>
          cp(path.join(root, folder), path.join(output, 'pdf-assets', folder), { recursive: true }),
        ),
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/EALUnit/' : '/',
  plugins: [react(), pdfAssets()],
  server: { host: '127.0.0.1' },
}));
