/**
 * seed-pam-images.mjs
 *
 * Directly copies images into Strapi's uploads folder and inserts the
 * corresponding database records — bypassing the upload API to avoid
 * the Windows EBUSY temp-file locking bug.
 *
 * Run from iao-cms-backend:
 *   node scripts/seed-pam-images.mjs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import pg from "pg";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1234",
  database: "iao_db",
};

const UPLOADS_DIR = path.resolve(__dirname, "../public/uploads");
const IMAGES_DIR = path.resolve(
  __dirname,
  "../../../IAO-Website-Frontend/iao-landing-website/public/images/programmes"
);

// Modules missing images with their document_ids and source image files
const MISSING = [
  // NL modules (previously fixed)
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
  // DE module
  {
    slug: "auffrischungskurs-zervikal",
    documentId: "gtmkkv8gf146ltl0v9neidvk",
    imageFile: "Cervicaal.webp",
  },
  // FR modules
  {
    slug: "ugo-programme-de-specialite-osteopathique-en-uro-gyneco-obstetrique-et-sante-de-la-femme",
    documentId: "di31x7s1etuywojmy6qql21k",
    imageFile: "thumbnail_image.webp",
  },
  {
    slug: "atelier-de-dissection-de-labdomen-et-thorax",
    documentId: "f1xr5bipteksliltvujs3zl7",
    imageFile: "dissectie-workshop-abdomen.webp",
  },
  {
    slug: "thorax-et-rachis-le-lien-mecanique-osteopathique-lmo",
    documentId: "wm2v4tpaf6u6xrvzai7p4pjo",
    imageFile: "LMO.webp",
  },
  // EN module
  {
    slug: "dissection-workshop-abdominal-and-thorax",
    documentId: "vsmu6vozhoz54b7zm4l9dh3h",
    imageFile: "dissectie-workshop-abdomen.webp",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateHash(filename) {
  return crypto.createHash("md5").update(filename + Date.now()).digest("hex").slice(0, 10);
}

function sanitizeName(name) {
  // Strapi sanitizes names by replacing special chars with underscores
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
}

function generateDocumentId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getImageDimensions(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width || 0, height: meta.height || 0 };
  } catch {
    return { width: 0, height: 0 };
  }
}

function getFileSizeKB(filePath) {
  return Math.round((fs.statSync(filePath).size / 1024) * 100) / 100;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const client = new pg.Client(DB);
await client.connect();
console.log("✓ Connected to PostgreSQL\n");

// Cache: imageFile → { fileId, hash } — so we don't copy/insert the same image twice
const fileCache = new Map();

for (const mod of MISSING) {
  const srcPath = path.join(IMAGES_DIR, mod.imageFile);

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠  File not found: ${srcPath} — skipping ${mod.slug}`);
    continue;
  }

  console.log(`\n📂 ${mod.slug}`);

  // ── Step 1: Copy file to uploads and insert files record ─────────────────
  let fileId = fileCache.get(mod.imageFile);

  if (!fileId) {
    const ext = path.extname(mod.imageFile); // .webp
    const baseName = path.basename(mod.imageFile, ext); // e.g. "Thorax"
    const hash = sanitizeName(baseName) + "_" + generateHash(mod.imageFile);
    const destFilename = `${hash}${ext}`;
    const destPath = path.join(UPLOADS_DIR, destFilename);

    // Copy file
    fs.copyFileSync(srcPath, destPath);
    console.log(`   📋 Copied → uploads/${destFilename}`);

    const { width, height } = await getImageDimensions(srcPath);
    const sizeKB = getFileSizeKB(srcPath);
    const docId = generateDocumentId();
    const now = new Date().toISOString();

    const inserted = await client.query(
      `INSERT INTO files
        (document_id, name, alternative_text, caption, focal_point, width, height,
         formats, hash, ext, mime, size, url, preview_url, provider, provider_metadata,
         folder_path, created_at, updated_at, published_at, created_by_id, updated_by_id, locale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING id`,
      [
        docId,
        mod.imageFile,          // name
        null,                   // alternative_text
        null,                   // caption
        null,                   // focal_point
        width,
        height,
        null,                   // formats (no thumbnails generated)
        hash,
        ext,
        "image/webp",
        sizeKB,
        `/uploads/${destFilename}`,
        null,                   // preview_url
        "local",
        null,                   // provider_metadata
        "/1",                   // folder_path (default upload folder)
        now,
        now,
        now,
        null,                   // created_by_id
        null,                   // updated_by_id
        null,                   // locale
      ]
    );

    fileId = inserted.rows[0].id;
    fileCache.set(mod.imageFile, fileId);
    console.log(`   ✓ Inserted files record → id=${fileId} (${width}×${height}, ${sizeKB}KB)`);
  } else {
    console.log(`   ♻  Reusing file id=${fileId} for ${mod.imageFile}`);
  }

  // ── Step 2: Get all pam_module row ids for this document ─────────────────
  const rowsRes = await client.query(
    "SELECT id FROM pam_modules WHERE document_id=$1",
    [mod.documentId]
  );

  if (rowsRes.rows.length === 0) {
    console.warn(`   ⚠  No pam_module rows found for documentId=${mod.documentId}`);
    continue;
  }

  console.log(`   Found ${rowsRes.rows.length} locale row(s) in pam_modules`);

  // ── Step 3: Insert morph links for each locale row ───────────────────────
  for (const row of rowsRes.rows) {
    // Check if a link already exists
    const existing = await client.query(
      "SELECT id FROM files_related_mph WHERE related_id=$1 AND related_type=$2 AND field=$3",
      [row.id, "api::pam-module.pam-module", "image"]
    );

    if (existing.rows.length > 0) {
      // Update existing link to point to new file
      await client.query(
        "UPDATE files_related_mph SET file_id=$1 WHERE id=$2",
        [fileId, existing.rows[0].id]
      );
      console.log(`   🔗 Updated morph link for pam_module row id=${row.id}`);
    } else {
      // Insert new link
      await client.query(
        `INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
         VALUES ($1, $2, $3, $4, $5)`,
        [fileId, row.id, "api::pam-module.pam-module", "image", 1]
      );
      console.log(`   🔗 Inserted morph link for pam_module row id=${row.id}`);
    }
  }
}

await client.end();
console.log("\n✅  Done — all missing images are now in Strapi's Media Library and linked to their modules.");
console.log("ℹ   Note: The images have no thumbnail variants since optimization was bypassed.");
console.log("    You can regenerate thumbnails by re-uploading images through the Strapi admin panel if needed.");
