#!/usr/bin/env node
/**
 * scripts/dump-pages.mjs
 * Runs the in-app layout engine in Node and writes the full 1740 pages
 * as JSON to stdout. Pipe into scripts/pages-dump.json then run
 * scripts/build-sqlite.cjs to populate the pages table.
 *
 * Usage:
 *   node scripts/dump-pages.mjs > scripts/pages-dump.json
 *
 * Note: requires the project to be built or run with tsx/vite-node so
 * the TypeScript imports resolve. Simplest:
 *   npx tsx scripts/dump-pages.mjs > scripts/pages-dump.json
 */

import { loadAllVerses, buildAllPages } from "../src/data/pages.ts";

await loadAllVerses();
const pages = buildAllPages();
process.stdout.write(JSON.stringify(pages));
process.stderr.write(`\n✓ dumped ${pages.length} pages\n`);
