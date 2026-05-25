const path = require('path');
const fs = require('fs');
const sharp = require('./node_modules/sharp');

const outputDir = path.join(__dirname, 'icons');
fs.mkdirSync(outputDir, { recursive: true });

const svgNormal = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#0f0f0f"/>
  <text x="256" y="256" font-size="300" text-anchor="middle" dominant-baseline="middle" fill="#c9f542" font-family="sans-serif" font-weight="bold">€</text>
</svg>`);

const svgMaskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0f0f0f"/>
  <text x="256" y="256" font-size="260" text-anchor="middle" dominant-baseline="middle" fill="#c9f542" font-family="sans-serif" font-weight="bold">€</text>
</svg>`);

Promise.all([
  sharp(svgNormal).resize(512, 512).png().toFile(path.join(outputDir, 'icon-512.png')),
  sharp(svgNormal).resize(192, 192).png().toFile(path.join(outputDir, 'icon-192.png')),
  sharp(svgMaskable).resize(512, 512).png().toFile(path.join(outputDir, 'icon-512-maskable.png')),
]).then(() => console.log('OK: icons/icon-192.png, icons/icon-512.png, icons/icon-512-maskable.png'))
  .catch(e => console.error('Errore:', e.message));
