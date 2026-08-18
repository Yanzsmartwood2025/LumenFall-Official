import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(projectRoot, 'dist');
const staticFolders = ['assets', 'css', 'js'];
const staticFiles = ['manifest.json'];

await mkdir(distRoot, { recursive: true });

for (const folder of staticFolders) {
  await cp(resolve(projectRoot, folder), resolve(distRoot, folder), {
    recursive: true,
    force: true,
  });
}

for (const file of staticFiles) {
  await cp(resolve(projectRoot, file), resolve(distRoot, file), {
    force: true,
  });
}

console.log(`Copied ${staticFolders.join(', ')} and ${staticFiles.join(', ')} into dist/`);
