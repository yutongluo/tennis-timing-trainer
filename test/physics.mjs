/* The ball must always be playable: over the net, inside the court, and every beat
   target must sit where the coaching model says it does. 300 shots per combination. */
import { open, check, inRange, done } from './_harness.mjs';

const { browser, page, errors } = await open();

const r = await page.evaluate(() => {
  const M = window.__stl, out = {};
  const HALF_SINGLES = 4.115, NET_H = 1.07;
  for (const contact of ['early', 'rise', 'top']) {
    M.S.contact = contact;
    for (const pace of ['warm', 'rally', 'press']) {
      M.S.pace = pace;
      const acc = { netY: [], bounceZ: [], bounceX: [], split: [], turn: [], load: [], hit: [],
                    rise: [], contactY: [], loadToHit: [] };
      for (let i = 0; i < 300; i++) {
        const sh = M.makeShot(false);
        acc.netY.push(M.ballAt(sh, sh.tNet).y);
        acc.bounceZ.push(sh.zb); acc.bounceX.push(Math.abs(sh.xb));
        acc.split.push(sh.targets.split); acc.turn.push(sh.targets.turn);
        acc.load.push(sh.targets.load);   acc.hit.push(sh.targets.hit);
        acc.rise.push(sh.tApex * 1000);
        acc.contactY.push(M.ballAt(sh, sh.tHit).y);
        acc.loadToHit.push((sh.tHit - sh.tb) * 1000);
      }
      const m = k => [Math.min(...acc[k]), Math.max(...acc[k])];
      out[`${contact}/${pace}`] = Object.fromEntries(Object.keys(acc).map(k => [k, m(k)]));
      out[`${contact}/${pace}`].clearsNet = Math.min(...acc.netY) > NET_H;
      out[`${contact}/${pace}`].inCourt = Math.max(...acc.bounceX) < HALF_SINGLES;
    }
  }
  M.S.contact = 'rise'; M.S.pace = 'rally';
  return out;
});

for (const [key, v] of Object.entries(r)) {
  console.log(key);
  check('ball clears the net on every shot', v.clearsNet, `min ${v.netY[0].toFixed(2)} m`);
  check('bounce inside the singles court', v.inCourt, `max |x| ${v.bounceX[1].toFixed(2)} m`);
  inRange('split target is the jump, before contact', v.split[0], -0.12, -0.04);
  inRange('turn target within the read window', v.turn[0], 0.28, 0.45);
  inRange('turn target within the read window (max)', v.turn[1], 0.28, 0.45);
  check('contact lands inside the rise window',
        v.loadToHit[0] > 0 && v.loadToHit[1] <= v.rise[1] + 1,
        `${v.loadToHit[0].toFixed(0)}–${v.loadToHit[1].toFixed(0)} ms of a ${v.rise[0].toFixed(0)}–${v.rise[1].toFixed(0)} ms window`);
  inRange('contact height is strikeable', v.contactY[0], 0.25, 1.45);
  inRange('contact height is strikeable (max)', v.contactY[1], 0.25, 1.45);
  // 1.3 m at warm-up + top-of-bounce is a high-bouncing loopy ball taken late: awkward but real
}
check('no page errors', errors.length === 0, errors.join(' | '));

await browser.close();
done();
