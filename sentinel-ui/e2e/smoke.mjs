/**
 * Does the console actually render, and does it say only what it can back up?
 *
 * A build that compiles proves nothing about a client component that throws on
 * its first render. This drives a real browser, fails on any console error or
 * page exception, and asserts the console that exists today:
 *
 *   - the masthead, and the honesty label under it (live vs. static snapshot)
 *   - the queue, the warm palette, the typeface
 *   - a selected case: header, the five tabs, and each tab's content
 *   - the case subgraph, drawn
 *   - the pack report, including its "recorded run" disclaimer in snapshot mode
 *   - the ring screen's negative finding
 *   - the approvals overlay
 *   - the guided demo walk
 *   - no sideways scroll at laptop width
 *
 * Two modes, one suite:
 *   BASE=http://127.0.0.1:3000                          (backend-connected build)
 *   BASE=http://127.0.0.1:3000 SNAPSHOT=1               (NEXT_PUBLIC_DEMO_DATA=1)
 *
 * The browser: Playwright's bundled revision is often not the one cached on a
 * machine (this repo has been burned by exactly that — the suite could not
 * start). CHROME_PATH wins; otherwise the newest cached Chromium is used;
 * otherwise Playwright's own bundled browser.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const SNAPSHOT = process.env.SNAPSHOT === "1";
const problems = [];
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) problems.push(`${name}${detail ? `: ${detail}` : ""}`);
}

function cachedChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA ?? "", "ms-playwright")
      : join(process.env.HOME ?? "", ".cache", "ms-playwright"));
  if (!existsSync(root)) return undefined;
  const builds = readdirSync(root)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  const binary = {
    win32: join("chrome-win64", "chrome.exe"),
    darwin: join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
    linux: join("chrome-linux", "chrome"),
  }[process.platform];
  if (!binary) return undefined;
  for (const build of builds) {
    const candidate = join(root, build, binary);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

const executablePath = cachedChromium();
// `colorScheme: "dark"` on purpose: the console is a light instrument and must
// stay light whatever the viewer's OS says.
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
});

const noise = [];
page.on("console", (message) => {
  if (message.type() === "error") noise.push(message.text());
});
page.on("pageerror", (error) => noise.push(`pageerror: ${error.message}`));

const views = page.getByRole("group", { name: "Views" });
const controls = page.getByRole("group", { name: "Run controls" });
const seen = async (locator, timeout = 10000) =>
  locator.first().waitFor({ timeout }).then(() => true, () => false);

/** Click a control, reporting absence instead of throwing so one missing
 *  button does not hide the rest of the suite's findings. */
async function open(group, name, label = name) {
  const button = group.getByRole("button", { name });
  if ((await button.count()) === 0) {
    check(`${label} control present`, false, "button not found");
    return false;
  }
  await button.click();
  return true;
}

await page.goto(BASE, { waitUntil: "networkidle" });

// ── the masthead, and what it claims ─────────────────────────────────────────
check("masthead", (await page.locator("header").getByText("Sentinel", { exact: true }).count()) === 1);
check("runway rule", (await page.locator(".bg-runway").count()) === 1);
if (SNAPSHOT) {
  check(
    "labels itself a static snapshot",
    (await page.getByText(/static snapshot/).count()) > 0,
  );
} else {
  check(
    "labels its data source",
    (await page.getByText(/demo mode|live backend/).count()) > 0,
  );
}

// ── the queue ────────────────────────────────────────────────────────────────
check("queue header", await seen(page.getByText("Case queue")));
const queueRows = await page.locator("aside ul li button").count();
check("queue rows", queueRows >= 20, `${queueRows} rows`);

// ── the palette and the typeface actually applied ────────────────────────────
const bg = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
);
check("stays light under a dark OS", bg === "#f7f4ef", bg);
const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
check("Space Grotesk", /Grotesk/i.test(font), font);

// ── a selected case, and its five tabs ───────────────────────────────────────
check(
  "a case is open",
  (await page.getByText(/^CASE-\d{3}$/).count()) > 0,
);
for (const tab of ["Timeline", "Case file", "SAR", "Nemotron", "JSON"]) {
  check(
    `tab ${tab} exists`,
    (await page.locator("button", { hasText: new RegExp(`^${tab}$`) }).count()) >= 1,
  );
}

/** Click a case tab; false (and a logged FAIL above) when it is missing. */
async function openTab(label) {
  const tab = page.locator("button", { hasText: new RegExp(`^${label}$`) }).first();
  if ((await tab.count()) === 0) return false;
  await tab.click();
  return true;
}

// Case file: the conclusion plus the evidence ledger behind it.
if (await openTab("Case file")) {
  check("case file: verdict grid", await seen(page.getByText("P(fraud)")));
  check("case file: evidence ledger", await seen(page.getByText(/Evidence/)));
}

// Timeline: the backend's audit trail, one row per event.
if (await openTab("Timeline")) {
  check("timeline: audit trail", await seen(page.getByText("Audit timeline")));
  const timelineRows = await page.locator("ol li").count();
  check("timeline rows", timelineRows > 0, `${timelineRows} events`);
}

// JSON: the answer file itself, so an analyst can distrust every panel above.
if (await openTab("JSON")) {
  check("json tab: answer file", await seen(page.getByText(/"case_id"/)));
}

// ── the case subgraph, drawn ─────────────────────────────────────────────────
await open(views, "graph");
check("subgraph heading", await seen(page.getByText(/Case subgraph/)));
const nodes = await page.locator("svg g.animate-s-pop circle").count();
check("graph nodes drawn", nodes >= 3, `${nodes} nodes`);
check("focus lock ring", (await page.locator("svg circle.animate-lock").count()) >= 1);

// ── the pack report ──────────────────────────────────────────────────────────
await open(views, "pack");
check("pack heading", await seen(page.getByText("The pack, scored")));
const packRows = await page.locator("section table tbody tr").count();
check("pack lists every case", packRows >= 20, `${packRows} rows`);
check(
  "pack shows measured latency",
  (await page.getByText(/^\d+\.\ds$/).count()) >= 1,
);
if (SNAPSHOT) {
  // Issue #8: the committed report is a keyed LLM run. A static build must not
  // let a reader mistake these numbers for this page's own response times.
  check(
    "pack labels the run as recorded",
    (await page.getByText(/Recorded run, replayed from the snapshot/).count()) > 0,
  );
}

// ── the ring screen states the absence ───────────────────────────────────────
await open(views, "ring");
check("ring heading", await seen(page.getByText("Ring discovery")));
check("ring states the missing capability", await seen(page.getByText("Not available in this API")));

// ── the approvals overlay ────────────────────────────────────────────────────
await open(controls, "inbox");
const dialog = page.getByRole("dialog", { name: "Approvals inbox" });
check("approvals overlay opens", await seen(dialog));
await page.getByRole("button", { name: /close/i }).click().catch(() => {});
check("approvals overlay closes", await dialog.waitFor({ state: "hidden", timeout: 5000 }).then(() => true, () => false));

// ── the guided demo walks the queue ─────────────────────────────────────────
await open(views, "case");
await open(controls, "demo");
check("demo starts", await seen(page.getByText("ACT I"), 5000));
await open(controls, "stop");
check("demo stops", (await controls.getByRole("button", { name: "demo" }).count()) === 1);

// ── laptop width must not scroll sideways ───────────────────────────────────
await page.setViewportSize({ width: 1100, height: 900 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(() => {
  const el = document.documentElement;
  return el.scrollWidth - el.clientWidth;
});
check("no sideways scroll at 1100px", overflow <= 1, `${overflow}px`);

check("no console errors", noise.length === 0, noise.slice(0, 4).join(" | "));

await browser.close();

for (const { name, ok, detail } of results) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
}
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
if (executablePath) console.log(`browser: ${executablePath}`);
process.exit(problems.length === 0 ? 0 : 1);
