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
  var g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  var pos = g.attributes.position;
  var col = [];
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var y = hFn(x, z);
    pos.setY(i, y);
    var c = tint(x, z, y);
    col.push(c[0], c[1], c[2]);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = !LOWFX;
  return m;
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
  if (sk.sun !== undefined) sun.intensity = sk.sun;
  if (sk.amb !== undefined) amb.intensity = sk.amb;
  if (sk.hemi !== undefined) hemi.intensity = sk.hemi;
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
