/* ================= налаштування ================= */
var LOWFX = /(\?|&)fx=low/.test(location.search);
var RIM = 130, EDGE = 140;               // де починається круча і де стіна
var GRAV = 24, PR = 0.44;                // тяжіння і радіус гравця
var WALK = 3.6, RUN = 6.4;

var CHAPEL = { x: 0, z: 86 };
var GX = 26;                             // вісь ущелини
var CAVE   = { x: GX, z: -70 };
var ARENA  = { x: GX, z: -104, r: 18 };  // зала боса
var MASSIF = { x: GX, z: -96, r: 48 };
var GORGE  = { z0: -60, z1: -86 };       // прохід крізь масив
var RIVER_Z = -6;                        // сухе русло
var BRIDGE = null;
var FIRES = [
  { x: -5, z: 70, name: 'Вогнище біля каплиці' },
  { x: 22, z: -52, name: 'Вогнище перед ущелиною' }
];
var FIRE = FIRES[0];
var ROAD = [[0,80],[3,56],[-4,34],[6,14],[4,-6],[2,-24],[12,-40],[20,-52],[26,-62]];

/* ================= рушій ================= */
var renderer = new THREE.WebGLRenderer({ antialias: !LOWFX, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(LOWFX ? 1 : 1.75, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !LOWFX;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
document.body.insertBefore(renderer.domElement, document.getElementById('fade'));

var scene = new THREE.Scene();
var SKY = 0x10131a, FOGC = 0x141821;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(FOGC, 14, 140);

var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

var hemi = new THREE.HemisphereLight(0x3d4760, 0x17140f, 0.34);
scene.add(hemi);
var sun = new THREE.DirectionalLight(0xffc888, 0.62);
sun.position.set(-40, 54, -70);
if (!LOWFX) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  var sc = sun.shadow.camera;
  sc.near = 1; sc.far = 130; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34;
  sun.shadow.bias = -0.0012;
}
scene.add(sun);
scene.add(sun.target);
var amb = new THREE.AmbientLight(0x232838, 0.2);
scene.add(amb);

