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

/* корзина и режим цен переживают перезагрузку: покупатель не теряет набранное */
let mode = 'opt';
const cart = new Map();
try {
  const savedMode = localStorage.getItem('lesnik.ui.mode');
  if (savedMode === 'retail') mode = 'retail';
  const savedCart = JSON.parse(localStorage.getItem('lesnik.ui.cart') || '[]');
  savedCart.forEach(([id, qty]) => { if (typeof id === 'string' && qty > 0) cart.set(id, qty); });
} catch (e) {}

function persistUI() {
  try {
    localStorage.setItem('lesnik.ui.mode', mode);
    localStorage.setItem('lesnik.ui.cart', JSON.stringify([...cart.entries()]));
  } catch (e) {}
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

const filters = { cat: 'mushroom', state: 'all', avail: 'live', vol: null, sort: 'default', q: '' };

function catalogList() {
  // поиск идёт поверх категорий: клиент ищет «морошку», а не «ягоды → морошка»
  let list = filters.q ? searchLots(filters.q) : LOTS.filter(l => l.kind === filters.cat);
  if (filters.state !== 'all') list = list.filter(l => l.state === filters.state);
  if (filters.avail === 'live') list = list.filter(l => l.status === 'live');
  if (filters.vol) list = list.filter(l => l.minVol === filters.vol);
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
  box.innerHTML = CATS.kinds.map(k => {
    const inKind = LOTS.filter(l => l.kind === k.id);
    const states = CATS.states.filter(s => inKind.some(l => l.state === s.id));
    const sub = inKind.length
      ? `<li><button type="button" data-state="all">Все <span class="catnav__count">${inKind.length}</span></button></li>` +
        states.map(s => `<li><button type="button" data-state="${s.id}">${statePlural(s)} <span class="catnav__count">${inKind.filter(l => l.state === s.id).length}</span></button></li>`).join('')
      : `<li><p class="catnav__soon">Категория готовится. Оставьте заявку, сообщим когда откроем сбор.</p></li>`;
    return `<li class="catnav__group" data-group="${k.id}">
      <button class="catnav__head" type="button" data-cat="${k.id}">${k.name} <span class="catnav__count">${inKind.length}</span></button>
      <ul class="catnav__sub" hidden>${sub}</ul>
    </li>`;
  }).join('');
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

  const inKind = LOTS.filter(l => l.kind === filters.cat);
  const total = filters.q ? searchLots(filters.q).length : inKind.length;
  const hiddenClosed = !filters.q && filters.avail === 'live' ? inKind.filter(l => l.status === 'closed').length : 0;
  const counter = document.getElementById('catCounter');
  if (counter) counter.textContent = filters.q
    ? `По запросу «${filters.q}» нашли ${total}`
    : mode === 'retail'
      ? `Показано ${list.length}, в розницу из них ${list.filter(l => l.retail).length}`
      : `Показано ${list.length} из ${total}${hiddenClosed ? `, ${hiddenClosed} в архиве закрытых` : ''}`;

  // активная группа и подпункт
  document.querySelectorAll('.catnav__group').forEach(g => {
    const on = !filters.q && g.dataset.group === filters.cat;
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
    if (filters.q) active.push({ k: 'q', label: `Поиск: ${filters.q}` });
    if (filters.state !== 'all') active.push({ k: 'state', label: STATE_RU[filters.state] || filters.state });
    if (filters.avail === 'all' && !filters.q) active.push({ k: 'avail', label: 'включая закрытые' });
    if (filters.vol) active.push({ k: 'vol', label: filters.vol === 'mini' ? 'мини-опт от 20 кг' : 'опт от 500 кг' });
    chips.innerHTML = active.length
      ? active.map(a => `<button class="chip" type="button" data-chip="${a.k}">${a.label}<span aria-hidden="true">×</span><span class="sr-only">убрать фильтр</span></button>`).join('') +
        `<button class="chips__reset" type="button" data-reset-filters>Сбросить всё</button>`
      : '';
  }
}

function resetFilters() {
  filters.state = 'all'; filters.avail = 'live'; filters.vol = null; filters.sort = 'default'; filters.q = '';
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
    <td>${stateLabel(l)}</td>
    <td class="n">${l.status === 'live' ? fmt(l.stock) + ' кг' : l.volume}</td>
    <td class="n">${optLabel(l)}${tiersOf(l) ? ` <small>от ${fmt(minKg(l))} кг</small>` : ''}</td>
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

function renderCart() {
  const count = [...cart.values()].reduce((a, b) => a + b, 0);
  const link = document.getElementById('cartlink');
  document.getElementById('cartcount').textContent = count;
  link.hidden = count === 0;

  const box = document.getElementById('cartBody');
  if (!box) return;
  // пустой корзине не нужна форма оформления с активной кнопкой
  const checkout = document.getElementById('cartCheckout');
  if (checkout) checkout.hidden = !cart.size;
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
      <img src="${Store.img(lot.img)}" alt="${lot.alt}">
      <div><strong>${lot.name}</strong><br><span class="lot__spec">${money(lot.retail)} ${lot.retailUnit} × ${qty} ${lot.retailUnit.indexOf('100 г') !== -1 ? 'уп. по 100 г' : 'кг'}</span></div>
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

/* «Цифры сезона» считаются из партий, а не живут константами в разметке */
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
  const figs = box.querySelectorAll('.fig');
  if (figs.length < 3) return;

  const ring = figs[0].querySelector('[data-ring]');
  ring.dataset.ring = String(Math.round(share * 100) / 100);
  figs[0].querySelector('[data-count]').dataset.count = String(closedKg);
  figs[0].querySelector('.fig__val').innerHTML = `<span data-count="${closedKg}">0</span> кг`;
  figs[0].querySelector('.fig__cap').textContent = `отгружено за сезон, ${Math.round(share * 100)}% заявленного объёма`;

  const dots = figs[1].querySelector('[data-dots]');
  dots.dataset.dots = String(species);
  dots.innerHTML = Array.from({ length: species }, () => '<span class="on"></span>').join('');
  figs[1].querySelector('.fig__val').innerHTML = `<span data-count="${species}">0</span>`;

  const bar = figs[2].querySelector('[data-bar]');
  bar.dataset.bar = String(Math.max(4, Math.round(minOrder / 500 * 100)));
  figs[2].querySelector('.fig__val').innerHTML = `<span data-count="${minOrder}">0</span> кг`;
}

function renderAll() {
  const live = LOTS.filter(l => l.status === 'live');
  const closed = LOTS.filter(l => l.status === 'closed');

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
function toast(msg) {
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
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
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
    persistUI();
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    renderAll();
    toast(mode === 'retail'
      ? `Розничные цены: в розницу доступно ${LOTS.filter(l => l.retail && l.status === 'live').length} позиций`
      : 'Оптовые цены: лесенка от объёма в каждой карточке');
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
    filters[key] = (key === 'vol' && filters.vol === val) ? null : val;
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
  if (e.target.id === 'sortSel') { filters.sort = e.target.value; renderCatalog(); }
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
  okBox.innerHTML = kind === 'sub'
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
// восстановленный из localStorage режим цен должен отразиться и на переключателе
document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
applyTexts();
renderAll();
route();
