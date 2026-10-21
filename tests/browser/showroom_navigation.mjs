#!/usr/bin/env node
/**
 * Browser regression test for the V1.1 showroom entry points.
 *
 * It serves `dist/` at the GitHub Pages project path `/gt3-atlas/`, drives the
 * installed Chrome through the DevTools Protocol, clicks real coordinates and
 * hit-tests overlays. No npm dependencies and no browser download are needed;
 * run `CHROME_PATH=/path/to/chrome node tests/browser/showroom_navigation.mjs`.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "dist");
const PREFIX = "/gt3-atlas";
const CHROME = findChrome();
const ARTIFACTS = path.join(ROOT, "tests/browser/.artifacts");

const SHOWROOMS = [
  { id: "ferrari26", title: "Ferrari 296 GT3 Evo", h1: "296 GT3" },
  { id: "bmw", title: "BMW M4 GT3 EVO", h1: "M4 GT3" },
  { id: "porsche26", title: "Porsche 911 GT3 R（992，2026 EVO）", h1: "911 GT3 R" },
];

const checks = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const explicit = process.env.CHROME_PATH;
  if (explicit) {
    if (fs.existsSync(explicit)) return explicit;
    console.warn(`CHROME_PATH does not exist, trying default locations: ${explicit}`);
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome/Chromium not found; set CHROME_PATH to a browser binary");
  return found;
}

function check(name, condition, detail = "") {
  const ok = Boolean(condition);
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
}

async function waitFor(probe, timeout = 12000, interval = 100) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      if (await probe()) return true;
    } catch (error) {
      lastError = error;
    }
    await wait(interval);
  }
  throw new Error(`Timed out after ${timeout}ms${lastError ? ": " + lastError.message : ""}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain; charset=utf-8",
      ".xml": "application/xml; charset=utf-8",
      ".pdf": "application/pdf",
    }[ext] || "application/octet-stream"
  );
}

function startServer() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    throw new Error("dist/index.html is missing; run: python3 scripts/build.py --offline");
  }
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === PREFIX) {
        response.writeHead(301, { Location: `${PREFIX}/` });
        response.end();
        return;
      }
      if (!pathname.startsWith(`${PREFIX}/`)) {
        response.writeHead(404, { "content-type": "text/plain" });
        response.end("outside project path");
        return;
      }
      let relative = pathname.slice(PREFIX.length + 1);
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const filePath = path.resolve(DIST, relative);
      if (!filePath.startsWith(DIST + path.sep)) {
        response.writeHead(403);
        response.end("forbidden");
        return;
      }
      const body = await fs.promises.readFile(filePath);
      response.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-store",
      });
      response.end(body);
    } catch (_) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", async (event) => {
      let raw = event.data;
      if (typeof raw !== "string") {
        raw = Buffer.from(await event.data.arrayBuffer()).toString("utf8");
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(`${message.error.message} (${pending.method})`));
        else pending.resolve(message.result);
        return;
      }
      const listeners = this.handlers.get(message.method);
      if (listeners) for (const listener of listeners) listener(message.params);
    });
  }

  on(method, listener) {
    if (!this.handlers.has(method)) this.handlers.set(method, new Set());
    this.handlers.get(method).add(listener);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch (_) {
      /* already closed */
    }
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error("CDP connection closed"));
    }
    this.pending.clear();
  }
}

async function launchChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gt3-showroom-test-"));
  const args = [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--hide-scrollbars",
    "--mute-audio",
    "about:blank",
  ];
  const chromeProcess = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  chromeProcess.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const portFile = path.join(userDataDir, "DevToolsActivePort");
    await waitFor(() => fs.existsSync(portFile), 15000);
    const port = Number((await fs.promises.readFile(portFile, "utf8")).split("\n")[0]);
    let target;
    await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      return Boolean(target);
    }, 10000);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error("Unable to open CDP WebSocket")), { once: true });
    });
    return { process: chromeProcess, userDataDir, cdp: new CdpClient(ws) };
  } catch (error) {
    chromeProcess.kill("SIGKILL");
    fs.rmSync(userDataDir, { recursive: true, force: true });
    throw new Error(`${error.message}\nChrome stderr:\n${stderr.slice(-4000)}`);
  }
}

async function main() {
  console.log(`Browser: ${CHROME}`);
  console.log(`Build:   ${DIST}`);
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}${PREFIX}/`;
  let chrome;
  let cdp;
  try {
    chrome = await launchChrome();
    cdp = chrome.cdp;
  } catch (error) {
    server.close();
    throw error;
  }

  const consoleErrors = [];
  const pageErrors = [];
  const httpErrors = [];
  const requestFailures = [];

  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Log.enable");
    cdp.on("Runtime.exceptionThrown", (event) => {
      pageErrors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || "unknown");
    });
    cdp.on("Runtime.consoleAPICalled", (event) => {
      if (event.type !== "error") return;
      consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
    });
    cdp.on("Log.entryAdded", (event) => {
      if (event.entry?.level === "error") consoleErrors.push(event.entry.text);
    });
    cdp.on("Network.responseReceived", (event) => {
      if (event.response?.status >= 400) {
        httpErrors.push(`${event.response.status} ${event.response.url}`);
      }
    });
    cdp.on("Network.loadingFailed", (event) => {
      if (!event.canceled) requestFailures.push(`${event.errorText} ${event.requestId}`);
    });

    const evaluate = async (expression) => {
      const result = await cdp.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      }
      return result.result?.value;
    };

    const settle = async () => {
      await waitFor(async () => {
        const state = await evaluate(`(() => {
          const boot = document.querySelector('#boot');
          return {
            ready: document.readyState,
            bootBlocked: Boolean(boot && !boot.hidden && getComputedStyle(boot).pointerEvents !== 'none')
          };
        })()`);
        return state.ready === "complete" && !state.bootBlocked;
      }, 15000);
      await wait(450);
    };

    const navigate = async (url) => {
      await cdp.send("Page.navigate", { url });
      await wait(250);
      await waitFor(async () => (await evaluate("document.readyState")) === "complete", 15000);
      await settle();
    };

    const waitForUrl = async (fragment, timeout = 10000) => {
      await waitFor(async () => {
        const href = await evaluate("location.href");
        return href.includes(fragment);
      }, timeout);
      await settle();
    };

    const waitForPath = async (expectedPath, expectedHash = null, timeout = 10000) => {
      await waitFor(async () => {
        const state = await evaluate("({ path: location.pathname, hash: location.hash })");
        return state.path === expectedPath && (expectedHash === null || state.hash === expectedHash);
      }, timeout);
      await settle();
    };

    const scrollTo = async (selector) => {
      await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('missing element: ${selector.replace(/'/g, "\\'")}');
        document.documentElement.style.scrollBehavior = 'auto';
        el.scrollIntoView({ block: 'center', inline: 'center' });
        return true;
      })()`);
      await wait(650);
    };

    const rectOf = async (selector) =>
      evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, pe: getComputedStyle(el).pointerEvents };
      })()`);

    const hitGrid = async (selector, columns = 5, rows = 5) =>
      evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return { missing: true, fails: [] };
        const rect = el.getBoundingClientRect();
        const fails = [];
        for (let i = 1; i <= ${columns}; i += 1) {
          for (let j = 1; j <= ${rows}; j += 1) {
            const x = rect.left + rect.width * (i / (${columns} + 1));
            const y = rect.top + rect.height * (j / (${rows} + 1));
            const hit = document.elementFromPoint(x, y);
            if (!hit || !(el.contains(hit) || hit.contains(el))) {
              fails.push({ x: Math.round(x), y: Math.round(y), tag: hit?.tagName || null, cls: typeof hit?.className === 'string' ? hit.className : '' });
            }
          }
        }
        return { fails };
      })()`);

    const click = async (selector, fractionX = 0.5, fractionY = 0.5, shouldScroll = true) => {
      if (shouldScroll) await scrollTo(selector);
      const rect = await rectOf(selector);
      if (!rect) throw new Error(`missing click target: ${selector}`);
      const x = rect.x + rect.w * fractionX;
      const y = rect.y + rect.h * fractionY;
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
      await wait(350);
      return { x, y };
    };

    const back = async () => {
      await evaluate("history.back()");
      await wait(350);
      await waitFor(async () => (await evaluate("document.readyState")) === "complete", 15000);
      await settle();
    };

    const showroomInfo = async () =>
      evaluate(`(() => {
        const text = (node) => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          title: document.title,
          h1: text(document.querySelector('h1')),
          css: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
          scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
          categories: document.querySelectorAll('.sr-tech-category').length,
          thumbs: document.querySelectorAll('.sr-gallery-thumb').length,
          garageHref: document.querySelector('.sr-garage-link')?.getAttribute('href') || '',
          logoHref: document.querySelector('.sr-logo')?.getAttribute('href') || '',
          relatedCards: document.querySelectorAll('.sr-related-card').length,
          nestedRelatedLinks: [...document.querySelectorAll('.sr-related-card')].filter((card) => card.querySelector('a')).length,
          moreThumbHeights: [...document.querySelectorAll('.sr-more-card img')].map((img) => Math.round(img.getBoundingClientRect().height))
        };
      })()`);

    const homeInfo = async () =>
      evaluate(`(() => {
        const text = (node) => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
        return {
          heroHref: document.querySelector('.hero-feature')?.getAttribute('href') || '',
          nav: [...document.querySelectorAll('.primary-nav a')].map((a) => ({ href: a.getAttribute('href'), text: text(a) })),
          drawer: [...document.querySelectorAll('.drawer-showroom-link')].map((a) => ({ href: a.getAttribute('href'), id: a.dataset.showroomEntry, text: text(a) })),
          rail: [...document.querySelectorAll('.showroom-preview')].map((a) => ({ href: a.getAttribute('href'), id: a.dataset.showroomEntry })),
          cards: [...document.querySelectorAll('.showroom-link')].map((a) => ({ href: a.getAttribute('href'), id: a.dataset.showroomEntry })),
          vehicleCards: document.querySelectorAll('article.vehicle.card').length,
          showroomRail: Boolean(document.querySelector('#showrooms')),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      })()`);

    // ---- HTTP routes at the GitHub Pages subpath -------------------------
    for (const route of [
      "",
      "cars/ferrari26/",
      "cars/bmw/",
      "cars/porsche26/",
      "assets/style.css",
      "assets/app.js",
      "assets/showroom.css",
      "assets/showroom.js",
    ]) {
      const response = await fetch(base + route);
      check(`HTTP 200 /gt3-atlas/${route}`, response.status === 200, response.status);
    }

    // ---- desktop homepage entries ---------------------------------------
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(base);
    const home = await homeInfo();
    const expected = SHOWROOMS.map((item) => `cars/${item.id}/`);
    const primary = home.nav.find((item) => item.href === "#showrooms");
    check("hero featured card links to the Ferrari showroom", home.heroHref === "cars/ferrari26/", home.heroHref);
    check("hero featured card is not the old #ferrari26 anchor", home.heroHref !== "#ferrari26", home.heroHref);
    check("primary nav exposes 数字展厅 / SHOWROOM", Boolean(primary && primary.text.includes("数字展厅") && primary.text.includes("SHOWROOM")), JSON.stringify(home.nav));
    check("primary showroom nav targets #showrooms", primary?.href === "#showrooms", primary?.href);
    check("mobile INDEX markup has three showroom entries", home.drawer.length === 3, home.drawer.length);
    check("mobile INDEX links match showroom routes", JSON.stringify(home.drawer.map((item) => item.href)) === JSON.stringify(expected), JSON.stringify(home.drawer));
    check("showroom rail keeps three full-card links", home.rail.length === 3 && JSON.stringify(home.rail.map((item) => item.href)) === JSON.stringify(expected), JSON.stringify(home.rail));
    const dossierRoutesMatch = home.cards.length === 3 && SHOWROOMS.every((showroom) =>
      home.cards.some((item) => item.id === showroom.id && item.href === `cars/${showroom.id}/`));
    check("three dossier showroom links remain", dossierRoutesMatch, JSON.stringify(home.cards));
    check("garage still renders 16 vehicle cards", home.vehicleCards === 16, home.vehicleCards);
    check("desktop has no horizontal overflow", home.scrollWidth <= home.innerWidth, `${home.scrollWidth}/${home.innerWidth}`);

    await scrollTo(".hero-feature");
    const heroHit = await hitGrid(".hero-feature");
    check("hero featured card is not covered by an overlay", heroHit.fails.length === 0, JSON.stringify(heroHit.fails.slice(0, 3)));
    await click(".hero-feature", 0.5, 0.5, false);
    await waitForUrl("/gt3-atlas/cars/ferrari26/");
    let info = await showroomInfo();
    check("clicking the hero card opens Ferrari showroom", info.title.includes("Ferrari 296 GT3 Evo"), info.title);
    check("Ferrari showroom loads its own stylesheet", info.css.some((href) => href.endsWith("/gt3-atlas/assets/showroom.css")), JSON.stringify(info.css));
    check("Ferrari showroom renders dossier content", info.categories === 7 && info.thumbs === JSON.parse(fs.readFileSync(path.join(ROOT,'data/photos.json'),'utf8')).images.filter(p=>p.car_id==='ferrari26').length, `${info.categories}/${info.thumbs}`);
    check("Ferrari showroom has a garage return link", info.garageHref === "../../#garage", info.garageHref);

    await click(".sr-garage-link", 0.5, 0.5, false);
    await waitForUrl("/gt3-atlas/#garage");
    const garageTop = await evaluate("Math.round(document.querySelector('#garage').getBoundingClientRect().top)");
    check("返回车库 lands on the garage section", garageTop >= 0 && garageTop <= 160, garageTop);
    await back();
    await waitForUrl("/gt3-atlas/cars/ferrari26/");
    check("browser back from the garage returns to the showroom", (await evaluate("location.pathname")).endsWith("/cars/ferrari26/"), await evaluate("location.href"));

    // ---- hero click + browser back to the homepage ----------------------
    await navigate(base);
    await click(".hero-feature");
    await waitForUrl("/gt3-atlas/cars/ferrari26/");
    await back();
    await waitForPath("/gt3-atlas/", "");
    const backState = await evaluate("({ path: location.pathname, hash: location.hash })");
    check("browser back from a showroom returns to the homepage", backState.path === "/gt3-atlas/" && backState.hash === "", JSON.stringify(backState));
    check("homepage entries are restored after browser back", (await homeInfo()).heroHref === "cars/ferrari26/");

    // ---- top navigation ------------------------------------------------
    const navHit = await hitGrid(".nav-showroom", 3, 3);
    check("primary showroom nav is not covered", navHit.fails.length === 0, JSON.stringify(navHit.fails.slice(0, 3)));
    await click(".nav-showroom", 0.5, 0.5, false);
    await waitFor(async () => (await evaluate("location.hash")) === "#showrooms", 5000);
    await waitFor(async () => {
      const top = await evaluate("Math.round(document.querySelector('#showrooms').getBoundingClientRect().top)");
      return top >= 0 && top <= 180;
    }, 5000);
    const navState = await evaluate(`(() => ({
      hash: location.hash,
      railTop: Math.round(document.querySelector('#showrooms').getBoundingClientRect().top),
      active: [...document.querySelectorAll('.primary-nav a.is-active')].map((a) => (a.textContent || '').replace(/\\s+/g, ' ').trim())
    }))()`);
    check("primary nav scrolls to the showroom rail", navState.hash === "#showrooms" && navState.railTop <= 180, JSON.stringify(navState));
    check("showroom nav becomes active at the rail", navState.active.some((text) => text.includes("数字展厅")), JSON.stringify(navState.active));

    // ---- all three full-card showroom entries ---------------------------
    const clickPoints = {
      ferrari26: { x: 0.5, y: 0.25 },
      bmw: { x: 0.5, y: 0.82 },
      porsche26: { x: 0.9, y: 0.5 },
    };
    for (const showroom of SHOWROOMS) {
      await navigate(base);
      const selector = `.showroom-preview[href="cars/${showroom.id}/"]`;
      await scrollTo(selector);
      const grid = await hitGrid(selector);
      check(`${showroom.id} rail card is fully clickable`, grid.fails.length === 0, JSON.stringify(grid.fails.slice(0, 3)));
      await click(selector, clickPoints[showroom.id].x, clickPoints[showroom.id].y, false);
      await waitForUrl(`/gt3-atlas/cars/${showroom.id}/`);
      info = await showroomInfo();
      check(`${showroom.id} rail card opens its showroom`, info.title.includes(showroom.title), info.title);
      check(`${showroom.id} direct route renders h1`, info.h1.includes(showroom.h1), info.h1);
      check(`${showroom.id} related cards are valid links`, info.nestedRelatedLinks === 0, info.nestedRelatedLinks);
      check(`${showroom.id} more-showroom thumbnails stay compact`, info.moreThumbHeights.length === 2 && info.moreThumbHeights.every((height) => height > 0 && height < 120), JSON.stringify(info.moreThumbHeights));
    }

    // ---- dossier CTA route ---------------------------------------------
    await navigate(base);
    const dossierSelector = '.showroom-link[href="cars/ferrari26/"]';
    await scrollTo(dossierSelector);
    const dossierGrid = await hitGrid(dossierSelector, 3, 3);
    check("dossier showroom CTA is not covered", dossierGrid.fails.length === 0, JSON.stringify(dossierGrid.fails.slice(0, 3)));
    await click(dossierSelector, 0.5, 0.5, false);
    await waitForUrl("/gt3-atlas/cars/ferrari26/");
    check("dossier CTA opens the Ferrari showroom", (await showroomInfo()).title.includes("Ferrari 296 GT3 Evo"));

    // ---- mobile INDEX drawer -------------------------------------------
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await navigate(base);
    const mobile = await homeInfo();
    const mobileLayout = await evaluate(`(() => ({
      nav: getComputedStyle(document.querySelector('.primary-nav')).display,
      index: getComputedStyle(document.querySelector('.index-btn')).display
    }))()`);
    check("mobile hides the desktop nav", mobileLayout.nav === "none", mobileLayout.nav);
    check("mobile exposes the INDEX button", mobileLayout.index !== "none", mobileLayout.index);
    check("mobile has no horizontal overflow", mobile.scrollWidth <= mobile.innerWidth, `${mobile.scrollWidth}/${mobile.innerWidth}`);
    check("mobile INDEX contains three showroom routes", mobile.drawer.length === 3 && JSON.stringify(mobile.drawer.map((item) => item.href)) === JSON.stringify(expected), JSON.stringify(mobile.drawer));

    await click("#openIndex", 0.5, 0.5, false);
    await waitFor(async () => (await evaluate("document.querySelector('#indexDrawer').classList.contains('is-open')")), 3000);
    const drawerState = await evaluate(`(() => ({
      open: document.querySelector('#indexDrawer').classList.contains('is-open'),
      hidden: document.querySelector('#indexDrawer').getAttribute('aria-hidden'),
      entries: [...document.querySelectorAll('.drawer-showroom-link')].map((a) => a.getAttribute('href'))
    }))()`);
    check("mobile INDEX opens", drawerState.open && drawerState.hidden === "false", JSON.stringify(drawerState));
    for (const showroom of SHOWROOMS) {
      const selector = `.drawer-showroom-link[href="cars/${showroom.id}/"]`;
      const grid = await hitGrid(selector, 3, 3);
      check(`mobile INDEX ${showroom.id} entry is not covered`, grid.fails.length === 0, JSON.stringify(grid.fails.slice(0, 3)));
    }
    await click('.drawer-showroom-link[href="cars/bmw/"]', 0.5, 0.5, false);
    await waitForUrl("/gt3-atlas/cars/bmw/");
    check("mobile INDEX entry opens BMW showroom", (await showroomInfo()).title.includes("BMW M4 GT3 EVO"));

    // ---- mobile hero entry ---------------------------------------------
    await navigate(base);
    await scrollTo(".hero-feature");
    const mobileHeroHit = await hitGrid(".hero-feature", 3, 3);
    check("mobile hero featured card is not covered", mobileHeroHit.fails.length === 0, JSON.stringify(mobileHeroHit.fails.slice(0, 3)));
    await click(".hero-feature", 0.5, 0.5, false);
    await waitForUrl("/gt3-atlas/cars/ferrari26/");
    check("mobile hero card opens Ferrari showroom", (await showroomInfo()).title.includes("Ferrari 296 GT3 Evo"));

    // ---- console / network hygiene -------------------------------------
    await wait(400);
    check("no console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0, 5)));
    check("no uncaught page exceptions", pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 5)));
    check("no HTTP 4xx/5xx resources", httpErrors.length === 0, JSON.stringify(httpErrors.slice(0, 5)));
    check("no failed resource requests", requestFailures.length === 0, JSON.stringify(requestFailures.slice(0, 5)));
  } catch (error) {
    console.error(`FATAL | ${error.stack || error.message}`);
    await captureFailure(cdp).catch(() => {});
    process.exitCode = 1;
  } finally {
    cdp.close();
    chrome.process.kill("SIGTERM");
    await wait(300);
    chrome.process.kill("SIGKILL");
    fs.rmSync(chrome.userDataDir, { recursive: true, force: true });
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }

  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`\n${failed.length} BROWSER CHECK(S) FAILED | ${checks.length - failed.length}/${checks.length}`);
    process.exitCode = 1;
  } else {
    console.log(`\nALL BROWSER CHECKS PASSED | ${checks.length}/${checks.length}`);
  }
}

async function captureFailure(cdp) {
  if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const target = path.join(ARTIFACTS, "failure.png");
  fs.writeFileSync(target, Buffer.from(shot.data, "base64"));
  console.error(`Screenshot: ${target}`);
}

export { startServer, launchChrome, wait, waitFor, ROOT, DIST, PREFIX };

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) main().then(() => {
  // Node native WebSocket can retain closed CDP handles after Chrome exits.
  process.exit(process.exitCode || 0);
}).catch((error) => {
  console.error(`FATAL | ${error.stack || error.message}`);
  process.exit(1);
});
