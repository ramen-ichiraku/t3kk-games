#!/usr/bin/env node
/*
  Генерація частин персонажів через Meshy.

  Ключ НІКОЛИ не лежить у репозиторії: репо публічне, бо з нього роздається
  GitHub Pages. Скрипт бере ключ із (у такому порядку):
      1) змінної оточення MESHY_API_KEY
      2) файлу %USERPROFILE%\.meshy\key.txt  (або ~/.meshy/key.txt)
  Ключ ніде не друкується і нікуди не записується.

  Гра про ключ не знає взагалі: цей скрипт — окремий крок, який кладе готові
  .glb у assets/chars/, і вже вони потрапляють у репозиторій.

  Запуск:
      node tools/meshy.js --list            що взагалі вміємо генерувати
      node tools/meshy.js --dry             що буде зроблено, без витрат
      node tools/meshy.js --only karas-head  одна деталь
      node tools/meshy.js                   усе, чого ще нема
      node tools/meshy.js --refine          ще й уточнення з текстурами (дорожче)

  Уже завантажене не перегенеровується — повторний запуск нічого не коштує.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'chars');
const STATE = path.join(__dirname, 'tmp', 'meshy-tasks.json');
const API = 'https://api.meshy.ai/openapi';

/* ---------- деталі, які нам потрібні ----------
   Генеруємо саме ЧАСТИНИ, а не цілих персонажів: скелет і вся анімація бою
   в грі вже свої й працюють, а автоскелет від генератора — як пощастить.
   Частини просто вішаються на наявні суглоби. */
const PARTS = {
  'karas-head': {
    prompt: 'stylized low poly head of a crucian carp fish with a bald human-like ' +
            'scalp on top, large round fish eyes on the sides, wide fish lips, two ' +
            'short whiskers, three single hairs on the bald spot, olive green and ' +
            'pale gold, flat untextured facing forward, game character part, ' +
            'neck opening at the bottom',
    poly: 3000
  },
  'karas-torso': {
    prompt: 'stylized low poly torso of an upright fish-man, elongated crucian carp ' +
            'body with golden scales, pale belly, small dorsal fin on the back, ' +
            'no head, no arms, no legs, openings at neck shoulders and hips, ' +
            'game character part',
    poly: 3500
  },
  'karas-fin': {
    prompt: 'stylized low poly fish fin, orange translucent membrane with bone rays, ' +
            'fan shaped, game asset part, flat colors',
    poly: 800
  },
  'foe-head': {
    prompt: 'stylized low poly head of a rotten undead carp fish, sunken milky eyes, ' +
            'torn gills, slimy dark green and swamp brown, open jaw with small teeth, ' +
            'game character part, neck opening at the bottom',
    poly: 3000
  },
  'foe-torso': {
    prompt: 'stylized low poly torso of an upright undead fish-man, rotten carp body, ' +
            'dark swamp green scales, torn pale belly, no head no arms no legs, ' +
            'openings at neck shoulders and hips, game character part',
    poly: 3500
  },
  'boss-head': {
    prompt: 'stylized low poly head of a huge menacing bream fish covered in river ' +
            'silt, heavy jaw, glowing pale eyes, crown of broken bones and rusty ' +
            'spikes on top, mossy green and muddy gold, game boss character part, ' +
            'neck opening at the bottom',
    poly: 5000
  }
};

/* ---------- ключ ---------- */
function readKey(){
  if (process.env.MESHY_API_KEY && process.env.MESHY_API_KEY.trim())
    return process.env.MESHY_API_KEY.trim();
  const f = path.join(os.homedir(), '.meshy', 'key.txt');
  if (fs.existsSync(f)) {
    const k = fs.readFileSync(f, 'utf8').trim();
    if (k) return k;
  }
  console.error('Ключа нема. Поклади його у ' + f + ' або в MESHY_API_KEY.');
  console.error('У репозиторій ключ класти не можна: він публічний.');
  process.exit(2);
}

/* ---------- мережа ---------- */
async function call(method, url, body, key){
  const r = await fetch(url, {
    method,
    headers: Object.assign({ Authorization: 'Bearer ' + key },
      body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* не JSON */ }
  if (!r.ok) {
    // текст помилки показуємо, ключ у ньому не фігурує
    throw new Error('HTTP ' + r.status + ': ' + text.slice(0, 300));
  }
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitTask(id, key, label){
  let last = -1;
  for (let i = 0; i < 300; i++) {
    const t = await call('GET', API + '/v2/text-to-3d/' + id, null, key);
    if (t.progress !== last) {
      process.stdout.write('\r  ' + label + ': ' + t.status + ' ' + (t.progress || 0) + '%   ');
      last = t.progress;
    }
    if (t.status === 'SUCCEEDED') { process.stdout.write('\n'); return t; }
    if (t.status === 'FAILED' || t.status === 'CANCELED')
      throw new Error(label + ' — ' + t.status + ' ' + JSON.stringify(t.task_error || {}));
    await sleep(5000);
  }
  throw new Error(label + ' — не дочекались');
}

async function download(url, to){
  const r = await fetch(url);
  if (!r.ok) throw new Error('не вдалось завантажити: HTTP ' + r.status);
  fs.writeFileSync(to, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(to).size;
}

/* ---------- стан: щоб не платити двічі за те саме ---------- */
function loadState(){
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; }
}
function saveState(s){
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 1));
}

/* ---------- головне ---------- */
(async () => {
  const argv = process.argv.slice(2);
  const has = f => argv.indexOf(f) >= 0;
  const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

  if (has('--list')) {
    Object.keys(PARTS).forEach(k => console.log('  ' + k.padEnd(14) + PARTS[k].poly + ' полігонів'));
    return;
  }

  // перевірка ключа: сам ключ не друкуємо, лише звідки взявся й чи працює
  if (has('--check')) {
    const fromEnv = !!(process.env.MESHY_API_KEY && process.env.MESHY_API_KEY.trim());
    const k = readKey();
    console.log('джерело: ' + (fromEnv ? 'змінна оточення MESHY_API_KEY'
                                       : path.join(os.homedir(), '.meshy', 'key.txt')));
    console.log('довжина: ' + k.length + ' символів');
    if (/\s/.test(k)) console.log('УВАГА: всередині ключа є пробіл або перенос рядка');
    if (/^["']|["']$/.test(k)) console.log('УВАГА: ключ узято в лапки — їх треба прибрати');
    if (/^MESHY_API_KEY\s*=/.test(k)) console.log('УВАГА: у файлі має бути лише значення, без назви змінної');
    if (/^встав/i.test(k)) { console.log('це ще заглушка, а не ключ'); return; }
    try {
      const bal = await call('GET', API + '/v1/balance', null, k);
      console.log('ключ робочий. Кредитів: ' + (bal && bal.balance !== undefined ? bal.balance : '?'));
    } catch (e) {
      console.log('ключ не прийнявся — ' + e.message.slice(0, 160));
    }
    return;
  }

  const only = val('--only');
  const ids = only ? [only] : Object.keys(PARTS);
  for (const id of ids) if (!PARTS[id]) { console.error('нема такої деталі: ' + id); process.exit(2); }

  fs.mkdirSync(OUT, { recursive: true });
  const todo = ids.filter(id => !fs.existsSync(path.join(OUT, id + '.glb')));
  const done = ids.filter(id => fs.existsSync(path.join(OUT, id + '.glb')));
  if (done.length) console.log('уже є: ' + done.join(', '));
  if (!todo.length) { console.log('генерувати нічого.'); return; }

  if (has('--dry')) {
    console.log('буде згенеровано ' + todo.length + ': ' + todo.join(', '));
    console.log('режим: ' + (has('--refine') ? 'чернетка + уточнення з текстурами' : 'лише чернетка'));
    return;
  }

  const key = readKey();
  try {
    const bal = await call('GET', API + '/v1/balance', null, key);
    console.log('кредитів на рахунку: ' + (bal && bal.balance !== undefined ? bal.balance : '?'));
  } catch (e) { console.log('баланс не дізнались (' + e.message.slice(0, 60) + ')'); }

  const state = loadState();
  let spent = 0;
  for (const id of todo) {
    const p = PARTS[id];
    console.log('\n' + id);
    let prev = state[id] && state[id].preview;
    if (!prev) {
      const r = await call('POST', API + '/v2/text-to-3d', {
        mode: 'preview',
        prompt: p.prompt,
        ai_model: 'meshy-6',
        topology: 'triangle',
        target_polycount: p.poly,
        should_remesh: true
      }, key);
      prev = r.result;
      state[id] = Object.assign(state[id] || {}, { preview: prev });
      saveState(state);
    }
    let task = await waitTask(prev, key, 'чернетка');
    spent += task.consumed_credits || 0;

    if (has('--refine')) {
      let ref = state[id] && state[id].refine;
      if (!ref) {
        const r = await call('POST', API + '/v2/text-to-3d', {
          mode: 'refine', preview_task_id: prev, enable_pbr: false, texture_resolution: '2k'
        }, key);
        ref = r.result;
        state[id].refine = ref;
        saveState(state);
      }
      task = await waitTask(ref, key, 'текстури');
      spent += task.consumed_credits || 0;
    }

    const url = task.model_urls && task.model_urls.glb;
    if (!url) { console.log('  немає посилання на glb — пропускаю'); continue; }
    const size = await download(url, path.join(OUT, id + '.glb'));
    console.log('  збережено assets/chars/' + id + '.glb — ' + (size / 1024).toFixed(0) + ' КБ');
  }
  console.log('\nвитрачено кредитів: ' + spent);
})().catch(e => { console.error('\nпомилка: ' + e.message); process.exit(1); });
