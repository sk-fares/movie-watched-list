const fs = require("fs");
const zlib = require("zlib");

function makePng(width, height) {
  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Play triangle bounds: centered slightly to right
      const triLeft = cx - width * 0.12;
      const triRight = cx + width * 0.20;
      const triHeight = width * 0.32;
      const inTriX = x >= triLeft && x <= triRight;
      const relX = (x - triLeft) / (triRight - triLeft);
      const halfH = (1 - relX) * (triHeight / 2);
      const inTriangle = inTriX && Math.abs(y - cy) <= halfH;

      if (inTriangle) {
        // Crisp white play arrow
        raw[pxOffset] = 255;
        raw[pxOffset + 1] = 255;
        raw[pxOffset + 2] = 255;
        raw[pxOffset + 3] = 255;
      } else {
        // Deep vibrant cinema purple background
        const t = y / height;
        raw[pxOffset] = Math.round(124 - t * 30); // 124 to 94
        raw[pxOffset + 1] = Math.round(58 - t * 25); // 58 to 33
        raw[pxOffset + 2] = Math.round(237 - t * 40); // 237 to 197
        raw[pxOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
}

if (!fs.existsSync("public")) {
  fs.mkdirSync("public", { recursive: true });
}

fs.writeFileSync("public/icon-192.png", makePng(192, 192));
fs.writeFileSync("public/icon-512.png", makePng(512, 512));
fs.writeFileSync("public/apple-touch-icon.png", makePng(180, 180));
console.log("PWA Icons created successfully in public/!");
