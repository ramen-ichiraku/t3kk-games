#!/usr/bin/env node
/*
  Збирає src/* у готовий karas3.html.

  Правила:
    • порядок частин = порядок імен файлів, тому номер у назві визначає місце в коді;
    • 00-head.html і 99-tail.html обгортають усе інше;
    • решта .js потрапляє всередину одного IIFE, тож усі частини бачать спільну область видимості;
    • блок запуску має лишатися в найостаннішому .js: шаблони оголошені через var,
      і ранній запуск уже одного разу ламав гру (у контейнер потрапляв рядок "undefined").

  Запуск:  node build.js        — зібрати
           node build.js --check — зібрати в пам'яті й звірити з наявним файлом
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'karas3.html');
const OPEN = '\n<script>\n(function(){\n\'use strict\';\n';

function build(){
  if (!fs.existsSync(SRC)) throw new Error('нема теки src/');
  const files = fs.readdirSync(SRC).sort();
  const head = files.find(f => f.endsWith('head.html'));
  const tail = files.find(f => f.endsWith('tail.html'));
  if (!head || !tail) throw new Error('бракує head.html або tail.html');

  const js = files.filter(f => f.endsWith('.js'));
  if (!js.length) throw new Error('нема жодної частини .js');

  const parts = [fs.readFileSync(path.join(SRC, head), 'utf8'), OPEN];
  js.forEach(f => parts.push(fs.readFileSync(path.join(SRC, f), 'utf8')));
  parts.push(fs.readFileSync(path.join(SRC, tail), 'utf8'));
  return { text: parts.join(''), js: js };
}

const res = build();

if (process.argv.indexOf('--check') >= 0) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old === res.text) {
    console.log('збіг: зібране ідентичне наявному karas3.html (' + res.text.length + ' Б)');
  } else {
    console.log('РОЗБІЖНІСТЬ: наявний ' + old.length + ' Б, зібране ' + res.text.length + ' Б');
    for (let i = 0; i < Math.min(old.length, res.text.length); i++) {
      if (old[i] !== res.text[i]) {
        console.log('перша відмінність на символі ' + i + ':');
        console.log('  було:  ' + JSON.stringify(old.slice(i - 40, i + 40)));
        console.log('  стало: ' + JSON.stringify(res.text.slice(i - 40, i + 40)));
        break;
      }
    }
    process.exit(1);
  }
} else {
  fs.writeFileSync(OUT, res.text);
  console.log('зібрано karas3.html — ' + res.text.length + ' Б з ' + res.js.length + ' частин');
}
