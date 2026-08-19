/* Админка «Лесника».
 *
 * Логика взята из админки «Методики» (разделы, JSON-файлы, флеш-сообщения,
 * выбор фото, транслитерация, откат к прошлой версии), но переписана с учётом
 * её разбора ошибок:
 *
 *  1. Загрузка фото там молча не срабатывала: компонент рисовал поле под одним
 *     именем, а раздел читал другое. Здесь поле фото одно на всю админку и
 *     после сохранения мы показываем, какой файл реально записан.
 *  2. Пустое числовое поле превращалось в ноль и стирало данные. Здесь пустое
 *     или нечисловое значение оставляет прежнее число и говорит об этом.
 *  3. Запись с незаполненными полями уезжала на сайт и ломала вёрстку. Здесь
 *     обязательные поля проверяются до сохранения, пустые необязательные
 *     просто не выводятся.
 *  4. Категория была привязана к точному названию: переименовали и страница
 *     опустела. Здесь у категории есть неизменный id, имя всего лишь подпись.
 *  5. Дату молча подменяли на сегодняшнюю, если не разобрали. Здесь непонятная
 *     дата это ошибка рядом с полем.
 *  6. «Сохранено» показывали даже когда сайт не пересобрался. Здесь сохранение
 *     и публикация это разные сообщения.
 *  7. Тексты вставлялись в HTML без экранирования. Здесь через esc() проходит
 *     всё без исключения.
 */

(function () {
  'use strict';

  Store.setBase('../');   // картинки лежат уровнем выше, рядом с сайтом

  /* ═══════════ мелкие помощники ═══════════ */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Обработчик на постоянном контейнере: прежний снимается, новый встаёт.
  // Без этого каждый заход на экран добавлял слушатель, и со второго визита
  // тап по статусу заявки срабатывал дважды («туда-обратно», как будто не работает).
  function bind(el, type, fn) {
    el.__bound = el.__bound || {};
    if (el.__bound[type]) el.removeEventListener(type, el.__bound[type]);
    el.__bound[type] = fn;
    el.addEventListener(type, fn);
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Пустое или нечисловое значение НЕ обнуляет данные: возвращаем прежнее.
  function num(raw, prev) {
    var s = String(raw === undefined || raw === null ? '' : raw).replace(/\s+/g, '').replace(',', '.');
    if (s === '') return { value: prev, kept: true };
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { value: prev, kept: true, bad: true };
    return { value: Math.round(parseFloat(s)), kept: false };
  }

  function translit(s) {
    var map = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i',
      'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
      'ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya' };
    return String(s).toLowerCase().replace(/[а-яё]/g, function (c) { return map[c] !== undefined ? map[c] : c; })
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'partiya';
  }

  function uniqueId(base, taken, self) {
    var id = base, i = 2;
    while (taken.indexOf(id) !== -1 && id !== self) { id = base + '-' + i; i++; }
    return id;
  }

  // «11.08» и «11.08.2026» разбираем, остальное честно считаем ошибкой.
  function parseShortDate(s) {
    var m = String(s).trim().match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?$/);
    if (!m) return null;
    var d = +m[1], mo = +m[2];
    var y = m[3] ? (m[3].length === 2 ? 2000 + (+m[3]) : +m[3]) : new Date().getFullYear();
    var probe = new Date(y, mo - 1, d);
    if (probe.getDate() !== d || probe.getMonth() !== mo - 1) return null;
    return { short: pad(d) + '.' + pad(mo), sort: y * 10000 + mo * 100 + d };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayShort() { var t = new Date(); return pad(t.getDate()) + '.' + pad(t.getMonth() + 1); }
  function todaySort() { var t = new Date(); return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate(); }

  function fmt(n) { return Number(n || 0).toLocaleString('ru-RU'); }

  /* ═══════════ данные ═══════════ */

  var db = {};        // текущее состояние разделов
  var ver = {};       // версия, с которой мы работаем: ловим правку из соседней вкладки

  function reload(file) {
    db[file] = Store.load(file);
    ver[file] = Store.version(file);
    return db[file];
  }

  function reloadAll() { Store.FILES.forEach(reload); }

  // Сохранение и публикация это разные события: не говорим «на сайте», пока не так.
  function commit(file, data, msg) {
    var res = Store.save(file, data, ver[file]);
    if (!res.ok) {
      toast(res.error, true);
      if (res.stale) { reload(file); render(); }
      return false;
    }
    db[file] = data;
    ver[file] = res.version;
    toast(msg || 'Сохранено. Сайт обновлён.');
    return true;
  }

  /* ═══════════ уведомления и подтверждения ═══════════ */

  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('#toast');
    t.className = 'toast' + (isError ? ' toast--err' : '');
    t.innerHTML = esc(msg);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, isError ? 6000 : 3000);
  }

  function sheet(title, sub, bodyHtml, onMount) {
    var box = $('#sheetBody');
    box.innerHTML =
      '<div class="sheet__head"><h2 id="sheetTitle">' + esc(title) + '</h2>' +
      '<button class="btn btn--sm" type="button" data-sheet-close>Закрыть</button></div>' +
      (sub ? '<p class="sheet__sub">' + esc(sub) + '</p>' : '') + bodyHtml;
    $('#sheet').hidden = false;
    document.body.classList.add('has-sheet');
    if (onMount) onMount(box);
  }

  function closeSheet() {
    $('#sheet').hidden = true;
    document.body.classList.remove('has-sheet');
  }

  function confirmDanger(title, text, btnText, onYes) {
    sheet(title, text,
      '<div class="btn-row"><button class="btn btn--danger btn--full" type="button" data-yes>' + esc(btnText) + '</button>' +
      '<button class="btn btn--full" type="button" data-sheet-close>Отмена</button></div>',
      function (box) {
        $('[data-yes]', box).addEventListener('click', function () { closeSheet(); onYes(); });
      });
  }

  /* ═══════════ нижняя панель ═══════════ */

  function bar(buttons) {
    var el = $('#bar'), inner = $('#barIn');
    if (!buttons || !buttons.length) { el.hidden = true; inner.innerHTML = ''; return; }
    el.hidden = false;
    inner.innerHTML = buttons.map(function (b, i) {
      return '<button class="btn ' + (b.cls === undefined ? 'btn--solid' : b.cls) + '" type="button" data-bar="' + i + '">' + esc(b.label) + '</button>';
    }).join('');
    $$('[data-bar]', inner).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fn = buttons[+btn.dataset.bar].onClick;
        if (fn) fn(btn);
      });
    });
  }

  /* ═══════════ навигация ═══════════ */

  var route = { name: 'home', arg: null };

  function go(name, arg) {
    location.hash = '#' + name + (arg ? '/' + arg : '');
  }

  function readHash() {
    var h = location.hash.replace(/^#/, '') || 'home';
    var parts = h.split('/');
    return { name: parts[0] || 'home', arg: parts[1] || null };
  }

  var TITLES = {
    home:     ['Управление сайтом', 'Лесник'],
    lots:     ['Партии', 'Товары на сайте'],
    lot:      ['Партия', ''],
    cats:     ['Категории', 'Виды и состояния'],
    photos:   ['Фото', 'Загрузка и замена'],
    leads:    ['Заявки', 'Кто написал с сайта'],
    orders:   ['Заказы', 'Партии, брони и розница'],
    buyers:   ['Оптовики', 'Доступ к оптовым ценам'],
    texts:    ['Тексты и контакты', 'Телефон, реквизиты, баннер'],
    history:  ['История изменений', 'Откат к прошлой версии']
  };

  function render() {
    route = readHash();
    var known = TITLES[route.name] ? route.name : 'home';
    if (known !== route.name) { go('home'); return; }

    $$('.screen').forEach(function (s) { s.classList.remove('is-on'); });
    var scr = $('#scr-' + route.name);
    if (scr) scr.classList.add('is-on');

    var t = TITLES[route.name];
    $('#topTitle').textContent = t[0];
    $('#topSub').textContent = t[1];
    $('#back').hidden = route.name === 'home';

    closeSheet();
    bar(null);
    window.scrollTo(0, 0);

    if (route.name === 'home')    renderHome();
    if (route.name === 'lots')    renderLots();
    if (route.name === 'lot')     renderLot(route.arg);
    if (route.name === 'cats')    renderCats();
    if (route.name === 'photos')  renderPhotos();
    if (route.name === 'leads')   renderLeads();
    if (route.name === 'orders')  renderOrders();
    if (route.name === 'buyers')  renderBuyers();
    if (route.name === 'texts')   renderTexts();
    if (route.name === 'history') renderHistory();
  }

  /* ═══════════ главная ═══════════ */

  function renderHome() {
    var lots = db.lots, leads = db.leads;
    var live = lots.filter(function (l) { return l.status === 'live'; });
    var newLeads = leads.filter(function (l) { return l.status === 'new'; }).length;
    var newOrders = orders().filter(function (o) { return o.status === 'new'; }).length;
    var low = live.filter(function (l) { return l.total && l.stock / l.total < 0.35; });

    $('#quick').innerHTML =
      quickBtn('price', '₽', 'Поменять цену', 'Открытых партий: ' + live.length) +
      quickBtn('stock', '⚖', 'Поправить остаток', low.length ? 'Заканчивается: ' + low.length : 'Все партии в норме') +
      quickBtn('new', '＋', 'Новая партия', 'Собрали что-то новое');

    $('#tiles').innerHTML = [
      tile('lots', 'Партии', 'Цены, остатки, статусы', live.length + ' из ' + lots.length),
      tile('cats', 'Категории', 'Виды и состояния', db.categories.kinds.length + ' вида'),
      tile('photos', 'Фото', 'Загрузить и заменить', Store.images().length + ' шт'),
      tile('leads', 'Заявки', 'Кто написал с сайта', newLeads ? newLeads + ' новых' : 'новых нет', newLeads > 0),
      tile('orders', 'Заказы', 'Партии, брони и розница', newOrders ? newOrders + ' новых' : 'новых нет', newOrders > 0),
      tile('buyers', 'Оптовики', 'Доступ к оптовым ценам', waitingBuyers() ? waitingBuyers() + ' ждут' : 'все открыты', waitingBuyers() > 0),
      tile('texts', 'Тексты', 'Телефон и реквизиты', TEXT_FIELDS.length + ' строк'),
      tile('history', 'История', 'Откатить изменения', histCount() ? histCount() + ' версий' : 'пока пусто')
    ].join('');

    var touched = Store.isTouched();
    $('#storeState').textContent = touched
      ? 'Вы уже вносили правки. В прототипе они хранятся в этом браузере: на другом устройстве сайт покажет исходные данные.'
      : 'Правок пока не было, показаны исходные данные партий из канала клиента.';

    if (!Store.storageOK) {
      $('#storeState').textContent = 'Браузер запретил сохранение (режим инкогнито). Правки будут жить до закрытия вкладки.';
    }
  }

  function quickBtn(act, ico, title, sub) {
    return '<button class="quick__btn" type="button" data-quick="' + act + '">' +
      '<span class="quick__ico" aria-hidden="true">' + ico + '</span>' +
      '<span>' + esc(title) + '<small>' + esc(sub) + '</small></span></button>';
  }

  function tile(to, name, sub, n, alert) {
    return '<button class="tile" type="button" data-go="' + to + '"><b>' + esc(name) + '</b>' +
      '<span>' + esc(sub) + '</span>' +
      (n ? '<span class="tile__n' + (alert ? ' tile__n--alert' : '') + '">' + esc(n) + '</span>' : '') +
      '</button>';
  }

  /* ═══════════ список партий ═══════════ */

  var lotFilter = 'live';
  var lotQuery = '';

  function visibleLots() {
    var q = lotQuery.trim().toLowerCase().replace(/ё/g, 'е');
    return db.lots.filter(function (l) {
      if (lotFilter === 'live' && l.status !== 'live') return false;
      if (lotFilter === 'closed' && l.status !== 'closed') return false;
      if (q && (l.name + ' ' + l.spec).toLowerCase().replace(/ё/g, 'е').indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderLots() {
    var list = visibleLots();
    $('#lotRows').innerHTML = list.map(lotRow).join('');
    $('#lotEmpty').hidden = list.length > 0;
    $('#lotEmpty').textContent = lotQuery
      ? 'По запросу «' + lotQuery + '» ничего нет.'
      : (lotFilter === 'closed' ? 'Закрытых партий нет.' : 'Открытых партий нет. Добавьте первую.');
    $$('#lotFilters button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lf === lotFilter));
    });
    bar([{ label: '＋ Новая партия', onClick: function () { newLot(); } }]);
  }

  function lotRow(l) {
    var live = l.status === 'live';
    var pct = l.total ? Math.round((l.stock / l.total) * 100) : 0;
    return '<article class="row' + (live ? '' : ' row--off') + '">' +
      '<div class="row__pic"><img src="' + esc(Store.img(l.img)) + '" alt=""></div>' +
      '<div class="row__main">' +
        '<button class="row__name" type="button" data-open="' + esc(l.id) + '">' + esc(l.name) + '</button>' +
        '<div class="row__meta"><span class="pill' + (live ? '' : ' pill--off') + '"><i></i>' +
          (live ? 'открыта' : 'закрыта ' + esc(l.closed || '')) + '</span> ' + esc(l.spec) + '</div>' +
      '</div>' +
      '<div class="row__nums">' +
        '<button class="row__num" type="button" data-edit="price" data-id="' + esc(l.id) + '">' +
          '<small>Цена опт</small><b>' + esc(l.opt || 'по запросу') + '</b></button>' +
        '<button class="row__num" type="button" data-edit="stock" data-id="' + esc(l.id) + '">' +
          '<small>Остаток' + (live && pct < 35 ? ', мало' : '') + '</small><b>' + fmt(l.stock) + ' кг</b></button>' +
        '<button class="row__num" type="button" data-edit="status" data-id="' + esc(l.id) + '">' +
          '<small>Статус</small><b>' + (live ? 'открыта' : 'закрыта') + '</b></button>' +
      '</div>' +
    '</article>';
  }

  /* быстрые правки прямо из списка: шторка снизу, список не теряется */

  function findLot(id) {
    for (var i = 0; i < db.lots.length; i++) if (db.lots[i].id === id) return db.lots[i];
    return null;
  }

  function editPrice(id) {
    var lot = findLot(id);
    if (!lot) return;
    var t = (lot.tiers && lot.tiers.length ? lot.tiers : [[20, ''], [100, ''], [500, '']]).slice(0, 3);
    while (t.length < 3) t.push(['', '']);
    sheet(lot.name, 'Цена за килограмм по ступеням объёма. Первая ступень — минимум заказа и цена на сайте. Пустые ступени не показываются.',
      t.map(function (row, i) {
        return '<div class="two" data-trow="' + i + '">' +
          '<label class="field"><span>От, кг</span><input type="text" inputmode="numeric" data-tkg value="' + esc(row[0]) + '"></label>' +
          '<label class="field"><span>Цена за кг, ₽</span><input type="text" inputmode="numeric" data-tpr value="' + esc(row[1]) + '"></label>' +
        '</div>';
      }).join('') +
      '<button class="btn btn--solid btn--full" type="button" data-save>Сохранить лесенку</button>',
      function (box) {
        var first = $('[data-tpr]', box);
        first.focus(); first.select();
        $('[data-save]', box).addEventListener('click', function () {
          var tiers = [];
          var bad = false;
          $$('[data-trow]', box).forEach(function (row) {
            var kg = $('[data-tkg]', row).value.trim().replace(/\s+/g, '');
            var pr = $('[data-tpr]', row).value.trim().replace(/\s+/g, '');
            if (kg === '' && pr === '') return;
            if (!/^\d+$/.test(kg) || !/^\d+$/.test(pr) || +kg <= 0 || +pr <= 0) { bad = true; return; }
            tiers.push([+kg, +pr]);
          });
          if (bad) { toast('Ступени пишутся числами: килограммы и цена. Проверьте заполненные строки.', true); return; }
          if (!tiers.length) { toast('Нужна хотя бы одна ступень: минимум и цена. Без цены партия на сайт не пойдёт.', true); return; }
          tiers.sort(function (a, b) { return a[0] - b[0]; });
          lot.tiers = tiers;
          lot.demoOpt = true;   // до боевого прайса клиента цены остаются демонстрационными
          lot.opt = fmt(tiers[0][1]) + ' ₽';
          lot.minVol = tiers[0][0] >= 200 ? 'big' : 'mini';
          if (commit('lots', db.lots, 'Лесенка сохранена: от ' + fmt(tiers[0][0]) + ' кг — ' + fmt(tiers[0][1]) + ' ₽/кг')) { closeSheet(); renderLots(); }
        });
      });
  }

  function editStock(id) {
    var lot = findLot(id);
    if (!lot) return;
    sheet(lot.name, 'Сколько осталось из ' + fmt(lot.total) + ' кг партии.',
      '<label class="field"><span>Остаток, кг</span>' +
      '<span class="stepper">' +
        '<button type="button" data-step="-10" aria-label="Минус 10">−</button>' +
        '<input type="text" inputmode="numeric" id="shStock" value="' + esc(lot.stock) + '">' +
        '<button type="button" data-step="10" aria-label="Плюс 10">+</button>' +
      '</span>' +
      '<span class="field__hint">Пустое поле оставит прежнее число, обнулять случайно нечем.</span></label>' +
      '<button class="btn btn--solid btn--full" type="button" data-save>Сохранить остаток</button>',
      function (box) {
        var inp = $('#shStock', box);
        $$('[data-step]', box).forEach(function (b) {
          b.addEventListener('click', function () {
            var cur = num(inp.value, lot.stock).value;
            inp.value = Math.max(0, cur + (+b.dataset.step));
          });
        });
        $('[data-save]', box).addEventListener('click', function () {
          var r = num(inp.value, lot.stock);
          if (r.bad) { toast('Остаток пишется числом. Прежнее значение сохранено.', true); return; }
          lot.stock = Math.max(0, r.value);
          if (lot.total && lot.stock > lot.total) lot.total = lot.stock;
          var msg = r.kept ? 'Поле было пустым, остаток не изменился: ' + fmt(lot.stock) + ' кг'
                           : 'Остаток сохранён: ' + fmt(lot.stock) + ' кг';
          if (commit('lots', db.lots, msg)) { closeSheet(); renderLots(); }
        });
      });
  }

  function editStatus(id) {
    var lot = findLot(id);
    if (!lot) return;
    var live = lot.status === 'live';
    sheet(lot.name, live ? 'Партия открыта и показывается в наличии.' : 'Партия закрыта и лежит в архиве.',
      (live
        ? '<label class="field"><span>Дата закрытия</span>' +
          '<input type="text" id="shDate" inputmode="numeric" value="' + esc(todayShort()) + '" placeholder="дд.мм">' +
          '<em class="err">Дата непонятна. Напишите как 11.08</em>' +
          '<span class="field__hint">Покажем на карточке: «закрыта 11.08». Карточка останется в поиске и приведёт закупщиков на следующий сезон.</span></label>' +
          '<button class="btn btn--solid btn--full" type="button" data-save>Закрыть партию</button>'
        : '<button class="btn btn--solid btn--full" type="button" data-save>Открыть партию снова</button>'),
      function (box) {
        $('[data-save]', box).addEventListener('click', function () {
          if (live) {
            var f = $('#shDate', box).closest('.field');
            var d = parseShortDate($('#shDate', box).value);
            if (!d) { f.dataset.invalid = 'true'; return; }   // молча сегодняшнюю не подставляем
            f.dataset.invalid = 'false';
            lot.status = 'closed';
            lot.closed = d.short;
            lot.date = d.sort;
            lot.stock = 0;
          } else {
            lot.status = 'live';
            delete lot.closed;
            if (!lot.stock) lot.stock = lot.total || 0;
          }
          if (commit('lots', db.lots, lot.status === 'live' ? 'Партия снова открыта' : 'Партия закрыта и ушла в архив')) {
            closeSheet(); renderLots();
          }
        });
      });
  }

  /* ═══════════ редактор партии ═══════════ */

  var draftKey = null;

  function blankLot() {
    return {
      id: '', name: '', kind: db.categories.kinds[0].id, state: db.categories.states[0].id,
      status: 'live', opt: 'по запросу', tiers: [], retail: null, retailUnit: 'за 1 кг', demo: true,
      stock: 0, total: 0, minVol: 'mini',
      region: '', harvest: '', spec: '', volume: '',
      about: '', specs: [['Состояние', ''], ['Тара', '']],
      img: '', gal: [], alt: '', date: todaySort()
    };
  }

  function newLot() { go('lot', 'new'); }

  function renderLot(id) {
    var isNew = id === 'new';
    var lot = isNew ? blankLot() : findLot(id);
    if (!lot) { toast('Такой партии больше нет.', true); go('lots'); return; }
    var work = Store.clone(lot);
    draftKey = 'lesnik.draft.' + (isNew ? 'new' : id);

    $('#topTitle').textContent = isNew ? 'Новая партия' : work.name;
    $('#topSub').textContent = isNew ? 'Заполните и сохраните' : 'Правка карточки';

    var kinds = db.categories.kinds, states = db.categories.states;
    var box = $('#lotForm');

    box.innerHTML =
      '<div class="group" style="margin-top:0">' +
        '<label class="field"><span>Название</span>' +
          '<input type="text" name="name" value="' + esc(work.name) + '" placeholder="Лисичка сушёная">' +
          '<em class="err">Без названия карточка на сайте будет пустой</em></label>' +
        '<div class="two">' +
          '<label class="field"><span>Вид</span><select name="kind">' +
            kinds.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === work.kind ? ' selected' : '') + '>' + esc(k.name) + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="field"><span>Состояние</span><select name="state">' +
            states.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === work.state ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
          '</select></label>' +
        '</div>' +
        '<label class="field"><span>Короткая подпись под названием</span>' +
          '<input type="text" name="spec" value="' + esc(work.spec) + '" placeholder="Урожай 2026, влажность до 12 %"></label>' +
      '</div>' +

      sect('Цена и объём', true,
        '<div class="field"><span>Лесенка опта: от какого объёма какая цена за кг</span>' +
          (function () {
            var t = (work.tiers && work.tiers.length ? work.tiers : [[20, ''], [100, ''], [500, '']]).slice(0, 3);
            while (t.length < 3) t.push(['', '']);
            return t.map(function (row, i) {
              return '<div class="two" data-trow="' + i + '">' +
                '<label class="field" style="margin-bottom:8px"><span>От, кг</span><input type="text" inputmode="numeric" data-tkg value="' + esc(row[0]) + '"></label>' +
                '<label class="field" style="margin-bottom:8px"><span>Цена за кг, ₽</span><input type="text" inputmode="numeric" data-tpr value="' + esc(row[1]) + '"></label>' +
              '</div>';
            }).join('');
          })() +
          '<em class="err" data-tiers-err>Заполните хотя бы первую ступень: минимум и цена числами</em>' +
          '<span class="field__hint">Первая ступень — минимум заказа и цена на сайте. Пустые ступени не показываются.</span>' +
        '</div>' +
        '<div class="two">' +
          '<label class="field"><span>Цена в розницу</span>' +
            '<input type="text" inputmode="numeric" name="retail" value="' + esc(work.retail === null || work.retail === undefined ? '' : work.retail) + '" placeholder="пусто = только опт"></label>' +
          '<label class="field"><span>За сколько</span>' +
            '<input type="text" name="retailUnit" value="' + esc(work.retailUnit || '') + '" placeholder="за 1 кг"></label>' +
        '</div>' +
        '<label class="field"><span>Тара и объём отгрузки</span>' +
          '<input type="text" name="volume" value="' + esc(work.volume) + '" placeholder="мешок 10 кг"></label>' +
        '<p class="field__hint">Минимальный заказ сайт берёт из первой ступени лесенки, отдельно его вводить не нужно.</p>'
      ) +

      sect('Остаток и статус', true,
        '<div class="two">' +
          '<label class="field"><span>Осталось, кг</span>' +
            '<span class="stepper">' +
              '<button type="button" data-fstep="-10" data-for="stock">−</button>' +
              '<input type="text" inputmode="numeric" name="stock" value="' + esc(work.stock) + '">' +
              '<button type="button" data-fstep="10" data-for="stock">+</button>' +
            '</span></label>' +
          '<label class="field"><span>Всего в партии, кг</span>' +
            '<span class="stepper">' +
              '<button type="button" data-fstep="-50" data-for="total">−</button>' +
              '<input type="text" inputmode="numeric" name="total" value="' + esc(work.total) + '">' +
              '<button type="button" data-fstep="50" data-for="total">+</button>' +
            '</span></label>' +
        '</div>' +
        '<div class="field"><span>Статус</span>' +
          '<div class="switch" data-switch="status">' +
            '<button type="button" data-v="live" aria-pressed="' + (work.status === 'live') + '">Открыта</button>' +
            '<button type="button" data-v="closed" aria-pressed="' + (work.status === 'closed') + '">Закрыта</button>' +
          '</div></div>' +
        '<label class="field" data-when="closed"' + (work.status === 'closed' ? '' : ' hidden') + '><span>Дата закрытия</span>' +
          '<input type="text" inputmode="numeric" name="closed" value="' + esc(work.closed || todayShort()) + '" placeholder="дд.мм">' +
          '<em class="err">Дата непонятна. Напишите как 11.08</em></label>'
      ) +

      sect('Фото', true,   // замена фото частая задача, прятать её за раскрытием нельзя
        '<div class="gal" id="galPick"></div>' +
        '<label class="uploader">＋ Загрузить с телефона' +
          '<input type="file" id="lotUpload" accept="image/jpeg,image/png,image/webp"></label>' +
        '<p class="field__hint" id="galNote"></p>' +
        '<label class="field" style="margin-top:14px"><span>Описание фото для поиска</span>' +
          '<input type="text" name="alt" value="' + esc(work.alt) + '" placeholder="Сушёные лисички в мешке"></label>'
      ) +

      sect('Описание', false,
        '<div class="two">' +
          '<label class="field"><span>Регион</span>' +
            '<input type="text" name="region" value="' + esc(work.region) + '" placeholder="Свердловская область"></label>' +
          '<label class="field"><span>Когда собрано</span>' +
            '<input type="text" name="harvest" value="' + esc(work.harvest) + '" placeholder="сбор июль 2026"></label>' +
        '</div>' +
        '<label class="field"><span>Текст об этой партии</span>' +
          '<textarea name="about" placeholder="Чем эта партия хороша и кому подходит">' + esc(work.about) + '</textarea></label>'
      ) +

      sect('Характеристики', false,
        '<div class="pairs" id="specRows"></div>' +
        '<button class="btn btn--sm" type="button" id="addSpec" style="margin-top:10px">＋ Строка</button>'
      ) +

      (isNew ? '' :
        '<div class="btn-row"><button class="btn btn--danger btn--full" type="button" id="delLot">Удалить партию</button></div>');

    // ---- фото ----
    function paintGallery() {
      $('#galPick').innerHTML = Store.images().map(function (name) {
        var own = !!(db.photos && db.photos[name]);
        return '<button class="gal__item" type="button" data-pick="' + esc(name) + '" aria-pressed="' + (work.img.replace(/^img\//, '') === name) + '">' +
          '<img src="' + esc(Store.img(name)) + '" alt="' + esc(name) + '" loading="lazy">' +
          (own ? '<span class="gal__own">своё</span>' : '') + '</button>';
      }).join('');
      $('#galNote').textContent = work.img
        ? 'Выбрано: ' + work.img.replace(/^img\//, '')
        : 'Фото не выбрано. Карточка без фото на сайт не уйдёт.';
    }
    paintGallery();

    $('#lotUpload').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      uploadPhoto(file, function (err, name) {
        e.target.value = '';
        if (err) { toast(err, true); return; }
        work.img = name;
        work.gal = [name].concat(work.gal || []).slice(0, 4);
        paintGallery();
        saveDraft();
        toast('Фото загружено: ' + name);
      });
    });

    // ---- характеристики ----
    function paintSpecs() {
      $('#specRows').innerHTML = (work.specs || []).map(function (p, i) {
        return '<div class="pair" data-si="' + i + '">' +
          '<input type="text" data-sk value="' + esc(p[0]) + '" placeholder="Хранение">' +
          '<input type="text" data-sv value="' + esc(p[1]) + '" placeholder="18 месяцев">' +
          '<button class="ico ico--del" type="button" data-sdel aria-label="Убрать строку">✕</button>' +
        '</div>';
      }).join('');
    }
    paintSpecs();
    $('#addSpec').addEventListener('click', function () {
      work.specs = collectSpecs(); work.specs.push(['', '']); paintSpecs();
    });
    $('#specRows').addEventListener('click', function (e) {
      var del = e.target.closest('[data-sdel]');
      if (!del) return;
      var i = +del.closest('.pair').dataset.si;
      work.specs = collectSpecs(); work.specs.splice(i, 1); paintSpecs();
    });
    function collectSpecs() {
      return $$('#specRows .pair').map(function (r) {
        return [$('[data-sk]', r).value, $('[data-sv]', r).value];
      });
    }

    // ---- один клик-обработчик на форму: фото, переключатели, степперы ----
    bind(box, 'click', function (e) {
      var pick = e.target.closest('[data-pick]');
      if (pick) {
        work.img = pick.dataset.pick;
        work.gal = [work.img].concat((work.gal || []).filter(function (g) { return g.replace(/^img\//, '') !== work.img; })).slice(0, 4);
        paintGallery();
        saveDraft();
        return;
      }
      var sw = e.target.closest('[data-switch] button');
      if (sw) {
        var grp = sw.closest('[data-switch]');
        $$('button', grp).forEach(function (b) { b.setAttribute('aria-pressed', String(b === sw)); });
        if (grp.dataset.switch === 'status') {
          $('[data-when="closed"]', box).hidden = sw.dataset.v !== 'closed';
        }
        saveDraft();
        return;
      }
      var st = e.target.closest('[data-fstep]');
      if (st) {
        var inp = box.querySelector('[name="' + st.dataset.for + '"]');
        inp.value = Math.max(0, num(inp.value, 0).value + (+st.dataset.fstep));
        saveDraft();
      }
    });

    // ---- черновик: звонок посреди правки не должен стирать работу ----
    function saveDraft() {
      try { sessionStorage.setItem(draftKey, JSON.stringify(collect(true))); } catch (e) {}
    }
    bind(box, 'input', saveDraft);

    var stashed = null;
    try { stashed = JSON.parse(sessionStorage.getItem(draftKey) || 'null'); } catch (e) {}
    if (stashed && !isNew && stashed.name !== work.name) {
      toast('Нашли незаконченную правку этой партии, поля восстановлены.');
    }

    function val(n) { var el = box.querySelector('[name="' + n + '"]'); return el ? el.value : ''; }
    function switchVal(n) {
      var b = box.querySelector('[data-switch="' + n + '"] button[aria-pressed="true"]');
      return b ? b.dataset.v : '';
    }

    function collect(loose) {
      var out = Store.clone(work);
      out.name = val('name').trim();
      out.kind = val('kind');
      out.state = val('state');
      out.spec = val('spec').trim();

      // лесенка опта: строки с числами; первая ступень задаёт минимум и цену на сайте
      var tiers = [];
      out.tiersBad = false;
      $$('[data-trow]', box).forEach(function (row) {
        var kg = $('[data-tkg]', row).value.trim().replace(/\s+/g, '');
        var pr = $('[data-tpr]', row).value.trim().replace(/\s+/g, '');
        if (kg === '' && pr === '') return;
        if (!/^\d+$/.test(kg) || !/^\d+$/.test(pr) || +kg <= 0 || +pr <= 0) { out.tiersBad = true; return; }
        tiers.push([+kg, +pr]);
      });
      tiers.sort(function (a, b) { return a[0] - b[0]; });
      out.tiers = tiers;
      if (tiers.length) {
        out.opt = fmt(tiers[0][1]) + ' ₽';
        out.demoOpt = true;
        out.minVol = tiers[0][0] >= 200 ? 'big' : 'mini';
      } else {
        out.opt = work.opt || 'по запросу';
      }

      out.retailUnit = val('retailUnit').trim();
      out.volume = val('volume').trim();
      out.region = val('region').trim();
      out.harvest = val('harvest').trim();
      out.about = val('about').trim();
      out.alt = val('alt').trim() || out.name;
      out.status = switchVal('status');
      out.specs = collectSpecs().filter(function (p) { return loose || (p[0].trim() && p[1].trim()); });

      var s = num(val('stock'), work.stock); out.stock = Math.max(0, s.value || 0);
      var t = num(val('total'), work.total); out.total = Math.max(0, t.value || 0);

      var r = val('retail').trim();
      out.retail = r === '' ? null : (num(r, work.retail).value || null);
      out.demo = out.retail !== null;
      return out;
    }

    function validate(data) {
      var bad = null;
      $$('.field', box).forEach(function (f) { f.dataset.invalid = 'false'; });
      function fail(name, msg) {
        var el = box.querySelector('[name="' + name + '"]');
        if (el && el.closest('.field')) el.closest('.field').dataset.invalid = 'true';
        if (!bad) { bad = msg; if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
      if (!data.name) fail('name', 'Впишите название партии.');
      if (data.tiersBad || (data.status === 'live' && !data.tiers.length)) {
        var tf = box.querySelector('[data-tiers-err]');
        if (tf && tf.closest('.field')) tf.closest('.field').dataset.invalid = 'true';
        if (!bad) {
          bad = data.tiersBad
            ? 'Ступени лесенки пишутся числами: килограммы и цена.'
            : 'Открытой партии нужна хотя бы одна ступень цены: минимум и цена за кг.';
          var firstTier = box.querySelector('[data-tkg]');
          if (firstTier) firstTier.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      delete data.tiersBad;
      if (!data.img) bad = bad || 'Выберите фото: карточка без фото ломает вид на сайте.';
      if (data.status === 'closed') {
        var d = parseShortDate(val('closed'));
        if (!d) fail('closed', 'Дата закрытия непонятна. Напишите как 11.08.');
        else { data.closed = d.short; data.date = d.sort; data.stock = 0; }
      } else {
        delete data.closed;
      }
      if (data.total && data.stock > data.total) {
        data.total = data.stock;   // не спорим, а подтягиваем: остаток больше партии бессмыслен
      }
      return bad;
    }

    bar([
      { label: isNew ? 'Создать партию' : 'Сохранить', onClick: function (btn) {
          var data = collect(false);
          var err = validate(data);
          if (err) { toast(err, true); return; }
          btn.disabled = true;                       // защита от двойного нажатия
          setTimeout(function () { btn.disabled = false; }, 800);

          if (isNew) {
            var taken = db.lots.map(function (l) { return l.id; });
            data.id = uniqueId(translit(data.name), taken);
            if (!data.gal.length) data.gal = [data.img];
            db.lots.unshift(data);
          } else {
            var i = db.lots.findIndex(function (l) { return l.id === id; });
            data.id = id;                            // id не переезжает при переименовании
            if (!data.gal.length) data.gal = [data.img];
            db.lots[i] = data;
          }
          if (commit('lots', db.lots, isNew ? 'Партия создана и уже на сайте' : 'Партия сохранена. Сайт обновлён.')) {
            try { sessionStorage.removeItem(draftKey); } catch (e) {}
            go('lots');
          }
        } },
      { label: 'Отмена', cls: '', onClick: function () {
          try { sessionStorage.removeItem(draftKey); } catch (e) {}
          go('lots');
        } }
    ]);

    var del = $('#delLot');
    if (del) del.addEventListener('click', function () {
      confirmDanger('Удалить партию?', 'Карточка «' + work.name + '» исчезнет с сайта вместе со ссылкой на неё. Если партия просто кончилась, лучше закрыть её: карточка останется в поиске.',
        'Да, удалить', function () {
          db.lots = db.lots.filter(function (l) { return l.id !== id; });
          if (commit('lots', db.lots, 'Партия удалена')) go('lots');
        });
    });
  }

  function sect(title, open, inner) {
    return '<details class="group"' + (open ? ' open' : '') + '>' +
      '<summary class="group__head"><h2>' + esc(title) + '</h2></summary>' + inner + '</details>';
  }

  /* ═══════════ фото: сжимаем прямо в браузере ═══════════ */

  function uploadPhoto(file, done) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'heic' || ext === 'heif') {
      done('Это фото в формате iPhone (HEIC). Отправьте его себе в Telegram и сохраните из чата — станет JPEG. Или включите Настройки → Камера → Форматы → «Наиболее совместимые».');
      return;
    }
    if (['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) === -1) {
      done('Можно загружать только фото: jpg, png или webp.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { done('Не удалось прочитать файл.'); };
    reader.onload = function () {
      var im = new Image();
      im.onerror = function () { done('Это не похоже на изображение.'); };
      im.onload = function () {
        var max = 1400;
        var w = im.width, h = im.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        var src = cv.toDataURL('image/jpeg', 0.82);

        var photos = db.photos || {};
        var base = translit(file.name.replace(/\.[^.]+$/, '')) || 'foto';
        var name = uniqueId(base, Object.keys(photos).concat(Store.BUILTIN).map(function (n) { return n.replace(/\.[^.]+$/, ''); })) + '.jpg';
        photos[name] = { src: src, at: Date.now(), w: w, h: h };
        var res = Store.save('photos', photos, ver.photos);
        if (!res.ok) { done(res.error); return; }
        db.photos = photos; ver.photos = res.version;
        done(null, name);
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPhotos() {
    var own = Object.keys(db.photos || {});
    $('#photosBox').innerHTML =
      '<p class="lede">Фото, которые вы загрузили, подставляются в карточки партий. Снимок с телефона ужимаем до 1400 точек по ширине, чтобы сайт оставался быстрым.</p>' +
      '<label class="uploader" style="margin-top:16px">＋ Загрузить фото' +
        '<input type="file" id="photoUpload" accept="image/jpeg,image/png,image/webp" multiple></label>' +
      '<div class="group"><div class="group__head"><h2>Ваши фото</h2><span class="group__note">' + own.length + '</span></div>' +
        (own.length
          ? '<div class="gal">' + own.map(function (n) {
              return '<button class="gal__item" type="button" data-photo="' + esc(n) + '">' +
                '<img src="' + esc(Store.img(n)) + '" alt="' + esc(n) + '" loading="lazy">' +
                '<span class="gal__own">своё</span></button>';
            }).join('') + '</div>'
          : '<p class="lede">Пока ничего не загружено.</p>') +
      '</div>' +
      '<div class="group"><div class="group__head"><h2>Фото прототипа</h2><span class="group__note">' + Store.BUILTIN.length + '</span></div>' +
        '<div class="gal">' + Store.BUILTIN.map(function (n) {
          return '<span class="gal__item"><img src="' + esc(Store.img(n)) + '" alt="' + esc(n) + '" loading="lazy"></span>';
        }).join('') + '</div>' +
        '<p class="field__hint">Временные снимки из открытых источников. Заменим на ваши кадры из Instagram и Telegram.</p>' +
      '</div>';

    $('#photoUpload').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      var okN = 0, errs = [];
      (function next(i) {
        if (i >= files.length) {
          e.target.value = '';
          if (okN) toast('Загружено фото: ' + okN + (errs.length ? '. Не приняли: ' + errs.length : ''));
          if (errs.length && !okN) toast(errs[0], true);
          renderPhotos();
          return;
        }
        uploadPhoto(files[i], function (err) {
          if (err) errs.push(err); else okN++;
          next(i + 1);
        });
      })(0);
    });

    bind($('#photosBox'), 'click', function (e) {
      var p = e.target.closest('[data-photo]');
      if (!p) return;
      var name = p.dataset.photo;
      var used = db.lots.filter(function (l) {
        return l.img.replace(/^img\//, '') === name || (l.gal || []).some(function (g) { return g.replace(/^img\//, '') === name; });
      });
      if (used.length) {
        // удалить используемое фото нельзя: на сайте останется битая картинка
        sheet(name, 'Это фото стоит в карточках: ' + used.map(function (l) { return l.name; }).join(', ') + '. Сначала замените его там.',
          '<button class="btn btn--full" type="button" data-sheet-close>Понятно</button>');
        return;
      }
      confirmDanger('Удалить фото?', 'Файл «' + name + '» нигде не используется, удалить можно безопасно.', 'Удалить',
        function () {
          delete db.photos[name];
          if (commit('photos', db.photos, 'Фото удалено')) renderPhotos();
        });
    });
  }

  /* ═══════════ категории ═══════════ */

  function renderCats() {
    var c = db.categories;
    $('#catsForm').innerHTML =
      '<div class="note note--info">Название категории можно менять когда угодно: ссылки и карточки на него не завязаны. Удалить категорию можно, только когда в ней нет партий.</div>' +
      '<div class="group" style="margin-top:0">' +
        '<div class="group__head"><h2>Виды</h2><span class="group__note">Грибы, ягоды, травы</span></div>' +
        '<div id="kindRows"></div>' +
        '<button class="btn btn--sm" type="button" data-add="kinds">＋ Добавить вид</button>' +
      '</div>' +
      '<div class="group">' +
        '<div class="group__head"><h2>Состояния</h2><span class="group__note">Свежая, сушёная, замороженная</span></div>' +
        '<div id="stateRows"></div>' +
        '<button class="btn btn--sm" type="button" data-add="states">＋ Добавить состояние</button>' +
      '</div>';

    paintCat('kinds', '#kindRows');
    paintCat('states', '#stateRows');

    bar([{ label: 'Сохранить категории', onClick: saveCats }]);

    function usedBy(group, id) {
      var field = group === 'kinds' ? 'kind' : 'state';
      return db.lots.filter(function (l) { return l[field] === id; });
    }

    function paintCat(group, sel) {
      $(sel).innerHTML = c[group].map(function (item, i) {
        var n = usedBy(group, item.id).length;
        return '<div class="mrow" data-g="' + group + '" data-i="' + i + '">' +
          '<input type="text" value="' + esc(item.name) + '" data-cname aria-label="Название">' +
          '<button class="ico" type="button" data-mv="-1" aria-label="Выше">↑</button>' +
          '<button class="ico" type="button" data-mv="1" aria-label="Ниже">↓</button>' +
          '<button class="ico ico--del" type="button" data-cdel aria-label="Удалить">✕</button>' +
          '<span class="field__hint" style="grid-column:1/-1;margin:0 0 4px">' +
            (n ? 'партий: ' + n : 'пока не используется') + ' · адрес: ' + esc(item.id) + '</span>' +
        '</div>';
      }).join('');
    }

    bind($('#catsForm'), 'click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) {
        var g = add.dataset.add;
        collectCats();
        c[g].push({ id: uniqueId('cat', c[g].map(function (x) { return x.id; })), name: '' });
        paintCat(g, g === 'kinds' ? '#kindRows' : '#stateRows');
        return;
      }
      var row = e.target.closest('.mrow');
      if (!row) return;
      var group = row.dataset.g, idx = +row.dataset.i;

      var mv = e.target.closest('[data-mv]');
      if (mv) {
        collectCats();
        var to = idx + (+mv.dataset.mv);
        if (to < 0 || to >= c[group].length) return;
        var tmp = c[group][idx]; c[group][idx] = c[group][to]; c[group][to] = tmp;
        paintCat(group, group === 'kinds' ? '#kindRows' : '#stateRows');
        return;
      }
      if (e.target.closest('[data-cdel]')) {
        collectCats();
        var item = c[group][idx];
        var used = usedBy(group, item.id);
        if (used.length) {
          toast('Сначала переведите партии в другую категорию: ' + used.map(function (l) { return l.name; }).slice(0, 3).join(', ') + (used.length > 3 ? ' и ещё ' + (used.length - 3) : ''), true);
          return;
        }
        if (c[group].length <= 1) { toast('Последнюю категорию удалить нельзя: каталогу нужен хотя бы один раздел.', true); return; }
        confirmDanger('Удалить «' + (item.name || 'без названия') + '»?', 'В этой категории нет партий, удаление безопасно.', 'Удалить', function () {
          c[group].splice(idx, 1);
          if (commit('categories', c, 'Категория удалена')) renderCats();
        });
      }
    });

    function collectCats() {
      ['kinds', 'states'].forEach(function (g) {
        $$('.mrow[data-g="' + g + '"]').forEach(function (r) {
          c[g][+r.dataset.i].name = $('[data-cname]', r).value;
        });
      });
    }

    function saveCats() {
      collectCats();
      var empty = null;
      ['kinds', 'states'].forEach(function (g) {
        c[g].forEach(function (item) { if (!String(item.name).trim()) empty = g; });
      });
      if (empty) { toast('У каждой категории должно быть название, иначе на сайте будет пустая строка.', true); return; }
      // адрес подтягиваем к названию только у новых: у существующих id неприкосновенен
      c.kinds.forEach(function (k) { if (k.id.indexOf('cat') === 0) k.id = uniqueId(translit(k.name), c.kinds.map(function (x) { return x.id; }), k.id); });
      c.states.forEach(function (s) { if (s.id.indexOf('cat') === 0) s.id = uniqueId(translit(s.name), c.states.map(function (x) { return x.id; }), s.id); });
      if (commit('categories', c, 'Категории сохранены. Сайт обновлён.')) renderCats();
    }
  }

  /* ═══════════ заявки ═══════════ */

  var leadFilter = 'new';

  function renderLeads() {
    var all = db.leads;
    var list = leadFilter === 'all' ? all : all.filter(function (l) { return l.status === leadFilter; });
    $('#leadsBox').innerHTML =
      '<p class="lede">Заявки с сайта. В прототипе показаны примеры, в рабочей версии они будут приходить сюда и дублироваться вам в Telegram.</p>' +
      '<div class="filters" style="margin-top:14px">' +
        [['new', 'Новые', all.filter(function (l) { return l.status === 'new'; }).length],
         ['done', 'Обработанные', all.filter(function (l) { return l.status === 'done'; }).length],
         ['all', 'Все', all.length]].map(function (f) {
          return '<button type="button" data-leadf="' + f[0] + '" aria-pressed="' + (leadFilter === f[0]) + '">' + f[1] + ' · ' + f[2] + '</button>';
        }).join('') +
      '</div>' +
      (list.length
        ? '<div class="rows">' + list.map(function (l) {
            var isNew = l.status === 'new';
            return '<article class="row" style="grid-template-columns:1fr">' +
              '<div class="row__main">' +
                '<b>' + esc(l.name) + '</b> <span class="pill' + (isNew ? ' pill--new' : ' pill--off') + '"><i></i>' + (isNew ? 'новая' : 'обработана') + '</span>' +
                '<div class="row__meta">' + esc(l.date) + ' · ' + esc(l.who) + '</div>' +
                '<div class="row__meta">' + esc(l.lot) + ', ' + esc(l.qty) + '</div>' +
              '</div>' +
              '<div class="row__nums" style="grid-template-columns:1fr 1fr">' +
                '<a class="row__num row__num--call" href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' +
                  '<small>Позвонить</small><b>' + esc(l.phone) + '</b></a>' +
                '<button class="row__num" type="button" data-lead="' + esc(l.id) + '">' +
                  '<small>Отметить</small><b>' + (isNew ? 'обработана' : 'вернуть в новые') + '</b></button>' +
              '</div>' +
            '</article>';
          }).join('') + '</div>'
        : '<div class="empty">' + (leadFilter === 'new' ? 'Новых заявок нет — все разобраны.' : 'Здесь пока пусто.') + '</div>');

    bind($('#leadsBox'), 'click', function (e) {
      var f = e.target.closest('[data-leadf]');
      if (f) { leadFilter = f.dataset.leadf; renderLeads(); return; }
      var b = e.target.closest('[data-lead]');
      if (!b) return;
      var lead = db.leads.filter(function (l) { return l.id === b.dataset.lead; })[0];
      lead.status = lead.status === 'new' ? 'done' : 'new';
      if (commit('leads', db.leads, lead.status === 'done' ? 'Отметили как обработанную' : 'Вернули в новые')) renderLeads();
    });
  }

  /* ═══════════ заказы: партии, брони и розница ═══════════
     Статус, который здесь выставили, покупатель видит у себя в кабинете.
     Без этого раздела статусы в кабинете были бы нарисованными. */

  var ORDER_RU = {
    opt:     { new: 'новая заявка',  confirmed: 'подтверждена',     done: 'отгружена',      cancelled: 'отменена' },
    retail:  { new: 'новый заказ',   confirmed: 'подтверждён',      done: 'отправлен',      cancelled: 'отменён' },
    booking: { new: 'бронь принята', confirmed: 'сбор подтверждён', done: 'партия открыта', cancelled: 'бронь снята' }
  };
  var NEXT_RU = { new: 'Подтвердить', confirmed: 'Закрыть', done: 'Вернуть в работу', cancelled: 'Вернуть в работу' };
  var NEXT_ST = { new: 'confirmed', confirmed: 'done', done: 'new', cancelled: 'new' };
  var orderFilter = 'new';

  function orders() { var o = db.orders; return Array.isArray(o) ? o : []; }

  function renderOrders() {
    var all = orders().slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var list = orderFilter === 'all' ? all
             : orderFilter === 'active' ? all.filter(function (o) { return o.status === 'new' || o.status === 'confirmed'; })
             : all.filter(function (o) { return o.status === orderFilter; });

    $('#ordersBox').innerHTML =
      '<p class="lede">Заказы партий, брони следующих сборов и розница. Статус отсюда видит покупатель ' +
      'в своём кабинете, поэтому меняйте его по факту, а не заранее.</p>' +
      '<div class="filters" style="margin-top:14px">' +
        [['new', 'Новые', all.filter(function (o) { return o.status === 'new'; }).length],
         ['active', 'В работе', all.filter(function (o) { return o.status === 'new' || o.status === 'confirmed'; }).length],
         ['done', 'Закрытые', all.filter(function (o) { return o.status === 'done'; }).length],
         ['all', 'Все', all.length]].map(function (f) {
          return '<button type="button" data-ordf="' + f[0] + '" aria-pressed="' + (orderFilter === f[0]) + '">' + f[1] + ' · ' + f[2] + '</button>';
        }).join('') +
      '</div>' +
      (list.length
        ? '<div class="rows">' + list.map(orderRow).join('') + '</div>'
        : '<div class="empty">' + (orderFilter === 'new' ? 'Новых заказов нет.' : 'Здесь пока пусто.') + '</div>');

    bind($('#ordersBox'), 'click', function (e) {
      var f = e.target.closest('[data-ordf]');
      if (f) { orderFilter = f.dataset.ordf; renderOrders(); return; }

      var next = e.target.closest('[data-onext]');
      if (next) { setOrder(next.dataset.onext, NEXT_ST[next.dataset.st] || 'confirmed'); return; }

      var no = e.target.closest('[data-ocancel]');
      if (no) {
        var o = orders().filter(function (x) { return x.id === no.dataset.ocancel; })[0];
        confirmDanger('Отменить заказ?', 'Покупатель увидит отмену у себя в кабинете. Вернуть в работу можно там же.',
          'Отменить', function () { setOrder(no.dataset.ocancel, 'cancelled'); });
      }
    });
  }

  function setOrder(id, status) {
    var list = orders().map(function (o) {
      return o.id === id ? Object.assign({}, o, { status: status }) : o;
    });
    if (commit('orders', list, 'Статус изменён, покупатель его уже видит')) renderOrders();
  }

  function orderRow(o) {
    var ru = (ORDER_RU[o.kind] || ORDER_RU.opt)[o.status] || o.status;
    var active = o.status === 'new' || o.status === 'confirmed';
    var what = o.kind === 'retail'
      ? (o.items || []).map(function (i) { return i.name + ' × ' + i.qty + ' ' + i.unit; }).join(', ')
      : esc(o.lotName || '') + ', ' + (o.qty || 0) + ' ' + (o.unit || 'кг');
    var money = o.kind === 'retail'
      ? (o.sum || 0).toLocaleString('ru-RU') + ' ₽'
      : (o.price ? (o.price * (o.qty || 0)).toLocaleString('ru-RU') + ' ₽' : 'цена по объёму');

    return '<article class="row" style="grid-template-columns:1fr">' +
      '<div class="row__main">' +
        '<b>№ ' + esc(o.num) + ' · ' + esc(o.company || o.name || 'Без кабинета') + '</b> ' +
        '<span class="pill' + (o.status === 'new' ? ' pill--new' : (active ? '' : ' pill--off')) + '"><i></i>' + ru + '</span>' +
        '<div class="row__meta">' + esc(o.at || '') + (o.email ? ' · ' + esc(o.email) : ' · заказ без кабинета') + '</div>' +
        '<div class="row__meta">' + esc(what) + ' — ' + money + '</div>' +
        (o.ship ? '<div class="row__meta">' + esc(o.ship) + '</div>' : '') +
        (o.note ? '<div class="row__meta">« ' + esc(o.note) + ' »</div>' : '') +
      '</div>' +
      '<div class="row__nums" style="grid-template-columns:1fr 1fr 1fr">' +
        '<a class="row__num row__num--call" href="tel:' + esc(String(o.phone || '').replace(/[^\d+]/g, '')) + '">' +
          '<small>Позвонить</small><b>' + esc(o.phone || '') + '</b></a>' +
        '<button class="row__num" type="button" data-onext="' + esc(o.id) + '" data-st="' + esc(o.status) + '">' +
          '<small>Дальше</small><b>' + (NEXT_RU[o.status] || 'Подтвердить') + '</b></button>' +
        (active
          ? '<button class="row__num" type="button" data-ocancel="' + esc(o.id) + '"><small>Заказ</small><b>Отменить</b></button>'
          : '<span class="row__num"><small>Заказ</small><b>' + (o.status === 'cancelled' ? 'отменён' : 'закрыт') + '</b></span>') +
      '</div>' +
    '</article>';
  }

  /* ═══════════ оптовики: доступ к оптовым ценам ═══════════ */

  function buyers() { var a = db.accounts; return Array.isArray(a) ? a : []; }
  function waitingBuyers() { return buyers().filter(function (a) { return a.status === 'pending'; }).length; }

  var buyerFilter = 'pending';

  function renderBuyers() {
    var list = buyers().filter(function (a) {
      return buyerFilter === 'all' ? true : a.status === buyerFilter;
    });

    $('#buyersBox').innerHTML =
      '<p class="lede">Оптовые цены и прайс видят только подтверждённые. Пока заявка на рассмотрении, ' +
      'человек видит каталог и наличие, но не цены.</p>' +
      '<div class="filters" id="buyerFilters" style="margin-top:16px">' +
        ['pending:Ждут', 'approved:Открыт доступ', 'closed:Закрыт', 'all:Все'].map(function (x) {
          var p = x.split(':');
          return '<button type="button" data-bf="' + p[0] + '" aria-pressed="' + (buyerFilter === p[0]) + '">' + p[1] + '</button>';
        }).join('') +
      '</div>' +
      (list.length
        ? '<div class="rows">' + list.map(buyerRow).join('') + '</div>'
        : '<div class="empty">' + (buyerFilter === 'pending' ? 'Новых заявок нет.' : 'Здесь пусто.') + '</div>');

    bind($('#buyersBox'), 'click', function (e) {
      var f = e.target.closest('[data-bf]');
      if (f) { buyerFilter = f.dataset.bf; renderBuyers(); return; }

      var ok = e.target.closest('[data-approve]');
      if (ok) { setBuyer(ok.dataset.approve, 'approved', 'Доступ открыт'); return; }

      var no = e.target.closest('[data-revoke]');
      if (no) {
        var acc = buyers().filter(function (a) { return a.id === no.dataset.revoke; })[0];
        // статус 'closed', а не 'pending': закрытый доступ и неподтверждённая
        // заявка — разные вещи, и в кабинете человек должен видеть правду,
        // а не «подтвердим в рабочее время» по уже отозванному доступу
        confirmDanger('Закрыть доступ?', '«' + (acc ? acc.company : '') + '» перестанет видеть оптовые цены и прайс. Заявка останется, открыть можно снова.',
          'Закрыть доступ', function () { setBuyer(no.dataset.revoke, 'closed', 'Доступ закрыт'); });
        return;
      }
    });
  }

  function buyerRow(a) {
    var open = a.status === 'approved';
    var label = open ? 'доступ открыт' : (a.status === 'closed' ? 'доступ закрыт' : 'ждёт подтверждения');
    return '<article class="row" style="grid-template-columns:1fr">' +
      '<div class="row__main">' +
        '<b>' + esc(a.company || 'Без названия') + '</b>' +
        '<div class="row__meta"><span class="pill' + (open ? '' : ' pill--off') + '"><i></i>' +
          label + '</span> заявка от ' + esc(a.at || '') + '</div>' +
        '<div class="row__meta">' + esc(a.name || '') + ' · ' + esc(a.email) + '</div>' +
        '<div class="row__meta"><a href="tel:' + esc(String(a.phone || '').replace(/[^\d+]/g, '')) + '">' + esc(a.phone || '') + '</a></div>' +
      '</div>' +
      '<div class="row__nums" style="grid-template-columns:1fr">' +
        (open
          ? '<button class="row__num" type="button" data-revoke="' + esc(a.id) + '"><small>Доступ</small><b>Закрыть</b></button>'
          : '<button class="row__num" type="button" data-approve="' + esc(a.id) + '"><small>Заявка</small><b>Подтвердить</b></button>') +
      '</div>' +
    '</article>';
  }

  function setBuyer(id, status, msg) {
    var list = buyers().map(function (a) {
      return a.id === id ? Object.assign({}, a, { status: status }) : a;
    });
    if (commit('accounts', list, msg)) renderBuyers();
  }

  /* ═══════════ тексты и контакты ═══════════ */

  var TEXT_FIELDS = [
    ['phone',     'Телефон',            'Показывается в шапке, карточках и подвале'],
    ['heroTitle', 'Заголовок баннера',  'Первое, что читают на главной'],
    ['heroPromo', 'Строка акции',       'Плашка над заголовком, можно оставить пустой'],
    ['inn',       'ИНН',                'Раздел «Контакты»'],
    ['ogrnip',    'ОГРНИП',             'Раздел «Контакты»'],
    ['account',   'Расчётный счёт',     'Раздел «Контакты»']
  ];

  function renderTexts() {
    var t = db.texts;
    $('#textsBox').innerHTML =
      '<p class="lede">Эти строки подставляются на сайт в нескольких местах сразу: правите один раз.</p>' +
      '<div class="group" style="margin-top:16px">' +
      TEXT_FIELDS.map(function (f) {
        return '<label class="field"><span>' + esc(f[1]) + '</span>' +
          '<input type="text" name="' + esc(f[0]) + '" value="' + esc(t[f[0]] || '') + '">' +
          '<span class="field__hint">' + esc(f[2]) + '</span></label>';
      }).join('') + '</div>';

    bar([{ label: 'Сохранить', onClick: function () {
      var next = Store.clone(t), emptyPhone = false;
      TEXT_FIELDS.forEach(function (f) {
        var v = $('#textsBox [name="' + f[0] + '"]').value.trim();
        if (f[0] === 'phone' && v === '') { emptyPhone = true; return; }
        next[f[0]] = v;
      });
      if (emptyPhone) { toast('Телефон стирать нельзя: без него с сайта не дозвонятся. Прежний номер оставлен.', true); return; }
      if (commit('texts', next, 'Тексты сохранены. Сайт обновлён.')) renderTexts();
    } }]);
  }

  /* ═══════════ история версий ═══════════ */

  var FILE_RU = { lots: 'Партии', categories: 'Категории', texts: 'Тексты', leads: 'Заявки', photos: 'Фото' };

  function histCount() {
    return Store.FILES.reduce(function (a, f) { return a + Store.backups(f).length; }, 0);
  }

  function renderHistory() {
    var html = '<p class="lede">Каждое сохранение кладёт предыдущую версию сюда. Хранятся 30 последних по каждому разделу.</p>';
    var any = false;
    Store.FILES.forEach(function (f) {
      var list = Store.backups(f);
      if (!list.length) return;
      any = true;
      html += '<div class="group"><div class="group__head"><h2>' + esc(FILE_RU[f]) + '</h2>' +
        (list.length > 10 ? '<span class="group__note">показаны 10 из ' + list.length + '</span>' : '') + '</div><div class="hist">' +
        list.slice(0, 10).map(function (b) {
          return '<div class="hist__row"><time>' + esc(when(b.at)) + '</time>' +
            '<button class="btn btn--sm" type="button" data-restore="' + f + ':' + b.at + '">Вернуть</button></div>';
        }).join('') + '</div></div>';
    });
    if (!any) html += '<div class="empty">Пока нечего откатывать: изменений не было.<br><br>' +
      '<button class="btn" type="button" data-go="lots">Открыть партии</button></div>';
    $('#histBox').innerHTML = html;

    bind($('#histBox'), 'click', function (e) {
      var b = e.target.closest('[data-restore]');
      if (!b) return;
      var parts = b.dataset.restore.split(':');
      var file = parts[0], at = +parts[1];
      confirmDanger('Вернуть эту версию?', 'Раздел «' + FILE_RU[file] + '» станет таким, каким был ' + when(at) + '. Текущая версия тоже попадёт в историю, откатить обратно можно.',
        'Вернуть', function () {
          var res = Store.restore(file, at);
          if (!res.ok) { toast(res.error, true); return; }
          reload(file);
          toast('Вернули версию от ' + when(at));
          renderHistory();
        });
    });
  }

  function when(ts) {
    var d = new Date(ts);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ═══════════ общие обработчики ═══════════ */

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-sheet-close]') || e.target === $('#sheet')) { closeSheet(); return; }

    var goBtn = e.target.closest('[data-go]');
    if (goBtn) { go(goBtn.dataset.go); return; }

    var quick = e.target.closest('[data-quick]');
    if (quick) {
      if (quick.dataset.quick === 'new') { newLot(); return; }
      lotFilter = 'live'; lotQuery = '';
      go('lots');
      // подсказываем, что именно правим: список открыт, тапать по нужной строке
      setTimeout(function () {
        toast(quick.dataset.quick === 'price'
          ? 'Тапните по цене нужной партии'
          : 'Тапните по остатку нужной партии');
      }, 250);
      return;
    }

    var open = e.target.closest('[data-open]');
    if (open) { go('lot', open.dataset.open); return; }

    var ed = e.target.closest('[data-edit]');
    if (ed) {
      if (ed.dataset.edit === 'price')  editPrice(ed.dataset.id);
      if (ed.dataset.edit === 'stock')  editStock(ed.dataset.id);
      if (ed.dataset.edit === 'status') editStatus(ed.dataset.id);
      return;
    }

    var lf = e.target.closest('[data-lf]');
    if (lf) { lotFilter = lf.dataset.lf; renderLots(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });

  $('#back').addEventListener('click', function () {
    if (route.name === 'lot') go('lots'); else go('home');
  });

  $('#lotSearch').addEventListener('input', function (e) {
    lotQuery = e.target.value;
    renderLots();
  });

  $('#resetAll').addEventListener('click', function () {
    confirmDanger('Сбросить демонстрацию?', 'Все ваши правки исчезнут, вернутся исходные партии из канала клиента. Загруженные фото тоже удалятся.',
      'Сбросить', function () {
        Store.reset();
        reloadAll();
        toast('Вернули исходные данные');
        render();
      });
  });

  /* ═══════════ вход ═══════════ */

  function showApp() {
    $('#scr-login').classList.remove('is-on');
    $('#app').hidden = false;
    reloadAll();
    render();
  }

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = $('.field', e.target);
    if (!$('input', f).value.trim()) { f.dataset.invalid = 'true'; return; }
    try { sessionStorage.setItem('lesnik.admin', '1'); } catch (err) {}
    showApp();
  });

  window.addEventListener('hashchange', function () {
    if ($('#app').hidden) return;
    render();
  });

  var authed = false;
  try { authed = sessionStorage.getItem('lesnik.admin') === '1'; } catch (e) {}
  if (authed) showApp();
  else $('#scr-login').classList.add('is-on');
})();
