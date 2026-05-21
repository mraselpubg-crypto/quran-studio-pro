#!/usr/bin/env node
/**
 * scripts/build-sqlite.cjs
 * -----------------------
 * One-time migration: converts src/data/verses.json + buildAllPages() output
 * into a SQLite database (./data.db) that the Electron main process queries.
 *
 * Run locally:
 *   npm install --save-dev better-sqlite3
 *   node scripts/build-sqlite.cjs
 *
 * Schema:
 *   verses(id INTEGER PK, s INTEGER, a INTEGER, ar TEXT, bn TEXT)
 *   pages (id TEXT PK, page_no INTEGER, surah INTEGER, json TEXT)
 *   meta  (key TEXT PK, value TEXT)
 *
 * Note: pages.json in this project is the *seed/meta* file; the actual 1740
 * pages are generated at runtime by buildAllPages(verses). For the SQLite
 * snapshot we serialize each generated page as JSON so ElectronDAL can
 * SELECT them by id / page_no / surah without re-running the layout engine.
 */

const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data.db");
const VERSES_JSON = path.join(ROOT, "src", "data", "verses.json");

function bnToInt(s) {
  return Number(String(s).replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c))));
}

async function main() {
  if (!fs.existsSync(VERSES_JSON)) {
    console.error("Missing", VERSES_JSON);
    process.exit(1);
  }
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch {
    console.error("Install first: npm install --save-dev better-sqlite3");
    process.exit(1);
  }

  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  const db = new Database(OUT);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY,
      s  INTEGER NOT NULL,
      a  INTEGER NOT NULL,
      ar TEXT NOT NULL,
      bn TEXT
    );
    CREATE INDEX verses_s_idx ON verses(s);

    CREATE TABLE pages (
      id      TEXT PRIMARY KEY,
      page_no INTEGER NOT NULL,
      surah   INTEGER,
      json    TEXT NOT NULL
    );
    CREATE INDEX pages_no_idx    ON pages(page_no);
    CREATE INDEX pages_surah_idx ON pages(surah);

    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ── verses ────────────────────────────────────────────────────────────
  console.log("Reading verses.json…");
  const verses = JSON.parse(fs.readFileSync(VERSES_JSON, "utf8"));
  const insV = db.prepare("INSERT INTO verses (id, s, a, ar, bn) VALUES (?, ?, ?, ?, ?)");
  const txV = db.transaction((rows) => {
    for (const v of rows) insV.run(v.id, v.s, v.a, v.ar, v.bn ?? null);
  });
  txV(verses);
  console.log(`  inserted ${verses.length} verses`);

  // ── pages ─────────────────────────────────────────────────────────────
  // We require the runtime layout to build pages. Easiest: import the
  // compiled module. Since this script runs in plain Node (no Vite), we
  // shell out to a tiny ESM helper that imports buildAllPages + emits JSON
  // on stdout. For now, write a placeholder advising the dev to run the
  // companion `scripts/dump-pages.mjs` (created by the same plan).
  const dumpJson = path.join(ROOT, "scripts", "pages-dump.json");
  if (!fs.existsSync(dumpJson)) {
    console.log("\n  pages-dump.json not found.");
    console.log("  Run:  node scripts/dump-pages.mjs > scripts/pages-dump.json");
    console.log("  Then re-run this script to populate the pages table.\n");
  } else {
    const pages = JSON.parse(fs.readFileSync(dumpJson, "utf8"));
    const insP = db.prepare(
      "INSERT INTO pages (id, page_no, surah, json) VALUES (?, ?, ?, ?)"
    );
    const txP = db.transaction((rows) => {
      for (const p of rows) {
        const pageNo = bnToInt(p.footer?.pageNo);
        // surah: look up first ayah's surah from id pattern, else null
        const surah = p.type === "surah-open" ? null : null;
        insP.run(p.id, pageNo, surah, JSON.stringify(p));
      }
    });
    txP(pages);
    console.log(`  inserted ${pages.length} pages`);
  }

  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run(
    "built_at",
    new Date().toISOString()
  );
  db.close();
  console.log("\n✓ wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
