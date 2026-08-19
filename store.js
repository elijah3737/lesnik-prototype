/* Лесник · слой хранения.
 *
 * Это единственный файл, который меняется при переезде на хостинг.
 * Сейчас данные лежат в localStorage браузера, в боевой версии их место займут
 * content/*.json и PHP: сигнатуры функций и правила остаются те же.
 *
 * Правила взяты из админки «Методики» и из разбора её ошибок:
 *  1. Запись атомарная: собрали новое состояние целиком, потом одной операцией
 *     подменили. Читатель никогда не видит половину файла.
 *  2. Каждое сохранение кладёт предыдущую версию в историю (30 последних),
 *     из истории можно откатиться.
 *  3. У каждого файла есть номер версии. Если вкладку открыли давно и данные
 *     успели измениться в другой вкладке, сохранение отклоняется с понятным
 *     сообщением, а не затирает чужую правку молча.
 *  4. Функция сохранения ничего не «чинит» за человека и не подставляет
 *     значения по умолчанию: пустое число возвращает прежнее, а не ноль.
 */

(function (global) {
  'use strict';

  var PREFIX = 'lesnik.';
  /* leads — обращения с сайта (написал, подписался).
     orders — заказы и брони, привязанные к кабинету оптовика. Это разные
     сущности: у обращения нет объёма, партии и жизненного цикла, у заказа есть. */
  var FILES = ['lots', 'categories', 'texts', 'leads', 'photos', 'accounts', 'orders'];
  var KEEP_BACKUPS = 30;

  var LIST_FILES = { leads: 1, orders: 1, accounts: 1 };

  function seed(file) {
    var s = global.LESNIK_SEED || {};
    return clone(s[file] !== undefined ? s[file] : (LIST_FILES[file] ? [] : {}));
  }

  function clone(v) {
    return v === undefined ? v : JSON.parse(JSON.stringify(v));
  }

  function key(file) { return PREFIX + file; }
  function verKey(file) { return PREFIX + file + '.v'; }
  function bakKey(file) { return PREFIX + file + '.bak'; }

  function available() {
    try {
      var t = PREFIX + '__t';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  }

  var OK = available();
  var memory = {};   // запасной ящик, если localStorage закрыт (режим инкогнито)

  function readRaw(k) {
    if (!OK) return memory[k] === undefined ? null : memory[k];
    return localStorage.getItem(k);
  }

  function writeRaw(k, v) {
    if (!OK) { memory[k] = v; return true; }
    try { localStorage.setItem(k, v); return true; }
    catch (e) { return false; }   // место кончилось
  }

  /* ── чтение ───────────────────────────────────────────────── */

  /* Браузер, который уже был на сайте, хранит свою копию и по общему правилу
     новые записи из seed.js игнорирует — тогда заведённый позже демо-доступ
     не доедет до него никогда (ровно так он не нашёлся в Safari 19.08.2026).
     Для accounts это неверно: удалять оптовиков админка не умеет, только
     открывать и закрывать доступ. Значит, запись, которой нет в хранилище, —
     новая, а не удалённая, и её можно дописать. Статусы, выставленные
     в админке, при этом не трогаем: побеждает то, что уже сохранено. */
  function withNewSeed(file, data) {
    if (file !== 'accounts' || !Array.isArray(data)) return data;
    var have = {};
    data.forEach(function (a) { if (a && a.id) have[a.id] = true; });
    seed(file).forEach(function (a) { if (a && a.id && !have[a.id]) data.push(a); });
    return data;
  }

  function load(file) {
    var raw = readRaw(key(file));
    if (raw === null) return seed(file);
    try {
      var data = JSON.parse(raw);
      return data === null ? seed(file) : withNewSeed(file, data);
    } catch (e) {
      // битая запись не должна ронять сайт: отдаём исходные данные
      return seed(file);
    }
  }

  function version(file) {
    return parseInt(readRaw(verKey(file)) || '0', 10) || 0;
  }

  /* ── запись ───────────────────────────────────────────────── */

  function save(file, data, expectedVersion) {
    if (FILES.indexOf(file) === -1) {
      return { ok: false, error: 'Неизвестный раздел данных: ' + file };
    }
    var current = version(file);
    if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== current) {
      return {
        ok: false,
        stale: true,
        version: current,
        error: 'Эти данные успели изменить в другом окне. Обновите страницу, чтобы не потерять чужую правку.'
      };
    }

    var json;
    try { json = JSON.stringify(data); }
    catch (e) { return { ok: false, error: 'Не удалось подготовить данные к сохранению.' }; }

    // Предыдущая версия уходит в историю до подмены. Самая первая правка тоже
    // должна откатываться, поэтому в истории оказываются и исходные данные.
    var prev = readRaw(key(file));
    if (prev === null) { try { prev = JSON.stringify(seed(file)); } catch (e) { prev = null; } }
    if (prev !== null) pushBackup(file, prev, current);

    if (!writeRaw(key(file), json)) {
      return { ok: false, error: 'В браузере кончилось место. Удалите часть загруженных фото и попробуйте снова.' };
    }
    var next = current + 1;
    writeRaw(verKey(file), String(next));
    notify(file);
    return { ok: true, version: next };
  }

  /* ── история и откат ──────────────────────────────────────── */

  function backups(file) {
    try {
      var list = JSON.parse(readRaw(bakKey(file)) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function pushBackup(file, rawJson, ver) {
    var list = backups(file);
    list.unshift({ at: Date.now(), v: ver, json: rawJson });
    list = list.slice(0, KEEP_BACKUPS);
    writeRaw(bakKey(file), JSON.stringify(list));
  }

  function restore(file, at) {
    var hit = backups(file).filter(function (b) { return b.at === at; })[0];
    if (!hit) return { ok: false, error: 'Эта версия больше не хранится.' };
    var data;
    try { data = JSON.parse(hit.json); }
    catch (e) { return { ok: false, error: 'Сохранённая версия повреждена.' }; }
    return save(file, data);
  }

  /* ── сброс демонстрации ───────────────────────────────────── */

  function reset() {
    FILES.forEach(function (f) {
      [key(f), verKey(f), bakKey(f)].forEach(function (k) {
        if (OK) localStorage.removeItem(k); else delete memory[k];
      });
    });
    notify('*');
  }

  function isTouched() {
    return FILES.some(function (f) { return readRaw(key(f)) !== null; });
  }

  /* ── подписка (сайт и админка открыты в соседних вкладках) ── */

  var subs = [];
  function subscribe(fn) { subs.push(fn); return function () { subs = subs.filter(function (s) { return s !== fn; }); }; }
  /* Второй аргумент — откуда правка: 'local' (эта же вкладка) или 'remote'
     (соседняя, обычно админка). Разница существенная: на свою собственную
     запись перерисовывать всё подряд нельзя — тот, кто писал, уже обновил
     что нужно, а сплошная перерисовка сотрёт форму вместе с подтверждением. */
  function notify(file, from) { subs.forEach(function (fn) { try { fn(file, from || 'local'); } catch (e) {} }); }

  if (global.addEventListener) {
    global.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf(PREFIX) === 0) notify(e.key.slice(PREFIX.length), 'remote');
    });
  }

  /* ── картинки ─────────────────────────────────────────────
     Фото, загруженные из админки, живут в хранилище как data-URL,
     остальные лежат файлами в img/. Обе разновидности зовутся одинаково,
     поэтому весь сайт спрашивает картинку только через Store.img(). */

  // Админка лежит на уровень глубже сайта, поэтому путь к img/ у неё свой.
  var BASE = '';
  function setBase(b) { BASE = b || ''; }

  function img(name) {
    if (!name) return '';
    if (name.indexOf('data:') === 0) return name;
    var up = load('photos');
    var bare = name.replace(/^img\//, '');
    if (up && up[bare] && up[bare].src) return up[bare].src;
    return BASE + (name.indexOf('/') === -1 ? 'img/' + name : name);
  }

  // Полный список доступных картинок: встроенные в прототип и загруженные.
  var BUILTIN = [
    'hero.jpg', 'lisichka.jpg', 'belyi.jpg', 'belyi-sush.jpg', 'sushenye.jpg',
    'smorchok.jpg', 'shapochka.jpg', 'solenya.jpg',
    'moroshka.jpg', 'klukva.jpg', 'brusnika.jpg', 'zemlyanika.jpg',
    'korzina.jpg', 'doroga.jpg', 'sborshiki.jpg', 'priemka.jpg'
  ];

  function images() {
    var up = load('photos') || {};
    var names = Object.keys(up).sort();
    return names.concat(BUILTIN.filter(function (b) { return names.indexOf(b) === -1; }));
  }

  global.Store = {
    FILES: FILES,
    BUILTIN: BUILTIN,
    setBase: setBase,
    img: img,
    images: images,
    load: load,
    save: save,
    version: version,
    backups: backups,
    restore: restore,
    reset: reset,
    isTouched: isTouched,
    subscribe: subscribe,
    seed: seed,
    clone: clone,
    storageOK: OK
  };
})(window);
