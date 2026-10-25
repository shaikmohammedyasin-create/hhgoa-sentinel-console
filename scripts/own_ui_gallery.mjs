/**
 * own-ui gallery + feature-parity check.
 * Drives the OWN-UI fallback console (served by the backend's frontend mount)
 * through every view and case tab, asserts the seven parity features:
 *   1) Nemotron proposal panel          4) Ask box with served_by label
 *   2) agree/overruled pill + reason    5) graph canvas with nodes
 *   3) narrative + SAR document         6) approvals inbox decision rows
 *   7) served_by provenance labels on the advisory
 * and captures one screenshot per view/tab into docs/images/own-ui/.
 * Exits 1 on any failure. Usage: node own_ui_gallery.mjs BASE_URL
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://127.0.0.1:8008";
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = join(HERE, "..", "docs", "images", "own-ui");
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

function cachedChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const systemCandidates = process.platform === "win32" ? [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ] : [];
  for (const sc of systemCandidates) if (existsSync(sc)) return sc;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
      : join(process.env.HOME ?? "", ".cache", "ms-playwright"));
  if (!existsSync(root)) return undefined;
  const builds = readdirSync(root)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  if (builds.length === 0) return undefined;
  const candidate = join(root, builds[0], "chrome-win64", "chrome.exe");
  return existsSync(candidate) ? candidate : undefined;
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
};
const shots = [];
async function shot(page, name) {
  const file = join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  shots.push(`${name}.png`);
}

const browser = await chromium.launch(
  cachedChromium() ? { executablePath: cachedChromium() } : {}
);
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const noise = [];
page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));

try {
  // ── 1. Queue view ────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("table tbody tr", { timeout: 20000 });
  const rows = await page.locator("table tbody tr").count();
  check("queue view renders case rows", rows >= 20, `${rows} rows`);
  await shot(page, "01-queue");

  // ── 2. Select CASE-009, Dossier hero with the three labeled numbers ───────
  await page.evaluate(() => {
    window.selectCase("CASE-009");
    window.switchView("case");
  });
  await page.waitForFunction(
    () => document.getElementById("caseHeroTriggerAmt")?.textContent !== "—",
    null, { timeout: 15000 }
  );
  const trigAmt = (await page.textContent("#caseHeroTriggerAmt"))?.trim();
  const exposure = (await page.textContent("#caseHeroExposure"))?.trim();
  const exposureLabel = (await page.textContent("#caseHeroExposureLabel"))?.trim();
  const prob = (await page.textContent("#caseHeroProb"))?.trim();
  check("CASE-009 trigger amount labeled", trigAmt === "$14.50", trigAmt);
  check("CASE-009 exposure money", exposure === "$23.51", exposure);
  check("CASE-009 exposure ring-labeled", exposureLabel === "Ring Exposure", exposureLabel);
  check("CASE-009 fraud probability", prob === "0.775", prob);
  await page.screenshot({ path: join(SHOT_DIR, "02-casehero-numbers.png") });
  shots.push("02-casehero-numbers.png");

  // ── 3. Overview tab ──────────────────────────────────────────────────────
  check("overview summary present", ((await page.textContent("#caseSummaryText")) || "").length > 40);
  await shot(page, "03-overview");

  // ── 4. Nemotron advisory tab (proposal + pill + provenance) ───────────────
  await page.evaluate(() => document.querySelector('[data-casetab="casetabNemotron"]')?.click());
  await page.waitForTimeout(400);
  const advisory = (await page.textContent("#nemotronAdvisoryContent")) || "";
  check("nemotron proposal panel", /PROPOSED PATTERN|NEMOTRON PROPOSAL/i.test(advisory));
  check(
    "agree or overruled badge present",
    /AGREE|Overruled|obligatory|binding policy/i.test(advisory),
  );
  if (/OVERRULED/i.test(advisory)) {
    check("overrule reason stated", /R\d|policy|pattern|engine/i.test(advisory));
  }
  check(
    "served_by provenance line",
    (await page.textContent("#viewCaseFile"))?.includes("cached live run"),
  );
  await shot(page, "04-nemotron-advisory");

  // ── 5. SAR + narrative tab ───────────────────────────────────────────────
  await page.evaluate(() => document.querySelector('[data-casetab="casetabSar"]')?.click());
  await page.waitForTimeout(300);
  const sarText = (await page.textContent("#persistenceContent")) || "";
  check("SAR document rendered", /Suspicious Activity Report|FinCEN/i.test(sarText));
  check("narrative paragraph populated", (sarText.length ?? 0) > 500, String(sarText.length));
  await shot(page, "05-sar-narrative");

  // ── 6. Graph canvas tab ──────────────────────────────────────────────────
  await page.evaluate(() => document.querySelector('[data-casetab="casetabGraph"]')?.click());
  await page.waitForTimeout(700);
  const graphParts = await page.evaluate(() => {
    const canvas = document.getElementById("caseGraphCanvas");
    return { present: !!canvas, w: canvas?.clientWidth ?? 0 };
  });
  check("graph canvas present", graphParts.present && graphParts.w > 100);
  await shot(page, "06-graph");

  // ── 7. Evidence + timeline tabs (screenshot only) ────────────────────────
  await page.evaluate(() => document.querySelector('[data-casetab="casetabEvidence"]')?.click());
  await page.waitForTimeout(300);
  check("evidence list populated", (await page.locator("#evidenceList > *").count()) > 0);
  await shot(page, "07-evidence");

  // ── 8. Ask box with served_by labels ─────────────────────────────────────
  await page.evaluate(() => document.querySelector('[data-casetab="casetabNemotron"]')?.click());
  await page.waitForTimeout(300);
  await page.fill("#caseAskInput", "What evidence supports this verdict?");
  await page.click("#btnAskCase");
  await page.waitForFunction(
    () => (document.getElementById("caseAskAnswer")?.textContent || "").includes("Served by"),
    null, { timeout: 30000 }
  );
  const askText = (await page.textContent("#caseAskAnswer")) || "";
  check("ask box answered", askText.trim().length > 60);
  check("ask answered labelled", /Served by: \S/.test(askText), askText.slice(0, 120));
  await page.screenshot({ path: join(SHOT_DIR, "08-ask.png") });
  shots.push("08-ask.png");

  // ── 9. Approvals inbox ───────────────────────────────────────────────────
  await page.evaluate(() => window.switchView("approvals"));
  await page.waitForTimeout(600);
  const approvalsBody = (await page.textContent("#viewApprovals")) || "";
  check("approvals inbox renders", /APPROVAL|Decision/i.test(approvalsBody));
  await page.screenshot({ path: join(SHOT_DIR, "09-approvals.png") });
  shots.push("09-approvals.png");

  // ── 10. Insights (benchmark validation) view ─────────────────────────────
  await page.evaluate(() => window.switchView("insights"));
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(SHOT_DIR, "10-insights.png") });
  shots.push("10-insights.png");

  // ── 11. Live view ──────────────────────────────────────────────────────
  await page.evaluate(() => window.switchView("live"));
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(SHOT_DIR, "11-live.png") });
  shots.push("11-live.png");
} catch (err) {
  check("flow completes", false, String(err).slice(0, 200));
}

for (const r of results) console.log(r);
if (noise.length) {
  console.log("console noise:");
  for (const n of noise.slice(0, 5)) console.log(`  ${n}`);
}
await browser.close();

const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`${results.length - failed}/${results.length} parity checks passed`);
console.log(`screenshots: ${shots.join(", ")}`);
process.exit(failed > 0 ? 1 : 0);
