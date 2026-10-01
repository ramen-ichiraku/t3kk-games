/* ================= звук ================= */
var sound = true;
try { if (localStorage.getItem('karas.sound') === '0') sound = false; } catch(e){}
var AC = null, AB = { master:null, mus:null, sfx:null };
function ac(){
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } }
  if (AC.state === 'suspended') { try { AC.resume(); } catch(e){} }
  return AC;
}
function aInit(){
  var a = ac();
  if (!a || AB.master) return a;
  AB.master = a.createGain(); AB.master.gain.value = sound ? 0.8 : 0;
  AB.mus = a.createGain(); AB.mus.gain.value = 0.42;
  AB.sfx = a.createGain(); AB.sfx.gain.value = 1;
  AB.mus.connect(AB.master); AB.sfx.connect(AB.master);
  AB.master.connect(a.destination);
  var n = Math.floor(a.sampleRate * 1.6);
  AB.noise = a.createBuffer(1, n, a.sampleRate);
  var ch = AB.noise.getChannelData(0);
  for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  return a;
}
function mf(m){ return 440 * Math.pow(2, (m - 69) / 12); }
function tone(t, f, dur, type, vol, to, dest){
  if (!AC || !AB.master) return;
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(24, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || AB.sfx);
  o.start(t); o.stop(t + dur + 0.04);
}
function nz(t, dur, f, q, vol, dest, to){
  if (!AC || !AB.noise) return;
  var s = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = AB.noise; s.loop = true;
  bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); bp.Q.value = q || 1;
  if (to) bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(Math.max(0.0002, vol), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp); bp.connect(g); g.connect(dest || AB.sfx);
  s.start(t); s.stop(t + dur + 0.04);
}
function ok(){ return sound && AC && AB.master; }
function sSwing(){ if (ok()) { var t = AC.currentTime; nz(t, 0.20, 900, 1.1, 0.13, null, 260); } }
function sHit(){ if (ok()) { var t = AC.currentTime; nz(t, 0.14, 420, 0.8, 0.22, null, 120); tone(t, 180, 0.12, 'square', 0.10, 70); } }
function sHitFlesh(){ if (ok()) { var t = AC.currentTime; nz(t, 0.18, 300, 0.7, 0.20, null, 90); tone(t, 120, 0.16, 'sawtooth', 0.09, 48); } }
function sBlock(){ if (ok()) { var t = AC.currentTime; nz(t, 0.16, 2600, 3.0, 0.18, null, 900); tone(t, 900, 0.1, 'triangle', 0.08, 400); } }
function sRoll(){ if (ok()) nz(AC.currentTime, 0.26, 700, 0.7, 0.10, null, 180); }
function sHurt(){ if (ok()) { var t = AC.currentTime; tone(t, 240, 0.26, 'square', 0.13, 70); nz(t, 0.2, 340, 0.6, 0.16); } }
function sHeal(){ if (ok()) { var t = AC.currentTime; [0,5,9].forEach(function(n,i){ tone(t + i*0.07, mf(72+n), 0.24, 'sine', 0.12); }); } }
function sDie(){ if (ok()) { var t = AC.currentTime; nz(t, 0.9, 500, 0.4, 0.2, null, 60); [0,-3,-7,-12].forEach(function(n,i){ tone(t + i*0.22, mf(52+n), 0.6, 'sawtooth', 0.12); }); } }
function sFire(){ if (ok()) { var t = AC.currentTime; [0,7,12,16].forEach(function(n,i){ tone(t + i*0.09, mf(64+n), 0.4, 'triangle', 0.10); }); } }
function sRoe(){ if (ok()) { var t = AC.currentTime; tone(t, mf(84), 0.12, 'triangle', 0.13); tone(t+0.05, mf(91), 0.14, 'sine', 0.09); } }
function sBossRoar(){ if (ok()) { var t = AC.currentTime; nz(t, 1.3, 180, 0.5, 0.3, null, 55); tone(t, 70, 1.2, 'sawtooth', 0.16, 34); tone(t+0.1, 104, 1.0, 'square', 0.09, 46); } }
function sVictory(){ if (ok()) { var t = AC.currentTime; [0,4,7,12,16].forEach(function(n,i){ tone(t + i*0.14, mf(60+n), 0.7, 'triangle', 0.12); }); } }
function setSound(on){
  sound = on;
  try { localStorage.setItem('karas.sound', on ? '1' : '0'); } catch(e){}
  if (on) { aInit(); if (AB.master) AB.master.gain.value = 0.8; }
  else if (AB.master) AB.master.gain.value = 0;
}

