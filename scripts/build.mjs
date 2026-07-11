/* Build step for Netlify (and runnable by hand: `node scripts/build.mjs`).
 *
 *  1. copy spanish-teacher.html  ->  pwa/index.html
 *  2. stamp pwa/sw.js VERSION with the commit sha, so every deploy busts the cache
 *
 * These are exactly the two steps that used to be done by hand before dragging the folder
 * onto Netlify, and exactly the two steps that were easy to forget.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "spanish-teacher.html");
const out = join(root, "pwa", "index.html");
const swPath = join(root, "pwa", "sw.js");

// 1. publish the single-file app as the PWA's index
const html = readFileSync(src, "utf8");
writeFileSync(out, html);

// 2. cache-bust the service worker. COMMIT_REF is injected by Netlify; fall back to a
//    timestamp for local runs so a hand-built folder is still unambiguous.
const stamp = (process.env.COMMIT_REF || "").slice(0, 7) || `local-${Date.now().toString(36)}`;
const sw = readFileSync(swPath, "utf8");
const stamped = sw.replace(/const VERSION = "[^"]*";/, `const VERSION = "aprende-${stamp}";`);
if (stamped === sw) {
  console.error("build: could not find the VERSION line in pwa/sw.js — refusing to ship a stale cache");
  process.exit(1);
}
writeFileSync(swPath, stamped);

console.log(`build: pwa/index.html <- spanish-teacher.html (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`build: sw.js VERSION = aprende-${stamp}`);
