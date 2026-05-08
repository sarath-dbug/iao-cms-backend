import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createStrapi } = require("@strapi/strapi");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = process.env.PROGRAMME_EXPORTS_DIR
  ? path.resolve(process.env.PROGRAMME_EXPORTS_DIR)
  : path.resolve(__dirname, "strapi-exports");
const CAMPUS_UID = "api::programme-campus.programme-campus";

const COMPONENT_JOIN_TABLE = "programme_campuses_components";
const TRACK_GROUP_COMPONENT_JOIN_TABLE = "components_programme_track_groups_components";

const HERO_META = { field: "hero", component_type: "programme.hero", table: "components_programme_heroes" };
const TRACK_GROUP_META = {
  field: "track_groups",
  component_type: "programme.track-group",
  table: "components_programme_track_groups",
};
const LECTURERS_META = {
  field: "lecturers_section",
  component_type: "programme.lecturers-section",
  table: "components_programme_lecturers_sections",
};
const PRACTICAL_META = {
  field: "practical_items",
  component_type: "programme.practical-item",
  table: "components_programme_practical_items",
};
const LOCATION_META = {
  field: "location_info",
  component_type: "shared.location",
  table: "components_shared_locations",
};

function loadEnvFile(relPath) {
  const envPath = path.resolve(__dirname, "..", relPath);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function asObj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function joinTextBlocks(parts) {
  return parts.map(clean).filter(Boolean).join("\n\n").trim();
}

function joinNonEmpty(parts) {
  return parts.map((v) => clean(v)).filter(Boolean).join("\n\n").trim();
}

function markdownList(items) {
  const rows = Array.isArray(items) ? items.map((x) => clean(x)).filter(Boolean) : [];
  if (!rows.length) return "";
  return rows.map((x) => `- ${x}`).join("\n");
}

function toTrackItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((it) =>
      typeof it === "string"
        ? { title: it.trim(), schedule: "" }
        : {
            title: clean(asObj(it).title),
            schedule: clean(asObj(it).schedule ?? asObj(it).date ?? ""),
          }
    )
    .filter((it) => it.title || it.schedule);
}

/** Legacy JSON shape: content.tracks (lateral / multi-track campuses). */
function normalizeTrackGroupsFromTracks(tracks) {
  if (!tracks || typeof tracks !== "object") return [];

  const groupDefs = [
    { titleKey: "track_alumni", y1: "alumni_year1", y2: "alumni_year2" },
    { titleKey: "track_external", y1: "external_year1", y2: "external_year2" },
    { titleKey: "track_lecturer", y1: "lecturer_year1", y2: "lecturer_year2" },
  ];

  const year1Title = clean(tracks.year_1) || "Year 1";
  const year2Title = clean(tracks.year_2) || "Year 2";

  return groupDefs
    .map((def) => ({
      track_title: clean(tracks[def.titleKey]),
      year_1_title: year1Title,
      year_2_title: year2Title,
      year_1_items: toTrackItems(tracks[def.y1]),
      year_2_items: toTrackItems(tracks[def.y2]),
    }))
    .filter((g) => g.track_title || g.year_1_items.length || g.year_2_items.length);
}

/** Narrative body from export content_overrides.content (curriculum + flexible + lateral teaser + intro paragraphs). */
function buildCampusBodyMarkdown(content) {
  const c = asObj(content);
  const introNode = c.intro;
  let introText = "";
  if (typeof introNode === "string") introText = clean(introNode);
  else if (introNode && typeof introNode === "object") {
    introText = joinNonEmpty([introNode.paragraph_1, introNode.paragraph_2, introNode.paragraph_3]);
  }

  const curriculum = asObj(c.curriculum);
  const curriculumParts = [];
  if (clean(curriculum.title)) curriculumParts.push(`## ${clean(curriculum.title)}`);
  if (clean(curriculum.intro_line)) curriculumParts.push(curriculum.intro_line);
  if (Array.isArray(curriculum.items)) {
    for (const it of curriculum.items) {
      const o = asObj(it);
      const t = clean(o.title);
      const d = clean(o.description);
      if (t || d) curriculumParts.push(`- **${t}** ${d}`.trim());
    }
  }
  if (clean(curriculum.paragraph)) curriculumParts.push(curriculum.paragraph);
  if (clean(curriculum.paragraph_2)) curriculumParts.push(curriculum.paragraph_2);
  const curriculumMd = curriculumParts.filter(Boolean).join("\n\n");

  const flexible = asObj(c.flexible_study);
  const flexibleMd = joinNonEmpty([
    flexible.title ? `## ${clean(flexible.title)}` : "",
    flexible.description,
    flexible.paragraph_1,
    flexible.paragraph_2,
  ]);

  const lateral = asObj(c.lateral_entry);
  const lateralSentence = [
    lateral.emphasis || lateral.bold,
    lateral.before,
    lateral.label ? `[${clean(lateral.label)}](${clean(lateral.href) || "#"})` : "",
    lateral.after,
  ]
    .map((v) => clean(v))
    .filter(Boolean)
    .join(" ");

  return joinNonEmpty([introText, curriculumMd, flexibleMd, lateralSentence]);
}

/** Export practical.{ price, duration, … } → rows for programme.practical-row */
function normalizePracticalObject(practical) {
  if (!practical || typeof practical !== "object") return [];
  const out = [];

  for (const [key, val] of Object.entries(practical)) {
    if (key === "location") continue;
    if (!val || typeof val !== "object") continue;

    const label = clean(val.label) || key;
    const valueParts = [];
    if (typeof val.value === "string" && val.value.trim()) valueParts.push(val.value.trim());
    if (Array.isArray(val.items) && val.items.length) valueParts.push(markdownList(val.items));
    const value = valueParts.filter(Boolean).join("\n\n");

    const notes = [];
    if (typeof val.included === "string" && val.included.trim()) notes.push(val.included.trim());
    if (typeof val.footnote === "string" && val.footnote.trim()) notes.push(val.footnote.trim());
    const note = notes.join("\n\n");

    if (label || value || note) out.push({ label, value, note });
  }

  return out;
}

/** Export modules: [{ year, items: [{ title, date }] }] → single normal module_section */
function mapLegacyModulesArrayToModuleSections(modules) {
  if (!Array.isArray(modules) || !modules.length) return [];

  const years = modules
    .map((yr) => {
      const rawItems = asArray(asObj(yr).items);
      const items = rawItems.map((it, idx) => {
        const o = typeof it === "string" ? { title: it } : asObj(it);
        const titleOnly = clean(o.title);
        const numbered =
          titleOnly && titleOnly.length ? `Module ${idx + 1} – ${titleOnly}` : titleOnly;
        return {
          title: numbered,
          schedule: clean(o.date ?? o.schedule ?? ""),
          note: "",
        };
      });

      return {
        year_title: clean(asObj(yr).year),
        items: items.filter((item) => item.title || item.schedule),
      };
    })
    .filter((y) => y.year_title || y.items.length);

  if (!years.length) return [];

  return [
    {
      title: "",
      display_mode: "normal",
      years,
      tabs: [],
    },
  ];
}

function parseMaybeJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function normalizeTrackItem(row) {
  const r = asObj(row);
  return {
    title: clean(r.title),
    schedule: clean(r.schedule),
    note: "",
  };
}

function mapTrackGroupToYears(group, year1Items = [], year2Items = []) {
  const g = asObj(group);
  const years = [];
  const year1Title = clean(g.year_1_title);
  const year2Title = clean(g.year_2_title);

  if (year1Title || year1Items.length) {
    years.push({
      year_title: year1Title,
      items: year1Items.map(normalizeTrackItem).filter((item) => item.title || item.schedule || item.note),
    });
  }

  if (year2Title || year2Items.length) {
    years.push({
      year_title: year2Title,
      items: year2Items.map(normalizeTrackItem).filter((item) => item.title || item.schedule || item.note),
    });
  }

  return years;
}

function mapTrackGroupsToModuleSections(trackGroups) {
  if (!trackGroups.length) return [];

  if (trackGroups.length > 1) {
    const tabs = trackGroups.map((group) => ({
      tab_label: clean(group.track_title || group.year_1_title || "Track"),
      years: mapTrackGroupToYears(group, group.year_1_items || [], group.year_2_items || []),
    }));

    return [
      {
        title: "",
        display_mode: "tabbed",
        years: [],
        tabs,
      },
    ];
  }

  const only = trackGroups[0];
  return [
    {
      title: clean(only.track_title),
      display_mode: "normal",
      years: mapTrackGroupToYears(only, only.year_1_items || [], only.year_2_items || []),
      tabs: [],
    },
  ];
}

function mapPracticalRows(practicalItems) {
  return practicalItems
    .map((item) => ({
      label: clean(item.label),
      value: clean(item.value),
      note: clean(item.note),
    }))
    .filter((row) => row.label || row.value || row.note);
}

function mapLecturers(lecturersSection) {
  if (!lecturersSection) return "";
  const text = clean(lecturersSection.text);
  const before = clean(lecturersSection.link_before);
  const label = clean(lecturersSection.link_label);
  const after = clean(lecturersSection.link_after);
  const inline = [before, label ? `**${label}**` : "", after].filter(Boolean).join(" ").trim();
  return joinTextBlocks([text, inline]);
}

function mapLocation(location) {
  if (!location) return null;
  const mapped = {
    label: clean(location.label),
    campus: clean(location.campus),
    address: clean(location.address),
    map_embed: clean(location.map_embed),
    search_link: clean(location.search_link || location.map_search),
  };
  return Object.values(mapped).some(Boolean) ? mapped : null;
}

/** True when campus already has the fields we import from backup (skip unless --force). */
function campusDataLooksComplete(entry) {
  if (!clean(entry.content)) return false;
  if (!(entry.module_sections || []).length) return false;
  if (!(entry.practical_rows || []).length) return false;
  const loc = entry.location_info;
  if (!loc || typeof loc !== "object") return false;
  if (!(clean(loc.campus) || clean(loc.address) || clean(loc.map_embed))) return false;
  return true;
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const stack = [dirPath];
  while (stack.length) {
    const dir = stack.pop();
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) stack.push(full);
      else if (item.isFile()) out.push(full);
    }
  }
  return out;
}

function collectCampusExports() {
  const byDocLocale = new Map();
  if (!fs.existsSync(EXPORTS_DIR)) return byDocLocale;

  const files = listFilesRecursive(EXPORTS_DIR).filter((f) => f.toLowerCase().includes("programme-campus") && f.endsWith(".json"));
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      continue;
    }
    const rows = Array.isArray(parsed?.data) ? parsed.data : asArray(parsed);
    for (const item of rows) {
      const obj = asObj(item?.data || item);
      const documentId = obj.document_id || obj.documentId;
      const locale = obj.locale || asObj(parsed?.meta).locale || "en";
      if (!documentId) continue;
      byDocLocale.set(`${documentId}:${locale}`, obj);
    }
  }

  return byDocLocale;
}

async function fetchSingleComponent(db, entityId, meta) {
  const relation = await db(COMPONENT_JOIN_TABLE)
    .select(["component_id"])
    .where({ entity_id: entityId, field: meta.field, component_type: meta.component_type })
    .orderBy("id", "asc")
    .first();

  if (!relation?.component_id) return null;
  return db(meta.table).select("*").where({ id: relation.component_id }).first();
}

async function fetchRepeatableComponents(db, entityId, meta) {
  const relations = await db(COMPONENT_JOIN_TABLE)
    .select(["component_id"])
    .where({ entity_id: entityId, field: meta.field, component_type: meta.component_type })
    .orderBy("order", "asc")
    .orderBy("id", "asc");

  if (!relations.length) return [];
  const ids = relations.map((r) => r.component_id).filter(Boolean);
  if (!ids.length) return [];

  const rows = await db(meta.table).select("*").whereIn("id", ids);
  const rowMap = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => rowMap.get(id)).filter(Boolean);
}

async function fetchTrackItemsForGroup(db, trackGroupId, field) {
  const relations = await db(TRACK_GROUP_COMPONENT_JOIN_TABLE)
    .select(["component_id"])
    .where({ entity_id: trackGroupId, field, component_type: "programme.track-item" })
    .orderBy("order", "asc")
    .orderBy("id", "asc");

  if (!relations.length) return [];
  const ids = relations.map((r) => r.component_id).filter(Boolean);
  if (!ids.length) return [];

  const rows = await db("components_programme_track_items").select("*").whereIn("id", ids);
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

async function loadLegacyCampusFromDb(db, row) {
  const hero = await fetchSingleComponent(db, row.id, HERO_META);
  const trackGroups = await fetchRepeatableComponents(db, row.id, TRACK_GROUP_META);
  const lecturersSection = await fetchSingleComponent(db, row.id, LECTURERS_META);
  const practicalItems = await fetchRepeatableComponents(db, row.id, PRACTICAL_META);
  const locationInfo = await fetchSingleComponent(db, row.id, LOCATION_META);

  const trackGroupsWithItems = [];
  for (const group of trackGroups) {
    const year1Items = await fetchTrackItemsForGroup(db, group.id, "year_1_items");
    const year2Items = await fetchTrackItemsForGroup(db, group.id, "year_2_items");
    trackGroupsWithItems.push({
      ...group,
      year_1_items: year1Items,
      year_2_items: year2Items,
    });
  }

  return {
    hero,
    content_intro: clean(row.content_intro),
    track_groups: trackGroupsWithItems,
    legacy_modules: [],
    lecturers_section: lecturersSection,
    practical_items: practicalItems,
    location_info: locationInfo,
    modules_title: clean(row.modules_title),
    breadcrumb_label: clean(row.breadcrumb_label),
  };
}

function emptyLegacyShape() {
  return {
    hero: null,
    content_intro: "",
    track_groups: [],
    legacy_modules: [],
    lecturers_section: null,
    practical_items: [],
    location_info: null,
    modules_title: "",
    breadcrumb_label: "",
  };
}

/**
 * Parse scripts/strapi-exports programme-campuses-*.json rows (content_overrides JSON shape).
 */
function loadLegacyCampusFallback(exportRow) {
  const row = asObj(exportRow);
  const overrides = parseMaybeJson(row.content_overrides) || asObj(row.content_overrides);
  const content = asObj(overrides.content);
  const practical = asObj(overrides.practical);

  const track_groups = normalizeTrackGroupsFromTracks(content.tracks);
  const legacy_modules = Array.isArray(overrides.modules) ? overrides.modules : [];

  const content_intro = buildCampusBodyMarkdown(content);

  const lecturers_section = asObj(overrides.lecturers_section || overrides.lecturers);
  const practical_items = normalizePracticalObject(practical);
  const rawLoc = practical.location || overrides.location_info || {};
  const location_info = mapLocation(rawLoc);

  return {
    hero: asObj(overrides.hero),
    content_intro,
    track_groups,
    legacy_modules,
    lecturers_section,
    practical_items,
    location_info,
    modules_title: clean(overrides.modules_title),
    breadcrumb_label: clean(asObj(overrides.breadcrumb).campus || overrides.breadcrumb_label),
  };
}

async function main() {
  loadEnvFile(".env");
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const fallbackExports = collectCampusExports();

  const strapi = await createStrapi();
  await strapi.load();
  const db = strapi.db.connection;

  const rows = await db("programme_campuses").select("*").orderBy("id", "asc");

  let inspected = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nprogramme-campus -> simplified migration (${dryRun ? "DRY RUN" : "APPLY"})`);
  console.log(`force: ${force ? "on" : "off"}`);
  console.log(`fallback exports: ${fs.existsSync(EXPORTS_DIR) ? "enabled" : "not found"}`);

  for (const row of rows) {
    inspected += 1;
    const documentId = row.document_id;
    const locale = row.locale || "en";
    const marker = `${documentId || row.id}/${locale}`;

    if (!documentId) {
      skipped += 1;
      console.log(`- skip ${marker} (missing document_id)`);
      continue;
    }

    try {
      const entry = await strapi.documents(CAMPUS_UID).findOne({
        documentId,
        locale,
        populate: ["module_sections", "practical_rows", "location_info", "programme"],
      });

      if (!entry) {
        skipped += 1;
        console.log(`- skip ${marker} (document not found)`);
        continue;
      }

      if (!force && campusDataLooksComplete(entry)) {
        skipped += 1;
        console.log(`- skip ${marker} (already complete)`);
        continue;
      }

      const fbRow = fallbackExports.get(`${documentId}:${locale}`);
      let legacy = emptyLegacyShape();

      if (fbRow) {
        legacy = loadLegacyCampusFallback(fbRow);
      } else {
        try {
          legacy = await loadLegacyCampusFromDb(db, row);
        } catch {
          legacy = emptyLegacyShape();
        }
      }

      const hero = asObj(legacy.hero);
      let moduleSections = mapTrackGroupsToModuleSections(legacy.track_groups || []);
      if (!moduleSections.length && legacy.legacy_modules?.length) {
        moduleSections = mapLegacyModulesArrayToModuleSections(legacy.legacy_modules);
      }
      const practicalRows = mapPracticalRows(legacy.practical_items || []);
      const lecturers = mapLecturers(legacy.lecturers_section);
      const locationInfo = mapLocation(legacy.location_info);

      const content = joinTextBlocks([legacy.content_intro]);
      const intro = clean(hero.intro);

      const payload = {
        title: clean(hero.title) || clean(entry.title) || clean(row.campus_slug),
        subtitle: clean(hero.subtitle),
        intro,
        content,
        cta: clean(hero.cta),
        register_link: clean(hero.form_src),
        modules_title: clean(legacy.modules_title || row.modules_title),
        module_sections: moduleSections,
        practical_rows: practicalRows,
        lecturers,
        location_info: locationInfo,
        breadcrumb_label: clean(legacy.breadcrumb_label || row.breadcrumb_label),
      };

      if (dryRun) {
        updated += 1;
        console.log(`- dry-run ${marker}`);
        continue;
      }

      await strapi.documents(CAMPUS_UID).update({
        documentId,
        locale,
        data: payload,
      });

      updated += 1;
      console.log(`- updated ${marker}`);
    } catch (error) {
      failed += 1;
      console.error(`- failed ${marker}: ${error.message}`);
    }
  }

  try {
    await strapi.destroy();
  } catch (err) {
    console.warn(`Strapi shutdown warning: ${err.message}`);
  }

  console.log("\nSummary");
  console.log(`  inspected: ${inspected}`);
  console.log(`  updated:   ${updated}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  failed:    ${failed}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
