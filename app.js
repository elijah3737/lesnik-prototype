/* Лесник v4 · логика прототипа
   Данные партий из Telegram-канала клиента (июнь-август 2026).
   Розничные цены с пометкой demo заглушки для прохода по сценарию. */

/* Данные партий, категорий и текстов приходят из слоя хранения (store.js).
   Сейчас это localStorage с исходными данными из seed.js, в боевой версии
   тот же слой читает content/*.json, которые пишет админка.
   При правке в соседней вкладке админки данные перечитываются на лету. */
let LOTS, CATS, TEXTS, STATE_RU;

function loadData(withIndex) {
  LOTS = Store.load('lots');
  CATS = Store.load('categories');
  TEXTS = Store.load('texts') || {};
  STATE_RU = CATS.states.reduce((m, s) => (m[s.id] = s.name, m), {});
  if (withIndex) buildSearchIndex();   // при первом вызове индекс собирается ниже, после словарей
}
loadData(false);

const money = n => n.toLocaleString('ru-RU') + ' ₽';
const sitePhone = () => TEXTS.phone || '8 932 474-83-83';
const siteTel = () => 'tel:+7' + sitePhone().replace(/\D/g, '').replace(/^[78]/, '');
const fmt = n => Number(n || 0).toLocaleString('ru-RU');

/* ═══════════ кабинет оптового покупателя ═══════════
   Оптовые цены больше не переключаются тумблером: их видит только подтверждённый
   оптовик. Гость видит розницу. Учётки лежат в том же Store, что и остальные данные,
   поэтому на хостинге меняется только слой хранения. */

const SESSION_KEY = 'lesnik.session';

function accounts() { const a = Store.load('accounts'); return Array.isArray(a) ? a : []; }
function sessionEmail() {
  try { return localStorage.getItem(SESSION_KEY) || ''; } catch (e) { return ''; }
}
function setSession(email) {
  try { email ? localStorage.setItem(SESSION_KEY, email) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
function currentAccount() {
  const mail = sessionEmail().toLowerCase();
  return mail ? accounts().find(a => String(a.email).toLowerCase() === mail) || null : null;
}
const isWholesale = () => { const a = currentAccount(); return !!(a && a.status === 'approved'); };

/* корзина переживает перезагрузку: покупатель не теряет набранное */
let mode = 'retail';
const cart = new Map();
try {
  const savedCart = JSON.parse(localStorage.getItem('lesnik.ui.cart') || '[]');
  savedCart.forEach(([id, qty]) => { if (typeof id === 'string' && qty > 0) cart.set(id, qty); });
} catch (e) {}

function syncMode() { mode = isWholesale() ? 'opt' : 'retail'; }
syncMode();

function persistUI() {
  try { localStorage.setItem('lesnik.ui.cart', JSON.stringify([...cart.entries()])); } catch (e) {}
}

/* лесенка цен: [от кг, ₽/кг]; первая ступень — входная цена и минимум заказа */
const tiersOf = l => (Array.isArray(l.tiers) && l.tiers.length ? l.tiers : null);
const minKg = l => { const t = tiersOf(l); return t ? t[0][0] : 20; };
const entryPrice = l => { const t = tiersOf(l); return t ? t[0][1] : null; };
const optLabel = l => (entryPrice(l) !== null ? money(entryPrice(l)) : l.opt);
const kindName = id => { const k = CATS.kinds.find(x => x.id === id); return k ? k.name : id; };

/* состояние согласуем с родом товара: «белый гриб сушёный», но «лисичка сушёная» */
const STATE_MALE = { 'свежая': 'свежий', 'сушёная': 'сушёный', 'замороженная': 'замороженный', 'солёная': 'солёный', 'протёртая': 'протёртый' };
function stateLabel(l) {
  const base = STATE_RU[l.state] || l.state;
  const lastWord = l.name.trim().split(' ').pop().toLowerCase();
  const male = !/[ая]$/.test(lastWord);
  return male && STATE_MALE[base] ? STATE_MALE[base] : base;
}

/* ═══════════ карточка товара ═══════════ */

function card(lot) {
  const live = lot.status === 'live';
  const tag = live
    ? '<span class="lot__tag lot__tag--live"><i></i>в наличии</span>'
    : `<span class="lot__tag lot__tag--closed"><i></i>закрыта ${lot.closed}</span>`;

  let price, unit, action;
  if (mode === 'opt') {
    price = optLabel(lot);
    unit = live ? `за кг, опт от ${minKg(lot)} кг` : `партия ${lot.volume}`;
    action = live
      ? `<a class="btn btn--soft btn--full" href="#/lot/${lot.id}">Смотреть партию</a>`
      : `<a class="btn btn--soft btn--full" href="#/lot/${lot.id}">Бронь следующего сбора</a>`;
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
    <div class="lot__shot">${tag}<img src="${Store.img(lot.img)}" alt="${lot.alt}" loading="lazy"></div>
    <div class="lot__body">
      <p class="lot__name"><a href="#/lot/${lot.id}">${lot.name}</a></p>
      <p class="lot__spec">${lot.spec}</p>
    </div>
    <div class="lot__foot">
      <p class="lot__price${/^\d/.test(String(price)) ? '' : ' lot__price--ask'}">${price}<small class="lot__unit">${unit}</small></p>
      <div class="lot__act">${action}</div>
    </div>
  </li>`;
}

const fill = (id, list) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = list.map(card).join('');
};

/* ═══════════ каталог: категории и фильтры ═══════════ */

const filters = { cat: 'mushroom', state: 'all', avail: 'live', vol: null, region: null, retail: null, sort: 'default', q: '' };

function catalogList() {
  // поиск идёт поверх категорий: клиент ищет «морошку», а не «ягоды → морошка»
  let list = filters.q ? searchLots(filters.q)
    : (filters.cat === 'all' ? LOTS.slice() : LOTS.filter(l => l.kind === filters.cat));
  if (filters.state === 'keep') list = list.filter(l => ['dry', 'salted', 'frozen'].includes(l.state));
  else if (filters.state !== 'all') list = list.filter(l => l.state === filters.state);
  if (filters.avail === 'live') list = list.filter(l => l.status === 'live');
  if (filters.vol) list = list.filter(l => l.minVol === filters.vol);
  if (filters.region) list = list.filter(l => l.region === filters.region);
  if (filters.retail) list = list.filter(l => !!l.retail);
  // сортируем по той цене, которую человек видит: в опте по входной ступени, в рознице по розничной
  if (filters.sort === 'price') list = [...list].sort((a, b) => mode === 'retail'
    ? (b.retail || 0) - (a.retail || 0)
    : (entryPrice(b) || 0) - (entryPrice(a) || 0));
  if (filters.sort === 'date') list = [...list].sort((a, b) => b.date - a.date);
  if (filters.sort === 'default') list = [...list].sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1));
  return list;
}

/* множественное число состояния для пунктов меню: «свежая» → «Свежие» */
const STATE_PLURAL = { 'свежая': 'Свежие', 'сушёная': 'Сушёные', 'замороженная': 'Замороженные', 'солёная': 'Солёные', 'протёртая': 'Протёртые' };
const statePlural = s => STATE_PLURAL[s.name] || (s.name.charAt(0).toUpperCase() + s.name.slice(1));

/* левое меню каталога строится из категорий админки: переименование и новые виды доезжают до сайта */
function renderCatnav() {
  const box = document.getElementById('catnavList');
  if (!box) return;

  const allCount = LOTS.length;
  let html = `<li class="catnav__all">
    <button class="catnav__head catnav__head--all" type="button" data-cat="all">
      <span>Все категории</span><span class="catnav__count">${allCount}</span>
    </button>
  </li>`;

  html += CATS.kinds.map(k => {
    const inKind = LOTS.filter(l => l.kind === k.id);
    const states = CATS.states.filter(s => inKind.some(l => l.state === s.id));

    // пустая категория не кликается: вести человека в пустоту нечестно
    if (!inKind.length) {
      return `<li class="catnav__group catnav__group--off" data-group="${k.id}">
        <span class="catnav__head catnav__head--off">
          <span>${k.name}</span><span class="catnav__soonpill">скоро</span>
        </span>
      </li>`;
    }

    const sub = `<li><button type="button" data-state="all"><span>Все</span><span class="catnav__count">${inKind.length}</span></button></li>` +
      states.map(s => `<li><button type="button" data-state="${s.id}"><span>${statePlural(s)}</span><span class="catnav__count">${inKind.filter(l => l.state === s.id).length}</span></button></li>`).join('');

    return `<li class="catnav__group" data-group="${k.id}">
      <button class="catnav__head" type="button" data-cat="${k.id}">
        <span>${k.name}</span><span class="catnav__count">${inKind.length}</span>
        <span class="catnav__chev" aria-hidden="true"></span>
      </button>
      <ul class="catnav__sub" hidden>${sub}</ul>
    </li>`;
  }).join('');

  box.innerHTML = html;
}

function renderCatalog() {
  renderCatnav();
  const list = catalogList();
  fill('catGrid', list);

  const empty = document.getElementById('catEmpty');
  if (empty) {
    empty.hidden = list.length > 0;
    if (!list.length) {
      const kindEmpty = !filters.q && !LOTS.some(l => l.kind === filters.cat);
      const filtersOn = filters.state !== 'all' || filters.avail !== 'live' || filters.vol || filters.q;
      if (kindEmpty) {
        // категория ещё не запущена: не «фильтры виноваты», а честное состояние с подпиской
        empty.innerHTML = `<h2 class="empty__h">${kindName(filters.cat)}: сбор откроем в сезон</h2>
          <p>Категория готовится. Оставьте почту, и мы напишем, когда появятся первые партии.</p>
          <form data-form="sub" novalidate class="empty__sub">
            <label class="field"><span class="sr-only">Почта</span><input name="mail" type="email" placeholder="zakupki@restoran.ru" required><em class="err">Проверьте адрес почты</em></label>
            <button class="btn btn--solid" type="submit">Сообщить о старте</button>
          </form>`;
      } else {
        empty.innerHTML = `<p>${filters.q ? `По запросу «${filters.q}» в каталоге пусто.` : 'По этим фильтрам ничего нет.'}</p>
          ${filtersOn ? '<p><button class="btn" type="button" data-reset-filters>Сбросить фильтры</button></p>' : ''}
          <p><a class="tlink" href="${siteTel()}">Позвоните, подскажем, что есть: ${sitePhone()}</a></p>`;
      }
    }
  }

  const inKind = filters.cat === 'all' ? LOTS.slice() : LOTS.filter(l => l.kind === filters.cat);
  const total = filters.q ? searchLots(filters.q).length : inKind.length;
  const hiddenClosed = !filters.q && filters.avail === 'live' ? inKind.filter(l => l.status === 'closed').length : 0;
  const counter = document.getElementById('catCounter');
  if (counter) counter.textContent = filters.q
    ? `По запросу «${filters.q}» нашли ${total}`
    : mode === 'retail'
      ? `Показано ${list.length}, в розницу из них ${list.filter(l => l.retail).length}`
      : `Показано ${list.length} из ${total}${hiddenClosed ? `, ${hiddenClosed} в архиве закрытых` : ''}`;

  // активная ветка; раскрытой может быть и не активная — её помнит openKinds
  document.querySelectorAll('.catnav__group').forEach(g => {
    const kind = g.dataset.group;
    const on = !filters.q && kind === filters.cat;
    g.classList.toggle('is-active', on);
    const sub = g.querySelector('.catnav__sub');   // у незапущенной категории его нет
    if (sub) sub.hidden = !(on || openKinds.has(kind));
    g.classList.toggle('is-open', !!sub && !sub.hidden);
    g.querySelectorAll('[data-state]').forEach(b => {
      if (on && b.dataset.state === filters.state) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  });
  const allBtn = document.querySelector('[data-cat="all"]');
  if (allBtn) allBtn.setAttribute('aria-current', String(!filters.q && filters.cat === 'all'));

  // пресеты, переключатель закрытых и сортировка
  document.querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', String(presetOn(b.dataset.preset))));
  const closedBox = document.getElementById('showClosed');
  if (closedBox) closedBox.checked = filters.avail === 'all';
  const sortLabel = document.getElementById('sortLabel');
  if (sortLabel) sortLabel.textContent = SORT_RU[filters.sort] || SORT_RU.default;
  const fN = document.getElementById('filtersN');
  if (fN) {
    const n = (filters.vol ? 1 : 0) + (filters.region ? 1 : 0) + (filters.retail ? 1 : 0) + (filters.avail === 'all' ? 1 : 0);
    fN.textContent = n; fN.hidden = n === 0;
  }
  renderRegionOpts();

  // кнопки фильтров
  document.querySelectorAll('[data-filter]').forEach(b => {
    const key = b.dataset.filter, val = b.dataset.value;
    b.setAttribute('aria-pressed', String(filters[key] === val));
  });

  // чипы выбранного
  const chips = document.getElementById('chips');
  if (chips) {
    const active = [];
    if (filters.q) active.push({ k: 'q', label: `Поиск: ${filters.q}` });
    if (filters.state !== 'all') active.push({ k: 'state', label: filters.state === 'keep' ? 'долгого хранения' : (STATE_RU[filters.state] || filters.state) });
    if (filters.avail === 'all' && !filters.q) active.push({ k: 'avail', label: 'включая закрытые' });
    if (filters.vol) active.push({ k: 'vol', label: filters.vol === 'mini' ? 'от 20 кг' : 'от 500 кг' });
    if (filters.region) active.push({ k: 'region', label: filters.region });
    if (filters.retail) active.push({ k: 'retail', label: 'есть в рознице' });
    chips.innerHTML = active.length
      ? active.map(a => `<button class="chip" type="button" data-chip="${a.k}">${a.label}<span aria-hidden="true">×</span><span class="sr-only">убрать фильтр</span></button>`).join('') +
        `<button class="chips__reset" type="button" data-reset-filters>Сбросить всё</button>`
      : '';
  }
}

function resetFilters() {
  filters.state = 'all'; filters.avail = 'live'; filters.vol = null;
  filters.region = null; filters.retail = null; filters.sort = 'default'; filters.q = '';
  renderCatalog();
}

const SORT_RU = { default: 'По наличию', price: 'По цене', date: 'По дате сбора' };
const openKinds = new Set();

// пресет считается включённым, только если стоит ровно его набор
function presetOn(name) {
  if (name === 'fresh')  return filters.state === 'fresh';
  if (name === 'keep')   return filters.state === 'keep';
  if (name === 'retail') return filters.retail === 'yes';
  if (name === 'mini')   return filters.vol === 'mini';
  return false;
}

function applyPreset(name) {
  const was = presetOn(name);
  filters.state = 'all'; filters.vol = null; filters.retail = null;
  if (!was) {
    if (name === 'fresh')  filters.state = 'fresh';
    if (name === 'keep')   filters.state = 'keep';
    if (name === 'retail') filters.retail = 'yes';
    if (name === 'mini')   filters.vol = 'mini';
  }
  renderCatalog();
}

// регионы берём из данных, а не из списка руками
function renderRegionOpts() {
  const box = document.getElementById('fRegions');
  if (!box) return;
  const src = filters.cat === 'all' ? LOTS : LOTS.filter(l => l.kind === filters.cat);
  const regions = [...new Set(src.map(l => l.region).filter(Boolean))];
  box.innerHTML = regions.map(r =>
    `<button type="button" data-filter="region" data-value="${r}" aria-pressed="${filters.region === r}">${r}</button>`).join('');
}

/* ═══════════ прайс ═══════════ */

const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function renderPrice() {
  // дата ставится сама: руками её никто не обновит, и прайс протухнет молча
  const d = new Date();
  const dateEl = document.getElementById('priceDate');
  if (dateEl) dateEl.textContent = `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;

  const tb = document.getElementById('priceRows');
  if (!tb) return;
  const opt = isWholesale();

  tb.innerHTML = LOTS.map(l => {
    const live = l.status === 'live';
    const price = opt
      ? `${optLabel(l)}${tiersOf(l) ? ` <small>от ${fmt(minKg(l))} кг</small>` : ''}`
      : `<a class="locked" href="#/lk">под кабинетом</a>`;
    const action = live
      ? `<button class="btn btn--soft btn--sm" type="button" data-order="${l.id}">Заказать</button>`
      : `<button class="btn btn--sm" type="button" data-order="${l.id}">Бронь сбора</button>`;
    return `<tr>
      <td>${l.name.replace(/ (свежая|свежий|сушёная|сушёный|замороженная|солёный|протёртая)$/i, '')}</td>
      <td>${stateLabel(l)}</td>
      <td class="n">${live ? fmt(l.stock) + ' кг' : l.volume}</td>
      <td class="n">${price}</td>
      <td>${live ? 'открыта' : 'закрыта ' + l.closed}</td>
      <td class="act">${action}</td>
    </tr>`;
  }).join('');

  const hint = document.getElementById('priceGate');
  if (hint) hint.hidden = opt;
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
        <a class="bhero__img" href="${p.href}" tabindex="-1" aria-hidden="true"><img src="${Store.img(p.img)}" alt="" loading="lazy"></a>
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
    <a class="bcard__img" href="${p.href}" tabindex="-1" aria-hidden="true"><img src="${Store.img(p.img)}" alt="" loading="lazy"></a>
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
        <img src="${Store.img(l.img)}" alt="${l.alt}">
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

/* Единица розничной фасовки: за 100 г продаём упаковками, за 1 кг — килограммами.
   Считать её в трёх местах по-разному — верный способ разойтись в цифрах. */
const retailPack = lot => (String(lot.retailUnit).indexOf('100 г') !== -1 ? 'уп.' : 'кг');

const plural = (n, one, few, many) => {
  const d10 = n % 10, d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return one;
  if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return few;
  return many;
};

/* Живые строки корзины: битые id (партию удалили в админке) отсеиваем,
   иначе весь рендер падает на lot.retail у undefined. */
function cartLines() {
  return [...cart.entries()]
    .map(([id, qty]) => ({ lot: LOTS.find(l => l.id === id), qty }))
    .filter(x => x.lot && x.lot.retail);
}

/* Что показать в допродаже: розничные партии в наличии, которых ещё нет в корзине.
   Кадры не повторяем: две «брусники» на одном фото рядом выглядят как ошибка вёрстки. */
function cartSuggest(limit) {
  const seen = new Set();
  return LOTS
    .filter(l => l.status === 'live' && l.retail && !cart.has(l.id))
    .filter(l => { if (seen.has(l.img)) return false; seen.add(l.img); return true; })
    .slice(0, limit);
}

const CART_OPT_BAND = `
  <section class="pband cband">
    <div>
      <h2>Берёте от 20 кг?</h2>
      <p class="pband__lede">Это уже опт: цена считается по объёму и заметно ниже розничной. Свежий гриб и ягоду тоже отгружаем только так.</p>
    </div>
    <div class="cband__act">
      <ul class="pband__facts">
        <li>Цена под ваш объём, лесенкой от 20 кг</li>
        <li>Открытый остаток по каждой партии</li>
        <li>Счёт юрлицу и отгрузка транспортной компанией</li>
      </ul>
      <div class="btn-row">
        <a class="btn btn--solid" href="#/opt">Условия опта</a>
        <a class="btn" href="#/catalog">Оптовые партии</a>
      </div>
    </div>
  </section>`;

const CART_TRUST = `
  <ul class="csum__trust">
    <li>Собираем, сушим и солим сами — знаем каждую партию</li>
    <li>Самовывоз со склада в Москве или доставка по России</li>
    <li>Оплата после подтверждения: картой, переводом или по счёту</li>
  </ul>`;

function renderCart() {
  const count = [...cart.values()].reduce((a, b) => a + b, 0);
  const link = document.getElementById('cartlink');
  document.getElementById('cartcount').textContent = count;
  link.hidden = count === 0;

  const box = document.getElementById('cartBody');
  if (!box) return;

  const lines = cartLines();
  const meta = document.getElementById('cartMeta');
  if (meta) {
    meta.textContent = lines.length
      ? `${lines.length} ${plural(lines.length, 'позиция', 'позиции', 'позиций')} в заказе`
      : 'Розница: сушёное, мороженое и солёное';
  }

  // ── пусто: не тупик с одной ссылкой, а витрина того, что вообще берут в розницу ──
  if (!lines.length) {
    const picks = cartSuggest(4);
    box.innerHTML = `
      <div class="cempty">
        <div class="cempty__copy">
          <h2>Пока пусто</h2>
          <p>В розницу отправляем то, что переживёт дорогу: сушёное, солёное и мороженое.
             Свежий гриб живёт трое суток, поэтому его отгружаем только оптом и только с холодом.</p>
          <div class="btn-row">
            <a class="btn btn--solid" href="#/catalog">Открыть каталог</a>
            <a class="btn" href="#/price">Прайс на неделю</a>
          </div>
        </div>
        <ul class="cempty__facts">
          <li><b>Сушёное</b><span>хранится 18 месяцев, едет в любой регион</span></li>
          <li><b>Солёное</b><span>холодная засолка без уксуса, 9 месяцев при +4</span></li>
          <li><b>Мороженое</b><span>шоковая заморозка в день сбора, 12 месяцев</span></li>
        </ul>
      </div>
      ${picks.length ? `<section class="crec">
        <h2 class="crec__h">Что берут в розницу</h2>
        <ul class="lots">${picks.map(card).join('')}</ul>
      </section>` : ''}
      ${CART_OPT_BAND}`;
    return;
  }

  // ── есть товар ──
  let sum = 0;
  let hasDemo = false;
  const rows = lines.map(({ lot, qty }) => {
    const lineSum = lot.retail * qty;
    sum += lineSum;
    if (lot.demo) hasDemo = true;
    const pack = retailPack(lot);
    return `<li class="cline">
      <a class="cline__shot" href="#/lot/${lot.id}" tabindex="-1" aria-hidden="true"><img src="${Store.img(lot.img)}" alt="${lot.alt}" loading="lazy"></a>
      <div class="cline__body">
        <p class="cline__name"><a href="#/lot/${lot.id}">${lot.name}</a></p>
        <p class="cline__spec">${lot.spec}</p>
        <p class="cline__unit"><b>${money(lot.retail)}</b> ${lot.retailUnit}</p>
      </div>
      <div class="cline__act">
        <span class="qty">
          <button type="button" data-qty="-1" data-id="${lot.id}" aria-label="Убрать одну единицу: ${lot.name}">−</button>
          <input class="qty__in" type="text" inputmode="numeric" value="${qty}" data-qtyin="${lot.id}"
                 size="3" aria-label="Количество, ${pack}: ${lot.name}">
          <button type="button" data-qty="1" data-id="${lot.id}" aria-label="Добавить одну единицу: ${lot.name}">+</button>
        </span>
        <p class="cline__sum"><b class="num">${money(lineSum)}</b><small>${qty} ${pack}</small></p>
        <button class="cline__del" type="button" data-del="${lot.id}" aria-label="Убрать из корзины: ${lot.name}">Убрать</button>
      </div>
    </li>`;
  }).join('');

  const picks = cartSuggest(3);

  box.innerHTML = `
    <div class="cart">
      <div class="cart__list">
        <ul class="clines">${rows}</ul>
        <p class="cart__back"><a class="tlink" href="#/catalog">← Продолжить покупки</a></p>
        ${hasDemo ? '<p class="cart__demo">Розничные цены в прототипе демонстрационные: подставим реальные из прайса.</p>' : ''}
        ${picks.length ? `<section class="crecs">
          <h2 class="crecs__h">С этим часто берут</h2>
          <ul class="crecs__list">${picks.map(p => `<li class="crecs__i">
            <a class="crecs__shot" href="#/lot/${p.id}" tabindex="-1" aria-hidden="true"><img src="${Store.img(p.img)}" alt="${p.alt}" loading="lazy"></a>
            <div class="crecs__body">
              <p class="crecs__n"><a href="#/lot/${p.id}">${p.name}</a></p>
              <p class="crecs__s">${p.spec}</p>
            </div>
            <p class="crecs__p"><b class="num">${money(p.retail)}</b><small>${p.retailUnit}</small></p>
            <button class="btn btn--soft crecs__add" type="button" data-add="${p.id}">В корзину</button>
          </li>`).join('')}</ul>
        </section>` : ''}
      </div>

      <aside class="cart__side">
        <div class="csum">
          <h2 class="csum__h">Ваш заказ</h2>
          <dl class="csum__rows">
            <div><dt>Товары, ${lines.length} ${plural(lines.length, 'позиция', 'позиции', 'позиций')}</dt><dd class="num">${money(sum)}</dd></div>
            <div><dt>Доставка</dt><dd class="csum__soft">рассчитаем и подтвердим</dd></div>
          </dl>
          <p class="csum__total"><span>Итого за товар</span><b class="num">${money(sum)}</b></p>

          <form class="csum__form" data-form="cart" novalidate>
            <label class="field"><span>Имя</span><input name="name" placeholder="Как к вам обращаться" required><em class="err">Укажите имя</em></label>
            <label class="field"><span>Телефон</span><input name="phone" type="tel" placeholder="+7" required><em class="err">Нужен телефон для связи</em></label>
            <label class="field"><span>Как получить</span>
              <select name="ship"><option>СДЭК до пункта выдачи</option><option>Курьером по Москве</option><option>Самовывоз со склада</option></select>
            </label>
            <label class="field"><span>Комментарий</span><textarea name="note" placeholder="Не обязательно"></textarea></label>
            <button class="btn btn--solid btn--full btn--lg" type="submit">Оформить заказ</button>
          </form>
          <p class="csum__after">Заказ ни к чему не обязывает: сначала перезвоним, подтвердим наличие
             и назовём стоимость доставки, платить — после этого.</p>
          ${CART_TRUST}
        </div>
      </aside>
    </div>

    ${CART_OPT_BAND}`;
}

/* ═══════════ общий рендер ═══════════ */

/* «Цифры сезона» считаются из партий, а не живут константами в разметке */
/* ═══════════ баннеры главной ═══════════
   Цифры в баннере живые: считаются по тем же партиям, что и каталог,
   иначе через месяц шапка сайта начнёт врать. */

function renderHero() {
  const live = LOTS.filter(l => l.status === 'live');

  const liveEl = document.getElementById('heroLive');
  if (liveEl) liveEl.textContent = live.length;

  const prices = live.map(entryPrice).filter(v => v !== null && v > 0);
  const fromEl = document.getElementById('heroFrom');
  if (fromEl) fromEl.textContent = prices.length ? 'от ' + money(Math.min(...prices)) : 'по объёму';

  // три самые крупные закрытые партии: доказательство оборота, а не обещание
  const box = document.getElementById('heroClosed');
  if (box) {
    const closed = LOTS.filter(l => l.status === 'closed' && l.total)
      .sort((a, b) => b.total - a.total).slice(0, 3);
    box.innerHTML = closed.map(l => `<li>
      <b>${esc(l.name)}</b>
      <span>${fmt(l.total)} кг</span>
      <i>закрыта ${esc(l.closed || '')}</i>
    </li>`).join('');
  }
}

function renderFigures() {
  const closedKg = LOTS.filter(l => l.status === 'closed').reduce((a, l) => a + (l.total || 0), 0);
  const liveKg = LOTS.filter(l => l.status === 'live').reduce((a, l) => a + (l.stock || 0), 0);
  const species = new Set(LOTS.map(l =>
    l.name.replace(/ (свежая|свежий|сушёная|сушёный|замороженная|замороженный|солёная|солёный|протёртая|протёртый)$/i, '')
  )).size;
  const minOrder = Math.min(...LOTS.filter(l => l.status === 'live').map(minKg));
  const share = closedKg + liveKg ? closedKg / (closedKg + liveKg) : 0;

  const box = document.querySelector('.figures');
  if (!box) return;
  const cells = box.querySelectorAll('.summary__cell');
  if (cells.length < 3) return;

  // цифры считаем по реальным партиям, а не вписываем руками
  cells[0].querySelector('.summary__val').innerHTML = `<span data-count="${closedKg}">0</span><small>кг</small>`;
  const bar = cells[0].querySelector('[data-bar]');
  if (bar) bar.dataset.bar = String(Math.round(share * 100));
  cells[0].querySelector('.summary__note').textContent = `${Math.round(share * 100)} % от заявленного объёма`;

  cells[1].querySelector('.summary__val').innerHTML = `<span data-count="${species}">0</span>`;
  const marks = cells[1].querySelector('.summary__marks');
  if (marks) marks.innerHTML = Array.from({ length: species }, () => '<li></li>').join('');

  cells[2].querySelector('.summary__val').innerHTML = `<span data-count="${minOrder}">0</span><small>кг</small>`;
}

function renderAll() {
  const live = LOTS.filter(l => l.status === 'live');
  const closed = LOTS.filter(l => l.status === 'closed');

  renderHero();
  fill('homeLive', live);
  fill('homeClosed', closed);
  renderFigures();

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

/* сохранённая ссылка на несуществующую партию не должна молча показывать чужой товар */
function renderLotMissing() {
  const box = document.getElementById('lotPage');
  if (!box) return;
  currentLot = null;
  const live = LOTS.filter(l => l.status === 'live').slice(0, 4);
  box.innerHTML = `
    <p class="crumbs"><a href="#/">Главная</a> → <a href="#/catalog">Каталог</a> → Партия не найдена</p>
    <div class="empty" style="text-align:left;padding-inline:0">
      <h1 style="margin-bottom:var(--space-sm)">Такой партии больше нет</h1>
      <p style="max-width:52ch">Ссылка устарела или партия удалена. Сезон меняется каждую неделю: посмотрите, что открыто сейчас, или позвоните — подскажем замену.</p>
      <p class="btn-row" style="display:flex;gap:var(--space-sm);flex-wrap:wrap;margin-top:var(--space-md)">
        <a class="btn btn--solid" href="#/catalog">Открытые партии</a>
        <a class="btn" href="${siteTel()}">${sitePhone()}</a>
      </p>
    </div>
    ${live.length ? `<div class="shead" style="margin-top:var(--space-xl)"><h2>Сейчас в наличии</h2></div>
    <ul class="lots">${live.map(card).join('')}</ul>` : ''}`;
}

function renderProduct(id) {
  const lot = LOTS.find(l => l.id === id);
  if (!lot) { renderLotMissing(id); return; }
  currentLot = lot;
  const box = document.getElementById('lotPage');
  if (!box) return;

  const live = lot.status === 'live';
  const pct = lot.total ? Math.round((lot.stock / lot.total) * 100) : 0;
  const kindRu = kindName(lot.kind);
  const mk = minKg(lot);

  // «по запросу» не число: крупный моношрифт оставляем настоящим ценам
  const ask = mode !== 'retail' && !/^\d/.test(optLabel(lot));
  const priceBlock = mode === 'retail' && lot.retail
    ? `<p class="buy__price">${money(lot.retail)}<small>${lot.retailUnit}${lot.demo ? ', цена демонстрационная' : ''}</small></p>`
    : ask
      ? `<p class="buy__price buy__price--ask">Цена по объёму<small>${live ? `считаем под партию, опт от ${mk} кг` : 'партия закрыта, цену следующей скажем при брони'}</small></p>`
      : `<p class="buy__price">${optLabel(lot)}<small>${live
          ? `за кг при заказе от ${mk} кг${lot.demoOpt ? ' · цена демонстрационная' : ''}${mode === 'retail' ? ' · в розницу эта партия не продаётся' : ''}`
          : `цена закрытой партии${lot.demoOpt ? ', демо' : ''}`}</small></p>`;

  const tierRows = tiersOf(lot);
  const tiers = live && mode === 'opt' && tierRows ? `
    <ul class="tiers">
      ${tierRows.map(([kg, p], i) => `<li${i === tierRows.length - 1 ? ' class="tiers__best"' : ''}><b>от ${fmt(kg)} кг</b><span class="num">${money(p)}/кг</span></li>`).join('')}
    </ul>` : '';

  const lowStock = live && pct < 35;
  const stockBlock = live ? `
    <div class="stockbar${lowStock ? ' stockbar--low' : ''}">
      <div class="stockbar__top"><span>Осталось в партии</span><b class="num">${fmt(lot.stock)} из ${fmt(lot.total)} кг</b></div>
      <div class="stockbar__rail"><i style="width:${Math.max(4, pct)}%"></i></div>
      <p class="stockbar__note${lowStock ? ' stockbar__note--low' : ''}">${lowStock ? 'Партия заканчивается, уточняйте остаток при заявке' : 'Отгружаем со склада в Москве'}</p>
    </div>` : `
    <div class="stockbar stockbar--out">
      <div class="stockbar__top"><span>Партия закрыта</span><b>${lot.closed}</b></div>
      <p class="stockbar__note">Забронируйте объём в следующем сборе, чтобы не ждать общего доступа.</p>
    </div>`;

  const action = !live
    ? `<button class="btn btn--solid btn--full btn--lg" type="button" data-scroll="buyForm">Бронь следующего сбора</button>`
    : (mode === 'retail' && lot.retail
        ? `<button class="btn btn--solid btn--full btn--lg" type="button" data-add="${lot.id}">В корзину</button>`
        : `<button class="btn btn--solid btn--full btn--lg" type="button" data-scroll="buyForm">Запросить цену на объём</button>`);

  // у закрытой партии отгружать нечего: подписи под кнопкой берём про следующий сбор
  const nextHarvest = (lot.specs.find(([k]) => k === 'Следующий сбор') || lot.specs.find(([k]) => k === 'Сезон') || [])[1];
  const facts = live
    ? [`Опт от ${fmt(mk)} кг, отгрузка 1-2 рабочих дня`, 'Самовывоз в Москве или доставка', 'Нал, безнал, счёт для юрлиц']
    : [nextHarvest ? `Следующий сбор: ${nextHarvest}` : 'Сбор повторится в свой сезон',
       'Напишем, как только партия откроется', 'Счёт и договор для юрлиц'];

  const related = LOTS.filter(l => l.id !== lot.id && l.status === 'live' && l.kind === lot.kind).slice(0, 4);

  box.innerHTML = `
    <p class="crumbs"><a href="#/">Главная</a> → <a href="#/catalog">Каталог</a> → ${kindRu} → ${lot.name}</p>

    <div class="product">
      <div class="product__media">
        <div class="pgal">
          <div class="pgal__thumbs" role="group" aria-label="Кадры партии">
            ${lot.gal.map((g, i) => `<button type="button" data-shot="${g}" aria-pressed="${i === 0}"><img src="${Store.img(g)}" alt=""></button>`).join('')}
          </div>
          <div class="pgal__main"><img id="galMain" src="${Store.img(lot.gal[0])}" alt="${lot.alt}"></div>
        </div>

        <section class="psection psection--about">
          <h2>Об этой партии</h2>
          <p>${lot.about}</p>
        </section>
      </div>

      <div class="product__buy">
        <div class="buy">
          <div class="buy__tags">
            <span class="tag ${live ? 'tag--live' : 'tag--closed'}">${live ? 'партия открыта' : 'партия закрыта'}</span>
            <span class="lotno" title="Номер партии">№ Л-${String(lot.date).slice(2)}</span>
          </div>
          <h1>${lot.name}</h1>
          <p class="buy__meta">${lot.region} · ${lot.harvest}</p>
          ${priceBlock}
          ${tiers}
          ${stockBlock}
          <div class="buy__act">${action}</div>
          <a class="buy__tel" href="${siteTel()}">Или позвоните: <b>${sitePhone()}</b></a>
          <ul class="buy__facts">
            ${facts.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <div class="pgrid">
      <section class="psection">
        <h2>Характеристики</h2>
        <dl class="ptable">
          ${lot.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
      </section>

      <section class="psection">
        <h2>Доставка и оплата</h2>
        <dl class="ptable">
          <div><dt>Самовывоз</dt><dd>склад в Москве, в день оплаты</dd></div>
          <div><dt>По Москве</dt><dd>от 300 кг без доплаты</dd></div>
          <div><dt>В регионы</dt><dd>транспортной компанией</dd></div>
          <div><dt>Оплата</dt><dd>нал, безнал, счёт юрлицу</dd></div>
        </dl>
      </section>
    </div>

    <section class="pband" id="buyForm">
      <div class="pband__head">
        <h2>${live ? 'Оставьте объём, посчитаем цену' : 'Забронировать следующий сбор'}</h2>
        <p class="pband__lede">${live
          ? `Цена уточняется от объёма: лесенка выше показывает шаг. Минимум по этой партии ${fmt(mk)} кг.`
          : 'Партия ушла, но сбор повторится. Оставьте объём, и мы напишем, как только он откроется.'}</p>
        <ul class="pband__facts">
          <li>Отвечаем в тот же день, в сезон включая выходные</li>
          <li>Считаем цену под ваш объём, от ${fmt(mk)} кг</li>
          <li>Скажем сразу, если в этом сборе объёма нет</li>
        </ul>
      </div>
      <form class="buyform" data-form="lot" novalidate>
        <label class="field"><span>Сколько нужно, кг</span><input name="qty" type="number" min="${mk}" placeholder="${mk * 2}" required><em class="err">Минимум для этой партии: ${fmt(mk)} кг</em></label>
        <label class="field"><span>Телефон</span><input name="phone" type="tel" placeholder="+7" required><em class="err">Нужен телефон для связи</em></label>
        <label class="field"><span>Кто вы</span>
          <select name="who"><option>Ресторан или кафе</option><option>Переработчик</option><option>Магазин или сеть</option><option>Экспорт</option><option>Частное лицо</option></select>
        </label>
        <button class="btn btn--solid btn--lg" type="submit">${live ? 'Отправить заявку' : 'Записаться на сбор'}</button>
      </form>
    </section>

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

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════ тост: короткое подтверждение действия ═══════════ */

let toastTimer = null;
/* action = { label, run } — кнопка отмены прямо в тосте: удаление из корзины
   должно быть обратимым, иначе промах пальцем стоит покупателю позиции */
function toast(msg, bad, action) {
  let t = document.getElementById('siteToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'siteToast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.toggle('toast--bad', !!bad);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast__act';
    b.textContent = action.label;
    b.onclick = () => { t.hidden = true; clearTimeout(toastTimer); action.run(); };
    t.appendChild(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5200 : 2400);
}

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

function setHeroSlide(i) {
  document.querySelectorAll('.hero__slide').forEach(sl => sl.classList.toggle('is-on', Number(sl.dataset.slide) === i));
  document.querySelectorAll('[data-dot]').forEach(d => d.setAttribute('aria-pressed', String(Number(d.dataset.dot) === i)));
}

/* ═══════════ кабинет: вход, регистрация, статус ═══════════ */

function renderLk() {
  const box = document.getElementById('lkPage');
  if (!box) return;
  const acc = currentAccount();

  if (!acc) {
    box.innerHTML = `
      <div class="pagehero pagehero--plain">
        <div class="pagehero__copy">
          <h1>Кабинет оптового покупателя</h1>
          <p>Оптовые цены и прайс-лист открыты зарегистрированным закупщикам. Регистрацию подтверждаем вручную, обычно в тот же день.</p>
        </div>
      </div>
      <div class="lk">
        <section class="lk__card">
          <h2>Вход</h2>
          <form data-form="lk-in" novalidate>
            <label class="field"><span>Почта</span>
              <input name="email" type="email" placeholder="zakupki@restoran.ru" required autocomplete="email">
              <em class="err">Проверьте адрес почты</em></label>
            <button class="btn btn--solid btn--full" type="submit">Войти</button>
          </form>
          <p class="lk__hint">В прототипе пароль не спрашиваем. Для примера уже заведён доступ <button class="tlink" type="button" data-fill-email="zakupki@restoran.ru">zakupki@restoran.ru</button>.</p>
        </section>

        <section class="lk__card">
          <h2>Регистрация</h2>
          <form data-form="lk-up" novalidate>
            <label class="field"><span>Компания</span>
              <input name="company" type="text" placeholder="Ресторан, переработчик, сеть" required>
              <em class="err">Впишите название компании</em></label>
            <label class="field"><span>Как к вам обращаться</span>
              <input name="name" type="text" placeholder="Имя" required>
              <em class="err">Впишите имя</em></label>
            <label class="field"><span>Почта</span>
              <input name="email" type="email" placeholder="zakupki@company.ru" required autocomplete="email">
              <em class="err">Проверьте адрес почты</em></label>
            <label class="field"><span>Телефон</span>
              <input name="phone" type="tel" placeholder="+7" required>
              <em class="err">Нужен телефон для связи</em></label>
            <button class="btn btn--solid btn--full" type="submit">Отправить заявку</button>
          </form>
        </section>
      </div>`;
    return;
  }

  if (acc.status !== 'approved') {
    box.innerHTML = `
      <div class="pagehero pagehero--plain">
        <div class="pagehero__copy">
          <h1>Заявка на рассмотрении</h1>
          <p>Мы получили заявку от «${esc(acc.company)}» и подтвердим доступ в рабочее время. Как только откроем, оптовые цены и прайс появятся здесь же.</p>
        </div>
      </div>
      <div class="lk">
        <section class="lk__card">
          <h2>Пока ждёте</h2>
          <p>Каталог и наличие открыты и без кабинета: видно, что есть в этом сезоне и в каком объёме.</p>
          <div class="btn-row"><a class="btn" href="#/catalog">Смотреть каталог</a><a class="btn" href="${siteTel()}">Позвонить</a></div>
        </section>
        <section class="lk__card">
          <h2>Ваша заявка</h2>
          <dl class="ptable">
            <div><dt>Компания</dt><dd>${esc(acc.company)}</dd></div>
            <div><dt>Почта</dt><dd>${esc(acc.email)}</dd></div>
            <div><dt>Телефон</dt><dd>${esc(acc.phone || '')}</dd></div>
            <div><dt>Подана</dt><dd>${esc(acc.at || '')}</dd></div>
          </dl>
          <p class="lk__hint">В прототипе подтвердить можно самому: админка, раздел «Оптовики».</p>
          <div class="btn-row"><button class="btn btn--sm" type="button" data-lk-out>Выйти</button></div>
        </section>
      </div>`;
    return;
  }

  const live = LOTS.filter(l => l.status === 'live');
  box.innerHTML = `
    <div class="pagehero pagehero--plain">
      <div class="pagehero__copy">
        <h1>${esc(acc.company)}</h1>
        <p>Доступ к опту открыт. Цены лесенкой от объёма видны в каталоге, в карточках партий и в прайс-листе.</p>
      </div>
    </div>
    <div class="lk">
      <section class="lk__card">
        <h2>Что открыто</h2>
        <ul class="buy__facts">
          <li>Оптовые цены по ${live.length} открытым партиям</li>
          <li>Прайс-лист целиком, с выгрузкой в PDF и XLSX</li>
          <li>Заказ партии в один шаг, без переписки</li>
        </ul>
        <div class="btn-row"><a class="btn btn--solid" href="#/price">Открыть прайс</a><a class="btn" href="#/catalog">В каталог</a></div>
      </section>
      <section class="lk__card">
        <h2>Учётная запись</h2>
        <dl class="ptable">
          <div><dt>Почта</dt><dd>${esc(acc.email)}</dd></div>
          <div><dt>Телефон</dt><dd>${esc(acc.phone || '')}</dd></div>
          <div><dt>Доступ с</dt><dd>${esc(acc.at || '')}</dd></div>
        </dl>
        <div class="btn-row"><button class="btn btn--sm" type="button" data-lk-out>Выйти</button></div>
      </section>
    </div>`;
}

function esc(x) {
  return String(x === undefined || x === null ? '' : x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function refreshLkLink() {
  const label = document.getElementById('lkLabel');
  if (!label) return;
  const acc = currentAccount();
  label.textContent = acc ? (acc.status === 'approved' ? 'Кабинет' : 'Заявка') : 'Кабинет';
  const link = document.getElementById('lkLink');
  if (link) link.classList.toggle('is-on', !!acc && acc.status === 'approved');
}

/* ═══════════ модалка заказа ═══════════ */

function openOrder(lotId) {
  const lot = LOTS.find(l => l.id === lotId) || null;
  const live = !lot || lot.status === 'live';
  const box = document.getElementById('orderBody');
  const opts = LOTS.filter(l => l.status === 'live')
    .map(l => `<option value="${l.id}"${lot && l.id === lot.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('');

  box.innerHTML = `
    <h2 id="orderTitle">${lot ? esc(lot.name) : 'Запрос цены на объём'}</h2>
    <p class="modal__sub">${lot && live
      ? `${esc(lot.region)}, ${esc(lot.harvest)}. Осталось ${fmt(lot.stock)} кг.`
      : lot ? `Партия закрыта ${esc(lot.closed || '')}. Запишем вас на следующий сбор.`
            : 'Назовите объём, посчитаем цену под вас и выставим счёт.'}</p>
    <form class="orderform" data-form="order" novalidate>
      ${lot ? `<input type="hidden" name="lot" value="${esc(lot.name)}">`
            : `<label class="field"><span>Что интересует</span><select name="lot">${opts}</select></label>`}
      <label class="field"><span>Сколько нужно, кг</span>
        <input name="qty" type="number" inputmode="numeric" min="1" placeholder="${lot ? fmt(minKg(lot)) : '200'}" required>
        <em class="err">Укажите объём в килограммах</em></label>
      <label class="field"><span>Телефон</span>
        <input name="phone" type="tel" placeholder="+7" required autocomplete="tel">
        <em class="err">Нужен телефон для связи</em></label>
      <button class="btn btn--solid btn--full btn--lg" type="submit">${live ? 'Отправить заявку' : 'Записаться на сбор'}</button>
    </form>`;

  const m = document.getElementById('orderModal');
  m.hidden = false;
  document.body.classList.add('has-modal');
  setTimeout(() => { const f = box.querySelector('input:not([type=hidden]), select'); if (f) f.focus(); }, 80);
}

function closeOrder() {
  document.getElementById('orderModal').hidden = true;
  document.body.classList.remove('has-modal');
}

/* ═══════════ поиск ═══════════ */

/* Ищем так, как товар называет клиент: «лисички», «сушеные», «боровик», «ягода».
   Поэтому ё сводим к е, слова сравниваем по основе, а к каждой партии
   приписываем синонимы вида и состояния. */

const SEARCH_STOP = new Set(['от', 'до', 'в', 'на', 'и', 'с', 'по', 'для', 'из', 'за', 'или', 'а']);

const KIND_WORDS = {
  mushroom: 'гриб грибы грибной грибная грибочки',
  berry: 'ягода ягоды ягодный ягодная',
  herb: 'трава травы травяной иван-чай сбор'
};

const STATE_WORDS = {
  fresh: 'свежая свежий свежее охлажденная',
  dry: 'сушеная сушеный сушеные сухая сушка вяленая',
  frozen: 'замороженная замороженный заморозка мороженая свежемороженая шоковая',
  salted: 'соленая соленый соление засолка соленья бочка',
  pureed: 'протертая перетертая пюре с сахаром'
};

const LOT_ALIAS = {
  'belyi-fresh': 'боровик белые грибы',
  'belyi-dry': 'боровик белые грибы',
  'gruzd-salted': 'грузди',
  'lisichka-fresh': 'лисички',
  'lisichka-dry': 'лисички',
  'lisichka-frozen': 'лисички',
  'smorchok': 'сморчки',
  'shapochka': 'сморчки шапочки',
  'klukva': 'клюквенная болотная',
  'brusnika': 'брусничная',
  'brusnika-pureed': 'брусничная',
  'moroshka': 'северная ягода',
  'zemlyanika': 'земляничная'
};

const VOL_WORDS = { mini: 'мини-опт от 20 кг небольшая партия', big: 'крупный опт от 500 кг тонна фура' };

const searchNorm = s => (s || '').toLowerCase().replace(/ё/g, 'е')
  .replace(/[^a-zа-я0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const searchStem = w => (w.length > 4 ? w.slice(0, Math.max(4, w.length - 2)) : w);

let SEARCH_INDEX = [];
function buildSearchIndex() {
  SEARCH_INDEX = LOTS.map(l => {
    const hay = [
      l.name, STATE_RU[l.state], stateLabel(l), KIND_WORDS[l.kind], STATE_WORDS[l.state], LOT_ALIAS[l.id],
      VOL_WORDS[l.minVol], l.spec, l.region, l.harvest, l.volume,
      (l.specs || []).map(p => p.join(' ')).join(' ')
    ].join(' ');
    return { lot: l, name: searchNorm(l.name).split(' '), hay: searchNorm(hay).split(' ') };
  });
}
buildSearchIndex();

function searchLots(q) {
  const words = searchNorm(q).split(' ').filter(w => w && !SEARCH_STOP.has(w));
  const terms = words.filter(w => w.length >= 2).map(searchStem);
  if (!terms.length) return [];

  const found = [];
  for (const entry of SEARCH_INDEX) {
    let score = 0, ok = true;
    for (const t of terms) {
      if (entry.name.some(w => w.startsWith(t))) score += 4;
      else if (entry.hay.some(w => w.startsWith(t))) score += 1;
      else { ok = false; break; }
    }
    if (!ok) continue;
    if (entry.lot.status === 'live') score += 0.5;
    found.push({ lot: entry.lot, score });
  }
  return found.sort((a, b) => b.score - a.score).map(x => x.lot);
}

const priceLabel = l => mode === 'opt'
  ? optLabel(l) + (tiersOf(l) ? '/кг' : '')
  : (l.retail ? money(l.retail) + ' ' + l.retailUnit : 'только оптом');

const SEARCH_TAGS = ['лисичка сушёная', 'белый гриб', 'ягода в заморозке', 'груздь солёный', 'морошка'];

function searchIdle() {
  return `<p class="search__hint">Спрашивайте как привыкли: название, вид или состояние</p>
    <div class="search__tags">
      ${SEARCH_TAGS.map(t => `<button class="search__tag" type="button" data-search-tag="${t}">${t}</button>`).join('')}
    </div>
    <a class="search__all" href="#/catalog" data-search-hit>Открыть весь каталог</a>`;
}

function runSearch(q) {
  const drop = document.getElementById('searchDrop');
  if (!drop) return;
  const query = q.trim();

  if (query.length < 2) { drop.innerHTML = searchIdle(); openSearchDrop(true); return; }

  const hits = searchLots(query);
  const shown = hits.slice(0, 6);

  drop.innerHTML = shown.length
    ? shown.map(l => `<a class="search__row" href="#/lot/${l.id}" data-search-hit>
        <img src="${Store.img(l.img)}" alt="">
        <span><b>${l.name}</b><span>${l.status === 'live' ? l.spec : 'партия закрыта ' + l.closed}</span></span>
        <span class="search__price${/^\d/.test(priceLabel(l)) ? ' search__price--num' : ''}">${priceLabel(l)}</span>
      </a>`).join('') +
      `<a class="search__all" href="#/catalog" data-search-all>${
        hits.length > shown.length ? `Показать все результаты: ${hits.length}` : 'Показать в каталоге'
      }</a>`
    : `<p class="search__empty">По запросу «${query}» ничего не нашли. Сезон меняется каждую неделю, позвоните и мы подскажем: <a href="${siteTel()}">${sitePhone()}</a></p>
       <a class="search__all" href="#/catalog" data-search-hit>Открыть весь каталог</a>`;
  openSearchDrop(true);
}

function openSearchDrop(on) {
  const drop = document.getElementById('searchDrop');
  if (drop) drop.hidden = !on;
}

function openSearch() {
  const box = document.getElementById('search');
  const input = document.getElementById('searchInput');
  if (!box || box.classList.contains('is-open')) return;
  box.classList.add('is-open');
  input.placeholder = input.dataset.phOpen || input.placeholder;
  runSearch(input.value);
}

function closeSearch(blur) {
  const box = document.getElementById('search');
  const input = document.getElementById('searchInput');
  if (!box) return;
  box.classList.remove('is-open');
  if (input) {
    input.placeholder = 'Поиск';
    if (blur) input.blur();
  }
  openSearchDrop(false);
}

/* Enter или «Найти»: переносим запрос в каталог, там он живёт как фильтр */
function searchToCatalog(q) {
  filters.q = (q || '').trim();
  if (filters.q) { filters.state = 'all'; filters.avail = 'all'; filters.vol = null; }
  closeSearch(true);
  renderCatalog();
  if (location.hash.replace('#', '') !== '/catalog') location.hash = '#/catalog';
}

/* ═══════════ чат с ИИ-консультантом (демо) ═══════════ */

function chatStockAnswer() {
  const live = LOTS.filter(l => l.status === 'live');
  const names = live.map(l => l.name.toLowerCase()).join(', ');
  return `Сейчас открыто партий: ${live.length}. ${names ? names.charAt(0).toUpperCase() + names.slice(1) + '.' : ''} Полный список с ценами — в разделе «Каталог».`;
}

const CHAT_QA = [
  { q: 'Что есть в наличии?', get a() { return chatStockAnswer(); } },
  { q: 'Чем сушёное лучше замороженного?', a: 'Сушёное хранится полтора года и едет обычной транспортной компанией без холода. Замороженное ближе к свежему по вкусу, но требует рефрижератора и морозильной камеры у вас. Для регионов почти всегда выгоднее сушёное.' },
  { q: 'Какой объём брать для ресторана?', a: 'Ресторану обычно хватает 20-50 кг свежего в неделю в сезон. Начните с пробной партии 20 кг: посмотрите отход и как гриб ведёт себя на кухне, потом зафиксируем регулярный объём.' },
  { q: 'Как оформляем сделку?', a: 'Работаем по счёту и договору поставки, оплата безналичная. Реквизиты есть в разделе «Контакты», счёт выставим в день заявки. Отгружаем после поступления оплаты или по согласованной отсрочке.' },
  { q: 'Доставите в другой город?', a: 'Да. Сушёное и замороженное отправляем транспортной компанией по всей России. Свежую лисичку тоже возим: она не червивеет и переносит двое суток дороги.' }
];

function chatSay(text, who) {
  const body = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = 'chat__msg chat__msg--' + who;
  div.textContent = text;
  body.appendChild(div);
  // длинный ответ читается с начала: прокручиваем к его верху, а не к низу
  body.scrollTop = who === 'bot' ? Math.max(0, div.offsetTop - body.offsetTop - 8) : body.scrollHeight;
}

function chatAnswer(question) {
  const q = question.toLowerCase();
  const hit = CHAT_QA.find(x => x.q.toLowerCase() === q)
    || CHAT_QA.find(x => q.split(' ').some(w => w.length > 4 && x.q.toLowerCase().includes(w)))
    || CHAT_QA.find(x => (q.includes('налич') && x.q.includes('наличии')) || ((q.includes('счёт') || q.includes('счет') || q.includes('договор') || q.includes('оплат')) && x.q.includes('сделку'))
      || (q.includes('достав') && x.q.includes('Доставите')) || (q.includes('объ') && x.q.includes('объём')));
  setTimeout(() => {
    chatSay(hit ? hit.a : 'В прототипе я отвечаю на подготовленные вопросы. В рабочей версии здесь будет живой помощник с базой знаний по товарам и ценам. Пока могу передать вопрос менеджеру: ' + sitePhone() + '.', 'bot');
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
  let raw = location.hash.replace(/^#/, '');
  // Telegram отдаёт мини-аппу свои параметры в hash (#tgWebAppData=...).
  // Для роутера это не маршрут: без сброса ни один экран не станет активным,
  // и в боте открывается пустая страница с одним подвалом.
  if (raw.startsWith('tgWebApp')) raw = '';
  const path = raw || '/';
  if (!path.startsWith('/')) return;  // якорь внутри страницы

  const isLot = path.startsWith('/lot') && path !== '/lk';
  if (isLot) renderProduct(path.split('/')[2] || 'lisichka-dry');
  if (path === '/lk') renderLk();

  let hit = null;
  document.querySelectorAll('.screen').forEach(s => {
    const on = isLot ? s.dataset.route === '/lot' : s.dataset.route === path;
    s.classList.toggle('is-active', on);
    if (on) hit = s;
  });
  // неизвестный адрес: честная страница «не нашлось», а не молчаливая главная
  if (!hit) {
    const nf = document.querySelector('[data-route="/404"]');
    if (nf) nf.classList.add('is-active');
    else document.querySelector('[data-route="/"]').classList.add('is-active');
  }

  document.querySelectorAll('.mast__nav a').forEach(a => {
    if (a.getAttribute('href') === '#' + path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (drop) { drop.open = false; dropByHover = false; }
  closeSearch(false);
  closeOrder();

  window.scrollTo({ top: 0, behavior: 'instant' });
  observeReveals();
  observeFigures();
  requestAnimationFrame(() => document.querySelectorAll('[data-rail-box]').forEach(setupRail));
}

/* ═══════════ события ═══════════ */

document.addEventListener('click', e => {

  // заказ партии: попап вместо ухода на другую страницу
  const orderBtn = e.target.closest('[data-order]');
  if (orderBtn) { openOrder(orderBtn.dataset.order); return; }
  if (e.target.closest('[data-modal-close]') || e.target === document.getElementById('orderModal')) { closeOrder(); return; }

  // кабинет
  const fill = e.target.closest('[data-fill-email]');
  if (fill) {
    const inp = document.querySelector('[data-form="lk-in"] [name="email"]');
    if (inp) { inp.value = fill.dataset.fillEmail; inp.focus(); }
    return;
  }
  if (e.target.closest('[data-lk-out]')) {
    setSession('');
    syncMode();
    refreshLkLink();
    renderAll();
    renderLk();
    toast('Вы вышли из кабинета');
    return;
  }

  // прокрутка к блоку внутри страницы, не трогая адрес: иначе маршрут потеряет партию
  const scrollBtn = e.target.closest('[data-scroll]');
  if (scrollBtn) {
    const target = document.getElementById(scrollBtn.dataset.scroll);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
      const first = target.querySelector('input, select');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), reduced() ? 0 : 500);
    }
    return;
  }

  // поиск
  const tagBtn = e.target.closest('[data-search-tag]');
  if (tagBtn) {
    const input = document.getElementById('searchInput');
    input.value = tagBtn.dataset.searchTag;
    input.focus();
    runSearch(input.value);
    return;
  }
  if (e.target.closest('[data-search-all]')) {
    e.preventDefault();
    searchToCatalog(document.getElementById('searchInput').value);
    return;
  }
  if (e.target.closest('[data-search-hit]')) { closeSearch(true); return; }
  if (e.target.closest('#searchClose')) { closeSearch(true); return; }

  // каталог: быстрые наборы
  const preset = e.target.closest('[data-preset]');
  if (preset) { applyPreset(preset.dataset.preset); return; }

  // каталог: шторка фильтров
  if (e.target.closest('#filtersOpen')) {
    document.getElementById('fsheet').hidden = false;
    document.body.classList.add('has-modal');
    return;
  }
  if (e.target.closest('[data-fsheet-close]') || e.target === document.getElementById('fsheet')) {
    document.getElementById('fsheet').hidden = true;
    document.body.classList.remove('has-modal');
    return;
  }

  // каталог: сортировка своим списком вместо системного
  if (e.target.closest('#sortBtn')) {
    const m = document.getElementById('sortMenu');
    m.hidden = !m.hidden;
    document.getElementById('sortBtn').setAttribute('aria-expanded', String(!m.hidden));
    return;
  }
  const sortPick = e.target.closest('[data-sort]');
  if (sortPick) {
    filters.sort = sortPick.dataset.sort;
    document.getElementById('sortMenu').hidden = true;
    document.getElementById('sortBtn').setAttribute('aria-expanded', 'false');
    renderCatalog();
    return;
  }
  if (!e.target.closest('#sortDrop')) {
    const m = document.getElementById('sortMenu');
    if (m && !m.hidden) { m.hidden = true; document.getElementById('sortBtn').setAttribute('aria-expanded', 'false'); }
  }

  // каталог: раскрыть ветку, не переключая категорию
  const chev = e.target.closest('.catnav__chev');
  if (chev) {
    const kind = chev.closest('.catnav__group').dataset.group;
    openKinds.has(kind) ? openKinds.delete(kind) : openKinds.add(kind);
    renderCatalog();
    return;
  }

  // каталог: категория
  const catBtn = e.target.closest('[data-cat]');
  if (catBtn) { filters.cat = catBtn.dataset.cat; filters.state = 'all'; filters.q = ''; renderCatalog(); return; }

  // каталог: состояние
  const stBtn = e.target.closest('.catnav__sub [data-state]');
  if (stBtn) { filters.state = stBtn.dataset.state; renderCatalog(); return; }

  // каталог: фильтры
  const fBtn = e.target.closest('[data-filter]');
  if (fBtn) {
    const key = fBtn.dataset.filter, val = fBtn.dataset.value;
    if (key === 'avail') filters.avail = filters.avail === 'all' ? 'live' : 'all';
    else filters[key] = filters[key] === val ? null : val;   // повторный тап снимает
    renderCatalog();
    return;
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    const k = chip.dataset.chip;
    if (k === 'q') { filters.q = ''; filters.avail = 'live'; document.getElementById('searchInput').value = ''; }
    if (k === 'state') filters.state = 'all';
    if (k === 'avail') filters.avail = 'live';
    if (k === 'vol') filters.vol = null;
    if (k === 'region') filters.region = null;
    if (k === 'retail') filters.retail = null;
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
    persistUI();
    add.textContent = 'В корзине';
    add.dataset.state = 'ok';
    setTimeout(() => { add.textContent = 'В корзину'; delete add.dataset.state; }, 1400);
    renderCart();
    const added = LOTS.find(l => l.id === id);
    toast(`${added ? added.name : 'Товар'} в корзине, всего позиций: ${cart.size}`);
    return;
  }
  const qty = e.target.closest('[data-qty]');
  if (qty) {
    const id = qty.dataset.id;
    const next = (cart.get(id) || 0) + Number(qty.dataset.qty);
    if (next <= 0) cart.delete(id); else cart.set(id, next);
    persistUI();
    renderCart();
    return;
  }
  // убрать позицию целиком, а не жать «−» до нуля
  const del = e.target.closest('[data-del]');
  if (del) {
    const id = del.dataset.del;
    const gone = LOTS.find(l => l.id === id);
    const wasQty = cart.get(id) || 0;
    cart.delete(id);
    persistUI();
    renderCart();
    toast(`${gone ? gone.name : 'Позиция'} убрана из корзины`, false, {
      label: 'Вернуть',
      run: () => { cart.set(id, wasQty); persistUI(); renderCart(); }
    });
    return;
  }

  // hero-слайдер
  // слайдер баннеров: точки и стрелки крутят один и тот же переключатель
  const dot = e.target.closest('[data-dot]');
  if (dot) { setHeroSlide(Number(dot.dataset.dot)); return; }
  const heroNav = e.target.closest('[data-hero]');
  if (heroNav) {
    const total = document.querySelectorAll('.hero__slide').length;
    const cur = [...document.querySelectorAll('.hero__slide')].findIndex(sl => sl.classList.contains('is-on'));
    setHeroSlide((cur + Number(heroNav.dataset.hero) + total) % total);
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
    document.getElementById('galMain').src = Store.img(shot.dataset.shot);
    shot.closest('.pgal__thumbs').querySelectorAll('[data-shot]').forEach(b => b.setAttribute('aria-pressed', String(b === shot)));
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
    chatSay('Передал вопрос менеджеру. Ответ придёт в Telegram, или мы перезвоним: ' + sitePhone() + '.', 'bot');
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
  if (!e.target.closest('#search')) closeSearch(false);
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
  if (e.target.id === 'showClosed') { filters.avail = e.target.checked ? 'all' : 'live'; renderCatalog(); return; }

  // количество можно вписать руками: набирать «+» двадцать раз никто не станет
  const qin = e.target.closest('[data-qtyin]');
  if (qin) {
    const id = qin.dataset.qtyin;
    const n = Math.min(999, Math.max(0, parseInt(String(qin.value).replace(/\D/g, ''), 10) || 0));
    if (n <= 0) cart.delete(id); else cart.set(id, n);
    persistUI();
    renderCart();
    return;
  }
});

document.addEventListener('focusin', e => {
  if (e.target.id === 'searchInput') openSearch();
});

document.addEventListener('focusout', e => {
  // уводим фокус с клавиатуры за пределы поиска: сворачиваем строку обратно.
  // Клик мимо закрывает отдельный обработчик, иначе выдача пропадёт до click.
  if (!e.target.closest('#search')) return;
  const to = e.relatedTarget;
  if (to && !to.closest('#search')) closeSearch(false);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'chatInput') {
    if (e.target.value.trim()) { chatSay(e.target.value, 'me'); chatAnswer(e.target.value); e.target.value = ''; }
  }

  // стрелками ходим по подсказкам поиска, не трогая мышь
  if (e.target.closest('#search') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const rows = [...document.querySelectorAll('#searchDrop .search__row')];
    if (rows.length) {
      e.preventDefault();
      const at = rows.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown'
        ? (at + 1) % rows.length
        : (at <= 0 ? rows.length - 1 : at - 1);
      rows[next].focus();
    }
  }

  if (e.key === 'Escape') {
    document.getElementById('chat').hidden = true;
    closeSearch(true);
  }
});

document.addEventListener('submit', e => {
  if (e.target.id === 'searchForm') {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;
    const hits = searchLots(q);
    // одно попадание ведём сразу в карточку, иначе показываем выдачу в каталоге
    if (hits.length === 1) { closeSearch(true); location.hash = '#/lot/' + hits[0].id; }
    else searchToCatalog(q);
    return;
  }

  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();

  // ── кабинет: вход ──
  if (form.dataset.form === 'lk-in') {
    const field = form.querySelector('.field');
    const mail = form.querySelector('[name="email"]').value.trim().toLowerCase();
    const found = accounts().find(a => String(a.email).toLowerCase() === mail);
    if (!/^\S+@\S+\.\S+$/.test(mail)) { field.dataset.invalid = 'true'; return; }
    field.dataset.invalid = 'false';
    if (!found) { toast('Такой почты у нас нет. Зарегистрируйтесь, это займёт минуту.', true); return; }
    setSession(found.email);
    syncMode(); refreshLkLink(); renderAll(); renderLk();
    toast(found.status === 'approved' ? 'Готово, оптовые цены открыты' : 'Заявка ещё на рассмотрении');
    return;
  }

  // ── кабинет: регистрация ──
  if (form.dataset.form === 'lk-up') {
    let ok = true;
    form.querySelectorAll('[required]').forEach(inp => {
      const bad = !inp.value.trim() || (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value));
      inp.closest('.field').dataset.invalid = String(bad);
      if (bad && ok) { inp.focus(); ok = false; }
    });
    if (!ok) return;
    const mail = form.querySelector('[name="email"]').value.trim();
    const list = accounts();
    if (list.some(a => String(a.email).toLowerCase() === mail.toLowerCase())) {
      toast('На эту почту доступ уже запрашивали. Войдите по ней же.', true);
      return;
    }
    const d = new Date();
    list.unshift({
      id: 'a-' + Date.now(),
      email: mail,
      company: form.querySelector('[name="company"]').value.trim(),
      name: form.querySelector('[name="name"]').value.trim(),
      phone: form.querySelector('[name="phone"]').value.trim(),
      status: 'pending',
      at: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    });
    Store.save('accounts', list);
    setSession(mail);
    syncMode(); refreshLkLink(); renderLk();
    toast('Заявка отправлена, подтвердим в рабочее время');
    return;
  }

  // ── розничный заказ из корзины ──
  // отдельно от 'order': та форма живёт в попапе, спрашивает объём в кг
  // и пишет ответ в тело модалки, а здесь ни попапа, ни поля qty нет
  if (form.dataset.form === 'cart') {
    let ok = true;
    form.querySelectorAll('[required]').forEach(inp => {
      const bad = !inp.value.trim();
      inp.closest('.field').dataset.invalid = String(bad);
      if (bad && ok) { inp.focus(); ok = false; }
    });
    if (!ok) return;

    const lines = cartLines();
    if (!lines.length) return;
    const sum = lines.reduce((a, x) => a + x.lot.retail * x.qty, 0);
    const num = 'Л-' + String(Date.now()).slice(-5);
    const ship = form.querySelector('[name="ship"]');
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();

    // заказ виден в админке: для клиента это и есть доказательство, что цепочка замкнута
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const list = Store.load('leads');
    if (Array.isArray(list)) {
      list.unshift({
        id: 'l-' + Date.now(),
        date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        name, phone,
        qty: money(sum),
        lot: lines.map(x => `${x.lot.name} × ${x.qty} ${retailPack(x.lot)}`).join(', '),
        who: 'Розничный заказ',
        status: 'new'
      });
      Store.save('leads', list);
    }

    const rows = lines.map(x =>
      `<li><span>${esc(x.lot.name)}</span><b class="num">${x.qty} ${retailPack(x.lot)}</b></li>`).join('');

    cart.clear();
    persistUI();
    renderCart();

    document.getElementById('cartBody').innerHTML = `
      <div class="cdone">
        <p class="cdone__tag">Заказ ${num} принят</p>
        <h2>Спасибо, ${esc(name)}. Перезвоним и подтвердим.</h2>
        <p class="cdone__lede">Наберём по номеру ${esc(phone)} в рабочее время, подтвердим наличие
           и назовём стоимость доставки. Платить — после этого.</p>
        <ul class="cdone__list">${rows}
          <li class="cdone__sum"><span>Итого за товар</span><b class="num">${money(sum)}</b></li>
        </ul>
        <p class="cdone__ship">Как получить: ${esc(ship ? ship.options[ship.selectedIndex].text : '')}</p>
        <div class="btn-row">
          <a class="btn btn--solid" href="${siteTel()}">Позвонить самим: ${sitePhone()}</a>
          <a class="btn" href="#/catalog">Вернуться в каталог</a>
        </div>
      </div>
      ${CART_OPT_BAND}`;
    return;
  }

  // ── заказ из попапа ──
  if (form.dataset.form === 'order') {
    let ok = true;
    form.querySelectorAll('[required]').forEach(inp => {
      const bad = !inp.value.trim();
      inp.closest('.field').dataset.invalid = String(bad);
      if (bad && ok) { inp.focus(); ok = false; }
    });
    if (!ok) return;
    const lotName = form.querySelector('[name="lot"]');
    const qty = form.querySelector('[name="qty"]').value.trim();
    const num = 'Л-' + String(Date.now()).slice(-5);
    document.getElementById('orderBody').innerHTML =
      `<h2 id="orderTitle">Заявка №${num} принята</h2>
       <p class="modal__sub">${esc(lotName ? (lotName.tagName === 'SELECT' ? lotName.options[lotName.selectedIndex].text : lotName.value) : '')}, ${esc(qty)} кг.
       Перезвоним сегодня до 20:00 и назовём цену под ваш объём.</p>
       <div class="btn-row"><a class="btn btn--solid" href="${siteTel()}">Позвонить самому</a>
       <button class="btn" type="button" data-modal-close>Закрыть</button></div>`;
    return;
  }


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
  const kind = form.dataset.form;
  btn.textContent = kind === 'sub' ? 'Готово' : 'Отправлено';
  btn.dataset.state = 'ok';
  btn.disabled = true;
  form.reset();
  setTimeout(() => { btn.textContent = was; delete btn.dataset.state; btn.disabled = false; }, 2600);

  // подтверждение не исчезает: номер обращения и что будет дальше остаются перед глазами
  let okBox = form.querySelector('.form-ok');
  if (!okBox) {
    okBox = document.createElement('p');
    okBox.className = 'form-ok';
    okBox.setAttribute('role', 'status');
    form.appendChild(okBox);
  }
  const num = 'Л-' + String(Date.now()).slice(-5);
  okBox.innerHTML = kind === 'eco'
    ? `Записали. Напишем, когда соберём ближайшую группу, и расскажем условия. Если хотите обсудить сразу: <a href="${siteTel()}">${sitePhone()}</a>.`
    : kind === 'sub'
    ? 'Готово. Первый прайс придёт в ближайший понедельник утром. Отписаться можно в одно нажатие из любого письма.'
    : `Заявка №${num} принята. Перезвоним сегодня до 20:00. Если срочно: <a href="${siteTel()}">${sitePhone()}</a>.`;
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

/* ═══════════ строки из админки ═══════════
   Телефон, заголовок баннера и реквизиты правятся в одном месте, а на сайте
   встречаются в десятке. Подставляем их по разметке, а не копированием. */

function applyTexts() {
  const t = TEXTS;
  document.querySelectorAll('[data-text]').forEach(el => {
    const key = el.dataset.text;
    if (!(key in t)) return;
    const v = t[key];
    // очищенное в админке поле реально очищается: плашка акции прячется, реквизит показывает прочерк
    if (key === 'heroPromo') { el.hidden = !v; if (v) el.textContent = v; return; }
    el.textContent = v === '' ? '—' : v;
  });
  if (t.phone) {
    const digits = '+7' + t.phone.replace(/\D/g, '').replace(/^[78]/, '');
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      a.setAttribute('href', 'tel:' + digits);
      const target = a.querySelector('b') || a;
      if (/[\d\s\-()]{7,}/.test(target.textContent) && !target.querySelector('*')) {
        target.textContent = target.textContent.replace(/8[\s\d\-()]{9,}/, t.phone);
      }
    });
  }
}

/* правка в соседней вкладке админки: перечитываем данные и перерисовываем сайт */
Store.subscribe(() => {
  loadData(true);
  applyTexts();
  renderAll();
});

window.addEventListener('hashchange', route);
applyTexts();
refreshLkLink();
renderAll();
route();
