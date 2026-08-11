/* Лесник v4 · логика прототипа
   Данные партий из Telegram-канала клиента (июнь-август 2026).
   Розничные цены с пометкой demo заглушки для прохода по сценарию. */

/* Данные партий и категорий приходят из слоя хранения (store.js).
   Сейчас это localStorage с исходными данными из seed.js, в боевой версии
   тот же слой читает content/*.json, которые пишет админка. */
const LOTS = Store.load('lots');
const CATS = Store.load('categories');

const STATE_RU = CATS.states.reduce((m, s) => (m[s.id] = s.name, m), {});
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
      ? `<a class="btn btn--soft btn--full" href="#/lot/${lot.id}">Запросить цену</a>`
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

  const total = filters.q ? searchLots(filters.q).length : LOTS.filter(l => l.kind === filters.cat).length;
  const counter = document.getElementById('catCounter');
  if (counter) counter.textContent = filters.q
    ? `По запросу «${filters.q}» нашли ${total}`
    : `Показано ${list.length} из ${total}`;

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

  // «по запросу» не число: крупный моношрифт оставляем настоящим ценам
  const ask = mode !== 'retail' && !/^\d/.test(lot.opt);
  const priceBlock = mode === 'retail' && lot.retail
    ? `<p class="buy__price">${money(lot.retail)}<small>${lot.retailUnit}${lot.demo ? ', цена демонстрационная' : ''}</small></p>`
    : ask
      ? `<p class="buy__price buy__price--ask">Цена по объёму<small>${live ? 'считаем под партию, опт от 20 кг' : 'партия закрыта, цену следующей скажем при брони'}</small></p>`
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
    ? `<button class="btn btn--solid btn--full btn--lg" type="button" data-scroll="buyForm">Бронь следующего сбора</button>`
    : (mode === 'retail' && lot.retail
        ? `<button class="btn btn--solid btn--full btn--lg" type="button" data-add="${lot.id}">В корзину</button>`
        : `<button class="btn btn--solid btn--full btn--lg" type="button" data-scroll="buyForm">Запросить цену на объём</button>`);

  // у закрытой партии отгружать нечего: подписи под кнопкой берём про следующий сбор
  const nextHarvest = (lot.specs.find(([k]) => k === 'Следующий сбор') || lot.specs.find(([k]) => k === 'Сезон') || [])[1];
  const facts = live
    ? ['Отгрузка 1-2 рабочих дня', 'Самовывоз в Москве или доставка', 'Нал, безнал, счёт для юрлиц']
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
          <span class="tag ${live ? 'tag--live' : 'tag--closed'}">${live ? 'партия открыта' : 'партия закрыта'}</span>
          <h1>${lot.name}</h1>
          <p class="buy__meta">${lot.region} · ${lot.harvest}</p>
          ${priceBlock}
          ${tiers}
          ${stockBlock}
          <div class="buy__act">${action}</div>
          <a class="buy__tel" href="tel:+79324748383">Или позвоните: <b>8 932 474-83-83</b></a>
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
        <div class="pfacts">
          <div><b>Самовывоз</b><span>Склад в Москве, в день оплаты</span></div>
          <div><b>По Москве</b><span>От 300 кг без доплаты</span></div>
          <div><b>В регионы</b><span>Транспортной компанией</span></div>
          <div><b>Оплата</b><span>Нал, безнал, счёт юрлицу</span></div>
        </div>
      </section>
    </div>

    <section class="pband" id="buyForm">
      <div class="pband__head">
        <h2>${live ? 'Запросить цену на объём' : 'Забронировать следующий сбор'}</h2>
        <p class="pband__lede">${live
          ? 'Цена на партию зависит от объёма. Назовите, сколько нужно, и мы посчитаем под вас.'
          : 'Партия ушла, но сбор повторится. Оставьте объём, и мы напишем, как только он откроется.'}</p>
        <ul class="pband__facts">
          <li>Отвечаем в тот же день, в сезон включая выходные</li>
          <li>Считаем цену под ваш объём, от 20 кг</li>
          <li>Скажем сразу, если в этом сборе объёма нет</li>
        </ul>
      </div>
      <form class="buyform" data-form="lot" novalidate>
        <label class="field"><span>Сколько нужно, кг</span><input name="qty" type="number" min="1" placeholder="200" required><em class="err">Укажите объём в килограммах</em></label>
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

const SEARCH_INDEX = LOTS.map(l => {
  const hay = [
    l.name, STATE_RU[l.state], KIND_WORDS[l.kind], STATE_WORDS[l.state], LOT_ALIAS[l.id],
    VOL_WORDS[l.minVol], l.spec, l.region, l.harvest, l.volume,
    (l.specs || []).map(p => p.join(' ')).join(' ')
  ].join(' ');
  return { lot: l, name: searchNorm(l.name).split(' '), hay: searchNorm(hay).split(' ') };
});

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
  ? l.opt
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
    : `<p class="search__empty">По запросу «${query}» ничего не нашли. Сезон меняется каждую неделю, позвоните и мы подскажем: <a href="tel:+79324748383">8 932 474-83-83</a></p>
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
    input.placeholder = 'Поиск по каталогу';
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

const CHAT_QA = [
  { q: 'Что есть в наличии?', a: 'Сейчас открыто шесть партий: лисичка свежая, сушёная и замороженная, белый гриб свежий и сушёный, груздь солёный. Из ягод есть клюква и брусника в заморозке. Открыть каталог целиком: раздел «Каталог».' },
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
  body.scrollTop = body.scrollHeight;
}

function chatAnswer(question) {
  const q = question.toLowerCase();
  const hit = CHAT_QA.find(x => x.q.toLowerCase() === q)
    || CHAT_QA.find(x => q.split(' ').some(w => w.length > 4 && x.q.toLowerCase().includes(w)))
    || CHAT_QA.find(x => (q.includes('налич') && x.q.includes('наличии')) || ((q.includes('счёт') || q.includes('счет') || q.includes('договор') || q.includes('оплат')) && x.q.includes('сделку'))
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
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    renderAll();
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

/* ═══════════ строки из админки ═══════════
   Телефон, заголовок баннера и реквизиты правятся в одном месте, а на сайте
   встречаются в десятке. Подставляем их по разметке, а не копированием. */

function applyTexts() {
  const t = Store.load('texts') || {};
  document.querySelectorAll('[data-text]').forEach(el => {
    const v = t[el.dataset.text];
    if (v === undefined || v === null || v === '') return;
    el.textContent = v;
    if (el.dataset.text === 'heroPromo') el.hidden = false;
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

window.addEventListener('hashchange', route);
applyTexts();
renderAll();
route();
