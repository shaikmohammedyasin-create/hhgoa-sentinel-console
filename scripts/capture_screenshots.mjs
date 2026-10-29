import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "screenshots");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function findBrowserExe() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const exe of candidates) {
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const exe = findBrowserExe();
const browser = await chromium.launch({
  headless: true,
  executablePath: exe,
});

const context = await browser.newContext({
  viewport: { width: 1536, height: 1024 },
  deviceScaleFactor: 1,
});

const page = await context.newPage();
const BASE = "http://localhost:3000";

console.log("Navigating to", BASE);
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const views = page.locator("nav").first();
const controls = page.locator("header nav").last();

async function openView(name) {
  const btn = page.locator("button", { hasText: new RegExp(`^${name}$`, "i") }).first();
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(1000);
  }
}

async function openTab(name) {
  const btn = page.locator("button", { hasText: new RegExp(`^${name}$`, "i") }).first();
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(800);
  }
}

// Select a completed case, e.g. CASE-014 or first case with FRAUD
console.log("Selecting case...");
await page.waitForSelector("aside ul li button", { timeout: 15000 }).catch(() => {});
const fraudCaseBtn = page.locator("aside ul li button", { hasText: "CASE-014" }).first();
if (await fraudCaseBtn.count() > 0) {
  await fraudCaseBtn.click();
} else {
  await page.locator("aside ul li button").first().click();
}
await page.waitForTimeout(1500);

// 1. Subgraph / Ring view
console.log("Capturing 01_case_overview_ring.png...");
await openView("GRAPH");
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT_DIR, "01_case_overview_ring.png") });

// Return to Case view
await openView("CASE");
await page.waitForTimeout(1000);

// 2. Risk breakdown & Bayesian channels
console.log("Capturing 03_risk_breakdown.png...");
await openTab("Case file");
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT_DIR, "03_risk_breakdown.png") });

// 3. Evidence cards with provenance
console.log("Capturing 02_evidence_cards.png...");
await page.evaluate(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTop = 420;
  else window.scrollBy(0, 420);
});
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT_DIR, "02_evidence_cards.png") });
await page.evaluate(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTop = 0;
  else window.scrollTo(0, 0);
});
await page.waitForTimeout(500);

// 4. Nemotron proposal with policy engine agree/override badge
console.log("Capturing 04_nemotron_advisory.png...");
await openTab("Nemotron");
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT_DIR, "04_nemotron_advisory.png") });

// 5. Narrative and audit-grounded SAR draft
console.log("Capturing 05_sar_narrative.png...");
await openTab("SAR");
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT_DIR, "05_sar_narrative.png") });

// 6. Analyst Q&A box
console.log("Capturing 06_analyst_qa.png...");
await openTab("Case file");
await page.waitForTimeout(800);
const qaInput = page.locator('input[placeholder*="Ask the analyst"]');
if (await qaInput.count() > 0) {
  await qaInput.scrollIntoViewIfNeeded();
  await qaInput.fill("What evidence links this case to card testing?");
  const askBtn = page.getByRole("button", { name: "Ask" });
  if (await askBtn.count() > 0) {
    await askBtn.click();
    await page.waitForTimeout(3000);
  }
}
await page.screenshot({ path: path.join(OUT_DIR, "06_analyst_qa.png") });

// 7. Approvals queue
console.log("Capturing 07_approvals_queue.png...");
const inboxBtn = page.locator("button", { hasText: /inbox/i }).first();
if (await inboxBtn.count() > 0) {
  await inboxBtn.click();
  await page.waitForTimeout(1000);
}
await page.screenshot({ path: path.join(OUT_DIR, "07_approvals_queue.png") });

console.log("All 7 screenshots updated successfully!");
await browser.close();
