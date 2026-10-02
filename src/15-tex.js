/* ================= процедурні текстури =================
   Пласкі однотонні матеріали — головна причина, чому низькополігональна
   графіка читається як заглушка. Шум, намальований у полотно, і карта
   нормалей із того самого шуму знімають цю пласкість і не важать нічого.

   Текстура тут — ДЕТАЛЬНА КАРТА: сірий шум навколо середнього TEX_MEAN.
   Колір лишається в матеріалі. Якщо замість цього намалювати в текстурі
   сам колір, Babylon помножить його на diffuseColor, тобто сам на себе,
   і вся сцена потемніє вчетверо — на цьому вже один раз обпеклися. */

var TEX_MEAN = 0.78;

function __valNoise(w, seedN){
  // згладжений шум, замкнений по краях, щоб текстура тайлилась
  var g = [], i, j;
  var s = seedN || 1;
  function rr2(){ s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
  var CELL = 8, n = Math.ceil(w / CELL) + 1;
  var pts = [];
  for (j = 0; j < n; j++) { pts[j] = []; for (i = 0; i < n; i++) pts[j][i] = rr2(); }
  for (j = 0; j < n; j++) pts[j][n - 1] = pts[j][0];
  for (i = 0; i < n; i++) pts[n - 1][i] = pts[0][i];
  for (j = 0; j < w; j++) {
    g[j] = [];
    for (i = 0; i < w; i++) {
      var fx = i / CELL, fy = j / CELL;
      var x0 = Math.floor(fx), y0 = Math.floor(fy);
      var tx = fx - x0, ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = pts[y0][x0], b = pts[y0][x0 + 1], c = pts[y0 + 1][x0], d = pts[y0 + 1][x0 + 1];
      g[j][i] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
  return g;
}

/* висотне поле з кількох октав */
function __height(w, seedN, oct){
  var acc = [], k, j, i;
  for (j = 0; j < w; j++) { acc[j] = []; for (i = 0; i < w; i++) acc[j][i] = 0; }
  var amp = 1, tot = 0;
  for (k = 0; k < (oct || 3); k++) {
    var n = __valNoise(w, (seedN || 1) + k * 977);
    var step = 1 << k;
    for (j = 0; j < w; j++) for (i = 0; i < w; i++)
      acc[j][i] += n[(j * step) % w][(i * step) % w] * amp;
    tot += amp; amp *= 0.5;
  }
  for (j = 0; j < w; j++) for (i = 0; i < w; i++) acc[j][i] /= tot;
  return acc;
}

var __texCache = {};
/* повертає { diffuse, bump } — обидві тайлаються */
function makeTex(name, opts){
  if (__texCache[name]) return __texCache[name];
  var o = opts || {};
  var W = o.size || 128;
  var H = __height(W, o.seed || 7, o.oct || 3);
  var vary = o.vary === undefined ? 0.34 : o.vary;
  var warm = o.warm || 0;       // легкий відхід у тепло-холод по плямах

  var dt = new BABYLON.DynamicTexture(name + 'd', { width: W, height: W }, bscene, true);
  var ctx = dt.getContext();
  var img = ctx.createImageData(W, W);
  var k = 0, i, j, v;
  for (j = 0; j < W; j++) for (i = 0; i < W; i++) {
    v = H[j][i];
    // смугастість для дерева й лусочність для риби задаються через модифікатор
    if (o.streak) v = v * 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((i / W) * Math.PI * 2 * o.streak + v * 4));
    if (o.scaleRows) {
      var row = Math.floor(j / (W / o.scaleRows));
      var off = (row % 2) * 0.5;
      var u = ((i / W) * o.scaleRows + off) % 1;
      v = v * 0.76 + 0.24 * (1 - Math.abs(u - 0.5) * 2);
    }
    var g0 = TEX_MEAN * (1 + (v - 0.5) * vary * 2);
    var d = warm * (v - 0.5);
    img.data[k++] = Math.max(0, Math.min(255, g0 * (1 + d) * 255));
    img.data[k++] = Math.max(0, Math.min(255, g0 * 255));
    img.data[k++] = Math.max(0, Math.min(255, g0 * (1 - d) * 255));
    img.data[k++] = 255;
  }
  ctx.putImageData(img, 0, 0);
  dt.update();

  // карта нормалей зі скінченних різниць того самого поля
  var nt = new BABYLON.DynamicTexture(name + 'n', { width: W, height: W }, bscene, true);
  var nc = nt.getContext();
  var nimg = nc.createImageData(W, W);
  var str = o.bump === undefined ? 2.4 : o.bump;
  k = 0;
  for (j = 0; j < W; j++) for (i = 0; i < W; i++) {
    var hl = H[j][(i - 1 + W) % W], hr = H[j][(i + 1) % W];
    var hu = H[(j - 1 + W) % W][i], hd = H[(j + 1) % W][i];
    var nx = (hl - hr) * str, ny = (hu - hd) * str, nz = 1;
    var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    nimg.data[k++] = (nx / len * 0.5 + 0.5) * 255;
    nimg.data[k++] = (ny / len * 0.5 + 0.5) * 255;
    nimg.data[k++] = (nz / len * 0.5 + 0.5) * 255;
    nimg.data[k++] = 255;
  }
  nc.putImageData(nimg, 0, 0);
  nt.update();

  var res = { diffuse: dt, bump: nt };
  __texCache[name] = res;
  return res;
}

/* вішає детальну карту на матеріал і підіймає його колір на середнє
   текстури, щоб загальна світлота поверхні не змінилась */
function skin(mtl, texName, opts, uv){
  if (LOWFX) return mtl;
  var t = makeTex(texName, opts);
  mtl.diffuseTexture = t.diffuse;
  mtl.bumpTexture = t.bump;
  mtl.bumpTexture.level = opts && opts.level !== undefined ? opts.level : 0.8;
  var s = uv || 1;
  mtl.diffuseTexture.uScale = mtl.diffuseTexture.vScale = s;
  mtl.bumpTexture.uScale = mtl.bumpTexture.vScale = s;
  var c = mtl.diffuseColor;
  if (c) {
    c.r = Math.min(1, c.r / TEX_MEAN);
    c.g = Math.min(1, c.g / TEX_MEAN);
    c.b = Math.min(1, c.b / TEX_MEAN);
  }
  return mtl;
}
