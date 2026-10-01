/* ================= музика ================= */
var MU = { on: false, step: 0, next: 0, boss: false };
function musicStart(){ if (!aInit() || MU.on) return; MU.on = true; MU.step = 0; MU.next = AC.currentTime + 0.2; }
function musicStop(){ MU.on = false; }
var AMB = [45, 45, 43, 40], BOS = [40, 41, 40, 36];
function musicTick(){
  if (!MU.on || !sound || !AC || !AB.mus) return;
  var bpm = MU.boss ? 96 : 54;
  var sp = 60 / bpm / 2;
  var guard = 0;
  while (MU.next < AC.currentTime + 0.3 && guard++ < 32) {
    var i = MU.step, bar = (i >> 3) & 3, k = i & 7;
    if (MU.boss) {
      if (k === 0 || k === 4) tone(MU.next, mf(BOS[bar] - 12), 0.5, 'sawtooth', 0.14, null, AB.mus);
      if (k % 2 === 0) nz(MU.next, 0.16, 140, 0.8, 0.10, AB.mus);
      if (k === 2 || k === 6) tone(MU.next, mf(BOS[bar] + 7), 0.4, 'triangle', 0.055, null, AB.mus);
      if (k === 5) tone(MU.next, mf(BOS[bar] + 15), 0.34, 'sine', 0.05, null, AB.mus);
    } else {
      if (k === 0) tone(MU.next, mf(AMB[bar] - 12), 1.5, 'sine', 0.10, null, AB.mus);
      if (k === 0) tone(MU.next, mf(AMB[bar] + 7), 1.7, 'triangle', 0.035, null, AB.mus);
      if (k === 4) tone(MU.next, mf(AMB[bar] + 12), 1.2, 'sine', 0.028, null, AB.mus);
      if (k === 6) nz(MU.next, 1.4, 320, 0.5, 0.022, AB.mus, 140);
    }
    MU.next += sp;
    MU.step = (MU.step + 1) % 32;
  }
  if (MU.next < AC.currentTime) MU.next = AC.currentTime + 0.1;
}

