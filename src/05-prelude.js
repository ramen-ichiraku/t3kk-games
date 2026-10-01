
var elErr = document.getElementById('err');
if (typeof THREE === 'undefined') {
  elErr.style.display = 'grid';
  elErr.innerHTML = '<div><b>Не вдалося завантажити рушій.</b><br>' +
    '«Кільце Карася» тягне Three.js із мережі. Перевір інтернет і онови сторінку.<br><br>' +
    '<a href="./" style="color:#e0b74f">← повернутися до збірки</a></div>';
  return;
}

