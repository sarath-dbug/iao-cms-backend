import pg from "pg";
const c = new pg.Client({ host: "localhost", user: "postgres", password: "1234", database: "iao_db", port: 5432 });
await c.connect();
const slugs = [
  "auffrischungskurs-zervikal",
  "ugo-programme-de-specialite-osteopathique-en-uro-gyneco-obstetrique-et-sante-de-la-femme",
  "atelier-de-dissection-de-labdomen-et-thorax",
  "thorax-et-rachis-le-lien-mecanique-osteopathique-lmo",
  "dissection-workshop-abdominal-and-thorax",
];
const r = await c.query(
  "SELECT DISTINCT slug, document_id FROM pam_modules WHERE slug = ANY($1::text[])",
  [slugs]
);
r.rows.forEach((row) => console.log(row.slug, "->", row.document_id));
await c.end();
