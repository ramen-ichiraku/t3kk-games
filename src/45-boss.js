/* ================= бос ================= */
var boss = null;
function makeBoss(){
  var g = buildFish({
    s: 2.5, body: M.boss, belly: M.bossD, fin: M.bossT, skin: M.bossD,
    bald: true, hairs: 0, crown: true, eye: 0xd8c46a
  });
  g.position.set(ARENA.x, hAt(ARENA.x, ARENA.z - 6), ARENA.z - 6);
  scene.add(g);
  var pr = g.userData.P;

  // велетенський обгризений меч
  var w = new THREE.Group();
  var bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.5), M.bossT);
  bl.position.y = -1.7; bl.castShadow = !LOWFX;
  w.add(bl);
  for (var i = 0; i < 5; i++) {
    var nick = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.2), M.bossD);
    nick.position.set(i % 2 ? 0.18 : -0.18, -0.7 - i * 0.6, 0.2);
    w.add(nick);
  }
  var gd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 1.3), M.bossD);
  w.add(gd);
  pr.arms[1].hand.add(w);

  // плащ із мулу
  var cape = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.9, 8, 1, true), M.bossD);
  cape.position.set(0, 0.1, -0.24);
  cape.rotation.x = 0.16;
  pr.torso.add(cape);

  boss = {
    g: g, P: pr, wep: w, x: ARENA.x, z: ARENA.z - 6, y: 0, yaw: 0,
    hp: 620, hpMax: 620, st: 'sleep', t: 0, anim: 0, hitDone: false,
    phase: 1, dead: 0, flash: 0, next: 0, dashX: 0, dashZ: 0
  };
  return boss;
}

var BOSS_MOVES = {
  slam:  { wind: 0.85, act: 0.22, rec: 0.95, rng: 4.6, arc: 1.2, dmg: 34 },
  sweep: { wind: 0.62, act: 0.26, rec: 0.8,  rng: 5.2, arc: 2.5, dmg: 28 },
  charge:{ wind: 0.9,  act: 0.55, rec: 1.0,  rng: 16,  arc: 1.0, dmg: 32 },
  burst: { wind: 1.15, act: 0.3,  rec: 1.2,  rng: 8.5, arc: 6.3, dmg: 30 }
};

function bossThink(dt){
  if (!boss || boss.dead) return;
  var dx = P.x - boss.x, dz = P.z - boss.z;
  var dist = Math.hypot(dx, dz) || 1;
  var toP = Math.atan2(dx, dz);

  if (boss.st === 'sleep') {
    boss.anim += dt;
    return;
  }
  if (boss.stagger > 0) { boss.stagger -= dt; boss.anim += dt; return; }

  boss.t += dt;
  var mv = BOSS_MOVES[boss.move] || BOSS_MOVES.slam;

  if (boss.st === 'idle') {
    boss.yaw += angWrap(toP - boss.yaw) * Math.min(1, dt * 3.0);
    var want = boss.phase === 2 ? 3.4 : 2.7;
    if (dist > 3.4) {
      boss.x += Math.sin(boss.yaw) * want * dt;
      boss.z += Math.cos(boss.yaw) * want * dt;
      clampBoss();
    }
    boss.anim += dt * (dist > 4 ? 2.6 : 1.2);
    // атакує лише коли справді може дістати — раніше лупив у порожнечу
    if (boss.t > boss.next) {
      var pool;
      if (dist > 9) pool = ['charge', 'charge', boss.phase === 2 ? 'burst' : 'charge'];
      else if (dist > 5.4) pool = ['sweep', 'charge', boss.phase === 2 ? 'burst' : 'sweep'];
      else pool = ['slam', 'sweep', 'slam', boss.phase === 2 ? 'burst' : 'sweep'];
      boss.move = pool[(Math.random() * pool.length) | 0];
      boss.st = 'wind'; boss.t = 0; boss.hitDone = false;
      if (boss.move === 'charge') { boss.dashX = Math.sin(boss.yaw); boss.dashZ = Math.cos(boss.yaw); }
      if (ok()) { var tt = AC.currentTime; nz(tt, 0.45, 250, 0.7, 0.15, null, 85); tone(tt, 92, 0.4, 'sawtooth', 0.09, 58); }
    }
    return;
  }
  var m = BOSS_MOVES[boss.move];
  if (boss.st === 'wind') {
    if (boss.move !== 'charge') boss.yaw += angWrap(toP - boss.yaw) * Math.min(1, dt * 2.2);
    else { boss.dashX = Math.sin(boss.yaw + angWrap(toP - boss.yaw) * 0.3); boss.dashZ = Math.cos(boss.yaw + angWrap(toP - boss.yaw) * 0.3); boss.yaw += angWrap(toP - boss.yaw) * Math.min(1, dt * 1.6); }
    if (boss.t >= m.wind * (boss.phase === 2 ? 0.82 : 1)) { boss.st = 'act'; boss.t = 0; sSwing(); }
    return;
  }
  if (boss.st === 'act') {
    if (boss.move === 'charge') {
      boss.x += boss.dashX * 12 * dt;
      boss.z += boss.dashZ * 12 * dt;
      clampBoss();
    }
    if (!boss.hitDone && boss.t > m.act * 0.3) {
      var ang = Math.abs(angWrap(Math.atan2(dx, dz) - boss.yaw));
      if (dist < m.rng + 1.4 && (m.arc > 6 || ang < m.arc / 2)) {
        hurtPlayer(m.dmg + (boss.phase === 2 ? 6 : 0), boss.x, boss.z);
        boss.hitDone = true;
      }
      if (boss.move === 'slam' && boss.hitDone) shockwave(boss.x + Math.sin(boss.yaw) * 3, boss.z + Math.cos(boss.yaw) * 3);
      if (boss.move === 'burst' && boss.t > m.act * 0.5) {
        for (var i = 0; i < 10; i++) {
          var a = i / 10 * Math.PI * 2;
          var mm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.goldHot);
          mm.position.set(boss.x, boss.y + 1.6, boss.z);
          scene.add(mm);
          shots.push({ m: mm, vx: Math.cos(a) * 11, vz: Math.sin(a) * 11, vy: 1.2, life: 2.6, dmg: 22 });
        }
        boss.hitDone = true;
      }
    }
    if (boss.t >= m.act) { boss.st = 'rec'; boss.t = 0; }
    return;
  }
  if (boss.st === 'rec') {
    boss.anim += dt * 0.6;
    if (boss.t >= m.rec * (boss.phase === 2 ? 0.78 : 1)) {
      boss.st = 'idle'; boss.t = 0;
      boss.next = (boss.phase === 2 ? 0.5 : 1.0) + Math.random() * (boss.phase === 2 ? 0.9 : 1.6);
    }
  }
}
function clampBoss(){
  var d = Math.hypot(boss.x - ARENA.x, boss.z - ARENA.z);
  var lim = ARENA.r - 1.6;
  if (d > lim) {
    var a = Math.atan2(boss.x - ARENA.x, boss.z - ARENA.z);
    boss.x = ARENA.x + Math.sin(a) * lim;
    boss.z = ARENA.z + Math.cos(a) * lim;
  }
}
var waves = [];
function shockwave(x, z){
  var m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 20),
    new THREE.MeshBasicMaterial({ color: 0xd9b45e, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, hAt(x, z) + 0.12, z);
  scene.add(m);
  waves.push({ m: m, t: 0 });
  sparks(x, hAt(x, z) + 0.4, z, 12);
}
function updateWaves(dt){
  for (var i = waves.length - 1; i >= 0; i--) {
    var w = waves[i];
    w.t += dt;
    var k = w.t / 0.55;
    w.m.scale.setScalar(1 + k * 6);
    w.m.material.opacity = Math.max(0, 0.6 * (1 - k));
    if (k >= 1) { scene.remove(w.m); waves.splice(i, 1); }
  }
}
function angWrap(a){ return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }

function poseBoss(dt){
  if (!boss) return;
  var B = boss.P, t = boss.anim;
  boss.y = hAt(boss.x, boss.z);
  boss.g.position.set(boss.x, boss.y, boss.z);
  boss.g.rotation.y = boss.yaw;
  var breathe = Math.sin(t * 1.5) * 0.05;
  B.torso.position.y = breathe;
  B.torso.rotation.x = 0.1 + breathe * 0.4;
  B.tail.rotation.y = Math.sin(t * 1.2) * 0.3;
  if (boss.st === 'sleep') {
    B.torso.rotation.x = 0.7;
    B.head.rotation.x = 0.5;
    B.arms[1].sh.rotation.x = 0.2;
    B.arms[0].sh.rotation.x = 0.2;
    return;
  }
  if (boss.st === 'dead') {
    boss.dead += dt;
    var dk = Math.min(1, boss.dead / 1.8);
    boss.g.rotation.x = dk * 1.45;
    boss.g.position.y = boss.y - dk * 0.5;
    B.arms[1].sh.rotation.x = 0.4 * dk;
    B.head.rotation.x = 0.6 * dk;
    if (boss.dead < 0.3) sparks(boss.x, boss.y + 2.4, boss.z, 3);
    return;
  }
  var walk = (boss.st === 'idle') ? Math.sin(t * 3.2) : 0;
  B.legs[0].hp.rotation.x = walk * 0.5;
  B.legs[1].hp.rotation.x = -walk * 0.5;
  B.legs[0].kn.rotation.x = Math.max(0, -walk) * 0.6;
  B.legs[1].kn.rotation.x = Math.max(0, walk) * 0.6;
  B.arms[0].sh.rotation.x = -walk * 0.4;

  var a = B.arms[1];
  var m = BOSS_MOVES[boss.move] || BOSS_MOVES.slam;
  if (boss.st === 'wind') {
    var k = Math.min(1, boss.t / m.wind);
    if (boss.move === 'sweep') { a.sh.rotation.z = -2.0 * k; a.sh.rotation.x = -0.4 * k; }
    else if (boss.move === 'charge') { a.sh.rotation.x = 0.6 * k; a.sh.rotation.z = -0.3 * k; B.torso.rotation.x = 0.1 + 0.3 * k; }
    else { a.sh.rotation.x = -2.5 * k; a.sh.rotation.z = -0.2 * k; }
  } else if (boss.st === 'act') {
    var k2 = Math.min(1, boss.t / m.act);
    if (boss.move === 'sweep') { a.sh.rotation.z = -2.0 + 3.4 * k2; a.sh.rotation.x = -0.4 + 0.5 * k2; }
    else if (boss.move === 'charge') { a.sh.rotation.x = 0.6 - 0.4 * k2; B.torso.rotation.x = 0.4; }
    else { a.sh.rotation.x = -2.5 + 3.5 * k2; }
  } else {
    a.sh.rotation.x += (0.15 - a.sh.rotation.x) * Math.min(1, dt * 4);
    a.sh.rotation.z += (0 - a.sh.rotation.z) * Math.min(1, dt * 4);
  }
  if (boss.flash > 0) boss.flash -= dt;
}

