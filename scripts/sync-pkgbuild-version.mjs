// Sincroniza el `pkgver` del PKGBUILD de Arch con la versión de package.json y
// resetea `pkgrel=1`. Se corre en cada release (`npm run release:sync`) para que
// el paquete de Arch no quede apuntando a una versión vieja del AppImage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const pkgbuildPath = path.join(root, 'packaging/arch/PKGBUILD');

const current = fs.readFileSync(pkgbuildPath, 'utf8');
const next = current
  .replace(/^pkgver=.*$/m, `pkgver=${version}`)
  .replace(/^pkgrel=.*$/m, 'pkgrel=1');

if (next === current) {
  console.log(`PKGBUILD ya está en ${version}`);
} else {
  fs.writeFileSync(pkgbuildPath, next);
  console.log(`PKGBUILD: pkgver=${version}, pkgrel=1`);
}
