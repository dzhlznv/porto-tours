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
const mapTemplatePath = path.join(rootDir, 'dist/map.html');
const serverEntryPath = path.join(rootDir, 'dist/server/entry-server.js');

const template = await fs.readFile(templatePath, 'utf-8');
const { render } = await import(pathToFileURL(serverEntryPath).href);

const routeTemplates = {
  '/': template.replace('<!--app-html-->', render('/')),
  '/map': template.replace('<!--app-html-->', render('/map')),
};

await fs.writeFile(templatePath, routeTemplates['/'], 'utf-8');
await fs.writeFile(mapTemplatePath, routeTemplates['/map'], 'utf-8');
