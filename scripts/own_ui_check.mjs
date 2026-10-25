/**
 * own-ui branch fallback console check.
 * Node script against the own-ui branch's static-cms fallback UI, which rides
 * on the backend of that frontend (own-ui mounts `frontend/` at /).
 * Usage: node own_ui_check.mjs BASE_URL   (BASE_URL must be the backend's
 * frontend mount; it answers / and /api/investigations/{id} from the answer
 * files recorded in cases/).
 */
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:8777";

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
  const binary = join("chrome-win64", "chrome.exe");
  const candidate = join(root, builds[0], binary);
  return existsSync(candidate) ? candidate : undefined;
}

const executPath = cachedChromium();
const browser = await chromium.launch(executPath ? { executablePath: executPath } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const noise = [];
page.on("console", (m) => { if (m.type() === "error") noise.push(m.text()); });
page.on("pageerror", (e) => noise.push(`pageerror: ${e.message}`));

const results = [];
const check = (name, ok) => results.push(`${ok ? "ok  " : "FAIL"} ${name}`);

try {
  const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
  check(`page loads (HTTP ${resp.status()})`, resp.ok());
  const title = await page.title();
  check(`title "${title}"`, title.length > 0);
  const body = await page.textContent("body");
  check("body renders content", body.trim().length > 50);
  check("case rows/list present", (await page.locator("table tbody tr, li, .case, [data-case]").count()) > 0);
} catch (err) {
  check("page navigates", false, String(err).slice(0, 200));
}

for (const r of results) console.log(r);
if (noise.length) {
  console.log("console noise:");
  for (const n of noise.slice(0, 5)) console.log(`  ${n}`);
}
await browser.close();

const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`${results.length - failed}/${results.length} checks passed, ${noise.length} console errors`);
process.exit(failed > 0 ? 1 : 0);
