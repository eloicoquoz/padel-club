// Audit visuel mobile : toutes les pages, 3 langues, 2 formats. Détecte le débordement horizontal.
import { chromium, devices } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = "/tmp/audit";
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];

const formats = [
  { name: "iphone", ...devices["iPhone 14"] },
  { name: "android-narrow", viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];
const pages = ["/", "/ranking", "/match/new", "/history", "/history?all=1", "/sessions", "/sessions/new", "/challenges", "/challenges/new", "/americano", "/americano/new", "/profile"];

for (const f of formats) {
  const { name, ...opts } = f;
  const ctx = await browser.newContext({ ...opts, locale: "fr-CH" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${name} pageerror: ${e.message}`));
  await page.goto(BASE + "/login");
  await page.fill("#email", "eloi@gotteron.ch");
  await page.fill("#password", "padel1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/");
  // ids dynamiques
  const ids = await page.evaluate(() => Array.from(document.querySelectorAll("a[href^='/match/']")).map((a) => a.getAttribute("href")).filter((h) => h !== "/match/new"));
  const sess = await (async () => {
    await page.goto(BASE + "/sessions");
    return page.evaluate(() => Array.from(document.querySelectorAll("a[href^='/sessions/']")).map((a) => a.getAttribute("href")).filter((h) => h !== "/sessions/new")[0]);
  })();
  const amer = await (async () => {
    await page.goto(BASE + "/americano");
    return page.evaluate(() => Array.from(document.querySelectorAll("a[href^='/americano/']")).map((a) => a.getAttribute("href")).filter((h) => h !== "/americano/new")[0]);
  })();
  const all = [...pages, ids[0], sess, amer].filter(Boolean);
  for (const lang of ["fr", "de", "en"]) {
    // changer la langue via le profil
    await page.goto(BASE + "/profile");
    await page.evaluate((l) => { [...document.querySelectorAll("form button")].find((b) => b.textContent.trim().toLowerCase() === l)?.click(); }, lang);
    await page.evaluate(() => document.querySelector("form button[type=submit]")?.click());
    await page.waitForTimeout(800);
    for (const p of all) {
      await page.goto(BASE + p);
      await page.waitForTimeout(500);
      const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (sw.sw > sw.cw + 1) problems.push(`${name} ${lang} ${p}: overflow horizontal ${sw.sw}>${sw.cw}`);
      const file = `${out}/${name}-${lang}-${p.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`;
      await page.screenshot({ path: file, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
console.log("Problems:", problems.length);
for (const p of problems) console.log(" -", p);
