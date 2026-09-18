/* ------------------------------------------------------------------
   export:qr — builds the printable trail signage.

   Outputs into docs/qr/:
     · trail-qr-codes.csv          for any external label/print run
     · trail-signs.html            12 print-ready A4 signs, open and Ctrl+P
     · svg/<slug>.svg              one QR per stop, for the designers

   Usage:  npm run export:qr  [-- --base https://your-domain]
   ------------------------------------------------------------------ */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedData } from "../frontend/src/content/seed/data.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../docs/qr");
const svgDir = resolve(outDir, "svg");

const baseArg = process.argv.indexOf("--base");
const BASE =
  (baseArg > -1 ? process.argv[baseArg + 1] : null) ??
  process.env.VITE_PUBLIC_BASE_URL ??
  "https://indrajatra.newaguthi.org.au";

let QRCode = null;
try {
  QRCode = (await import("qrcode")).default;
} catch {
  console.warn(
    "\n  ! 'qrcode' is not installed, so the signs will be generated without images.\n" +
    "    Run  npm i -D qrcode  once, then re-run this script.\n"
  );
}

mkdirSync(svgDir, { recursive: true });

// Newa Guthi Victoria logo, inlined so a sign prints correctly from anywhere.
let logoDataUri = "";
try {
  const logo = readFileSync(resolve(here, "../frontend/public/brand/ngv-logo.png"));
  logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;
} catch {
  console.warn("  ! brand/ngv-logo.png not found — signs will print without the logo.");
}

const stops = seedData.trailPoints.map((point) => ({
  number: point.number,
  slug: point.slug,
  title: point.title.en,
  native: point.nativeName ?? "",
  code: point.qrCodes[0],
  url: `${BASE}/scan/${point.qrCodes[0]}`,
  location: seedData.locations.find((l) => l.id === point.locationId)?.name.en ?? "",
  review: point.reviewStatus
}));

/* ---------- CSV ---------- */

const csv = [
  "number,stop,code,target_url,place_on_site,review_status",
  ...stops.map((s) =>
    [s.number, `"${s.title}"`, s.code, s.url, `"${s.location}"`, s.review].join(",")
  )
].join("\n");
writeFileSync(resolve(outDir, "trail-qr-codes.csv"), csv + "\n");

/* ---------- SVG per stop ---------- */

const svgs = {};
if (QRCode) {
  for (const stop of stops) {
    const svg = await QRCode.toString(stop.url, {
      type: "svg",
      errorCorrectionLevel: "H", // survives a scuffed, rained-on sign
      margin: 1,
      color: { dark: "#16100E", light: "#FFFFFF" }
    });
    svgs[stop.slug] = svg;
    writeFileSync(resolve(svgDir, `${stop.slug}.svg`), svg);
  }
}

/* ---------- Printable signs ---------- */

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const signs = stops
  .map(
    (s) => `
  <section class="sign">
    <header>
      <span class="num">${s.number}</span>
      <span class="brand">Yenya Cultural Trail<small>Indra Jatra &mdash; Yenya Punhi Melbourne 2026</small></span>
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="Newa Guthi Victoria">` : ""}
    </header>
    <h1>${esc(s.title)}</h1>
    ${s.native ? `<p class="native">${esc(s.native)}</p>` : ""}
    <div class="qr">${svgs[s.slug] ?? `<div class="qr-missing">QR for<br><code>${esc(s.url)}</code></div>`}</div>
    <p class="cta">Point your camera here for the story</p>
    <footer>
      <span>${esc(s.location)}</span>
      <span>newaguthi.org.au</span>
    </footer>
  </section>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>Yenya Cultural Trail — printable signs</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: #E8E2D6;
    font-family: "Plus Jakarta Sans", -apple-system, system-ui, sans-serif;
    color: #16100E;
  }
  .note {
    padding: 20px 24px; background: #16100E; color: #fff; font-size: 14px; line-height: 1.5;
  }
  .note b { color: #F4B63C; }
  .sign {
    width: 210mm; height: 297mm; margin: 0 auto;
    padding: 24mm 20mm; background: #FBF7F0;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    page-break-after: always; break-after: page;
    border-bottom: 1px dashed #bbb;
  }
  header {
    width: 100%; display: flex; align-items: center; gap: 10mm;
    padding-bottom: 6mm; border-bottom: 2px solid #B4251C;
  }
  .num {
    width: 22mm; height: 22mm; flex: 0 0 auto; display: grid; place-items: center;
    background: #B4251C; color: #fff; border: 2px solid #E79C13; border-radius: 50%;
    font-size: 40pt; font-weight: 800; line-height: 1;
  }
  .brand {
    display: grid; text-align: left; font-size: 17pt; font-weight: 800;
    letter-spacing: -.01em; line-height: 1.15;
  }
  .brand small { font-size: 11pt; font-weight: 600; color: #6E5C53; letter-spacing: .02em; }
  .logo { margin-left: auto; height: 26mm; width: auto; }
  h1 {
    margin: 16mm 0 0; font-family: "Iowan Old Style", Georgia, serif;
    font-size: 40pt; line-height: 1.04; font-weight: 600; max-width: 15ch;
  }
  .native { margin: 4mm 0 0; font-size: 22pt; color: #B4251C; }
  .qr { margin: auto 0; width: 92mm; height: 92mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .qr-missing {
    width: 100%; height: 100%; display: grid; place-items: center; padding: 8mm;
    border: 3px dashed #B4251C; font-size: 11pt; word-break: break-all;
  }
  .cta { margin: 0 0 auto; font-size: 17pt; font-weight: 700; color: #6E5C53; }
  footer {
    width: 100%; margin-top: 10mm; padding-top: 5mm; border-top: 1px solid #D9CCB8;
    display: flex; justify-content: space-between; font-size: 11pt; color: #6E5C53;
  }
  @media print { .note { display: none; } .sign { border: 0; } }
</style>
</head>
<body>
<div class="note">
  <b>Print setup:</b> A4 portrait, margins &ldquo;None&rdquo;, background graphics ON, scale 100%.
  One sign per page, ${stops.length} pages. Laminate or sleeve them — this event is outdoors in spring.
  Codes point at <b>${esc(BASE)}</b>; regenerate with
  <code>npm run export:qr -- --base https://your-domain</code> if that changes.
</div>
${signs}
</body>
</html>`;

writeFileSync(resolve(outDir, "trail-signs.html"), html);

console.log(`QR export complete → docs/qr/`);
console.log(`  trail-qr-codes.csv   ${stops.length} rows`);
console.log(`  trail-signs.html     ${stops.length} printable A4 signs`);
console.log(`  svg/                 ${QRCode ? `${stops.length} QR files` : "skipped (qrcode not installed)"}`);
console.log(`  base URL             ${BASE}`);
