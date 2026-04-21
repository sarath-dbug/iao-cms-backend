import pg from "pg";
const { Client } = pg;

const c = new Client({
  host: "localhost",
  user: "postgres",
  password: "1234",
  database: "iao_db",
  port: 5432,
});

await c.connect();

// files_related_mph structure and a sample pam link
const r1 = await c.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='files_related_mph' ORDER BY ordinal_position"
);
console.log("=== files_related_mph columns ===");
r1.rows.forEach((r) => console.log(" ", r.column_name));

const r2 = await c.query("SELECT * FROM files_related_mph WHERE file_id=40");
console.log("\n=== morphs for file_id=40 ===");
console.log(r2.rows);

// pam_modules columns
const r3 = await c.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='pam_modules' ORDER BY ordinal_position"
);
console.log("\n=== pam_modules columns ===");
r3.rows.forEach((r) => console.log(" ", r.column_name));

await c.end();
