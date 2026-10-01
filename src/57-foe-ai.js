/* ================= ШІ рядових ================= */
function foeThink(f, dt){
  if (!f.alive) { f.dead += dt; return; }
  if (f.flash > 0) f.flash -= dt;
  if (f.poise > 0) f.poise = Math.max(0, f.poise - dt * 9);
  if (f.stagger > 0) { f.stagger -= dt; f.anim += dt; return; }
  var dx = P.x - f.x, dz = P.z - f.z;
  var dist = Math.hypot(dx, dz) || 1;
  var toP = Math.atan2(dx, dz);
  var d = f.d;

  if (f.st === 'idle') {
    f.pat += dt * 0.5;
    f.yaw += angWrap(f.pat * 0.7 - f.yaw) * Math.min(1, dt * 1.2);
    var hx = f.hx + Math.cos(f.pat) * 2.2, hz = f.hz + Math.sin(f.pat * 0.8) * 2.2;
    var ddx = hx - f.x, ddz = hz - f.z, dd = Math.hypot(ddx, ddz);
    if (dd > 0.4) {
      moveFoe(f, ddx / dd * 0.7, ddz / dd * 0.7, dt);
      f.yaw += angWrap(Math.atan2(ddx, ddz) - f.yaw) * Math.min(1, dt * 3);
      f.anim += dt * 2;
    } else f.anim += dt * 0.7;
    if (dist < d.agr && !P.dead) { f.st = 'chase'; f.t = 0; }
    return;
  }
  if (f.st === 'return') {
    var rx = f.hx - f.x, rz = f.hz - f.z, rd = Math.hypot(rx, rz);
    f.yaw += angWrap(Math.atan2(rx, rz) - f.yaw) * Math.min(1, dt * 4);
    if (rd > 1) { moveFoe(f, rx / rd * d.sp * 0.8, rz / rd * d.sp * 0.8, dt); f.anim += dt * 4; }
    else { f.st = 'idle'; f.t = 0; f.hp = Math.min(f.hpMax, f.hp + f.hpMax * 0.5); }
    return;
  }
  if (f.st === 'chase') {
    f.yaw += angWrap(toP - f.yaw) * Math.min(1, dt * 5);
    if (dist > d.rng * 0.85) {
      moveFoe(f, Math.sin(f.yaw) * d.sp, Math.cos(f.yaw) * d.sp, dt);
      f.anim += dt * 5.5;
    } else f.anim += dt * 1.6;
    f.t += dt;
    if (dist < d.rng && f.t > 0.35) { f.st = 'wind'; f.t = 0; f.hitDone = false; }
    // повідець: раніше вони бігли за гравцем через усю карту й не поверталися
    var fromHome = Math.hypot(f.x - f.hx, f.z - f.hz);
    if (fromHome > d.leash || dist > d.agr * 1.8 || P.dead) { f.st = 'return'; f.t = 0; }
    return;
  }
  if (f.st === 'wind') {
    f.t += dt;
    f.yaw += angWrap(toP - f.yaw) * Math.min(1, dt * 2.6);
    if (f.t >= d.wind) { f.st = 'act'; f.t = 0; if (!d.ranged) sSwing(); else castMud(f); }
    return;
  }
  if (f.st === 'act') {
    f.t += dt;
    if (!d.ranged && !f.hitDone && f.t > d.act * 0.35) {
      if (dist < d.rng + 0.8 && Math.abs(angWrap(toP - f.yaw)) < 1.1) hurtPlayer(d.dmg, f.x, f.z);
      f.hitDone = true;
    }
    if (f.t >= d.act) { f.st = 'rec'; f.t = 0; }
    return;
  }
  if (f.st === 'rec') {
    f.t += dt;
    f.anim += dt * 0.8;
    if (f.t >= d.rec) { f.st = dist < d.agr ? 'chase' : 'idle'; f.t = 0; }
  }
}
function separateFoes(){
  for (var i = 0; i < foes.length; i++) {
    var a = foes[i];
    if (!a.alive) continue;
    for (var j = i + 1; j < foes.length; j++) {
      var b = foes[j];
      if (!b.alive) continue;
      var dx = a.x - b.x, dz = a.z - b.z;
      var d = Math.hypot(dx, dz), need = a.d.r + b.d.r + 0.2;
      if (d < need && d > 0.001) {
        var push = (need - d) * 0.5;
        a.x += dx / d * push; a.z += dz / d * push;
        b.x -= dx / d * push; b.z -= dz / d * push;
        keepOut(a); keepOut(b);
      }
    }
  }
}
function poseFoe(f, dt){
  var Pp = f.P;
  f.y = hAt(f.x, f.z);
  f.g.position.set(f.x, f.y, f.z);
  f.g.rotation.y = f.yaw;
  if (!f.alive) {
    var k = Math.min(1, f.dead / 0.8);
    f.g.rotation.x = k * 1.5;
    f.g.position.y = f.y - k * 0.35;
    f.g.visible = f.dead < 3.4;
    return;
  }
  var t = f.anim;
  var mov = (f.st === 'chase' || f.st === 'idle') ? 1 : 0.15;
  Pp.legs[0].hp.rotation.x = Math.sin(t * 2) * 0.62 * mov;
  Pp.legs[1].hp.rotation.x = -Math.sin(t * 2) * 0.62 * mov;
  Pp.legs[0].kn.rotation.x = Math.max(0, -Math.sin(t * 2)) * 0.75 * mov;
  Pp.legs[1].kn.rotation.x = Math.max(0, Math.sin(t * 2)) * 0.75 * mov;
  Pp.torso.rotation.x = 0.14 + Math.sin(t * 4) * 0.03;
  Pp.tail.rotation.y = Math.sin(t * 2.4) * 0.35;
  Pp.arms[0].sh.rotation.x = -Math.sin(t * 2) * 0.5 * mov;

  var a = Pp.arms[1];
  if (f.st === 'wind') {
    var k2 = Math.min(1, f.t / f.d.wind);
    a.sh.rotation.x = -2.1 * k2; a.sh.rotation.z = -0.35 * k2;
    Pp.torso.rotation.y = -0.3 * k2;
  } else if (f.st === 'act') {
    var k3 = Math.min(1, f.t / f.d.act);
    a.sh.rotation.x = -2.1 + 3.2 * k3;
    Pp.torso.rotation.y = -0.3 + 0.6 * k3;
  } else {
    a.sh.rotation.x += (0.2 - a.sh.rotation.x) * Math.min(1, dt * 5);
    a.sh.rotation.z += (0 - a.sh.rotation.z) * Math.min(1, dt * 5);
    Pp.torso.rotation.y += (0 - Pp.torso.rotation.y) * Math.min(1, dt * 5);
  }
  if (f.stagger > 0) Pp.torso.rotation.x = 0.14 - 0.5;
  var fl = f.flash > 0 ? Math.min(1, f.flash / 0.16) : 0;
  if (fl !== f.lastFl) {
    f.lastFl = fl;
    for (var mi = 0; mi < f.mats.length; mi++) {
      var mm = f.mats[mi];
      mm.emissive.setHex(mm.userData.base);
      if (fl > 0) mm.emissive.lerp(new THREE.Color(0xffffff), fl * 0.8);
    }
  }
}

