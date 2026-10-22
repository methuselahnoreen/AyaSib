// Builds src/data/kb.json and src/data/glossary.json from ../kb/*.yaml and ../glossary/glossary.json.
// Runs automatically before `dev` and `build`. If the source folders are missing (for example on a
// host that only checks out ./frontend), the committed JSON files are kept as they are.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const out = path.resolve(here, "..", "src", "data");
fs.mkdirSync(out, { recursive: true });

const str = (v) => {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return Object.values(v).map(str).filter(Boolean).join(" - ");
  return String(v).trim();
};
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : []);

function syncKb() {
  const dir = path.join(root, "kb");
  if (!fs.existsSync(dir)) {
    console.warn("[sync] ../kb not found; keeping existing src/data/kb.json");
    return;
  }
  const entries = [];
  for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/i.test(x)).sort()) {
    let doc;
    try {
      doc = YAML.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      console.warn(`[sync] skipping ${f}: invalid YAML (${String(e.message).split("\n")[0]})`);
      continue;
    }
    if (!doc || typeof doc !== "object") {
      console.warn(`[sync] skipping ${f}: empty or not a YAML mapping`);
      continue;
    }
    const id = str(doc.id) || f.replace(/\.ya?ml$/i, "");
    const entry = {
      id,
      name_en: str(doc.name_en ?? doc.name ?? doc.title) || id,
      name_ceb: str(doc.name_ceb),
      locality: str(doc.locality),
      who_may_avail: str(doc.who_may_avail),
      scope_note: str(doc.scope_note),
      requirements: list(doc.requirements),
      requirements_note: str(doc.requirements_note),
      steps: list(doc.steps),
      fee: str(doc.fee),
      office: str(doc.office),
      processing_time: str(doc.processing_time),
      source_title: str(doc.source_title),
      source_url: str(doc.source_url),
      last_verified: str(doc.last_verified),
      notes: str(doc.notes),
      // Curated, hand-reviewed Cebuano shown to users. The model never writes these.
      summary_ceb: str(doc.summary_ceb),
      requirements_ceb: list(doc.requirements_ceb),
      requirements_note_ceb: str(doc.requirements_note_ceb),
      steps_ceb: list(doc.steps_ceb),
      office_ceb: str(doc.office_ceb),
      fee_ceb: str(doc.fee_ceb),
      processing_time_ceb: str(doc.processing_time_ceb),
    };
    if (!entry.source_url || !entry.last_verified) {
      console.warn(`[sync] ${f}: missing source_url or last_verified, so it will never be used to answer`);
    }
    entries.push(entry);
  }
  fs.writeFileSync(path.join(out, "kb.json"), JSON.stringify(entries, null, 2) + "\n");
  console.log(`[sync] ${entries.length} KB entries`);
}

function syncGlossary() {
  const file = path.join(root, "glossary", "glossary.json");
  if (!fs.existsSync(file)) {
    console.warn("[sync] ../glossary/glossary.json not found; keeping existing src/data/glossary.json");
    return;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.warn(`[sync] glossary.json is not valid JSON (${e.message}); keeping existing file`);
    return;
  }
  const terms = (Array.isArray(data) ? data : [])
    .filter((t) => t && typeof t === "object" && str(t.ceb) && (str(t.en) || str(t.fil)))
    .map((t) => ({ en: str(t.en), fil: str(t.fil), ceb: str(t.ceb), needs_review: Boolean(t.needs_review) }));
  fs.writeFileSync(path.join(out, "glossary.json"), JSON.stringify(terms, null, 2) + "\n");
  console.log(`[sync] ${terms.length} glossary terms`);
}

syncKb();
syncGlossary();
