/* ================= гравець ================= */
var player = buildFish({ s: 1.05, body: M.scale, belly: M.scaleD, fin: M.fin, skin: M.skin, hairs: 3 });
scene.add(player);
var PP = player.userData.P;
var PMATS = [];
player.traverse(function(o){
  if (o.isMesh && o.material) {
    o.material = o.material.clone();
    if (PMATS.indexOf(o.material) < 0) PMATS.push(o.material);
  }
});
var sword = buildSword(1.05);
PP.arms[1].hand.add(sword);
// Лезо росте вздовж +Y від руків'я, а долоня дивиться вниз по -Y. Поворот на
// +90 градусів навколо X кладе лезо вздовж +Z, тобто вперед — туди ж, куди
// дивиться герой. Зі знаком мінус лезо дивилось рівно назад.
sword.rotation.set(Math.PI / 2, 0, 0.16);

var P = {
  x: CHAPEL.x, y: 0, z: CHAPEL.z + 1.8, vy: 0, yaw: Math.PI,
  hp: 100, hpMax: 100, st: 100, stMax: 100, stLock: 0,
  flasks: 3, flasksMax: 3, roe: 0,
  vit: 1, end: 1, str: 1,
  atk: 0, atkStage: 0, combo: 0, hitDone: false,
  roll: 0, rollDir: new THREE.Vector2(0, 1), inv: 0,
  block: false, stagger: 0, dead: 0, grounded: true,
  anim: 0, lean: 0, swordDrive: 0, spaceHold: 0, heavy: false, respawnAt: { x: FIRE.x, z: FIRE.z + 2.2 }
};
function statHp(){ return 78 + P.vit * 22; }
function statSt(){ return 82 + P.end * 18; }
function statDmg(){ return 16 + P.str * 8; }
function levelCost(){ return 120 + (P.vit + P.end + P.str - 3) * 95; }

/* ================= стан гри ================= */
var G = {
  mode: 'start',          // start | play | pause | fire | dead | win
  t: 0, freeze: 0, inChapel: true, area: '', bossOn: false, bossDead: false, fire: null,
  lock: null, prompt: null, roeDrop: null
};

