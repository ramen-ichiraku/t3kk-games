/* ================= камера ================= */
function updateCamera(dt){
  var tx = P.x, ty = P.y + 1.35, tz = P.z;
  if (G.lock) {
    var dx = G.lock.x - P.x, dz = G.lock.z - P.z;
    camYaw = Math.atan2(dx, dz) + Math.PI;
    camPitch += (0.13 - camPitch) * Math.min(1, dt * 2.2);
    lockBlend = Math.min(1, lockBlend + dt * 2.2);
  } else lockBlend = Math.max(0, lockBlend - dt * 4);
  // кути доганяють ціль м'яко: сира миша давала ривки, а захоплення — різкий розворот
  var turn = G.lock ? 3.2 + lockBlend * 4 : 9;
  camYawS += angWrap(camYaw - camYawS) * Math.min(1, dt * turn);
  camPitchS += (camPitch - camPitchS) * Math.min(1, dt * 9);
  var camYaw0 = camYaw, camPitch0 = camPitch;
  camYaw = camYawS; camPitch = camPitchS;
  var camDist = (G.lock && G.lock === boss) ? 11.0 : 7.9;
  var dist = camDist;
  // камера трохи праворуч від осі: інакше герой затуляє того, з ким б'єшся
  camSide += ((G.lock ? 1.25 : 0.95) - camSide) * Math.min(1, dt * 5);
  var rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  // Йдемо від героя назовні по ТІЙ САМІЙ лінії, на якій камера реально стане,
  // разом із виносом убік. Раніше перевірялась лише осьова лінія, і біля
  // будинку винос заштовхував камеру крізь стіну — всередині було видно балки.
  for (var i = 1; i <= 12; i++) {
    var tt = i / 12;
    var sx2 = tx + (Math.sin(camYaw) * Math.cos(camPitch) * camDist + rx * camSide) * tt;
    var sz2 = tz + (Math.cos(camYaw) * Math.cos(camPitch) * camDist + rz * camSide) * tt;
    var sy2 = ty + (Math.sin(camPitch) * camDist + 0.62) * tt;
    if (sy2 < hAt(sx2, sz2) + 0.6 || blocked(sx2, sz2, sy2, 0.45)) { dist = camDist * (i - 1) / 12; break; }
  }
  if (dist < 2.6) dist = 2.6;
  // наближення різке, віддалення повільне — інакше камера смикається біля кожного каменя
  camDistNow += (dist - camDistNow) * Math.min(1, dt * (dist < camDistNow ? 18 : 3.5));
  dist = camDistNow;
  // винос убік стискається разом з відстанню, інакше впритул до стіни
  // камера з'їжджає вбік сильніше, ніж назад
  var sideNow = camSide * (dist / camDist);
  var want = new THREE.Vector3(
    tx + Math.sin(camYaw) * Math.cos(camPitch) * dist + rx * sideNow,
    ty + Math.sin(camPitch) * dist + 0.62 * (dist / camDist),
    tz + Math.cos(camYaw) * Math.cos(camPitch) * dist + rz * sideNow
  );
  var gh = hAt(want.x, want.z) + 0.7;
  if (want.y < gh) want.y = gh;
  camNow.lerp(want, Math.min(1, dt * 11));
  camera.position.copy(camNow);
  var lx = tx + rx * sideNow * 0.55, lz = tz + rz * sideNow * 0.55;
  if (G.lock) {
    // дивимось у точку між героєм і ціллю, щоб обидва були в кадрі
    lx = tx + (G.lock.x - tx) * 0.34 + rx * sideNow * 0.3;
    lz = tz + (G.lock.z - tz) * 0.34 + rz * sideNow * 0.3;
  }
  camera.lookAt(lx, ty + (G.lock ? 0.8 : 0.55), lz);
  camYaw = camYaw0; camPitch = camPitch0;
  // впритул героя не видно — робимо його напівпрозорим
  var fadeK = dist < 3.9 ? Math.max(0.5, (dist - 3.0) / 0.9) : 1;
  if (fadeK !== P.lastFade) {
    P.lastFade = fadeK;
    for (var fi = 0; fi < PMATS.length; fi++) {
      PMATS[fi].transparent = fadeK < 0.99;
      PMATS[fi].opacity = fadeK;
    }
  }
}
function toggleLock(){
  if (G.lock) { G.lock = null; UI.lock.classList.remove('on'); return; }
  // тільки те, що попереду: раніше камера різко розверталась на ворога за спиною
  var fwd = camYaw + Math.PI;
  var best = null, bestScore = 1e9;
  function consider(o, maxD){
    var dx = o.x - P.x, dz = o.z - P.z;
    var d = Math.hypot(dx, dz);
    if (d > maxD) return;
    var off = Math.abs(angWrap(Math.atan2(dx, dz) - fwd));
    if (off > 0.95) return;
    var score = off * 14 + d;
    if (score < bestScore) { bestScore = score; best = o; }
  }
  for (var i = 0; i < foes.length; i++) if (foes[i].alive) consider(foes[i], 26);
  if (boss && !boss.dead && G.bossOn) consider(boss, 34);
  if (!best) {
    // нема на кого — камеру не чіпаємо, лише тихий відмовний клац
    if (ok()) nz(AC.currentTime, 0.06, 1400, 2.5, 0.05);
    return;
  }
  G.lock = best;
  lockBlend = 0;
  UI.lock.classList.add('on');
  if (ok()) { var t = AC.currentTime; tone(t, 660, 0.08, 'triangle', 0.07); tone(t + 0.05, 880, 0.09, 'sine', 0.05); }
}

