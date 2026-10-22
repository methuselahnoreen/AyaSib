// One-off smoke test for the /api/ocr route. Renders a text image with sharp and posts it.
// Usage: node scripts/ocr-smoke.mjs [baseUrl]
import sharp from "sharp";

const base = process.argv[2] || "http://localhost:3000";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="260">
  <rect width="100%" height="100%" fill="white"/>
  <text x="30" y="60" font-family="Arial" font-size="30" fill="black">REPUBLIC OF THE PHILIPPINES</text>
  <text x="30" y="110" font-family="Arial" font-size="30" fill="black">Barangay Clearance</text>
  <text x="30" y="160" font-family="Arial" font-size="24" fill="black">This certifies that the resident</text>
  <text x="30" y="200" font-family="Arial" font-size="24" fill="black">has no pending case on record.</text>
</svg>`;

const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
console.log("image bytes:", jpeg.length);

const form = new FormData();
form.append("image", new Blob([jpeg], { type: "image/jpeg" }), "photo.jpg");

const res = await fetch(`${base}/api/ocr`, { method: "POST", body: form });
console.log("status:", res.status);
const text = await res.text();
console.log("body:", text.slice(0, 2000));
