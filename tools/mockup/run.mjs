// Builds docs/mockup/MDE.svg: a layered vector mockup of the MDE window, for
// trying out colours in a vector editor (Affinity, Illustrator).
//
// It starts the Vite dev server and headless Microsoft Edge, puts the app in
// the state of the mockup (setup.js) and converts the page into SVG
// (export.js). Usage: node tools/mockup/run.mjs [out.svg] [width] [height]

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const [, , out = join(repo, "docs/mockup/MDE.svg"), width = "1440", height = "900"] = process.argv;
const VITE_PORT = 1431;
const DEBUG_PORT = 9333;
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {}
    await sleep(200);
  }
  throw new Error(`No answer from ${url}`);
}

const vite = spawn(process.execPath, [join(repo, "node_modules/vite/bin/vite.js"), "--port", String(VITE_PORT), "--strictPort"], { cwd: repo, stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "mde-mockup-"));
const edge = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--force-device-scale-factor=1", `--window-size=${width},${height}`, "about:blank",
]);

try {
  await waitFor(`http://localhost:${VITE_PORT}/`);
  const targets = await (await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const id = ++nextId;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (file) => {
    const expression = readFileSync(join(here, file), "utf8");
    const { result } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`${file}: ${result.exceptionDetails.exception?.description}`);
    return result.result.value;
  };

  await send("Emulation.setDeviceMetricsOverride", { width: +width, height: +height, deviceScaleFactor: 1, mobile: false });
  await send("Page.enable");
  // A hidden page gets no animation frames, and the app draws the minimap and
  // the character count in them.
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // Polish UI, as the Windows display language would give in the real app.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: 'window.__MDE_LANG__ = "pl";' });
  // A fresh dev server prepares its dependencies on the first load and may reload
  // the page meanwhile, so the mockup is made on a second, settled load.
  for (let load = 0; load < 2; load++) {
    await send("Page.navigate", { url: `http://localhost:${VITE_PORT}/` });
    await sleep(load === 0 ? 5000 : 2000);
  }
  await evaluate("setup.js");
  const svg = await evaluate("export.js");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg);
  console.log(`Saved ${out}`);
  ws.close();
} finally {
  edge.kill();
  vite.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
