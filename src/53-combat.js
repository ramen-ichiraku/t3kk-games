/* ================= бій гравця ================= */
function attack(heavy){
  if (G.mode !== 'play' || P.dead || P.roll > 0 || P.stagger > 0) return;
  if (P.atk > 0) { P.combo = heavy ? 2 : 1; return; }
  if (P.st < (heavy ? 34 : 20)) return;
  startSwing(heavy);
}
function startSwing(heavy){
  // довертаємо героя на ціль або на напрямок камери: інакше удар іде повз
  if (G.lock) P.yaw = Math.atan2(G.lock.x - P.x, G.lock.z - P.z);
  else {
    var near = null, nd = 3.6;
    for (var i = 0; i < foes.length; i++) {
      var f = foes[i];
      if (!f.alive) continue;
      var d = Math.hypot(f.x - P.x, f.z - P.z);
      if (d < nd && Math.abs(angWrap(Math.atan2(f.x - P.x, f.z - P.z) - (camYaw + Math.PI))) < 1.0) { nd = d; near = f; }
    }
    P.yaw = near ? Math.atan2(near.x - P.x, near.z - P.z) : camYaw + Math.PI;
  }
  P.atk = 0.001;
  P.heavy = !!heavy;
  P.atkStage = heavy ? 3 : (P.atkStage + 1) % 3;
  P.hitDone = false;
  P.st -= heavy ? 34 : 20;
  P.stLock = heavy ? 0.85 : 0.6;
  sSwing();
}
function swingWindows(){
  // [вікно замаху, вікно удару, повна тривалість]
  if (P.atkStage === 3) return [0.42, 0.24, 1.0];   // важкий
  return P.atkStage === 2 ? [0.26, 0.20, 0.72] : [0.17, 0.15, 0.52];
}
function doHitCheck(){
  var reach = P.atkStage === 3 ? 3.6 : (P.atkStage === 2 ? 3.1 : 2.6);
  var dmg = statDmg() * (P.atkStage === 3 ? 2.3 : (P.atkStage === 2 ? 1.55 : 1));
  if (P.atkStage === 3) shockwave(P.x + Math.sin(P.yaw) * 2.2, P.z + Math.cos(P.yaw) * 2.2);
  var hit = false;
  for (var i = 0; i < foes.length; i++) {
    var f = foes[i];
    if (!f.alive) continue;
    var dx = f.x - P.x, dz = f.z - P.z;
    var d = Math.hypot(dx, dz);
    if (d > reach + f.d.s * 0.5) continue;
    if (Math.abs(angWrap(Math.atan2(dx, dz) - P.yaw)) > 1.15) continue;
    hurtFoe(f, dmg);
    hit = true;
  }
  if (boss && !boss.dead && G.bossOn) {
    var bdx = boss.x - P.x, bdz = boss.z - P.z;
    var bd = Math.hypot(bdx, bdz);
    if (bd < reach + 1.7 && Math.abs(angWrap(Math.atan2(bdx, bdz) - P.yaw)) < 1.2) {
      hurtBoss(dmg);
      hit = true;
    }
  }
  if (hit) sHitFlesh(); else sHit();
}
function hurtFoe(f, dmg){
  f.hp -= dmg;
  f.flash = 0.16;
  // поїз: дрібні удари більше не глушать усіх підряд, тож Пузиря не забити стан-локом
  f.poise += dmg;
  if (f.poise >= f.d.poise) { f.poise = 0; f.stagger = Math.max(f.stagger, 0.45); }
  if (f.st === 'idle' || f.st === 'return') { f.st = 'chase'; f.t = 0; }
  var a = Math.atan2(f.x - P.x, f.z - P.z);
  moveFoe(f, Math.sin(a) * 12, Math.cos(a) * 12, 0.03);
  sparks(f.x, f.y + 1.0 * f.d.s, f.z, 7);
  G.freeze = 0.055;
  if (f.hp <= 0 && f.alive) {
    f.alive = false; f.dead = 0.001; f.st = 'dying';
    P.roe += f.d.roe;
    showGot('+' + f.d.roe + ' ікри');
    sRoe();
  }
}
function hurtBoss(dmg){
  boss.hp -= dmg;
  boss.flash = 0.14;
  if (boss.phase === 1 && boss.hp <= boss.hpMax * 0.5) {
    boss.phase = 2;
    boss.stagger = 1.2;
    sBossRoar();
    showArea('Лящ підіймає мул');
  }
  if (boss.hp <= 0 && !boss.dead) {
    boss.dead = 0.001;
    boss.hp = 0;
    boss.st = 'dead';
    G.bossDead = true;
    P.roe += 1200;
    sVictory();
    setTimeout(function(){
      UI.boss.classList.remove('on');
      G.mode = 'win';
      document.getElementById('winText').textContent =
        'Ікри зібрано: ' + P.roe + '. Жидінький Меч витримав, хоч і розм\'як остаточно.';
      UI.cWin.hidden = false;
      exitLock();
    }, 2600);
  }
}
function hurtPlayer(dmg, sx, sz){
  if (P.dead || P.inv > 0) return;
  if (P.block && P.st > 8) {
    var a = Math.abs(angWrap(Math.atan2(sx - P.x, sz - P.z) - P.yaw));
    if (a < 1.3) {
      P.st -= dmg * 1.5;
      P.stLock = 0.7;
      sBlock();
      if (P.st <= 0) { P.st = 0; P.stagger = 0.9; }
      return;
    }
  }
  P.hp -= dmg;
  P.stagger = 0.42;
  P.inv = 0.5;
  sHurt();
  hurtFlash();
  if (P.hp <= 0) { P.hp = 0; die(); }
}
var hurtEl = null;
function hurtFlash(){
  if (!hurtEl) {
    hurtEl = document.createElement('div');
    hurtEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(140,20,16,0) 42%,rgba(140,20,16,.55) 100%);opacity:0;transition:opacity .35s ease';
    document.getElementById('ui').appendChild(hurtEl);
  }
  hurtEl.style.opacity = '1';
  setTimeout(function(){ hurtEl.style.opacity = '0'; }, 90);
}
function jump(){
  if (G.mode !== 'play' || P.dead || !P.grounded || P.roll > 0 || P.st < 14) return;
  P.vy = 7.6; P.st -= 14; P.stLock = 0.4;
  if (ok()) nz(AC.currentTime, 0.18, 500, 0.8, 0.08, null, 200);
}
function quaff(){
  if (G.mode !== 'play' || P.dead || P.flasks <= 0 || P.hp >= P.hpMax || P.atk > 0) return;
  P.flasks--;
  P.hp = Math.min(P.hpMax, P.hp + P.hpMax * 0.55);
  P.stLock = 0.5;
  sHeal();
  syncUI();
}
function die(){
  if (P.dead) return;
  P.dead = 0.001;
  G.mode = 'dead';
  sDie();
  UI.died.classList.add('on');
  UI.boss.classList.remove('on');
  exitLock();
  if (G.roeDrop) scene.remove(G.roeDrop.m);
  G.roeDrop = null;
  if (P.roe > 0) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), M.goldHot);
    m.position.set(P.x, hAt(P.x, P.z) + 0.6, P.z);
    scene.add(m);
    G.roeDrop = { m: m, x: P.x, z: P.z, amt: P.roe };
  }
  P.roe = 0;
  setTimeout(function(){
    fade(true, function(){
      respawn();
      UI.died.classList.remove('on');
      fade(false);
    });
  }, 2200);
}
function respawn(){
  P.hp = P.hpMax; P.st = P.stMax; P.flasks = P.flasksMax;
  P.x = P.respawnAt.x; P.z = P.respawnAt.z; P.vy = 0;
  P.dead = 0; P.atk = 0; P.roll = 0; P.stagger = 0; P.inv = 0;
  G.mode = 'play';
  G.bossOn = false;
  if (boss) { boss.hp = boss.hpMax; boss.phase = 1; boss.st = 'sleep'; boss.dead = 0;
    boss.x = ARENA.x; boss.z = ARENA.z - 6; boss.t = 0; }
  if (!G.bossDead) gateMesh.visible = true;
  spawnAll();
  syncUI();
}

