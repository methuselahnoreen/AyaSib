import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
// KB_DIR override (env) lets tests point at fixture directories; defaults to the real kb/ folder.
const KB_DIR = process.env.KB_DIR ? path.resolve(process.env.KB_DIR) : path.resolve(here, "../../kb");

const REQUIRED_TEXT = ["id", "name_en", "locality", "summary_ceb", "source_title", "source_url"];
const NULLABLE_TEXT = ["office", "fee", "processing_time"];
const OPTIONAL = ["name_ceb", "who_may_avail", "requirements_note", "requirements_note_ceb", "scope_note", "source_pages", "steps", "steps_ceb", "office_ceb", "fee_ceb", "processing_time_ceb", "next_step", "next_step_ceb", "related", "review_status", "review_due"];
const KNOWN = new Set([...REQUIRED_TEXT, ...NULLABLE_TEXT, ...OPTIONAL, "requirements", "requirements_ceb", "last_verified"]);

const isText = (v) => typeof v === "string" && v.trim() !== "";

function toDateString(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

function isRealDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkFile(file, text) {
  const errors = [];
  const warnings = [];
  let doc;

  try {
    doc = load(text);
  } catch (e) {
    return { errors: [`not valid YAML: ${e.message.split("\n")[0]}`], warnings, doc: null };
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { errors: ["file must contain key: value pairs"], warnings, doc: null };
  }

  for (const key of REQUIRED_TEXT) {
    if (!isText(doc[key])) errors.push(`${key} is missing or empty`);
  }
  for (const key of NULLABLE_TEXT) {
    if (!(key in doc)) errors.push(`${key} is missing (write null if it is unknown)`);
    else if (doc[key] !== null && !isText(doc[key])) errors.push(`${key} must be text or null`);
  }

  if (isText(doc.id)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(doc.id)) errors.push("id must be lowercase words joined by hyphens");
    const stem = file.replace(/\.ya?ml$/i, "");
    if (doc.id !== stem) errors.push(`id "${doc.id}" must match the file name "${stem}"`);
  }

  if (!Array.isArray(doc.requirements) || doc.requirements.length === 0 || !doc.requirements.every(isText)) {
    errors.push("requirements must be a non-empty list of text");
  }

  if (!Array.isArray(doc.requirements_ceb) || doc.requirements_ceb.length === 0 || !doc.requirements_ceb.every(isText)) {
    errors.push("requirements_ceb must be a non-empty list of Cebuano text");
  } else if (Array.isArray(doc.requirements) && doc.requirements_ceb.length !== doc.requirements.length) {
    errors.push("requirements_ceb must have the same number of items as requirements");
  }

  if (Array.isArray(doc.steps) && (!Array.isArray(doc.steps_ceb) || doc.steps_ceb.length !== doc.steps.length)) {
    errors.push("steps_ceb must have the same number of items as steps");
  }

  if (isText(doc.source_url)) {
    const url = doc.source_url.trim();
    if (/todo/i.test(url)) {
      errors.push("source_url is still a placeholder (TODO)");
    } else {
      try {
        const u = new URL(url);
        if (u.protocol !== "https:") errors.push("source_url must start with https://");
        if (/(^|\.)example\.(com|org|gov\.ph)$/i.test(u.hostname)) {
          errors.push("source_url is an example address, not a real source");
        }
      } catch {
        errors.push("source_url is not a valid web address");
      }
    }
  }

  const date = toDateString(doc.last_verified);
  if (!date || !isRealDate(date)) {
    errors.push("last_verified must be a real date like 2026-10-14");
  } else {
    const limit = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (date > limit) errors.push(`last_verified (${date}) is in the future`);
  }

  // Feature: ayasib-andam-na — optional additive fields, checked only when present.
  if ("next_step" in doc && !isText(doc.next_step)) errors.push("next_step must be non-empty text");
  if ("next_step_ceb" in doc && !isText(doc.next_step_ceb)) errors.push("next_step_ceb must be non-empty text");
  if ("related" in doc) {
    const idRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!Array.isArray(doc.related) || !doc.related.every((r) => typeof r === "string" && idRe.test(r))) {
      errors.push("related must be a list of lowercase-hyphenated ids");
    }
  }
  if ("review_status" in doc && !["verified", "needs_review", "unconfirmed"].includes(doc.review_status)) {
    errors.push("review_status must be one of: verified, needs_review, unconfirmed");
  }
  if ("review_due" in doc) {
    const due = toDateString(doc.review_due);
    if (!due || !isRealDate(due)) errors.push("review_due must be a real date like 2026-10-14");
  }

  // Duplicate-normalized requirements: two items that normalize equal would share one stored
  // checklist state. Same normalization the app's requirementKey uses: trim + collapse whitespace,
  // preserve case and punctuation. Checked independently for requirements and requirements_ceb.
  const normReq = (s) => String(s).trim().replace(/\s+/g, " ");
  for (const field of ["requirements", "requirements_ceb"]) {
    if (!Array.isArray(doc[field])) continue;
    const seen = new Set();
    let dup = false;
    for (const item of doc[field]) {
      const n = normReq(item);
      if (seen.has(n)) {
        dup = true;
        break;
      }
      seen.add(n);
    }
    if (dup) errors.push(`${field} contains duplicate items after normalization`);
  }

  for (const key of Object.keys(doc)) {
    if (!KNOWN.has(key)) warnings.push(`unknown field "${key}" (typo?)`);
  }

  return { errors, warnings, doc };
}

const files = fs.existsSync(KB_DIR)
  ? fs.readdirSync(KB_DIR).filter((f) => /\.ya?ml$/i.test(f)).sort()
  : [];

if (files.length === 0) {
  console.error(`No .yaml files found in ${KB_DIR}`);
  process.exit(1);
}

let failed = 0;
const passed = [];
const seenIds = new Map();

for (const file of files) {
  const text = fs.readFileSync(path.join(KB_DIR, file), "utf8");
  const { errors, warnings, doc } = checkFile(file, text);

  if (doc && isText(doc.id)) {
    if (seenIds.has(doc.id)) errors.push(`id "${doc.id}" is already used by ${seenIds.get(doc.id)}`);
    else seenIds.set(doc.id, file);
  }

  if (errors.length === 0) {
    console.log(`OK    kb/${file}`);
    passed.push({ file, doc });
  } else {
    failed += 1;
    console.log(`FAIL  kb/${file}`);
    for (const e of errors) console.log(`        - ${e}`);
  }
  for (const w of warnings) console.log(`        ! warning: ${w}`);
}

// Feature: ayasib-andam-na — second pass: every `related` id must resolve to a validated entry.
// Runs only over files that passed their own checks, using the collected id set.
const validIds = new Set(passed.map(({ doc }) => doc.id).filter((id) => typeof id === "string"));
for (const { file, doc } of passed) {
  const rels = Array.isArray(doc.related) ? doc.related : [];
  const unresolved = rels.filter((rid) => !validIds.has(rid));
  if (unresolved.length > 0) {
    failed += 1;
    console.log(`FAIL  kb/${file}`);
    for (const rid of unresolved) console.log(`        - related id "${rid}" does not resolve to a validated entry`);
  }
}

console.log(`\n${files.length - failed} of ${files.length} files passed`);

if (process.argv.includes("--write")) {
  const out = path.resolve(here, "../data/kb.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const services = passed.map(({ doc }) => ({ ...doc, last_verified: toDateString(doc.last_verified) }));
  fs.writeFileSync(out, JSON.stringify(services, null, 2) + "\n");
  console.log(`Wrote ${services.length} services to backend/data/kb.json (${failed} skipped)`);
  process.exit(0);
}

process.exit(failed > 0 ? 1 : 0);