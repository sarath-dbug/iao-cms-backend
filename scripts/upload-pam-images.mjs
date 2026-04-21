/**
 * upload-pam-images.mjs
 *
 * Uploads PAM module images that are missing from Strapi Media Library,
 * then links each uploaded file to the correct pam-module document.
 *
 * Uses only Node.js 22 built-ins (no external dependencies).
 *
 * Run from the iao-cms-backend directory:
 *   node scripts/upload-pam-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STRAPI_URL = "http://localhost:1337";
const API_TOKEN =
  "601ed8ab40f6151b3d5c897230268d38e95cb80ae1e77e1bc820a03e68d0d4bc91a3c410a0330762109ae9cfdf1659ea6c64ca7c4c1d7b56ae1dbf1bfd6595f5645b2cdcf505a6701b3d94854949a658e8ecd1605891bcafd3370c4bfc980a9287338dd910580843deddbe6f0d3ff6c95cf17ca60d2cd85956c078f83bc162e1";

// Path to the Next.js public folder with programme images
// Backend: E:\IAO-Website-Backend\iao-cms-backend
// Frontend: E:\IAO-Website-Frontend\iao-landing-website
const IMAGES_DIR = path.resolve(
  __dirname,
  "../../../IAO-Website-Frontend/iao-landing-website/public/images/programmes"
);

// Modules missing images: { documentId, imageFile }
const MISSING = [
  {
    slug: "integrale-orthomoleculaire-aanvulling-voor-osteopaten-deel-2",
    documentId: "khxuni09b17kccsnfx2afdhw",
    imageFile: "1365749374.webp",
  },
  {
    slug: "pre-recorded-webinar-integrative-and-osteopathic-approach-to-perimenopause-menopause",
    documentId: "fgzx3nwe0ykxurltt1yqfze2",
    imageFile: "ONLINE-1-e1774940597215.webp",
  },
  {
    slug: "dissectieworkshop-abdomen-en-thorax",
    documentId: "qbblxqnj8ogi2tmhdxbkloeb",
    imageFile: "dissectie-workshop-abdomen.webp",
  },
  {
    slug: "the-thorax",
    documentId: "hjduyrx33s12rfrzcz87u31u",
    imageFile: "Thorax.webp",
  },
  {
    slug: "integrale-orthomoleculaire-aanvulling-voor-osteopaten-deel-1",
    documentId: "d51euxad1injbcbhtr4klaug",
    imageFile: "1365749374.webp",
  },
];

const authHeaders = { Authorization: `Bearer ${API_TOKEN}` };

// ─── Upload a file to Strapi Media Library using Node 22 built-in fetch ──────
async function uploadFile(filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/webp" });

  const form = new FormData();
  form.append("files", blob, fileName);

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { ...authHeaders },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed for ${fileName}: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data[0];
}

// ─── Link an uploaded media file to a pam-module document ────────────────────
async function linkImageToModule(documentId, mediaId) {
  const res = await fetch(
    `${STRAPI_URL}/api/pam-modules/${documentId}?locale=nl`,
    {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { image: mediaId } }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Link failed for ${documentId}: ${res.status} ${err}`);
  }

  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Cache uploads so same file isn't uploaded twice
  const uploadCache = new Map(); // fileName → mediaId

  for (const mod of MISSING) {
    const filePath = path.join(IMAGES_DIR, mod.imageFile);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠  File not found: ${filePath} — skipping ${mod.slug}`);
      continue;
    }

    console.log(`\n📂 ${mod.slug}`);

    // 1. Upload (or reuse cached)
    let mediaId = uploadCache.get(mod.imageFile);
    if (!mediaId) {
      process.stdout.write(`   ↑ Uploading ${mod.imageFile}... `);
      const uploaded = await uploadFile(filePath, mod.imageFile);
      mediaId = uploaded.id;
      uploadCache.set(mod.imageFile, mediaId);
      console.log(`✓  id=${mediaId}  url=${uploaded.url}`);
    } else {
      console.log(`   ♻  Reusing media id=${mediaId} for ${mod.imageFile}`);
    }

    // 2. Link to module
    process.stdout.write(`   🔗 Linking to ${mod.documentId}... `);
    await linkImageToModule(mod.documentId, mediaId);
    console.log(`✓`);
  }

  console.log("\n✅  Done — all missing images uploaded and linked to modules.");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
