// Smoke test de bout en bout contre un serveur local (npm run dev) avec la base seedée.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shots = "/tmp/shots";
fs.mkdirSync(shots, { recursive: true });
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: "fr-CH" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});
page.on("response", (r) => {
  if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`);
});

const step = async (name, fn) => {
  try {
    await fn();
    console.log("✓", name);
  } catch (e) {
    console.log("✗", name, "-", e.message);
    errors.push(`${name}: ${e.message}`);
    await page.screenshot({ path: `${shots}/fail-${name.replace(/\W+/g, "_")}.png` });
  }
};

await step("redirect to login", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL(/\/login/);
});

await step("register new user", async () => {
  await page.goto(BASE + "/register");
  await page.fill("#name", "Testeur");
  await page.fill("#email", `test${Date.now()}@gotteron.ch`);
  await page.fill("#password", "padel1234");
  await page.fill("#invite", "GOTTERON");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/");
  await page.waitForSelector("text=Salut Testeur");
  await page.screenshot({ path: `${shots}/01-home-new.png` });
});

await step("logout + login as Eloi", async () => {
  await page.goto(BASE + "/profile");
  await page.click("text=Se déconnecter");
  await page.waitForURL(/\/login/);
  await page.fill("#email", "eloi@gotteron.ch");
  await page.fill("#password", "padel1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/");
  await page.waitForSelector("text=Salut Eloi");
  await page.screenshot({ path: `${shots}/02-home.png`, fullPage: true });
});

await step("ranking", async () => {
  await page.goto(BASE + "/ranking");
  await page.waitForSelector("h1:has-text('Classement')");
  await page.screenshot({ path: `${shots}/03-ranking.png`, fullPage: true });
});

await step("new match → result", async () => {
  await page.goto(BASE + "/match/new");
  await page.waitForSelector("h1:has-text('Nouveau match')");
  // Choisir 3 joueurs (slot a1 = moi)
  for (let i = 0; i < 3; i++) {
    await page.click("text=Choisir un joueur");
    await page.waitForSelector("div.fixed button:has-text('Julien'), div.fixed button");
    const btns = page.locator("div.fixed .overflow-y-auto button");
    await btns.nth(i).click();
  }
  // Score 6-4 6-3 : tape A x6 et B x4 au set 1, A x6 B x3 set 2
  const tap = async (set, side, n) => {
    const btn = page.locator(`button[aria-label*="Set ${set}"]`).nth(side);
    for (let k = 0; k < n; k++) await btn.click();
  };
  await tap(1, 0, 6);
  await tap(1, 1, 4);
  await tap(2, 0, 6);
  await tap(2, 1, 3);
  await page.screenshot({ path: `${shots}/04-match-form.png`, fullPage: true });
  await page.click("text=Valider le match");
  await page.waitForURL(/\/match\/[0-9a-f-]+/);
  await page.waitForSelector("text=VICTOIRE");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/05-result-win.png`, fullPage: true });
});

await step("history", async () => {
  await page.goto(BASE + "/history");
  await page.waitForSelector("h1:has-text('Historique')");
  await page.screenshot({ path: `${shots}/06-history.png`, fullPage: true });
  await page.goto(BASE + "/history?all=1");
  await page.waitForSelector("h1:has-text('Historique')");
});

await step("sessions + join/leave", async () => {
  await page.goto(BASE + "/sessions");
  await page.waitForSelector("h1:has-text('Sessions')");
  await page.screenshot({ path: `${shots}/07-sessions.png`, fullPage: true });
  await page.locator("a[href^='/sessions/']:not([href$='/new'])").first().click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]+/);
  await page.screenshot({ path: `${shots}/08-session.png`, fullPage: true });
});

await step("create session", async () => {
  await page.goto(BASE + "/sessions/new");
  await page.fill("#location", "Padel Fribourg");
  await page.click("text=Créer la session");
  await page.waitForURL(/\/sessions\/[0-9a-f-]+/);
  await page.waitForSelector("text=Inscrit");
});

await step("challenges accept", async () => {
  await page.goto(BASE + "/challenges");
  await page.waitForSelector("h1:has-text('Défis')");
  await page.screenshot({ path: `${shots}/09-challenges.png`, fullPage: true });
  const accept = page.locator("button:has-text('Accepter')").first();
  if (await accept.count()) {
    await accept.click();
    await page.waitForSelector("text=Saisir le résultat");
  }
});

await step("challenge → match prefilled → defeat screen", async () => {
  await page.goto(BASE + "/challenges");
  const link = page.locator("a:has-text('Saisir le résultat')").first();
  await link.click();
  await page.waitForURL(/match\/new\?challengeId=/);
  const tap = async (set, side, n) => {
    const btn = page.locator(`button[aria-label*="Set ${set}"]`).nth(side);
    for (let k = 0; k < n; k++) await btn.click();
  };
  await tap(1, 0, 3);
  await tap(1, 1, 6);
  await tap(2, 0, 4);
  await tap(2, 1, 6);
  await page.click("text=Valider le match");
  await page.waitForURL(/\/match\/[0-9a-f-]+/);
  await page.waitForSelector("text=DÉFAITE");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/10-result-lose.png`, fullPage: true });
  await page.click("text=Une autre");
});

await step("americano", async () => {
  await page.goto(BASE + "/americano");
  await page.waitForSelector("h1:has-text('Americano')");
  await page.locator("a[href^='/americano/']:not([href$='/new'])").first().click();
  await page.waitForURL(/\/americano\/[0-9a-f-]+/);
  await page.waitForSelector("text=Classement du soir");
  await page.screenshot({ path: `${shots}/11-americano.png`, fullPage: true });
  // Saisir les scores du tour courant puis tirer le suivant
  const btns = page.locator("button[aria-label='Équipe A']");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    await btns.nth(i).click();
    await page.waitForTimeout(400);
  }
  await page.click("text=Clôturer le tour");
  await page.waitForTimeout(1200);
});

await step("profile + language switch", async () => {
  await page.goto(BASE + "/profile");
  await page.waitForSelector("text=Mon profil");
  await page.screenshot({ path: `${shots}/12-profile.png`, fullPage: true });
  await page.click("form button:has-text('de')");
  await page.click("text=Enregistrer");
  await page.waitForSelector("text=Mein Profil", { timeout: 10000 });
  await page.goto(BASE + "/");
  await page.waitForSelector("text=Hoi Eloi");
  await page.screenshot({ path: `${shots}/13-home-de.png`, fullPage: true });
  await page.goto(BASE + "/profile");
  await page.click("form button:has-text('fr')");
  await page.click("text=Speichern");
  await page.waitForSelector("text=Mon profil", { timeout: 10000 });
});


await step("admin: reset link → new password → login", async () => {
  await page.goto(BASE + "/admin");
  await page.waitForSelector("h1:has-text('Admin')");
  await page.screenshot({ path: `${shots}/15-admin.png`, fullPage: true });
  // Lien de reset pour "Pierre" (lecture du presse-papiers via l'URL affichée en fallback)
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const row = page.locator(".card", { hasText: "Pierre" }).first();
  await row.locator("button:has-text('Lien de réinit.')").click();
  await page.waitForTimeout(800);
  const url = await page.evaluate(() => navigator.clipboard.readText());
  if (!/\/reset\?token=/.test(url)) throw new Error("no reset url: " + url);
  const resetUrl = url.startsWith("/") ? BASE + url : url.replace(/^https?:\/\/[^/]+/, BASE);
  // Supprimer le dernier match et recalculer
  const before = await page.locator(".card:has(button:has-text('Supprimer'))").count();
  await page.locator("button:has-text('Supprimer')").first().click();
  await page.locator("button:has-text('Oui')").first().click();
  await page.waitForTimeout(2500);
  const after = await page.locator(".card:has(button:has-text('Supprimer'))").count();
  if (after !== before - 1) throw new Error(`delete failed ${before}→${after}`);
  // Déconnexion puis reset
  await page.goto(BASE + "/profile");
  await page.click("text=Se déconnecter");
  await page.waitForURL(/\/login/);
  await page.goto(resetUrl);
  await page.waitForSelector("text=Pour le compte de Pierre");
  await page.fill("#password", "nouveau123");
  await page.click("text=Enregistrer et me connecter");
  await page.waitForURL(BASE + "/");
  await page.waitForSelector("text=/Salut Pierre|Hoi Pierre|Hey Pierre/");
  // Lien déjà utilisé → invalide
  await page.goto(BASE + "/profile");
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Se déconnecter|Abmelden|Sign out/.test(b.textContent))?.click(); });
  await page.waitForURL(/\/login/);
  await page.goto(resetUrl);
  await page.waitForSelector("text=/plus valable|nicht mehr gültig|no longer valid/");
});

await step("change password from profile", async () => {
  await page.goto(BASE + "/login");
  await page.fill("#email", "pierre@gotteron.ch");
  await page.fill("#password", "nouveau123");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/profile");
  await page.fill("#current", "nouveau123");
  await page.fill("#next", "padel1234");
  await page.locator("form:has(#current) button[type=submit]").click();
  await page.waitForSelector("text=/Mot de passe modifié|Passwort geändert|Password changed/");
  await page.goto(BASE + "/admin");
  await page.waitForURL(BASE + "/"); // Pierre n'est pas admin → redirigé
});

await step("tv", async () => {
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  tv.on("pageerror", (e) => errors.push("tv pageerror: " + e.message));
  await tv.goto(BASE + "/tv");
  await tv.waitForSelector("text=Classement");
  await tv.waitForTimeout(1000);
  await tv.screenshot({ path: `${shots}/14-tv.png` });
  await tv.goto(BASE + "/tv?lang=en");
  await tv.waitForSelector("text=Ranking");
  await tv.close();
});

await browser.close();
console.log("\nErrors:", errors.length);
for (const e of errors) console.log(" -", e);
process.exit(errors.length ? 1 : 0);
