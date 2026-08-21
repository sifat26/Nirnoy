// Generates the raster social/icon assets from inline SVG sources.
//
//   npm run assets:og      (defined in package.json)
//   # or: node scripts/generate-og.mjs
//
// Outputs (git-tracked, served from the site root by Vite/Vercel):
//   public/og.png               1200x630  — OpenGraph / Twitter share card
//   public/apple-touch-icon.png  180x180  — iOS home-screen icon
//
// Text uses Arial/sans-serif (present on the build machine) — Bengali is kept
// out of the raster to avoid missing-glyph boxes; the HTML meta carries it.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#059669"/>
      <stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="100" y="190" width="150" height="150" rx="32" fill="#ffffff"/>
  <text x="175" y="300" font-family="Arial, sans-serif" font-size="112" font-weight="700" fill="#059669" text-anchor="middle">N</text>
  <text x="290" y="292" font-family="Arial, sans-serif" font-size="130" font-weight="700" fill="#ffffff">Nirnoy</text>
  <text x="294" y="356" font-family="Arial, sans-serif" font-size="46" font-weight="400" fill="#d1fae5">Free online MCQ practice exams</text>
  <text x="294" y="414" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#a7f3d0">SSC · HSC · Job Preparation</text>
  <text x="100" y="558" font-family="Arial, sans-serif" font-size="34" font-weight="400" fill="#ffffff" fill-opacity="0.85">nirnoy.vercel.app</text>
</svg>`;

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#059669"/>
  <text x="90" y="128" font-family="Arial, sans-serif" font-size="118" font-weight="700" fill="#ffffff" text-anchor="middle">N</text>
</svg>`;

async function render(svg, out, width, height) {
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(join(publicDir, out));
  console.log(`wrote public/${out} (${width}x${height})`);
}

await render(OG_SVG, 'og.png', 1200, 630);
await render(ICON_SVG, 'apple-touch-icon.png', 180, 180);
