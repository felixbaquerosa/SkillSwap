/**
 * Builds premium SkillSwap app & splash icons (purple gradient + swap mark).
 * Run: node scripts/generate-icons.js
 */
const path = require('path');
const fs = require('fs');

function iconSvg(size, { withWordmark = false } = {}) {
  const r = Math.round(size * 0.22);
  const box = Math.round(size * 0.52);
  const x = Math.round((size - box) / 2);
  const y = withWordmark ? Math.round(size * 0.18) : Math.round((size - box) / 2);
  const cx = x + box / 2;
  const cy = y + box / 2;
  const arrow = Math.round(box * 0.18);

  const swapPaths = `
    <path d="M${cx - arrow * 2.2} ${cy} H${cx + arrow * 0.3} M${cx - arrow * 0.8} ${cy - arrow * 0.7} L${cx - arrow * 1.8} ${cy} L${cx - arrow * 0.8} ${cy + arrow * 0.7}"
      fill="none" stroke="#FFFFFF" stroke-width="${Math.max(4, size * 0.014)}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${cx + arrow * 2.2} ${cy} H${cx - arrow * 0.3} M${cx + arrow * 0.8} ${cy + arrow * 0.7} L${cx + arrow * 1.8} ${cy} L${cx + arrow * 0.8} ${cy - arrow * 0.7}"
      fill="none" stroke="#FFFFFF" stroke-width="${Math.max(4, size * 0.014)}" stroke-linecap="round" stroke-linejoin="round"/>
  `;

  const glow = `
    <circle cx="${cx}" cy="${cy}" r="${Math.round(box * 0.62)}" fill="#9B6DFF" opacity="0.18"/>
  `;

  const wordmark = withWordmark
    ? `
    <text x="${size / 2}" y="${y + box + size * 0.12}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${Math.round(size * 0.085)}" fill="#F4F2FF">Skill<tspan fill="#C4B5FD">Swap</tspan></text>
  `
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0A0814"/>
        <stop offset="100%" stop-color="#141022"/>
      </linearGradient>
      <linearGradient id="mark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6C4CE0"/>
        <stop offset="55%" stop-color="#9B6DFF"/>
        <stop offset="100%" stop-color="#B794FF"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    ${glow}
    <rect x="${x}" y="${y}" width="${box}" height="${box}" rx="${r}" fill="url(#mark)"/>
    ${swapPaths}
    ${wordmark}
  </svg>`;
}

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install --save-dev sharp');
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'assets', 'images');
  fs.mkdirSync(outDir, { recursive: true });

  const jobs = [
    { name: 'icon.png', size: 1024, wordmark: false },
    { name: 'android-icon-foreground.png', size: 1024, wordmark: false },
    { name: 'splash-icon.png', size: 512, wordmark: true },
    { name: 'favicon.png', size: 48, wordmark: false },
  ];

  for (const job of jobs) {
    const svg = iconSvg(job.size, { withWordmark: job.wordmark });
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, job.name));
    console.log('Wrote', job.name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
