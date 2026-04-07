import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const rootDir = process.cwd();

await build();
await build({
  build: {
    ssr: 'src/entry-server.jsx',
    outDir: 'dist/server',
    emptyOutDir: false,
  },
});

const templatePath = path.join(rootDir, 'dist/index.html');
const serverEntryPath = path.join(rootDir, 'dist/server/entry-server.js');

const template = await fs.readFile(templatePath, 'utf-8');
const { render } = await import(pathToFileURL(serverEntryPath).href);
const appHtml = render('/');
const rendered = template.replace('<!--app-html-->', appHtml);

await fs.writeFile(templatePath, rendered, 'utf-8');
