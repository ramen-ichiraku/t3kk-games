/* ================= ландшафт ================= */
function segDist(px, pz, ax, az, bx, bz){
  var dx = bx - ax, dz = bz - az;
  var L = dx * dx + dz * dz;
  var t = L > 0 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var cx = ax + dx * t, cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}
function roadDist(x, z){
  var d = 1e9;
  for (var i = 0; i < ROAD.length - 1; i++) {
    var v = segDist(x, z, ROAD[i][0], ROAD[i][1], ROAD[i + 1][0], ROAD[i + 1][1]);
    if (v < d) d = v;
  }
  return d;
}
function hAt(x, z){
  var h = Math.sin(x * 0.052) * 1.2 + Math.cos(z * 0.045) * 1.0 + Math.sin((x + z) * 0.026) * 1.7;
  h += Math.sin(x * 0.132 + 1.7) * 0.34 + Math.cos(z * 0.148 - 0.6) * 0.3;
  // дорога притискає рельєф
  var rd = Math.exp(-Math.pow(roadDist(x, z) / 4.6, 2));
  h = h * (1 - rd * 0.9) - rd * 0.22;
  // майданчик каплиці
  var cd = Math.hypot(x - CHAPEL.x, z - CHAPEL.z);
  if (cd < 12) h = h * (cd / 12) + 0.15 * (1 - cd / 12);
  // селище стоїть на рівному
  var vd = Math.hypot(x - 22, z - 20);
  if (vd < 17) { var kv = Math.min(1, (17 - vd) / 9); h = h * (1 - kv) + 0.5 * kv; }
  // сухе русло перетинає поле — міст через нього єдиний
  var rv = Math.abs(z - RIVER_Z);
  if (rv < 9.5) h -= Math.pow(1 - rv / 9.5, 1.3) * 4.2;
  // скельний масив, у якому ховається печера
  var kd = Math.hypot(x - MASSIF.x, z - MASSIF.z);
  if (kd < MASSIF.r) h += Math.pow(Math.max(0, 1 - kd / MASSIF.r), 1.55) * 13;
  // прохід крізь масив: пласка рампа, інакше камера тоне у схилі
  var td = segDist(x, z, GX, GORGE.z0, GX, GORGE.z1);
  if (td < 5.4) {
    var kt = Math.min(1, (5.4 - td) / 2.6);
    var zc = Math.max(GORGE.z1, Math.min(GORGE.z0, z));
    var ramp = 0.6 + ((zc - GORGE.z0) / (GORGE.z1 - GORGE.z0)) * (-1.5 - 0.6);
    h = h * (1 - kt) + ramp * kt;
  }
  // зала боса: рівна підлога, інакше в ній неможливо битися
  var ad = Math.hypot(x - ARENA.x, z - ARENA.z);
  if (ad < ARENA.r + 6) {
    var ka = Math.min(1, (ARENA.r + 6 - ad) / 7);
    h = h * (1 - ka) + (-1.5) * ka;
  }
  // чаша по краю світу
  var r = Math.hypot(x, z);
  if (r > RIM) h += Math.min(15, Math.pow((r - RIM) * 0.5, 1.9));
  return h;
}

var TSEG = 176, TSIZE = 340;
var terGeo = new THREE.PlaneGeometry(TSIZE, TSIZE, TSEG, TSEG);
terGeo.rotateX(-Math.PI / 2);
(function(){
  var pos = terGeo.attributes.position;
  var col = [];
  for (var i = 0; i < pos.count; i++) {
    var x = pos.getX(i), z = pos.getZ(i);
    var y = hAt(x, z);
    pos.setY(i, y);
    var rd = roadDist(x, z);
    var t = Math.max(0, 1 - rd / 4.2);
    var r = 0.115 + t * 0.10, g = 0.125 + t * 0.075, b = 0.095 + t * 0.055;
    var m = 0.78 + 0.42 * (Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + 0.5);
    col.push(r * m, g * m, b * m);
  }
  terGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  terGeo.computeVertexNormals();
})();
var terrain = new THREE.Mesh(terGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
terrain.receiveShadow = !LOWFX;
scene.add(terrain);

/* ================= перепони ================= */
var walls = [];   // {x,z,r}  циліндричні
var boxes = [];   // {x,z,hw,hh,rot} прямокутні в плані
function addWall(x, z, r, top){ walls.push({ x:x, z:z, r:r, top: top === undefined ? hAt(x, z) + 2.6 : top }); }
function addBox(x, z, hw, hh, rot, top){ boxes.push({ x:x, z:z, hw:hw, hh:hh, rot:rot || 0, top: top === undefined ? hAt(x, z) + 3.4 : top }); }
// чи заступає щось точку на висоті y
function blocked(x, z, y, pad){
  var i;
  for (i = 0; i < walls.length; i++) {
    var w = walls[i];
    if (y > w.top) continue;
    if (Math.hypot(x - w.x, z - w.z) < w.r + (pad || 0)) return true;
  }
  for (i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    if (y > b.top) continue;
    var c = Math.cos(-b.rot), sn = Math.sin(-b.rot);
    var lx = (x - b.x) * c - (z - b.z) * sn, lz = (x - b.x) * sn + (z - b.z) * c;
    if (Math.abs(lx) < b.hw + (pad || 0) && Math.abs(lz) < b.hh + (pad || 0)) return true;
  }
  return false;
}

function resolve(px, pz, rad){
  var i, w;
  for (i = 0; i < walls.length; i++) {
    w = walls[i];
    var dx = px - w.x, dz = pz - w.z;
    var d = Math.hypot(dx, dz), need = w.r + rad;
    if (d < need && d > 0.0001) { px = w.x + dx / d * need; pz = w.z + dz / d * need; }
    else if (d <= 0.0001) { px = w.x + need; }
  }
  for (i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    var c = Math.cos(-b.rot), s = Math.sin(-b.rot);
    var lx = (px - b.x) * c - (pz - b.z) * s;
    var lz = (px - b.x) * s + (pz - b.z) * c;
    var ex = b.hw + rad, ez = b.hh + rad;
    if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
      var ox = ex - Math.abs(lx), oz = ez - Math.abs(lz);
      if (ox < oz) lx += lx >= 0 ? ox : -ox; else lz += lz >= 0 ? oz : -oz;
      var cc = Math.cos(b.rot), ss = Math.sin(b.rot);
      px = b.x + lx * cc - lz * ss;
      pz = b.z + lx * ss + lz * cc;
    }
  }
  var r = Math.hypot(px, pz);
  if (r > EDGE) { px = px / r * EDGE; pz = pz / r * EDGE; }
  return [px, pz];
}

