/* ================= матеріали ================= */
function mat(c, opt){
  var o = Object.assign({ color: c }, opt || {});
  return new THREE.MeshLambertMaterial(o);
}
var M = {
  stone:  mat(0x383b43), stoneD: mat(0x24262c), stoneL: mat(0x474b55),
  gold:   mat(0xd7a93f, { emissive: 0x4a3508 }),
  goldHot:mat(0xf2d276, { emissive: 0xa8791d }),
  scale:  mat(0xb99444), scaleD: mat(0x6f7238),
  skin:   mat(0xd8ab7c), fin: mat(0xd2762f),
  bread:  mat(0xdcb476, { emissive: 0x2a1c08 }),
  crust:  mat(0xa9763c),
  foeA:   mat(0x5e6b3c), foeB: mat(0x424e2c), foeSkin: mat(0x9aa06c),
  rust:   mat(0x7a4a2c), cloth: mat(0x3a3340),
  wood:   mat(0x46392c), dark: mat(0x1b1d22),
  wall:   mat(0x6b6153), wallD: mat(0x4d463b),
  boss:   mat(0x6c6f4a), bossD: mat(0x3e4230), bossT: mat(0x8d7b3a, { emissive: 0x2b1f05 }),
  ember:  mat(0xff7a2a, { emissive: 0xc23c05 })
};

SHARED_MATS = new Set();
for (var mk in M) if (M.hasOwnProperty(mk)) SHARED_MATS.add(M[mk]);
