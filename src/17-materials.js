/* ================= матеріали ================= */
function mat(c, opt){
  var o = Object.assign({ color: c }, opt || {});
  return new THREE.MeshLambertMaterial(o);
}
var M = {
  stone:  mat(0x383b43), stoneD: mat(0x24262c), stoneL: mat(0x474b55),
  gold:   mat(0xd7a93f, { emissive: 0x4a3508 }),
  goldHot:mat(0xf2d276, { emissive: 0xa8791d }),
  scale:  mat(0x6a5220), scaleD: mat(0x3e4020),
  skin:   mat(0x8a6b4a), fin: mat(0x8a4c1c),
  bread:  mat(0xdcb476, { emissive: 0x2a1c08 }),
  crust:  mat(0xa9763c),
  foeA:   mat(0x30351c), foeB: mat(0x222613), foeSkin: mat(0x55593a),
  rust:   mat(0x7a4a2c), cloth: mat(0x3a3340),
  wood:   mat(0x46392c), dark: mat(0x1b1d22),
  wall:   mat(0x6b6153), wallD: mat(0x4d463b),
  boss:   mat(0x43452c), bossD: mat(0x26281c), bossT: mat(0x8d7b3a, { emissive: 0x2b1f05 }),
  ember:  mat(0xff7a2a, { emissive: 0xc23c05 }),
  bone:   mat(0x8e8673)
};

/* поверхні перестають бути пластиковими: текстура лише модулює колір */
skin(M.stone,  'rough',  { vary: 0.26, seed: 11, bump: 1.8, level: 0.45 }, 3);
skin(M.stoneD, 'roughD', { vary: 0.22, seed: 23, bump: 1.4, level: 0.35 }, 3);
skin(M.stoneL, 'roughL', { vary: 0.24, seed: 31, bump: 1.6, level: 0.4 }, 2);
skin(M.wall,   'wall',   { vary: 0.34, seed: 41, bump: 2.4, warm: 0.10 }, 2);
skin(M.wallD,  'wallD',  { vary: 0.32, seed: 43, bump: 2.4, warm: 0.10 }, 2);
skin(M.wood,   'wood',   { vary: 0.46, seed: 53, streak: 7, bump: 3.2, warm: 0.14 }, 2);
skin(M.scale,  'scales', { vary: 0.26, seed: 61, scaleRows: 9, bump: 2.0 }, 3.2);
skin(M.scaleD, 'scalesD',{ vary: 0.26, seed: 67, scaleRows: 9, bump: 2.0 }, 3.2);
skin(M.foeA,   'foeA',   { vary: 0.30, seed: 71, scaleRows: 7, bump: 2.2 }, 3.0);
skin(M.foeB,   'foeB',   { vary: 0.30, seed: 73, scaleRows: 7, bump: 2.2 }, 3.0);
skin(M.rust,   'rust',   { vary: 0.44, seed: 79, bump: 2.8, warm: 0.18 }, 2);
skin(M.skin,   'hide',   { vary: 0.16, seed: 83, bump: 1.4 }, 1.2);
skin(M.bread,  'crumb',  { vary: 0.40, seed: 89, oct: 4, bump: 3.4, warm: 0.12 }, 2);
skin(M.crust,  'crust',  { vary: 0.42, seed: 97, oct: 4, bump: 3.4, warm: 0.16 }, 2);
skin(M.bone,   'bone',   { vary: 0.30, seed: 109, bump: 2.2, warm: 0.08 }, 2);
skin(M.cloth,  'cloth',  { vary: 0.26, seed: 101, streak: 14, bump: 1.8 }, 2);
skin(M.boss,   'bossA',  { vary: 0.28, seed: 103, scaleRows: 8, bump: 2.4 }, 2.6);
skin(M.bossD,  'bossD',  { vary: 0.28, seed: 107, scaleRows: 8, bump: 2.4 }, 2.6);

SHARED_MATS = new Set();
for (var mk in M) if (M.hasOwnProperty(mk)) SHARED_MATS.add(M[mk]);
