/**
 * fix-broken-formats.mjs
 *
 * Some files were uploaded via the Strapi API during the previous session.
 * The API ran sharp optimization, created a `formats` JSON (with large/medium/small/thumbnail
 * variant URLs), but the actual variant files were NEVER saved to disk because the Windows
 * EBUSY error killed the request before the files were moved.
 *
 * This script:
 * 1. Finds files that have a non-null `formats` JSON
 * 2. Checks whether the variant files actually exist on disk
 * 3. If they DON'T exist, nullifies the `formats` column so Strapi only
 *    serves the original file (which does exist and returns 200)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../public/uploads");

const client = new pg.Client({
  host: "localhost", port: 5432, user: "postgres", password: "1234", database: "iao_db",
});

await client.connect();
console.log("✓ Connected to PostgreSQL\n");

// Get all files that have a formats JSON
const res = await client.query(
  "SELECT id, name, url, formats FROM files WHERE formats IS NOT NULL ORDER BY id"
);

let fixed = 0;
for (const row of res.rows) {
  const formats = row.formats;
  const brokenVariants = [];

  for (const [key, fmt] of Object.entries(formats)) {
    if (!fmt?.url) continue;
    // fmt.url is like /uploads/large_xxx.webp
    const filename = path.basename(fmt.url);
    const filepath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      brokenVariants.push(`${key}: ${filename}`);
    }
  }

  if (brokenVariants.length > 0) {
    console.log(`\n🔧 File id=${row.id}  ${row.name}`);
    console.log(`   Missing variants: ${brokenVariants.join(", ")}`);
    await client.query("UPDATE files SET formats = NULL WHERE id = $1", [row.id]);
    console.log(`   ✓ Cleared formats column`);
    fixed++;
  }
}

await client.end();
console.log(`\n✅ Done — fixed ${fixed} file record(s) with missing variant files.`);
