/* ================= менеджер зон =================
   Кожна зона — окремий опис: власний рельєф, власна забудова, власні вороги.
   Геометрія зони живе в одному Group, тож на виході її можна зняти цілком
   і звільнити пам'ять, а не тримати три локації в сцені одночасно. */
var ZONES = {};
/* стан поточної зони: наповнюється її build(), чиститься clearZone() */
var flames = [], doorLeaves = [], doorCollider = null;
var fireObjs = [], runes = [], gateMesh = null, BRIDGE = null;
var ZONE = null;
var zoneRoot = null;
var SHARED_MATS = null;          // матеріали з M — спільні, їх ніколи не звільняємо

function hAt(x, z){ return ZONE ? ZONE.h(x, z) : 0; }

function zoneRoad(){ return (ZONE && ZONE.road) || null; }
function zoneEdge(){ return (ZONE && ZONE.edge) || EDGE; }

/* рельєф зони: один меш із забарвленням по висоті й дорозі */
function buildTerrainMesh(hFn, size, seg, tint){
  var pos = [], idx = [], col = [], uvs = [], n = seg + 1, step = size / seg;
  for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
    var x = -size / 2 + i * step, z = -size / 2 + j * step;
    var y = hFn(x, z);
    pos.push(x, y, z);
    uvs.push(i / seg, j / seg);          // без них карта нормалей дає сміття
    var c = tint(x, z, y);
    col.push(c[0], c[1], c[2], 1);
  }
  for (var j2 = 0; j2 < seg; j2++) for (var i2 = 0; i2 < seg; i2++) {
    var a = j2 * n + i2, b = a + 1, c2 = a + n, d = c2 + 1;
    idx.push(a, b, c2, b, d, c2);     // намотка Babylon: інакше колайдер не бачить поверхню
  }
  var nrm = [];
  BABYLON.VertexData.ComputeNormals(pos, idx, nrm);
  var m = new BABYLON.Mesh('terrain', bscene);
  var vd = new BABYLON.VertexData();
  vd.positions = pos; vd.indices = idx; vd.normals = nrm; vd.colors = col; vd.uvs = uvs;
  vd.applyToMesh(m);
  var mat = new BABYLON.StandardMaterial('terrmat', bscene);
  mat.specularColor = new BABYLON.Color3(0, 0, 0);
  if (!LOWFX) {
    var gt = makeTex('ground', { vary: 0.5, seed: 5, oct: 4, bump: 2.0, warm: 0.12 });
    mat.diffuseTexture = gt.diffuse;
    mat.bumpTexture = gt.bump;
    mat.bumpTexture.level = 0.55;
    var gs = size / 7;
    mat.diffuseTexture.uScale = mat.diffuseTexture.vScale = gs;
    mat.bumpTexture.uScale = mat.bumpTexture.vScale = gs;
  }
  m.material = mat;
  m.useVertexColors = true;
  m.receiveShadows = !LOWFX;
  m.checkCollisions = true;          // саме це дає сходи й схили
  return decorate(m);
}

/* звільнення: геометрії завжди, матеріали — лише не спільні */
function disposeTree(obj){
  obj.traverse(function(o){
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (var i = 0; i < mats.length; i++) {
      if (mats[i] && mats[i].dispose && (!SHARED_MATS || !SHARED_MATS.has(mats[i]))) mats[i].dispose();
    }
  });
}

function clearZone(){
  if (zoneRoot) {
    scene.remove(zoneRoot);
    disposeTree(zoneRoot);
    zoneRoot = null;
  }
  for (var i = 0; i < foes.length; i++) { scene.remove(foes[i].g); disposeTree(foes[i].g); }
  foes.length = 0;
  for (var s = 0; s < shots.length; s++) scene.remove(shots[s].m);
  shots.length = 0;
  walls.length = 0;
  boxes.length = 0;
  flames.length = 0;
  runes.length = 0;
  fireObjs.length = 0;
  doorLeaves.length = 0;
  doorCollider = null;
  gateMesh = null;
  G.lock = null;
}

function applySky(sk){
  if (!sk) return;
  scene.background.setHex(sk.bg);
  scene.fog.color.setHex(sk.fog);
  scene.fog.near = sk.near;
  scene.fog.far = sk.far;
  if (sk.sun !== undefined) sun.intensity = sk.sun * GAIN.dir;
  if (sk.amb !== undefined) amb.intensity = sk.amb * GAIN.amb;
  if (sk.hemi !== undefined) hemi.intensity = sk.hemi * GAIN.hemi;
}

function loadZone(id, at){
  var z = ZONES[id];
  if (!z) { console.warn('нема зони ' + id); return; }
  clearZone();
  ZONE = z;
  zoneRoot = new THREE.Group();
  scene.add(zoneRoot);
  applySky(z.sky);
  z.build(zoneRoot);
  spawnAll();
  var sp = at || z.spawn;
  P.x = sp.x; P.z = sp.z; P.vy = 0;
  P.y = hAt(P.x, P.z);
  if (sp.yaw !== undefined) P.yaw = sp.yaw;
  camNow.set(P.x, P.y + 4, P.z + 6);
  G.zone = id;
  G.inChapel = !!z.chapel;
  if (z.backdrop !== undefined && typeof setBackdrop === 'function') setBackdrop(z.backdrop);
}
