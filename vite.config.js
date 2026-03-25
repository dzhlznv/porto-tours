import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@vercel/analytics': path.resolve(__dirname, 'src/lib/vercelAnalyticsShim.js')
    }
  }
});
