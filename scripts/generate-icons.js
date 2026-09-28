// Script para generar iconos PWA desde SVG
// Requiere: npm install sharp
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = readFileSync(join(__dirname, "../public/icons/icon.svg"));

async function generate() {
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(__dirname, `../public/icons/icon-${size}.png`));
    console.log(`✓ icon-${size}.png generado`);
  }
  console.log("\n✅ Todos los iconos generados correctamente");
}

generate().catch(console.error);
