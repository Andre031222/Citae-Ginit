const sharp  = require('sharp');
const toIco  = require('to-ico');
const fs     = require('fs');
const path   = require('path');

const PUBLIC = path.resolve(__dirname, '../public');
const SVG    = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'));

const SIZES = [16, 32, 48, 64, 180, 192, 512];

async function main() {
  // Genera todos los PNGs
  const buffers = {};
  for (const size of SIZES) {
    const buf = await sharp(SVG)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    buffers[size] = buf;
    const out = path.join(PUBLIC, `favicon-${size}x${size}.png`);
    fs.writeFileSync(out, buf);
    console.log(`  ✓ favicon-${size}x${size}.png  (${buf.length} bytes)`);
  }

  // Renombrar favicon-180 → apple-touch-icon, favicon-192/512 para manifest
  fs.copyFileSync(
    path.join(PUBLIC, 'favicon-180x180.png'),
    path.join(PUBLIC, 'apple-touch-icon.png')
  );
  fs.copyFileSync(
    path.join(PUBLIC, 'favicon-192x192.png'),
    path.join(PUBLIC, 'logo192.png')
  );
  fs.copyFileSync(
    path.join(PUBLIC, 'favicon-512x512.png'),
    path.join(PUBLIC, 'logo512.png')
  );
  console.log('  ✓ apple-touch-icon.png, logo192.png, logo512.png copiados');

  // Genera favicon.ico con 16, 32 y 48 embebidos
  const icoBuffer = await toIco([buffers[16], buffers[32], buffers[48]]);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log(`  ✓ favicon.ico (16+32+48)  (${icoBuffer.length} bytes)`);
}

main().catch(err => { console.error(err); process.exit(1); });
