/* Лесник v4 · логика прототипа
   Данные партий из Telegram-канала клиента (июнь-август 2026).
   Розничные цены с пометкой demo заглушки для прохода по сценарию. */

const LOTS = [
  { gal: ["img/lisichka.jpg", "img/korzina.jpg", "img/priemka.jpg", "img/doroga.jpg"], region: "Свердловская область", harvest: "сбор ежедневно", stock: 180, total: 400, about: "Собираем и принимаем в день сбора, охлаждаем сразу. Лисичка не червивеет, поэтому доезжает даже в дальние регионы без сортировки на месте.", specs: [["Состояние", "свежая"], ["Калибр", "2-5 см"], ["Тара", "ящик 10 кг"], ["Хранение", "до 5 суток при +2"], ["Отгрузка", "в день заявки"], ["Минимум", "20 кг"]],
    id: 'lisichka-fresh', name: 'Лисичка свежая', kind: 'mushroom', state: 'fresh',
    img: 'img/lisichka.jpg', alt: 'Свежие лисички',
    spec: 'Свердловская область, сбор ежедневно', volume: 'отгрузка партиями',
    opt: 'по запросу', retail: null, minVol: 'mini', date: 20260810, status: 'live' },

  { gal: ["img/sushenye.jpg", "img/lisichka.jpg", "img/korzina.jpg", "img/priemka.jpg"], region: "Свердловская область", harvest: "сбор июль 2026", stock: 240, total: 600, about: "Сушка воздушная, при 45 градусах: гриб не «печётся», сохраняет цвет и аромат. Сырьё собрано в один заход, разнобоя по возрасту гриба нет.", specs: [["Состояние", "сушёная"], ["Урожай", "2026"], ["Влажность", "до 12 %"], ["Фракция", "целая шляпка"], ["Тара", "крафт-мешок 10 кг"], ["Хранение", "18 месяцев"]],
    id: 'lisichka-dry', name: 'Лисичка сушёная', kind: 'mushroom', state: 'dry',
    img: 'img/sushenye.jpg', alt: 'Сушёные лесные грибы',
    spec: 'Урожай 2026, влажность до 12 %', volume: 'мешок 10 кг',
    opt: 'по запросу', retail: 690, retailUnit: 'за 100 г', demo: true, minVol: 'mini', date: 20260714, status: 'live' },

  { gal: ["img/lisichka.jpg", "img/priemka.jpg", "img/korzina.jpg", "img/doroga.jpg"], region: "Свердловская область", harvest: "заморозка августа", stock: 900, total: 1500, about: "Шоковая заморозка в день сбора, ягода и гриб не слипаются в ком. Едет рефрижератором, хранится до следующего сезона.", specs: [["Состояние", "замороженная"], ["Заморозка", "шоковая"], ["Тара", "короб 10 кг"], ["Хранение", "12 месяцев при -18"], ["Отгрузка", "1-2 дня"], ["Минимум", "500 кг"]],
    id: 'lisichka-frozen', name: 'Лисичка замороженная', kind: 'mushroom', state: 'frozen',
    img: 'img/lisichka.jpg', alt: 'Лисички',
    spec: 'Шоковая заморозка, короб 10 кг', volume: 'короб 10 кг',
    opt: 'по запросу', retail: null, minVol: 'big', date: 20260801, status: 'live' },

  { gal: ["img/belyi.jpg", "img/priemka.jpg", "img/korzina.jpg", "img/doroga.jpg"], region: "Свердловская область", harvest: "сбор ежедневно", stock: 120, total: 300, about: "Первый сорт, калиброванный, червивый отбраковываем на приёмке. Берут рестораны под сезонное меню и переработчики под сушку.", specs: [["Состояние", "свежий"], ["Сорт", "первый"], ["Калибр", "от 4 см"], ["Тара", "ящик 10 кг"], ["Хранение", "до 3 суток при +2"], ["Минимум", "20 кг"]],
    id: 'belyi-fresh', name: 'Белый гриб свежий', kind: 'mushroom', state: 'fresh',
    img: 'img/belyi.jpg', alt: 'Белые грибы',
    spec: 'Первый сорт, калиброванный', volume: 'ящик 10 кг',
    opt: 'по запросу', retail: null, minVol: 'mini', date: 20260808, status: 'live' },

  { gal: ["img/sushenye.jpg", "img/belyi.jpg", "img/priemka.jpg", "img/korzina.jpg"], region: "Свердловская область", harvest: "сбор июль 2026", stock: 95, total: 250, about: "Резаный пластиной и целой шляпкой, сушка воздушная. Из десяти килограммов свежего получается около килограмма сушёного, поэтому цена за килограмм выше свежего в разы.", specs: [["Состояние", "сушёный"], ["Урожай", "2026"], ["Влажность", "до 12 %"], ["Фракция", "шляпка целая"], ["Тара", "мешок 5 кг"], ["Хранение", "18 месяцев"]],
    id: 'belyi-dry', name: 'Белый гриб сушёный', kind: 'mushroom', state: 'dry',
    img: 'img/sushenye.jpg', alt: 'Сушёный белый гриб',
    spec: 'Урожай 2026, шляпка целая', volume: 'мешок 5 кг',
    opt: 'по запросу', retail: 1190, retailUnit: 'за 100 г', demo: true, minVol: 'mini', date: 20260720, status: 'live' },

  { gal: ["img/korzina.jpg", "img/priemka.jpg", "img/belyi.jpg", "img/doroga.jpg"], region: "Урал", harvest: "засолка августа", stock: 400, total: 800, about: "Холодная засолка в бочках, без уксуса и консервантов. Готовность через 40 дней, отгружаем партиями от бочки.", specs: [["Состояние", "солёный"], ["Способ", "холодная засолка"], ["Тара", "бочка 25 кг"], ["Хранение", "9 месяцев при +4"], ["Отгрузка", "по готовности"], ["Минимум", "бочка"]],
    id: 'gruzd-salted', name: 'Груздь солёный', kind: 'mushroom', state: 'salted',
    img: 'img/korzina.jpg', alt: 'Солёные грузди',
    spec: 'Холодная засолка, бочка 25 кг', volume: 'бочка 25 кг',
    opt: 'по запросу', retail: 890, retailUnit: 'за 1 кг', demo: true, minVol: 'big', date: 20260805, status: 'live' },

  { gal: ["img/klukva.jpg", "img/priemka.jpg", "img/doroga.jpg", "img/korzina.jpg"], region: "Северо-Запад", harvest: "сбор сентябрь", stock: 1200, total: 2000, about: "Болотная клюква, шоковая заморозка без листа и веток. Берут переработчики под морсы и кондитеры.", specs: [["Состояние", "замороженная"], ["Заморозка", "шоковая"], ["Примеси", "без листа"], ["Тара", "короб 10 кг"], ["Хранение", "12 месяцев при -18"], ["Минимум", "20 кг"]],
    id: 'klukva', name: 'Клюква замороженная', kind: 'berry', state: 'frozen',
    img: 'img/klukva.jpg', alt: 'Клюква',
    spec: 'Шоковая заморозка, без листа', volume: 'короб 10 кг',
    opt: 'по запросу', retail: 490, retailUnit: 'за 1 кг', demo: true, minVol: 'mini', date: 20260930, status: 'live' },

  { gal: ["img/brusnika.jpg", "img/priemka.jpg", "img/doroga.jpg", "img/korzina.jpg"], region: "Северо-Запад", harvest: "сбор сентябрь", stock: 800, total: 1500, about: "Брусника с болот, очищенная от листа, шоковая заморозка. Плотная ягода, не течёт после разморозки.", specs: [["Состояние", "замороженная"], ["Заморозка", "шоковая"], ["Примеси", "без листа"], ["Тара", "короб 10 кг"], ["Хранение", "12 месяцев при -18"], ["Минимум", "20 кг"]],
    id: 'brusnika', name: 'Брусника замороженная', kind: 'berry', state: 'frozen',
    img: 'img/brusnika.jpg', alt: 'Брусника',
    spec: 'Шоковая заморозка, без листа', volume: 'короб 10 кг',
    opt: 'по запросу', retail: 590, retailUnit: 'за 1 кг', demo: true, minVol: 'mini', date: 20260925, status: 'live' },

  { gal: ["img/brusnika.jpg", "img/korzina.jpg", "img/priemka.jpg", "img/doroga.jpg"], region: "Северо-Запад", harvest: "переработка сентября", stock: 300, total: 600, about: "Протёртая с сахаром, без варки: витамины остаются. Делаем под заказ от 200 килограммов, фасуем в пищевые вёдра.", specs: [["Состояние", "протёртая"], ["Сахар", "1 к 1"], ["Обработка", "без варки"], ["Тара", "ведро 5 кг"], ["Хранение", "6 месяцев при +4"], ["Минимум", "200 кг"]],
    id: 'brusnika-pureed', name: 'Брусника протёртая', kind: 'berry', state: 'pureed',
    img: 'img/brusnika.jpg', alt: 'Протёртая брусника с сахаром',
    spec: 'С сахаром, ведро 5 кг, под заказ от 200 кг', volume: 'ведро 5 кг',
    opt: 'по запросу', retail: 740, retailUnit: 'за 1 кг', demo: true, minVol: 'big', date: 20260920, status: 'live' },

  { gal: ["img/smorchok.jpg", "img/priemka.jpg", "img/doroga.jpg", "img/korzina.jpg"], region: "Средняя полоса", harvest: "сбор май 2026", stock: 0, total: 8, about: "Ранний весенний гриб, растёт три-четыре недели в году. Партия была восемь килограммов, ушла за два дня.", specs: [["Состояние", "свежий"], ["Урожай", "2026"], ["Партия", "8 кг"], ["Тара", "ящик 2 кг"], ["Сезон", "апрель, май"], ["Следующий сбор", "весна 2027"]],
    id: 'smorchok', name: 'Сморчок конический', kind: 'mushroom', state: 'fresh',
    img: 'img/smorchok.jpg', alt: 'Сморчок конический',
    spec: 'Партия 8 кг, сбор май', volume: '8 кг',
    opt: '10 000 ₽', retail: null, minVol: 'mini', date: 20260702, status: 'closed', closed: '02.07' },

  { gal: ["img/smorchok.jpg", "img/priemka.jpg", "img/korzina.jpg", "img/doroga.jpg"], region: "Средняя полоса", harvest: "сбор май 2026", stock: 0, total: 3000, about: "Сморчковая шапочка в шоковой заморозке, партия три тонны. Забрал один переработчик целиком.", specs: [["Состояние", "замороженная"], ["Урожай", "2026"], ["Партия", "3 000 кг"], ["Тара", "короб 10 кг"], ["Хранение", "12 месяцев при -18"], ["Следующий сбор", "весна 2027"]],
    id: 'shapochka', name: 'Сморчковая шапочка', kind: 'mushroom', state: 'frozen',
    img: 'img/smorchok.jpg', alt: 'Сморчковая шапочка',
    spec: 'Заморозка, партия 3 000 кг', volume: '3 000 кг',
    opt: '320 ₽', retail: null, minVol: 'big', date: 20260628, status: 'closed', closed: '28.06' },

  { gal: ["img/moroshka.jpg", "img/doroga.jpg", "img/priemka.jpg", "img/korzina.jpg"], region: "Северо-Запад", harvest: "сбор июль 2026", stock: 0, total: 4000, about: "Северная ягода, сезон две недели. Партия четыре тонны разошлась за неделю между переработчиками.", specs: [["Состояние", "свежая"], ["Урожай", "2026"], ["Партия", "4 000 кг"], ["Тара", "короб 10 кг"], ["Сезон", "июль"], ["Следующий сбор", "июль 2027"]],
    id: 'moroshka', name: 'Морошка', kind: 'berry', state: 'fresh',
    img: 'img/moroshka.jpg', alt: 'Морошка',
    spec: 'Партия 4 000 кг, сбор июль', volume: '4 000 кг',
    opt: 'по запросу', retail: null, minVol: 'big', date: 20260718, status: 'closed', closed: '18.07' },

  { gal: ["img/zemlyanika.jpg", "img/doroga.jpg", "img/priemka.jpg", "img/korzina.jpg"], region: "Средняя полоса", harvest: "сбор июнь 2026", stock: 0, total: 0, about: "Лесная земляника, только опт и только по факту сбора. Ягода нежная, отгружаем в день приёмки.", specs: [["Состояние", "свежая"], ["Урожай", "2026"], ["Тара", "лоток 2 кг"], ["Хранение", "до 2 суток при +2"], ["Сезон", "июнь"], ["Следующий сбор", "июнь 2027"]],
    id: 'zemlyanika', name: 'Земляника лесная', kind: 'berry', state: 'fresh',
    img: 'img/zemlyanika.jpg', alt: 'Лесная земляника',
    spec: 'Сбор июнь, только опт', volume: 'по факту сбора',
    opt: 'по запросу', retail: null, minVol: 'mini', date: 20260606, status: 'closed', closed: '06.06' }
];

const STATE_RU = { fresh: 'свежая', dry: 'сушёная', frozen: 'замороженная', salted: 'солёная', pureed: 'протёртая' };
const money = n => n.toLocaleString('ru-RU') + ' ₽';
let mode = 'opt';
const cart = new Map();

/* ═══════════ карточка товара ═══════════ */

function card(lot) {
  const live = lot.status === 'live';
  const tag = live
    ? '<span class="lot__tag lot__tag--live"><i></i>в наличии</span>'
    : `<span class="lot__tag lot__tag--closed"><i></i>закрыта ${lot.closed}</span>`;

  let price, unit, action;
  if (mode === 'opt') {
    price = lot.opt;
    unit = live ? `опт, ${lot.volume}` : `партия ${lot.volume}`;
    action = live
      ? `<a class="btn btn--soft btn--full" href="#/lot">Запросить цену</a>`
      : `<a class="btn btn--soft btn--full" href="#/opt">Бронь следующего сбора</a>`;
  } else if (lot.retail) {
    price = money(lot.retail);
    unit = `${lot.retailUnit}${lot.demo ? ', цена демонстрационная' : ''}`;
    action = `<button class="btn btn--solid btn--full" type="button" data-add="${lot.id}">В корзину</button>`;
  } else {
    price = 'Только оптом';
    unit = 'свежее в розницу не отправляем';
    action = `<a class="btn btn--soft btn--full" href="#/opt">Условия опта</a>`;
  }

  return `<li class="lot${live ? '' : ' lot--closed'}">
    <div class="lot__shot">${tag}<img src="${lot.img}" alt="${lot.alt}" loading="lazy"></div>
    <div class="lot__body">
      <p class="lot__name"><a href="#/lot/${lot.id}">${lot.name}</a></p>
      <p class="lot__spec">${lot.spec}</p>
    </div>
    <div class="lot__foot">
      <p class="lot__price">${price}<small class="lot__unit">${unit}</small></p>
      <div class="lot__act">${action}</div>
    </div>
  </li>`;
}

const fill = (id, list) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = list.map(card).join('');
};

/* ═══════════ каталог: категории и фильтры ═══════════ */

const filters = { cat: 'mushroom', state: 'all', avail: 'live', vol: null, sort: 'default' };

function catalogList() {
  let list = LOTS.filter(l => l.kind === filters.cat);
  if (filters.state !== 'all') list = list.filter(l => l.state === filters.state);
  if (filters.avail === 'live') list = list.filter(l => l.status === 'live');
  if (filters.vol) list = list.filter(l => l.minVol === filters.vol);
  if (filters.sort === 'price') list = [...list].sort((a, b) => (b.retail || 0) - (a.retail || 0));
  if (filters.sort === 'date') list = [...list].sort((a, b) => b.date - a.date);
  if (filters.sort === 'default') list = [...list].sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1));
  return list;
}

function renderCatalog() {
  const list = catalogList();
  fill('catGrid', list);
  const empty = document.getElementById('catEmpty');
  if (empty) empty.hidden = list.length > 0;

  const total = LOTS.filter(l => l.kind === filters.cat).length;
  const counter = document.getElementById('catCounter');
  if (counter) counter.textContent = `Показано ${list.length} из ${total}`;

  // счётчики в левом меню
  document.querySelectorAll('[data-count-cat]').forEach(el => {
    el.textContent = LOTS.filter(l => l.kind === el.dataset.countCat).length;
  });
  document.querySelectorAll('[data-count-state]').forEach(el => {
    const [kind, st] = el.dataset.countState.split(':');
    el.textContent = LOTS.filter(l => l.kind === kind && (st === 'all' || l.state === st)).length;
  });

  // активная группа и подпункт
  document.querySelectorAll('.catnav__group').forEach(g => {
    const on = g.dataset.group === filters.cat;
    g.classList.toggle('is-active', on);
    const sub = g.querySelector('.catnav__sub');
    if (sub) sub.hidden = !on;
    g.querySelectorAll('[data-state]').forEach(b => {
      if (on && b.dataset.state === filters.state) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  });

  // кнопки фильтров
  document.querySelectorAll('[data-filter]').forEach(b => {
    const key = b.dataset.filter, val = b.dataset.value;
    b.setAttribute('aria-pressed', String(filters[key] === val));
  });

  // чипы выбранного
  const chips = document.getElementById('chips');
  if (chips) {
    const active = [];
    if (filters.state !== 'all') active.push({ k: 'state', label: STATE_RU[filters.state] || filters.state });
    if (filters.avail === 'all') active.push({ k: 'avail', label: 'включая закрытые' });
    if (filters.vol) active.push({ k: 'vol', label: filters.vol === 'mini' ? 'мини-опт от 20 кг' : 'опт от 500 кг' });
    chips.innerHTML = active.length
      ? active.map(a => `<button class="chip" type="button" data-chip="${a.k}">${a.label}<span aria-hidden="true">×</span><span class="sr-only">убрать фильтр</span></button>`).join('') +
        `<button class="chips__reset" type="button" data-reset-filters>Сбросить всё</button>`
      : '';
  }
}

function resetFilters() {
  filters.state = 'all'; filters.avail = 'live'; filters.vol = null; filters.sort = 'default';
  const sel = document.getElementById('sortSel');
  if (sel) sel.value = 'default';
  renderCatalog();
}

/* ═══════════ прайс ═══════════ */

function renderPrice() {
  const tb = document.getElementById('priceRows');
  if (!tb) return;
  tb.innerHTML = LOTS.map(l => `<tr>
    <td>${l.name.replace(/ (свежая|свежий|сушёная|сушёный|замороженная|солёный|протёртая)$/i, '')}</td>
    <td>${STATE_RU[l.state]}</td>
    <td class="n">${l.status === 'live' ? 'есть' : l.volume}</td>
    <td class="n">${l.opt}</td>
    <td>${l.status === 'live' ? 'открыта' : 'закрыта ' + l.closed}</td>
  </tr>`).join('');
}

/* ═══════════ блог ═══════════ */

const POSTS = [
  { href: '#/blog/lisichka-price', date: '6 августа 2026', short: '06.08.2026', cat: 'Цены', read: '4 мин',
    img: 'img/lisichka.jpg', title: 'Сколько на самом деле стоит килограмм лисички',
    ex: 'Почему цена у заготовителя, на базе и в магазине отличается в разы, и из чего складывается каждый рубль по дороге из леса.' },
  { href: '#/blog/dry-ratio', date: '14 июля 2026', short: '14.07.2026', cat: 'Цены', read: '3 мин',
    img: 'img/sushenye.jpg', title: 'Десять к одному: экономика сушёного гриба',
    ex: 'Как считать цену сушёного гриба, чтобы не переплатить и не сравнивать несравнимое.' },
  { href: '#/blog/quality', date: '22 июля 2026', short: '22.07.2026', cat: 'Качество', read: '4 мин',
    img: 'img/belyi.jpg', title: 'Почему сушёный гриб бывает дешёвым и дорогим',
    ex: 'Пять признаков, по которым видно пересушенное, подмоченное и разбавленное сырьё. Проверяется за минуту.' },
  { href: '#/blog/smorchok', date: '2 июля 2026', short: '02.07.2026', cat: 'Рынок', read: '3 мин',
    img: 'img/smorchok.jpg', title: 'Сморчок по десять тысяч за килограмм',
    ex: 'Восемь килограммов за сезон и очередь из ресторанов. Разбираем, откуда берётся такая цена.' }
];

let blogTab = 'all';

function renderBlog() {
  const hero = document.getElementById('blogHero');
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const list = blogTab === 'all' ? POSTS : POSTS.filter(p => p.cat === blogTab);

  if (hero) {
    if (blogTab === 'all') {
      const p = POSTS[0];
      hero.innerHTML = `<article class="bhero">
        <a class="bhero__img" href="${p.href}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="" loading="lazy"></a>
        <div class="bhero__b">
          <div class="bmeta"><span class="bmeta__tag">${p.cat}</span><span>${p.date}</span><span>${p.read}</span></div>
          <h2 class="bhero__t"><a href="${p.href}">${p.title}</a></h2>
          <p class="bhero__ex">${p.ex}</p>
          <span class="bcard__more">Читать →</span>
        </div>
      </article>`;
    } else hero.innerHTML = '';
  }

  const rest = blogTab === 'all' ? list.slice(1) : list;
  grid.innerHTML = rest.map(p => `<li><article class="bcard">
    <a class="bcard__img" href="${p.href}" tabindex="-1" aria-hidden="true"><img src="${p.img}" alt="" loading="lazy"></a>
    <div class="bcard__b">
      <div class="bmeta"><span class="bmeta__tag">${p.cat}</span><span>${p.date}</span><span>${p.read}</span></div>
      <h3 class="bcard__t"><a href="${p.href}">${p.title}</a></h3>
      <p class="bcard__ex">${p.ex}</p>
      <span class="bcard__more">Читать →</span>
    </div>
  </article></li>`).join('');

  document.querySelectorAll('[data-tab]').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.tab === blogTab)));
}

/* ═══════════ боковая колонка статей ═══════════ */

function renderAsides(live) {
  document.querySelectorAll('[data-aside]').forEach(box => {
    const screen = box.closest('.screen');
    const here = screen.dataset.route;

    const toc = [...screen.querySelectorAll('.article h2[id]')]
      .map(h => `<li><a href="#${h.id}">${h.textContent}</a></li>`).join('');

    const lots = live.slice(0, 3).map(l => `
      <a class="aside__row" href="#/lot/${l.id}">
        <img src="${l.img}" alt="${l.alt}">
        <span><b>${l.name}</b><span>${mode === 'opt' ? l.opt : (l.retail ? money(l.retail) : 'только опт')}</span></span>
      </a>`).join('');

    const links = POSTS.filter(p => p.href !== '#' + here).slice(0, 3).map(p => `
      <a class="aside__row" href="${p.href}">
        <span><b>${p.title}</b><span>${p.short}</span></span>
      </a>`).join('');

    box.innerHTML = `
      ${toc ? `<div class="aside__block"><h3>В этой статье</h3><ul class="toc">${toc}</ul></div>` : ''}
      <div class="aside__block">
        <h3>В наличии сейчас</h3>
        ${lots}
        <p style="margin-top:var(--space-md)"><a class="tlink" href="#/catalog">Весь каталог →</a></p>
      </div>
      <div class="aside__block">
        <h3>Читайте также</h3>
        ${links}
      </div>`;
  });
}

/* ═══════════ корзина ═══════════ */

function renderCart() {
  const count = [...cart.values()].reduce((a, b) => a + b, 0);
  const link = document.getElementById('cartlink');
  document.getElementById('cartcount').textContent = count;
  link.hidden = count === 0;

  const box = document.getElementById('cartBody');
  if (!box) return;
  if (!cart.size) {
    box.innerHTML = `<p>Пока пусто. В розницу продаём то, что переживёт дорогу: сушёное, мороженое и солёное.</p>
      <p><a class="tlink" href="#/catalog">Открыть каталог →</a></p>`;
    return;
  }
  let sum = 0;
  const rows = [...cart.entries()].map(([id, qty]) => {
    const lot = LOTS.find(l => l.id === id);
    sum += lot.retail * qty;
    return `<div class="cartline">
      <img src="${lot.img}" alt="${lot.alt}">
      <div><strong>${lot.name}</strong><br><span class="lot__spec">${money(lot.retail)} ${lot.retailUnit}</span></div>
      <span class="qty">
        <button type="button" data-qty="-1" data-id="${id}" aria-label="Убрать одну">−</button>
        <span class="num">${qty}</span>
        <button type="button" data-qty="1" data-id="${id}" aria-label="Добавить одну">+</button>
      </span>
    </div>`;
  }).join('');
  box.innerHTML = rows + `<p class="lot__price" style="margin-top:var(--space-lg)">Итого: <strong class="num">${money(sum)}</strong></p>
    <p style="font-size:var(--text-sm);color:var(--color-muted)">Розничные цены в прототипе демонстрационные, подставим реальные.</p>`;
}

/* ═══════════ общий рендер ═══════════ */

function renderAll() {
  const live = LOTS.filter(l => l.status === 'live');
  const closed = LOTS.filter(l => l.status === 'closed');

  fill('homeLive', live);
  fill('homeClosed', closed);

  renderCatalog();
  renderPrice();
  renderBlog();
  renderAsides(live);
  renderCart();
  if (currentLot && location.hash.startsWith('#/lot')) renderProduct(currentLot.id);

  requestAnimationFrame(() => document.querySelectorAll('[data-rail-box]').forEach(setupRail));
}

/* ═══════════ страница товара ═══════════ */

let currentLot = null;

function renderProduct(id) {
  const lot = LOTS.find(l => l.id === id) || LOTS[0];
  currentLot = lot;
  const box = document.getElementById('lotPage');
  if (!box) return;

  const live = lot.status === 'live';
  const pct = lot.total ? Math.round((lot.stock / lot.total) * 100) : 0;
  const kindRu = lot.kind === 'berry' ? 'Ягоды' : lot.kind === 'herb' ? 'Травы' : 'Грибы';

  const priceBlock = mode === 'retail' && lot.retail
    ? `<p class="buy__price">${money(lot.retail)}<small>${lot.retailUnit}${lot.demo ? ', цена демонстрационная' : ''}</small></p>`
    : `<p class="buy__price">${lot.opt}<small>${live ? 'за кг, опт от 20 кг' : 'цена закрытой партии'}</small></p>`;

  const tiers = live && mode === 'opt' ? `
    <ul class="tiers">
      <li><b>от 20 кг</b><span>мини-опт</span></li>
      <li><b>от 100 кг</b><span>дешевле</span></li>
      <li><b>от 500 кг</b><span>лучшая цена</span></li>
    </ul>` : '';

  const stockBlock = live ? `
    <div class="stockbar">
      <div class="stockbar__top"><span>Осталось в партии</span><b class="num">${fmt(lot.stock)} из ${fmt(lot.total)} кг</b></div>
      <div class="stockbar__rail"><i style="width:${Math.max(4, pct)}%"></i></div>
      <p class="stockbar__note">${pct < 35 ? 'Партия заканчивается, уточняйте остаток при заявке' : 'Отгружаем со склада в Москве'}</p>
    </div>` : `
    <div class="stockbar stockbar--out">
      <div class="stockbar__top"><span>Партия закрыта</span><b>${lot.closed}</b></div>
      <p class="stockbar__note">Забронируйте объём в следующем сборе, чтобы не ждать общего доступа.</p>
    </div>`;

  const action = !live
    ? `<a class="btn btn--solid btn--full btn--lg" href="#/opt">Бронь следующего сбора</a>`
    : (mode === 'retail' && lot.retail
        ? `<button class="btn btn--solid btn--full btn--lg" type="button" data-add="${lot.id}">В корзину</button>`
        : `<a class="btn btn--solid btn--full btn--lg" href="#buyForm">Запросить цену на объём</a>`);

  const related = LOTS.filter(l => l.id !== lot.id && l.status === 'live' && l.kind === lot.kind).slice(0, 4);

  box.innerHTML = `
    <p class="crumbs"><a href="#/">Главная</a> → <a href="#/catalog">Каталог</a> → ${kindRu} → ${lot.name}</p>

    <div class="product">
      <div class="product__media">
        <div class="pgal">
          <div class="pgal__thumbs" role="group" aria-label="Кадры партии">
            ${lot.gal.map((g, i) => `<button type="button" data-shot="${g}" aria-pressed="${i === 0}"><img src="${g}" alt=""></button>`).join('')}
          </div>
          <div class="pgal__main"><img id="galMain" src="${lot.gal[0]}" alt="${lot.alt}"></div>
        </div>
      </div>

      <div class="product__buy">
        <div class="buy">
          <span class="tag ${live ? 'tag--live' : 'tag--closed'}">${live ? 'партия открыта' : 'партия закрыта'}</span>
          <h1>${lot.name}</h1>
          <p class="buy__meta">${lot.region} · ${lot.harvest}</p>
          ${priceBlock}
          ${tiers}
          ${stockBlock}
          <div class="buy__act">${action}</div>
          <a class="buy__tel" href="tel:+79324748383">Или сразу: 8 932 474-83-83</a>
          <ul class="buy__facts">
            <li>Отгрузка 1-2 рабочих дня</li>
            <li>Самовывоз в Москве или доставка</li>
            <li>Нал, безнал, счёт для юрлиц</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="psections">
      <section class="psection">
        <h2>Об этой партии</h2>
        <p>${lot.about}</p>
      </section>

      <section class="psection">
        <h2>Характеристики</h2>
        <dl class="ptable">
          ${lot.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
      </section>

      <section class="psection">
        <h2>Доставка и оплата</h2>
        <div class="pfacts">
          <div><b>Самовывоз</b><span>Склад в Москве, в день оплаты</span></div>
          <div><b>По Москве</b><span>От 300 кг без доплаты</span></div>
          <div><b>В регионы</b><span>Транспортной компанией</span></div>
          <div><b>Оплата</b><span>Нал, безнал, счёт юрлицу</span></div>
        </div>
      </section>

      <section class="psection" id="buyForm">
        <h2>Запросить цену на объём</h2>
        <p class="psection__lede">Назовите объём, ответим в тот же день и выставим счёт.</p>
        <form class="buyform" data-form="lot" novalidate>
          <label class="field"><span>Сколько нужно, кг</span><input name="qty" type="number" min="1" placeholder="200" required><em class="err">Укажите объём в килограммах</em></label>
          <label class="field"><span>Телефон</span><input name="phone" type="tel" placeholder="+7" required><em class="err">Нужен телефон для связи</em></label>
          <label class="field"><span>Кто вы</span>
            <select name="who"><option>Ресторан или кафе</option><option>Переработчик</option><option>Магазин или сеть</option><option>Экспорт</option><option>Частное лицо</option></select>
          </label>
          <button class="btn btn--solid btn--lg" type="submit">Отправить заявку</button>
        </form>
      </section>
    </div>

    ${related.length ? `
    <div class="shead"><h2>Из этой же категории</h2><a class="tlink" href="#/catalog">Весь каталог →</a></div>
    <ul class="lots">${related.map(card).join('')}</ul>` : ''}
  `;
}

/* ═══════════ карусели: точки и стрелки ═══════════ */

function setupRail(box) {
  const track = box.querySelector('.rail__track');
  const dots = box.querySelector('.rail__dots');
  if (!track || !dots) return;

  const pages = Math.max(1, Math.ceil(track.scrollWidth / Math.max(1, track.clientWidth)));
  if (pages <= 1) { dots.innerHTML = ''; box.querySelectorAll('.rail__nav').forEach(b => b.hidden = true); return; }
  box.querySelectorAll('.rail__nav').forEach(b => b.hidden = false);

  dots.innerHTML = Array.from({ length: pages }, (_, i) =>
    `<button type="button" data-page="${i}" aria-label="Страница ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('');

  const sync = () => {
    const page = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    dots.querySelectorAll('button').forEach((b, i) =>
      i === page ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'));
    const prev = box.querySelector('.rail__nav--prev'), next = box.querySelector('.rail__nav--next');
    if (prev) prev.disabled = track.scrollLeft < 8;
    if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  };
  track.onscroll = sync;
  sync();
}

/* ═══════════ инфографика счётчиков ═══════════ */

const fmt = n => n.toLocaleString('ru-RU');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const figIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    figIO.unobserve(en.target);
    const el = en.target;

    if (el.dataset.count !== undefined) {
      const target = Number(el.dataset.count);
      if (reduced()) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1000;
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    if (el.dataset.ring !== undefined) {
      const pct = Number(el.dataset.ring);
      el.style.setProperty('--dashoffset', String(352 * (1 - pct)));
      el.classList.add('in');
    }
    if (el.dataset.dots !== undefined) el.classList.add('in');
    if (el.dataset.bar !== undefined) {
      el.style.setProperty('--w', el.dataset.bar + '%');
      el.classList.add('in');
    }
  });
}, { threshold: 0.35 });

function observeFigures() {
  document.querySelectorAll('.screen.is-active [data-count], .screen.is-active [data-ring], .screen.is-active [data-dots], .screen.is-active [data-bar]')
    .forEach(el => figIO.observe(el));
  setTimeout(() => {
    document.querySelectorAll('[data-count]').forEach(el => { if (el.textContent === '0') el.textContent = fmt(Number(el.dataset.count)); });
    document.querySelectorAll('[data-ring],[data-dots],[data-bar]').forEach(el => {
      if (el.dataset.ring !== undefined) el.style.setProperty('--dashoffset', String(352 * (1 - Number(el.dataset.ring))));
      if (el.dataset.bar !== undefined) el.style.setProperty('--w', el.dataset.bar + '%');
      el.classList.add('in');
    });
  }, 2500);
}

/* ═══════════ появление секций ═══════════ */

const revealIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  });
}, { rootMargin: '0px 0px -8% 0px' });

function observeReveals() {
  const els = document.querySelectorAll('.screen.is-active [data-reveal]:not(.in)');
  els.forEach(el => revealIO.observe(el));
  setTimeout(() => els.forEach(el => el.classList.add('in')), 2000);
}

/* ═══════════ поиск ═══════════ */

function runSearch(q) {
  const drop = document.getElementById('searchDrop');
  const query = q.trim().toLowerCase();
  if (query.length < 2) { drop.hidden = true; return; }

  const hits = LOTS.filter(l =>
    (l.name + ' ' + (STATE_RU[l.state] || '') + ' ' + l.spec).toLowerCase().includes(query)
  ).slice(0, 5);

  drop.innerHTML = hits.length
    ? hits.map(l => `<a class="search__row" href="#/lot/${l.id}" data-search-hit>
        <img src="${l.img}" alt="">
        <span><b>${l.name}</b><span>${mode === 'opt' ? l.opt : (l.retail ? money(l.retail) + ' ' + l.retailUnit : 'только оптом')}</span></span>
      </a>`).join('')
    : `<p class="search__empty">Ничего не нашли. Позвоните, подскажем что есть: <a href="tel:+79324748383">8 932 474-83-83</a></p>`;
  drop.hidden = false;
}

/* ═══════════ чат с ИИ-консультантом (демо) ═══════════ */

const CHAT_QA = [
  { q: 'Что есть в наличии?', a: 'Сейчас открыто шесть партий: лисичка свежая, сушёная и замороженная, белый гриб свежий и сушёный, груздь солёный. Из ягод есть клюква и брусника в заморозке. Открыть каталог целиком: раздел «Каталог».' },
  { q: 'Чем сушёное лучше замороженного?', a: 'Сушёное хранится полтора года и едет обычной транспортной компанией без холода. Замороженное ближе к свежему по вкусу, но требует рефрижератора и морозильной камеры у вас. Для регионов почти всегда выгоднее сушёное.' },
  { q: 'Какой объём брать для ресторана?', a: 'Ресторану обычно хватает 20-50 кг свежего в неделю в сезон. Начните с пробной партии 20 кг: посмотрите отход и как гриб ведёт себя на кухне, потом зафиксируем регулярный объём.' },
  { q: 'Какие документы дадите?', a: 'Декларацию соответствия, протокол лаборатории с радиологией и программу ХАССП цеха. Сканы открываются со страницы каждой партии, отдельно запрашивать не нужно.' },
  { q: 'Доставите в другой город?', a: 'Да. Сушёное и замороженное отправляем транспортной компанией по всей России. Свежую лисичку тоже возим: она не червивеет и переносит двое суток дороги.' }
];

function chatSay(text, who) {
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = 'chat__msg chat__msg--' + who;
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function chatAnswer(question) {
  const q = question.toLowerCase();
  const hit = CHAT_QA.find(x => x.q.toLowerCase() === q)
    || CHAT_QA.find(x => q.split(' ').some(w => w.length > 4 && x.q.toLowerCase().includes(w)))
    || CHAT_QA.find(x => (q.includes('налич') && x.q.includes('наличии')) || (q.includes('документ') && x.q.includes('документы'))
      || (q.includes('достав') && x.q.includes('Доставите')) || (q.includes('объ') && x.q.includes('объём')));
  setTimeout(() => {
    chatSay(hit ? hit.a : 'В прототипе я отвечаю на подготовленные вопросы. В рабочей версии здесь будет живой помощник с базой знаний по товарам и ценам. Пока могу позвать Илью: он ответит на что угодно.', 'bot');
  }, 400);
}

function chatInit() {
  const body = document.getElementById('chatBody');
  if (body.childElementCount) return;
  chatSay('Здравствуйте! Я помощник «Лесника». Подскажу по наличию, ценам, объёмам и доставке. С чего начнём?', 'bot');
  document.getElementById('chatChips').innerHTML =
    CHAT_QA.slice(0, 4).map(x => `<button type="button" data-chatq="${x.q}">${x.q}</button>`).join('');
}

/* ═══════════ роутер ═══════════ */

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  if (!path.startsWith('/')) return;  // якорь внутри страницы

  const isLot = path.startsWith('/lot');
  if (isLot) renderProduct(path.split('/')[2] || 'lisichka-dry');

  let hit = null;
  document.querySelectorAll('.screen').forEach(s => {
    const on = isLot ? s.dataset.route === '/lot' : s.dataset.route === path;
    s.classList.toggle('is-active', on);
    if (on) hit = s;
  });
  if (!hit) document.querySelector('[data-route="/"]').classList.add('is-active');

  document.querySelectorAll('.mast__nav a').forEach(a => {
    if (a.getAttribute('href') === '#' + path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (drop) { drop.open = false; dropByHover = false; }

  window.scrollTo({ top: 0, behavior: 'instant' });
  observeReveals();
  observeFigures();
  requestAnimationFrame(() => document.querySelectorAll('[data-rail-box]').forEach(setupRail));
}

/* ═══════════ события ═══════════ */

document.addEventListener('click', e => {
  // режим цен
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn) {
    mode = modeBtn.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    renderAll();
    return;
  }

  // каталог: категория
  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) { filters.cat = catBtn.dataset.cat; filters.state = 'all'; renderCatalog(); return; }

  // каталог: состояние
  const stBtn = e.target.closest('.catnav__sub [data-state]');
  if (stBtn) { filters.state = stBtn.dataset.state; renderCatalog(); return; }

  // каталог: фильтры
  const fBtn = e.target.closest('[data-filter]');
  if (fBtn) {
    const key = fBtn.dataset.filter, val = fBtn.dataset.value;
    filters[key] = (key === 'vol' && filters.vol === val) ? null : val;
    renderCatalog();
    return;
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const k = chip.dataset.chip;
    if (k === 'state') filters.state = 'all';
    if (k === 'avail') filters.avail = 'live';
    if (k === 'vol') filters.vol = null;
    renderCatalog();
    return;
  }
  if (e.target.closest('[data-reset-filters]')) { resetFilters(); return; }
  const catToggle = e.target.closest('[data-catnav-toggle]');
  if (catToggle) { document.getElementById('catnav').classList.toggle('is-open'); return; }

  // блог: рубрики
  const tab = e.target.closest('[data-tab]');
  if (tab) { blogTab = tab.dataset.tab; renderBlog(); return; }

  // корзина
  const add = e.target.closest('[data-add]');
  if (add) {
    const id = add.dataset.add;
    cart.set(id, (cart.get(id) || 0) + 1);
    add.textContent = 'В корзине';
    add.dataset.state = 'ok';
    setTimeout(() => { add.textContent = 'В корзину'; delete add.dataset.state; }, 1400);
    renderCart();
    return;
  }
  const qty = e.target.closest('[data-qty]');
  if (qty) {
    const id = qty.dataset.id;
    const next = (cart.get(id) || 0) + Number(qty.dataset.qty);
    if (next <= 0) cart.delete(id); else cart.set(id, next);
    renderCart();
    return;
  }

  // hero-слайдер
  const dot = e.target.closest('[data-dot]');
  if (dot) {
    const idx = dot.dataset.dot;
    document.querySelectorAll('.hero__slide').forEach(s => s.classList.toggle('is-on', s.dataset.slide === idx));
    document.querySelectorAll('[data-dot]').forEach(d => d.setAttribute('aria-pressed', String(d === dot)));
    return;
  }

  // карусели
  const railBtn = e.target.closest('[data-rail]');
  if (railBtn) {
    const track = railBtn.closest('.rail').querySelector('.rail__track');
    track.scrollBy({ left: Number(railBtn.dataset.rail) * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
    return;
  }
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) {
    const track = pageBtn.closest('.rail').querySelector('.rail__track');
    track.scrollTo({ left: Number(pageBtn.dataset.page) * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
    return;
  }

  // галерея партии
  const shot = e.target.closest('[data-shot]');
  if (shot) {
    document.getElementById('galMain').src = shot.dataset.shot;
    shot.closest('.pgal__thumbs').querySelectorAll('[data-shot]').forEach(b => b.setAttribute('aria-pressed', String(b === shot)));
    return;
  }

  // админка
  const step = e.target.closest('[data-step]');
  if (step) {
    const out = document.getElementById('admPrice');
    const cur = Number(out.textContent.replace(/\D/g, ''));
    out.textContent = Math.max(0, cur + Number(step.dataset.step)).toLocaleString('ru-RU') + ' ₽';
    return;
  }
  const stock = e.target.closest('[data-stock]');
  if (stock) {
    const out = document.getElementById('admStock');
    const next = Math.max(0, Number(out.textContent) + Number(stock.dataset.stock));
    out.textContent = next;
    const dry = LOTS.find(l => l.id === 'lisichka-dry');
    if (dry) dry.stock = next;
    if (currentLot && location.hash.startsWith('#/lot')) renderProduct(currentLot.id);
    return;
  }

  // мультикнопка
  const fabMain = e.target.closest('#fabMain');
  if (fabMain) {
    const list = document.getElementById('fabList');
    if (!list.hidden && fabByHover) { fabByHover = false; return; }  // закрепляем раскрытое наведением
    const open = list.hidden;
    list.hidden = !open;
    fabMain.setAttribute('aria-expanded', String(open));
    return;
  }
  if (e.target.closest('#chatOpen')) {
    document.getElementById('chat').hidden = false;
    document.getElementById('fabList').hidden = true;
    document.getElementById('fabMain').setAttribute('aria-expanded', 'false');
    chatInit();
    document.getElementById('chatInput').focus();
    return;
  }
  if (e.target.closest('#chatClose')) { document.getElementById('chat').hidden = true; return; }
  if (e.target.closest('#chatHuman')) {
    chatSay('Передал вопрос Илье. Он ответит в Telegram или перезвонит: 8 932 474-83-83.', 'bot');
    return;
  }
  const chatQ = e.target.closest('[data-chatq]');
  if (chatQ) { chatSay(chatQ.dataset.chatq, 'me'); chatAnswer(chatQ.dataset.chatq); return; }
  if (e.target.closest('#chatSend')) {
    const inp = document.getElementById('chatInput');
    if (inp.value.trim()) { chatSay(inp.value, 'me'); chatAnswer(inp.value); inp.value = ''; }
    return;
  }
  if (e.target.closest('[data-fab-link]')) {
    document.getElementById('fabList').hidden = true;
    document.getElementById('fabMain').setAttribute('aria-expanded', 'false');
    return;
  }

  // закрыть выпадающие при клике вне
  if (!e.target.closest('#search')) document.getElementById('searchDrop').hidden = true;
  const drop = document.getElementById('dropAbout');
  if (drop && drop.open && !e.target.closest('#dropAbout')) drop.open = false;
  if (!e.target.closest('#fab')) {
    const list = document.getElementById('fabList');
    if (list && !list.hidden) { list.hidden = true; document.getElementById('fabMain').setAttribute('aria-expanded', 'false'); }
  }

  const demo = e.target.closest('[data-demo]');
  if (demo) {
    const was = demo.textContent;
    demo.textContent = demo.dataset.demo;
    demo.dataset.state = 'ok';
    demo.disabled = true;
    setTimeout(() => { demo.textContent = was; delete demo.dataset.state; demo.disabled = false; }, 1800);
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'searchInput') runSearch(e.target.value);
});

document.addEventListener('change', e => {
  if (e.target.id === 'sortSel') { filters.sort = e.target.value; renderCatalog(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'chatInput') {
    if (e.target.value.trim()) { chatSay(e.target.value, 'me'); chatAnswer(e.target.value); e.target.value = ''; }
  }
  if (e.key === 'Escape') {
    document.getElementById('chat').hidden = true;
    document.getElementById('searchDrop').hidden = true;
  }
});

document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();

  let ok = true;
  form.querySelectorAll('[required]').forEach(input => {
    const field = input.closest('.field');
    const bad = !input.value.trim() || (input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));
    field.dataset.invalid = String(bad);
    if (bad && ok) { input.focus(); ok = false; }
  });
  if (!ok) return;

  const btn = form.querySelector('button[type="submit"]');
  const was = btn.textContent;
  btn.textContent = 'Отправлено, перезвоним сегодня';
  btn.dataset.state = 'ok';
  btn.disabled = true;
  form.reset();
  setTimeout(() => { btn.textContent = was; delete btn.dataset.state; btn.disabled = false; }, 2600);
});

/* ═══════════ раскрытие по наведению ═══════════
   Тип устройства не угадываем: медиазапрос про мышь врёт на гибридах.
   Помним, чем именно раскрыли. Раскрытое наведением закрывается уходом мыши,
   раскрытое кликом держится до следующего клика. */

let dropByHover = false;
const drop = document.getElementById('dropAbout');
if (drop) {
  let timer;
  drop.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    if (!drop.open) { drop.open = true; dropByHover = true; }
  });
  drop.addEventListener('mouseleave', () => {
    timer = setTimeout(() => { if (dropByHover) { drop.open = false; dropByHover = false; } }, 220);
  });
  drop.addEventListener('focusin', () => { clearTimeout(timer); drop.open = true; });
  drop.addEventListener('focusout', e => {
    if (!drop.contains(e.relatedTarget)) { drop.open = false; dropByHover = false; }
  });
  // клик по уже раскрытому наведением не схлопывает его, а закрепляет
  drop.querySelector('summary').addEventListener('click', e => {
    if (drop.open && dropByHover) { e.preventDefault(); dropByHover = false; }
  });
}

let fabByHover = false;
const fab = document.getElementById('fab');
if (fab) {
  let timer;
  const list = document.getElementById('fabList');
  const main = document.getElementById('fabMain');
  const setOpen = on => { list.hidden = !on; main.setAttribute('aria-expanded', String(on)); };
  fab.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    if (list.hidden) { setOpen(true); fabByHover = true; }
  });
  fab.addEventListener('mouseleave', () => {
    timer = setTimeout(() => { if (fabByHover) { setOpen(false); fabByHover = false; } }, 260);
  });
}

/* ═══════════ шапка: компактный режим при скролле ═══════════ */

const mast = document.querySelector('.mast');
function measureMast() {
  document.documentElement.style.setProperty('--mast-h', mast.offsetHeight + 'px');
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    mast.classList.toggle('is-compact', window.scrollY > 8);
    ticking = false;
  });
}, { passive: true });

window.addEventListener('resize', () => {
  measureMast();
  document.querySelectorAll('[data-rail-box]').forEach(setupRail);
});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureMast);
measureMast();

window.addEventListener('hashchange', route);
renderAll();
route();
