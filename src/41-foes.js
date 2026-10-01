/* ================= вороги ================= */
var foes = [];
var FOE = {
  grunt: { hp: 58, dmg: 13, sp: 2.1, agr: 11, rng: 1.9, wind: 0.62, act: 0.18, rec: 0.66, roe: 40, s: 0.95,
           poise: 26, leash: 19, r: 0.55, name: 'Полеглий короп' },
  brute: { hp: 132, dmg: 26, sp: 1.5, agr: 10, rng: 2.4, wind: 0.95, act: 0.24, rec: 1.0, roe: 110, s: 1.35,
           poise: 70, leash: 15, r: 0.85, name: 'Пузир' },
  caster:{ hp: 46, dmg: 15, sp: 1.6, agr: 15, rng: 13, wind: 1.05, act: 0.15, rec: 1.2, roe: 70, s: 0.95,
           poise: 16, leash: 17, r: 0.5, ranged: true, name: 'Муляр' }
};
// дев'ятеро замість тринадцяти, трьома осередками, а не рівним шаром
var SPAWNS = [
  ['grunt', 4, 52], ['grunt', -4, 38],          // дорога від каплиці
  ['grunt', 20, 25], ['grunt', 27, 17], ['brute', 17, 13],   // селище
  ['caster', -41, 4],                            // дольмен
  ['brute', 5, -16], ['grunt', 14, -32],         // міст і далі
  ['caster', -23, -30]                           // вежа
];

function makeFoe(kind, x, z){
  var d = FOE[kind];
  var cfg = kind === 'caster'
    ? { s: d.s, body: M.cloth, belly: M.foeB, fin: M.foeA, skin: M.foeSkin, hairs: 1 }
    : { s: d.s, body: M.foeA, belly: M.foeB, fin: M.rust, skin: M.foeSkin, hairs: kind === 'brute' ? 0 : 2 };
  var g = buildFish(cfg);
  (zoneRoot || scene).add(g);
  var pr = g.userData.P;
  var wep = null;
  if (kind === 'caster') {
    wep = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.5, 5), M.wood);
    wep.position.y = -0.55; wep.rotation.x = 0.3;
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.rust);
    orb.position.y = 0.78; wep.add(orb);
  } else {
    var bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1 * d.s, 0.22), M.rust);
    bl.position.y = -0.55 * d.s;
    wep = new THREE.Group(); wep.add(bl);
    var gd = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.4), M.rust);
    gd.position.y = -0.04; wep.add(gd);
    if (kind === 'brute') { bl.scale.set(2.0, 1.15, 1.6); }
  }
  pr.arms[1].hand.add(wep);
  if (kind === 'brute') {
    var bel = new THREE.Mesh(new THREE.SphereGeometry(0.4 * d.s, 12, 9), M.foeB);
    bel.scale.set(1.15, 1.0, 1.1); bel.position.set(0, 0.06 * d.s, 0.16 * d.s);
    pr.torso.add(bel);
  }
  // матеріали в кожного свої, інакше спалах від удару блимав би на всій орді
  var mats = [];
  g.traverse(function(o){
    if (o.isMesh && o.material && o.material.emissive) {
      o.material = o.material.clone();
      if (mats.indexOf(o.material) < 0) { o.material.userData.base = o.material.emissive.getHex(); mats.push(o.material); }
    }
  });
  var f = {
    kind: kind, d: d, g: g, P: pr, wep: wep, mats: mats,
    x: x, z: z, y: 0, yaw: rnd() * 6.28, hp: d.hp, hpMax: d.hp,
    st: 'idle', t: 0, anim: rnd() * 6, hitDone: false, stagger: 0, dead: 0,
    hx: x, hz: z, pat: rnd() * 6.28, alive: true, flash: 0, poise: 0
  };
  foes.push(f);
  return f;
}
function spawnAll(){
  for (var i = 0; i < foes.length; i++) { scene.remove(foes[i].g); disposeTree(foes[i].g); }
  foes.length = 0;
  var list = (ZONE && ZONE.foes) || SPAWNS;
  for (var k = 0; k < list.length; k++) makeFoe(list[k][0], list[k][1], list[k][2]);
}

// ворогів не пускаємо в ущелину й залу боса — вони туди забредали й заважали
function keepOut(f){ if (ZONE && ZONE.keepOut) ZONE.keepOut(f); }
function moveFoe(f, vx, vz, dt){
  var nx = f.x + vx * dt, nz = f.z + vz * dt;
  var r = resolve(nx, nz, f.d.r);
  f.x = r[0]; f.z = r[1];
  keepOut(f);
}

/* снаряди мулярів */
var shots = [];
function castMud(f){
  var m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), M.rust);
  var y = f.y + 1.2;
  m.position.set(f.x, y, f.z);
  scene.add(m);
  var dx = P.x - f.x, dz = P.z - f.z, dy = (P.y + 1) - y;
  var d = Math.hypot(dx, dz) || 1;
  var sp = 15;
  shots.push({ m: m, vx: dx / d * sp, vz: dz / d * sp, vy: dy / d * sp * 0.5 + 2.4, life: 3, dmg: f.d.dmg });
  if (ok()) { var t = AC.currentTime; nz(t, 0.2, 600, 1.2, 0.10, null, 200); }
}

