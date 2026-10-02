/* ================= рух гравця ================= */
var camYaw = 0, camPitch = 0.10, camDist = 6.2, camNow = new THREE.Vector3();
var camYawS = 0, camPitchS = 0.10, camDistNow = 6.2, camSens = 0.0012;
var camSide = 0;                 // зміщення через плече, щоб герой не затуляв ціль
var lockBlend = 0;
function exitLock(){ if (document.exitPointerLock) document.exitPointerLock(); }

function updatePlayer(dt){
  if (P.stLock > 0) P.stLock -= dt;
  if (P.inv > 0) P.inv -= dt;
  if (P.stagger > 0) P.stagger -= dt;

  // камера від миші
  camYaw -= mouse.dx * camSens;
  camPitch += mouse.dy * camSens * 0.8;
  camPitch = Math.max(-0.42, Math.min(0.86, camPitch));
  mouse.dx = 0; mouse.dy = 0;

  if (P.dead) { P.dead += dt; return; }

  // напрямок руху відносно камери
  var ix = 0, iz = 0;
  if (keys.KeyW) iz += 1;
  if (keys.KeyS) iz -= 1;
  if (keys.KeyA) ix -= 1;
  if (keys.KeyD) ix += 1;
  if (touchMove) { ix += touchMove.dx / 58; iz -= touchMove.dy / 58; }
  var il = Math.hypot(ix, iz);
  if (il > 1) { ix /= il; iz /= il; il = 1; }

  // камера стоїть у (sin cy, cos cy)·d від героя, тож «уперед» — це протилежний вектор,
  // а «вправо» — він же, повернутий на чверть оберту
  var cy = camYaw;
  var wx = -Math.sin(cy) * iz + Math.cos(cy) * ix;
  var wz = -Math.cos(cy) * iz - Math.sin(cy) * ix;

  P.block = mouse.rmb && P.atk <= 0 && P.roll <= 0 && P.stagger <= 0 && P.st > 4;
  // пробіл: коротке натискання — перекат, утримання — біг
  if (keys.Space) { P.spaceHold += dt; } else {
    if (P.spaceHold > 0 && P.spaceHold < 0.22 && P.roll <= 0 && P.atk <= 0 && P.stagger <= 0 && P.st >= 24) {
      P.roll = 0.001; P.inv = 0.38; P.st -= 24; P.stLock = 0.55;
      var rl = Math.hypot(wx, wz);
      if (rl < 0.1) P.rollDir.set(Math.sin(P.yaw), Math.cos(P.yaw));
      else P.rollDir.set(wx / rl, wz / rl);
      sRoll();
    }
    P.spaceHold = 0;
  }
  var sprint = P.spaceHold > 0.22 && il > 0.1 && P.st > 6 && !P.block && P.atk <= 0;

  var speed = 0;
  if (P.roll > 0) {
    P.roll += dt;
    var rk = Math.min(1, P.roll / 0.52);
    speed = 9.5 * (1 - rk * 0.72);
    wx = P.rollDir.x; wz = P.rollDir.y;
    if (P.roll >= 0.52) P.roll = 0;
  } else if (P.atk > 0) {
    speed = 0.7;
  } else if (P.stagger > 0) {
    speed = 0.4;
  } else if (il > 0.05) {
    speed = (sprint ? RUN : (P.block ? WALK * 0.5 : WALK)) * il;
    if (sprint) { P.st -= 13 * dt; P.stLock = 0.35; }
  }

  if (speed > 0 && (Math.abs(wx) + Math.abs(wz)) > 0.001) {
    var nx = P.x + wx * speed * dt, nz = P.z + wz * speed * dt;
    var r = resolve(nx, nz, PR);
    P.x = r[0]; P.z = r[1];
  }

  // поворот тіла
  var want = P.yaw;
  if (G.lock && !P.roll) {
    want = Math.atan2(G.lock.x - P.x, G.lock.z - P.z);
  } else if (P.roll > 0) {
    want = Math.atan2(P.rollDir.x, P.rollDir.y);
  } else if (il > 0.05 && P.atk <= 0) {
    want = Math.atan2(wx, wz);
  }
  P.yaw += angWrap(want - P.yaw) * Math.min(1, dt * (P.roll > 0 ? 18 : 10));

  // розштовхування з ворогами: раніше можна було стояти всередині моделі
  for (var fi = 0; fi < foes.length; fi++) {
    var ff = foes[fi];
    if (!ff.alive) continue;
    var ex = P.x - ff.x, ez = P.z - ff.z;
    var ed = Math.hypot(ex, ez), need = PR + ff.d.r + 0.12;
    if (ed < need && ed > 0.001) {
      var push = (need - ed) * 0.5;
      P.x += ex / ed * push; P.z += ez / ed * push;
      ff.x -= ex / ed * push; ff.z -= ez / ed * push;
      keepOut(ff);
    }
  }

  // тяжіння
  var gy = hAt(P.x, P.z);
  P.y += P.vy * dt;
  P.vy -= GRAV * dt;
  if (P.y <= gy) { P.y = gy; P.vy = 0; P.grounded = true; } else P.grounded = false;

  // удар
  if (P.atk > 0) {
    P.atk += dt;
    var w = swingWindows();
    if (!P.hitDone && P.atk >= w[0]) { P.hitDone = true; doHitCheck(); }
    if (P.atk >= w[2]) {
      P.atk = 0; P.swordDrive = 0;
      var q = P.combo; P.combo = 0;
      if (q && P.st >= (q === 2 ? 34 : 20)) startSwing(q === 2);
      else P.atkStage = -1;
    }
  } else {
    P.swordDrive += (0 - P.swordDrive) * Math.min(1, dt * 6);
  }

  // витривалість
  if (P.stLock <= 0 && !P.block) P.st = Math.min(P.stMax, P.st + 34 * dt);
  else if (P.block) P.st = Math.min(P.stMax, P.st + 8 * dt);
  P.st = Math.max(0, P.st);

  P.anim += dt * (speed > WALK + 0.5 ? 9 : 5.4) * (speed > 0.2 ? 1 : 0.18);
  posePlayer(dt, speed, il);
}

/* Кожен удар описаний трьома позами: спокій, замах, проводка.
   Раніше рухалось лише плече, тож удар виглядав як помах рукою. */
function sm(t){ t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
function fo(t){ t = t < 0 ? 0 : (t > 1 ? 1 : t); return 1 - Math.pow(1 - t, 3); }
var REST_POSE = { shx:0.15, shz:0.12, elx:-0.55, torY:0, torX:0, hipY:0, step:0, lshx:0, headY:0, drive:0 };
var ATK_POSE = [
  { // 0 — діагональ згори-справа
    wind: { shx:-1.95, shz:-0.70, elx:-1.05, torY: 0.62, torX:-0.14, hipY: 0.32, step:-0.14, lshx: 0.55, headY: 0.30, drive:-1.5 },
    hit:  { shx: 0.95, shz: 0.78, elx:-0.14, torY:-0.58, torX: 0.22, hipY:-0.26, step: 0.32, lshx:-0.45, headY:-0.26, drive: 1.7 }
  },
  { // 1 — горизонталь зліва направо
    wind: { shx:-0.55, shz:-1.80, elx:-1.15, torY:-0.78, torX: 0.02, hipY:-0.36, step:-0.12, lshx:-0.55, headY:-0.36, drive:-1.3 },
    hit:  { shx:-0.12, shz: 1.55, elx:-0.18, torY: 0.74, torX: 0.12, hipY: 0.32, step: 0.30, lshx: 0.55, headY: 0.32, drive: 1.6 }
  },
  { // 2 — завершальний, з розмаху згори
    wind: { shx:-2.75, shz: 0.02, elx:-0.95, torY: 0.36, torX:-0.32, hipY: 0.16, step:-0.18, lshx: 0.35, headY: 0.16, drive:-1.8 },
    hit:  { shx: 1.20, shz: 0.10, elx:-0.08, torY:-0.28, torX: 0.42, hipY:-0.12, step: 0.46, lshx:-0.35, headY:-0.42, drive: 2.1 }
  },
  { // 3 — важкий, двома руками
    wind: { shx:-2.95, shz:-0.16, elx:-0.72, torY: 0.20, torX:-0.46, hipY: 0.10, step:-0.24, lshx:-2.60, headY: 0.12, drive:-2.2 },
    hit:  { shx: 1.40, shz: 0.06, elx: 0.02, torY:-0.16, torX: 0.58, hipY:-0.06, step: 0.58, lshx: 1.15, headY:-0.52, drive: 2.6 }
  }
];
var POSE_KEYS = ['shx','shz','elx','torY','torX','hipY','step','lshx','headY','drive'];
var poseTmp = {};
function mixPose(A, B, t){
  for (var i = 0; i < POSE_KEYS.length; i++) {
    var k = POSE_KEYS[i];
    poseTmp[k] = A[k] + (B[k] - A[k]) * t;
  }
  return poseTmp;
}

function posePlayer(dt, speed, il){
  player.position.set(P.x, P.y, P.z);
  player.rotation.y = P.yaw;
  var t = P.anim;
  var moving = speed > 0.3 ? 1 : 0;

  if (P.roll > 0) {
    var rk = P.roll / 0.52;
    PP.hip.rotation.x = rk * Math.PI * 2;
    PP.hip.position.y = (PP.hipY || 0.92 * 1.05) - Math.sin(rk * Math.PI) * 0.34;
    player.position.y = P.y;
  } else {
    PP.hip.rotation.x += (0 - PP.hip.rotation.x) * Math.min(1, dt * 12);
    PP.hip.position.y += ((PP.hipY || 0.92 * 1.05) - PP.hip.position.y) * Math.min(1, dt * 10);
  }

  var sw = Math.sin(t) * moving;
  if (P.atk <= 0) {
    PP.legs[0].hp.rotation.x = sw * 0.66;
    PP.legs[1].hp.rotation.x = -sw * 0.66;
    PP.legs[0].kn.rotation.x = Math.max(0, -sw) * 0.85;
    PP.legs[1].kn.rotation.x = Math.max(0, sw) * 0.85;
    PP.torso.rotation.x = 0.06 + moving * 0.12 + Math.sin(t * 2) * 0.02;
    PP.head.rotation.y = Math.sin(t * 0.5) * 0.06;
  }
  PP.tail.rotation.y = Math.sin(t * 0.9 + 1) * (0.2 + moving * 0.3);
  if (PP.hairs) for (var h = 0; h < PP.hairs.length; h++) {
    PP.hairs[h].rotation.z = Math.sin(G.t * 5 + h) * 0.28 - moving * 0.3;
    PP.hairs[h].rotation.x = -moving * 0.5;
  }

  var a = PP.arms[1], la = PP.arms[0];
  if (P.atk > 0) {
    var w = swingWindows();
    var tA = w[0], tB = w[0] + w[1], tot = w[2];
    var S0 = ATK_POSE[P.atkStage < 0 ? 0 : P.atkStage] || ATK_POSE[0];
    var pose;
    if (P.atk < tA) {
      // замах: повільно, з відведенням корпусу назад
      pose = mixPose(REST_POSE, S0.wind, sm(P.atk / tA));
    } else if (P.atk < tB) {
      // проводка: різко, з доворотом корпусу й кроком уперед
      pose = mixPose(S0.wind, S0.hit, fo((P.atk - tA) / (tB - tA)));
    } else {
      // повернення в стійку
      pose = mixPose(S0.hit, REST_POSE, sm((P.atk - tB) / Math.max(0.001, tot - tB)));
    }
    a.sh.rotation.x = pose.shx; a.sh.rotation.z = pose.shz; a.el.rotation.x = pose.elx;
    la.sh.rotation.x = pose.lshx; la.el.rotation.x = -0.3 - Math.abs(pose.lshx) * 0.2;
    PP.torso.rotation.y = pose.torY;
    PP.torso.rotation.x = 0.06 + pose.torX;
    PP.hip.rotation.y = pose.hipY;
    PP.hip.position.z = pose.step;
    PP.head.rotation.y = pose.headY;
    // ноги роблять крок, а не стоять колом
    PP.legs[0].hp.rotation.x = -pose.step * 1.9;
    PP.legs[1].hp.rotation.x = pose.step * 1.1;
    PP.legs[0].kn.rotation.x = Math.max(0, pose.step) * 0.7;
    PP.legs[1].kn.rotation.x = Math.max(0, -pose.step) * 0.9;
    P.swordDrive = pose.drive;
  } else {
    var sp2 = Math.min(1, dt * 9);
    PP.torso.rotation.y += (0 - PP.torso.rotation.y) * sp2;
    PP.hip.rotation.y += (0 - PP.hip.rotation.y) * sp2;
    PP.hip.position.z += (0 - PP.hip.position.z) * sp2;
    la.sh.rotation.x += (-sw * 0.55 - la.sh.rotation.x) * sp2;
    la.el.rotation.x += (-0.3 - la.el.rotation.x) * sp2;
    if (P.block) {
      a.sh.rotation.x += (-1.05 - a.sh.rotation.x) * Math.min(1, dt * 12);
      a.sh.rotation.z += (0.85 - a.sh.rotation.z) * Math.min(1, dt * 12);
      a.el.rotation.x += (-0.9 - a.el.rotation.x) * Math.min(1, dt * 12);
      PP.torso.rotation.y += (0.3 - PP.torso.rotation.y) * sp2;
    } else {
      a.sh.rotation.x += (0.15 + sw * 0.25 - a.sh.rotation.x) * sp2;
      a.sh.rotation.z += (0.12 - a.sh.rotation.z) * sp2;
      a.el.rotation.x += (-0.55 - a.el.rotation.x) * sp2;
    }
  }
  wobbleSword(sword, G.t, P.swordDrive);
  if (P.stagger > 0) PP.torso.rotation.x -= 0.3;
}

