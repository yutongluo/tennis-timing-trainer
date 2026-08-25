import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export const APP = 'file://' + resolve(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');

let failures = 0;
export function check(name, ok, detail) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`);
  if (!ok) failures++;
}
export function inRange(name, v, lo, hi) {
  const ok = v >= lo && v <= hi;
  check(name, ok, `${typeof v === 'number' ? v.toFixed(3) : v} (want ${lo}..${hi})`);
}
export function done() {
  console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
}

export async function open(opts = {}) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, ...opts });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    // Google Fonts is the one external request; it is expected to fail offline
    if (m.type() === 'error' && !/ERR_|fonts\.googleapis/.test(m.text())) errors.push('console: ' + m.text());
  });
  await page.goto(APP);
  await page.waitForTimeout(700);
  return { browser, page, errors };
}

/* Presses every beat at its target plus a per-beat bias, in ms.
   Reads S.grading as well as S.shot so a late contact still reaches the shot it belongs to. */
export const BOT = `(bias) => {
  const {S, press} = window.__stl, K = ['split','turn','load','hit'];
  (function tick(){
    for (const sh of [S.grading, S.shot]) {
      if (!sh || !S.running) continue;
      const t = (performance.now() - sh.t0) / 1000;
      if (!sh._b) { sh._b = {j:{}}; K.forEach(k => sh._b.j[k] = (Math.random()-0.5)*70); }
      for (const k of K)
        if (!sh._b[k] && t >= sh.targets[k] + (bias[k] + sh._b.j[k])/1000) {
          sh._b[k] = 1; press(k, k === 'turn' ? sh.side : 0);
        }
    }
    requestAnimationFrame(tick);
  })();
}`;
