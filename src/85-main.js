/* ================= головний цикл ================= */
P.hpMax = statHp(); P.stMax = statSt(); P.hp = P.hpMax; P.st = P.stMax;

/* Світ будується аж після того, як прийдуть моделі: зони питають model(),
   і без зразків вони б намалювали примітиви. Кнопку старту до того тримаємо
   вимкненою, інакше гравець потрапить у недобудований світ. */
var __bGo = document.getElementById('bGo');
var __bGoText = __bGo.textContent;
__bGo.disabled = true;
__bGo.textContent = 'Завантаження…';
loadModels(function(){
  initPlayer();
  loadZone('field');
  makeBoss();
  syncUI();
  G.ready = true;
  __bGo.disabled = false;
  __bGo.textContent = __bGoText;
  requestAnimationFrame(frame);
});

/* ---- автоматична якість ----
   Пост-обробка й тіні коштують стільки ж, скільки вся геометрія разом.
   На потужній машині це непомітно, на слабкій — гра перетворюється на слайди,
   тож міряємо справжній час кадру й зрізаємо шари, поки не стане грабельно. */
var QA = { n: 0, acc: 0, step: 0 };
function autoQuality(dt){
  if (LOWFX || FXMAX || QA.step >= 3 || G.mode !== 'play') return;
  QA.n++; QA.acc += dt;
  if (QA.n < 90) return;
  var ms = QA.acc / QA.n * 1000;
  QA.n = 0; QA.acc = 0;
  if (ms < 30) { QA.step = 3; return; }      // тягне — більше не чіпаємо
  var pm = bscene.postProcessRenderPipelineManager, bc = camera.__b;
  QA.step++;
  try {
    if (QA.step === 1) {
      pm.detachCamerasFromRenderPipeline('ssao', bc);
    } else if (QA.step === 2) {
      if (shadowGen) { shadowGen.getShadowMap().renderList.length = 0; }
      for (var i = 0; i < bscene.meshes.length; i++) bscene.meshes[i].receiveShadows = false;
    } else {
      pm.detachCamerasFromRenderPipeline('look', bc);
    }
  } catch (e) { QA.step = 3; }
}

var last = 0, acc = 0;
function frame(now){
  requestAnimationFrame(frame);
  if (!last) last = now;
  var dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  // мікрозупинка на влучанні: без неї удар не відчувається
  if (G.freeze > 0) { G.freeze -= dt; if (G.mode === 'play') { updateCamera(dt); renderer.render(scene, camera); return; } }
  G.t += dt;
  autoQuality(dt);

  if (G.mode === 'play') {
    updatePlayer(dt);
    for (var i = 0; i < foes.length; i++) foeThink(foes[i], dt);
    separateFoes();
    for (var i2 = 0; i2 < foes.length; i2++) poseFoe(foes[i2], dt);
    updateFx(dt);
    bossThink(dt);
    poseBoss(dt);
    updateWaves(dt);
    updateShots(dt);
    checkZones(dt);
    musicTick();
    syncUI();
  } else if (G.mode === 'dead') {
    updatePlayer(dt);
    for (var j = 0; j < foes.length; j++) poseFoe(foes[j], dt);
    poseBoss(dt);
  }
  updateCamera(dt);
  animateWorld(dt);
  renderer.render(scene, camera);
}

function updateShots(dt){
  for (var i = shots.length - 1; i >= 0; i--) {
    var s = shots[i];
    s.life -= dt;
    s.vy -= 11 * dt;
    s.m.position.x += s.vx * dt;
    s.m.position.y += s.vy * dt;
    s.m.position.z += s.vz * dt;
    var hitGround = s.m.position.y < hAt(s.m.position.x, s.m.position.z);
    var d = Math.hypot(s.m.position.x - P.x, s.m.position.z - P.z);
    var dy = Math.abs(s.m.position.y - (P.y + 1));
    if (d < 0.9 && dy < 1.3) { hurtPlayer(s.dmg, s.m.position.x, s.m.position.z); s.life = 0; }
    if (s.life <= 0 || hitGround) { scene.remove(s.m); shots.splice(i, 1); }
  }
}

function checkZones(dt){
  // підказка взаємодії
  var n = nearest();
  if ((n && (!G.prompt || n.kind !== G.prompt.kind)) || (!n && G.prompt)) {
    G.prompt = n;
    setPrompt(n ? n.txt : null);
  } else if (n && G.prompt && n.kind === 'roe') {
    G.prompt = n; setPrompt(n.txt);
  }
  // туманна завіса — вхід до боса
  if (!G.bossOn && !G.bossDead && gateMesh.visible) {
    var gz = gateMesh.position.z;
    if (Math.abs(P.x - GX) < 6 && P.z < gz && P.z > gz - 7) {
      G.bossOn = true;
      gateMesh.visible = false;
      boss.st = 'idle'; boss.t = 0; boss.next = 0.8;
      UI.bossName.textContent = 'Лящ, Перший з Мулу';
      UI.boss.classList.add('on');
      showArea('Лящ, Перший з Мулу');
      MU.boss = true; MU.step = 0;
      sBossRoar();
    }
  }
  // назви місцин
  if (!G.inChapel && G.area !== 'mid' && P.z < 20) { G.area = 'mid'; }
  if (G.bossOn && boss && boss.dead) MU.boss = false;
}

function animateWorld(dt){
  // мерехтіння вогню
  for (var i = 0; i < flames.length; i++) {
    var f = flames[i];
    f.p += dt * (6 + i % 3);
    var k = 0.82 + Math.sin(f.p) * 0.1 + Math.sin(f.p * 2.7) * 0.07;
    f.mesh.scale.setScalar(k);
    if (f.base === undefined) f.base = f.light.intensity;
    f.light.intensity = f.base * k;
  }
  // полум'я вогнищ і іскри
  for (var q = 0; q < fireObjs.length; q++) {
    var fo = fireObjs[q];
    for (var fl = 0; fl < fo.flames.length; fl++) {
      var ph = G.t * (5 + fl * 1.7) + q * 2;
      fo.flames[fl].scale.set(0.85 + Math.sin(ph) * 0.14, 0.8 + Math.sin(ph * 1.6) * 0.26, 0.85 + Math.cos(ph) * 0.14);
      fo.flames[fl].rotation.y = Math.sin(ph * 0.6) * 0.3;
    }
    for (var e = 0; e < fo.emb.length; e++) {
      var em = fo.emb[e];
      em.t += dt * em.sp;
      if (em.t > 1) { em.t = 0; em.a = Math.random() * 6.28; em.r = 0.15 + Math.random() * 0.5; }
      em.m.position.set(Math.cos(em.a) * em.r * (1 + em.t), 0.5 + em.t * 3.2, Math.sin(em.a) * em.r * (1 + em.t));
      em.m.scale.setScalar(Math.max(0.1, 1 - em.t));
    }
  }
  // руни пульсують
  for (var rn = 0; rn < runes.length; rn++) {
    var R = runes[rn];
    R.p += dt * 1.6;
    var k = 0.7 + Math.sin(R.p) * 0.3;
    R.light.intensity = 0.35 + k * 0.35;
    R.mark.scale.setScalar(0.9 + k * 0.18);
    R.mark.rotation.z = R.p * 0.4;
  }
  // двері
  for (var d = 0; d < doorLeaves.length; d++) {
    var L = doorLeaves[d];
    var want = doorOpen ? L.s * 1.5 : 0;
    L.g.rotation.y += (want - L.g.rotation.y) * Math.min(1, dt * 2.2);
  }
  // карась дихає
  if (bigKaras) {
    bigKaras.position.y = 88 + Math.sin(G.t * 0.22) * 2.6;
    bigKaras.rotation.y = 0.34 + Math.sin(G.t * 0.11) * 0.07;
    bigKaras.rotation.z = -Math.PI / 2 + 0.1 + Math.sin(G.t * 0.17) * 0.04;
  }
  // завіса мерехтить
  if (gateMesh && gateMesh.visible) {
    gateMesh.material.opacity = 0.24 + Math.sin(G.t * 2.4) * 0.07;
  }
  // тінь ходить за гравцем
  if (!LOWFX) {
    sun.position.set(P.x - 46, P.y + 26, P.z - 34);   // низько: довгі тіні
    sun.target.position.set(P.x, P.y, P.z);
    sun.target.updateMatrixWorld();
  }
  // мітка захоплення
  if (G.lock) {
    var tgt = G.lock;
    if ((tgt.alive === false) || (tgt === boss && boss.dead)) { G.lock = null; UI.lock.classList.remove('on'); }
    else {
      var v = new THREE.Vector3(tgt.x, (tgt.y || 0) + (tgt === boss ? 3.0 : 1.4), tgt.z);
      v.project(camera);
      if (v.z < 1) {
        UI.lock.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        UI.lock.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
        UI.lock.classList.add('on');
      } else UI.lock.classList.remove('on');
    }
  }
}

/* налагоджувальний гачок для перевірок */
window.__K3 = { P: P, G: G, foes: foes, getBoss: function(){ return boss; }, keys: keys,
  look: function(p, y){ camPitch = p; if (y !== undefined) camYaw = y; },
  hurtBoss: function(d){ hurtBoss(d); },
  atk: function(h){ attack(h); },
  hit: function(){ doHitCheck(); },
  freezeBoss: function(){ var b = boss; b.st = 'idle'; b.t = -999; b.next = 999; },
  scene: scene, cam: camera, karasObj: function(){ return bigKaras; }, THREE: THREE,
  karas: function(){ var v = bigKaras.position.clone(); v.project(camera); return { x: v.x.toFixed(2), y: v.y.toFixed(2), z: v.z.toFixed(2) }; },
  tp: function(x, z){ P.x = x; P.z = z; P.y = hAt(x, z); },
  ready: function(){ return !!G.ready; },
  free: function(x, z){ return !blocked(x, z, hAt(x, z) + 1.2, 0.5); },
  obstacles: function(){ return { кіл: walls.length, коробок: boxes.length }; },
  probe: function(){
    // по одному представнику кількох видів реквізиту — для перевірки твердості
    var out = [], seen = {};
    for (var i = 0; i < scene.__b.meshes.length && out.length < 6; i++) {
      var m = scene.__b.meshes[i];
      if (!m.__mid || seen[m.__mid] || m.name.indexOf("mdl:") === 0) continue;
      if (/grass|debris|hero/.test(m.__mid)) continue;
      var p = m.getAbsolutePosition();
      if (Math.hypot(p.x, p.z) > 110) continue;
      seen[m.__mid] = 1;
      out.push({ id: m.__mid, x: p.x, z: p.z });
    }
    return out;
  },
  models: function(){ return { ok: MODELS_OK, total: MODEL_IDS.length }; } };