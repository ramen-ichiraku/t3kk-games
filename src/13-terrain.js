/* ================= ландшафт ================= */
function segDist(px, pz, ax, az, bx, bz){
  var dx = bx - ax, dz = bz - az;
  var L = dx * dx + dz * dz;
  var t = L > 0 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var cx = ax + dx * t, cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}
// дорогу бере поточна зона
function roadDist(x, z){
  var R = zoneRoad() || ROAD;
  var d = 1e9;
  for (var i = 0; i < R.length - 1; i++) {
    var v = segDist(x, z, R[i][0], R[i][1], R[i + 1][0], R[i + 1][1]);
    if (v < d) d = v;
  }
  return d;
}
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
  var ed = zoneEdge();
  if (r > ed) { px = px / r * ed; pz = pz / r * ed; }
  return [px, pz];
}

