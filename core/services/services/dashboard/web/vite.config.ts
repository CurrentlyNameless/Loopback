import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// projectRoot = Floofcore Reborn/ (4 levels up from web/)
const projectRoot = path.resolve(__dirname, '../../../..');
const hasTabler = existsSync(path.resolve(projectRoot, 'node_modules/@tabler/icons-react'));
const hasReactQuery = existsSync(path.resolve(projectRoot, 'node_modules/@tanstack/react-query'));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@modules': path.resolve(projectRoot, 'modules'),
      '@tabler/icons-react': path.resolve(__dirname, 'src/lib/tablerFallback.tsx'),
      ...(!hasReactQuery ? { '@tanstack/react-query': path.resolve(__dirname, 'src/lib/reactQueryFallback.tsx') } : {}),
    },
  },
  server: {
    hmr: false,
    ws: false,
    fs: {
      allow: [
        path.resolve(__dirname, 'src'),
        path.resolve(projectRoot, 'modules'),
        projectRoot,
      ],
    },
  },
});
