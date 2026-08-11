/* tasteskill rebuild, family: Forest trade-desk
   Данные партий взяты из Telegram-канала клиента (июнь-август 2026).
   Розничные цены с пометкой demo:true заглушки для прохода по сценарию. */

const LOTS = [
  { id: 'lisichka-fresh', name: 'Лисичка свежая', kind: 'mushroom', state: 'fresh',
    img: 'img/lisichka.jpg', alt: 'Свежие лисички',
    spec: 'Свердловская область, сбор ежедневно', volume: 'отгрузка партиями',
    opt: 'по запросу', retail: null, status: 'live' },

  { id: 'lisichka-dry', name: 'Лисичка сушёная', kind: 'mushroom', state: 'dry',
    img: 'img/sushenye.jpg', alt: 'Сушёные лесные грибы',
    spec: 'Урожай 2026, влажность до 12 %', volume: 'мешок 10 кг',
    opt: 'по запросу', retail: 690, retailUnit: 'за 100 г', demo: true, status: 'live' },

  { id: 'belyi-fresh', name: 'Белый гриб свежий', kind: 'mushroom', state: 'fresh',
    img: 'img/belyi.jpg', alt: 'Белые грибы',
    spec: 'Первый сорт, калиброванный', volume: 'ящик 10 кг',
    opt: 'по запросу', retail: null, status: 'live' },

  { id: 'belyi-dry', name: 'Белый гриб сушёный', kind: 'mushroom', state: 'dry',
    img: 'img/sushenye.jpg', alt: 'Сушёный белый гриб',
    spec: 'Урожай 2026, шляпка целая', volume: 'мешок 5 кг',
    opt: 'по запросу', retail: 1190, retailUnit: 'за 100 г', demo: true, status: 'live' },

  { id: 'smorchok', name: 'Сморчок конический', kind: 'mushroom', state: 'fresh',
    img: 'img/smorchok.jpg', alt: 'Сморчок конический',
    spec: 'Партия 8 кг, сбор май', volume: '8 кг',
    opt: '10 000 ₽', retail: null, status: 'closed', closed: '02.07' },

  { id: 'shapochka', name: 'Сморчковая шапочка', kind: 'mushroom', state: 'frozen',
    img: 'img/smorchok.jpg', alt: 'Сморчковая шапочка',
    spec: 'Заморозка, партия 3 000 кг', volume: '3 000 кг',
    opt: '320 ₽', retail: null, status: 'closed', closed: '28.06' },

  { id: 'moroshka', name: 'Морошка', kind: 'berry', state: 'fresh',
    img: 'img/moroshka.jpg', alt: 'Морошка',
    spec: 'Партия 4 000 кг, сбор июль', volume: '4 000 кг',
    opt: 'по запросу', retail: null, status: 'closed', closed: '18.07' },

  { id: 'klukva', name: 'Клюква замороженная', kind: 'berry', state: 'frozen',
    img: 'img/klukva.jpg', alt: 'Клюква',
    spec: 'Шоковая заморозка, без листа', volume: 'короб 10 кг',
    opt: 'по запросу', retail: 490, retailUnit: 'за 1 кг', demo: true, status: 'live' },

  { id: 'brusnika', name: 'Брусника замороженная', kind: 'berry', state: 'frozen',
    img: 'img/brusnika.jpg', alt: 'Брусника',
    spec: 'Шоковая заморозка, без листа', volume: 'короб 10 кг',
    opt: 'по запросу', retail: 590, retailUnit: 'за 1 кг', demo: true, status: 'live' },

  { id: 'zemlyanika', name: 'Земляника лесная', kind: 'berry', state: 'fresh',
    img: 'img/zemlyanika.jpg', alt: 'Лесная земляника',
    spec: 'Сбор июнь, только опт', volume: 'по факту сбора',
    opt: 'по запросу', retail: null, status: 'closed', closed: '06.06' }
];

const money = n => n.toLocaleString('ru-RU') + ' ₽';
let mode = 'opt';
const cart = new Map();

/* ── карточка партии ───────────────────────────────────────── */

function card(lot, opts = {}) {
  const live = lot.status === 'live';
  const tag = opts.tags
    ? (live ? '<span class="tag tag--live">в наличии</span>'
            : `<span class="tag tag--closed">закрыта ${lot.closed}</span>`)
    : '';

  let price, action;
  if (mode === 'opt') {
    price = `${lot.opt}<br><small>опт, ${lot.volume}</small>`;
    action = live
      ? `<a class="btn btn--full" href="#/lot">Запросить цену</a>`
      : `<a class="btn btn--full" href="#/opt">Бронь следующего сбора</a>`;
  } else if (lot.retail) {
    price = `${money(lot.retail)}<br><small>${lot.retailUnit}${lot.demo ? ', цена демонстрационная' : ''}</small>`;
    action = `<button class="btn btn--solid btn--full" type="button" data-add="${lot.id}">В корзину</button>`;
  } else {
    price = `Только оптом<br><small>свежее в розницу не отправляем</small>`;
    action = `<a class="btn btn--full" href="#/opt">Условия опта</a>`;
  }

  return `<li class="lot">
    <div class="lot__shot"><img src="${lot.img}" alt="${lot.alt}" loading="lazy"></div>
    <div class="lot__body">
      ${tag}
      <p class="lot__name"><a href="#/lot">${lot.name}</a></p>
      <p class="lot__spec">${lot.spec}</p>
      <p class="lot__price">${price}</p>
    </div>
    <div class="lot__act">${action}</div>
  </li>`;
}

const fill = (id, list, opts) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = list.map(l => card(l, opts)).join('');
};

let lisichkaFilter = 'all';

function renderAll() {
  const live = LOTS.filter(l => l.status === 'live');
  const closed = LOTS.filter(l => l.status === 'closed');

  fill('homeLive', live);
  fill('catMushrooms', LOTS.filter(l => l.kind === 'mushroom'), { tags: true });
  fill('catBerries', LOTS.filter(l => l.kind === 'berry'), { tags: true });
  fill('lotRelated', live.filter(l => l.id !== 'lisichka-dry').slice(0, 4));

  fill('homeClosed', closed, { tags: true });

  const lis = [
    { ...LOTS[0] },
    { ...LOTS[1] },
    { id: 'lisichka-frozen', name: 'Лисичка замороженная', kind: 'mushroom', state: 'frozen',
      img: 'img/lisichka.jpg', alt: 'Лисички', spec: 'Шоковая заморозка, короб 10 кг',
      volume: 'короб 10 кг', opt: 'по запросу', retail: null, status: 'live' }
  ].filter(l => lisichkaFilter === 'all' || l.state === lisichkaFilter);
  fill('catLisichka', lis, { tags: true });

  const lotPrice = document.getElementById('lotPrice');
  if (lotPrice) {
    const l = LOTS.find(x => x.id === 'lisichka-dry');
    if (mode === 'opt') {
      lotPrice.textContent = l.opt;
      document.getElementById('lotHint').textContent = 'Опт от 20 кг, крафт-мешок 10 кг';
    } else {
      lotPrice.textContent = money(l.retail) + ' ' + l.retailUnit;
      document.getElementById('lotHint').textContent = 'Розница, цена демонстрационная';
    }
  }

  renderAsides(live);
  renderCart();
}

/* ── боковая колонка в статьях ─────────────────────────────── */

const POSTS = [
  { href: '#/blog/lisichka-price', date: '06.08.2026', title: 'Сколько стоит килограмм лисички' },
  { href: '#/blog/dry-ratio',      date: '14.07.2026', title: 'Десять к одному: экономика сушёного гриба' },
  { href: '#/blog/quality',        date: '22.07.2026', title: 'Почему сушёный гриб бывает дешёвым и дорогим' },
  { href: '#/blog/smorchok',       date: '02.07.2026', title: 'Сморчок по десять тысяч за килограмм' }
];

function renderAsides(live) {
  document.querySelectorAll('[data-aside]').forEach(box => {
    const here = box.closest('.screen').dataset.route;
    const lots = live.slice(0, 3).map(l => `
      <a class="aside__row" href="#/lot">
        <img src="${l.img}" alt="${l.alt}">
        <span><b>${l.name}</b><span>${mode === 'opt' ? l.opt : (l.retail ? money(l.retail) + ' ' + l.retailUnit : 'только опт')}</span></span>
      </a>`).join('');

    const links = POSTS.filter(p => p.href !== '#' + here).slice(0, 3).map(p => `
      <a class="aside__row" href="${p.href}">
        <span><b>${p.title}</b><span>${p.date}</span></span>
      </a>`).join('');

    box.innerHTML = `
      <div class="aside__block">
        <h3>В наличии сейчас</h3>
        ${lots}
        <p style="margin-top:var(--space-md)"><a class="tlink" href="#/catalog">Весь каталог →</a></p>
      </div>
      <div class="aside__block">
        <h3>Ещё в блоге</h3>
        ${links}
      </div>
      <div class="aside__block">
        <h3>Прайс недели на почту</h3>
        <p style="font-size:var(--text-sm);color:var(--color-neutral)">Что в наличии, почём и что закрывается. Раз в неделю.</p>
        <a class="btn btn--full" href="#/blog">Подписаться</a>
      </div>`;
  });
}

/* ── корзина ───────────────────────────────────────────────── */

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

/* ── роутер ────────────────────────────────────────────────── */

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const screens = document.querySelectorAll('.screen');
  let hit = null;
  screens.forEach(s => {
    const on = s.dataset.route === path;
    s.classList.toggle('is-active', on);
    if (on) hit = s;
  });
  if (!hit) document.querySelector('[data-route="/"]').classList.add('is-active');
  document.querySelectorAll('.mast__nav a').forEach(a => {
    if (a.getAttribute('href') === '#' + path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
  observeReveals();
}

/* ── события ───────────────────────────────────────────────── */

document.addEventListener('click', e => {
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn) {
    mode = modeBtn.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    renderAll();
    return;
  }

  const filterBtn = e.target.closest('[data-filter]');
  if (filterBtn) {
    lisichkaFilter = filterBtn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.filter === lisichkaFilter)));
    renderAll();
    return;
  }

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

  const shot = e.target.closest('[data-shot]');
  if (shot) {
    document.getElementById('galMain').src = shot.dataset.shot;
    document.querySelectorAll('[data-shot]').forEach(b =>
      b.setAttribute('aria-pressed', String(b === shot)));
    return;
  }

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
    const onLot = document.getElementById('lotStock');
    if (onLot) onLot.textContent = next;
    return;
  }

  const swatch = e.target.closest('[data-accent]');
  if (swatch) {
    const root = document.documentElement.style;
    root.setProperty('--accent', swatch.dataset.accent);
    root.setProperty('--accent-dark', swatch.dataset.accentDark);
    return;
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
  const ctl = e.target.closest('.tweak [data-var]');
  if (ctl) document.documentElement.style.setProperty(ctl.dataset.var, ctl.value + (ctl.dataset.unit || ''));
});

const copyBtn = document.getElementById('copyTokens');
if (copyBtn) copyBtn.addEventListener('click', () => {
  const s = document.documentElement.style;
  const vars = ['--accent', '--accent-dark', '--radius']
    .map(v => s.getPropertyValue(v) && `  ${v}: ${s.getPropertyValue(v)};`)
    .filter(Boolean).join('\n');
  navigator.clipboard.writeText(`:root {\n${vars || '  /* значения по умолчанию */'}\n}`);
  copyBtn.textContent = 'Скопировано';
  setTimeout(() => { copyBtn.textContent = 'Скопировать CSS'; }, 1500);
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

/* ── hero-слайдер: ручное переключение точками ── */

document.addEventListener('click', e => {
  const dot = e.target.closest('[data-dot]');
  if (dot) {
    const idx = dot.dataset.dot;
    document.querySelectorAll('.hero__slide').forEach(s =>
      s.classList.toggle('is-on', s.dataset.slide === idx));
    document.querySelectorAll('[data-dot]').forEach(d =>
      d.setAttribute('aria-pressed', String(d === dot)));
    return;
  }

  const rail = e.target.closest('[data-rail]');
  if (rail) {
    const track = rail.closest('.rail').querySelector('.rail__track');
    const cardW = track.firstElementChild ? track.firstElementChild.offsetWidth + 16 : 300;
    track.scrollBy({ left: Number(rail.dataset.rail) * cardW * 2, behavior: 'smooth' });
  }
});

/* ── счётчики: набегают при появлении, уважают reduced-motion ── */

const fmtCount = n => n.toLocaleString('ru-RU');
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    counterIO.unobserve(en.target);
    const el = en.target, target = Number(el.dataset.count);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmtCount(target); return; }
    const t0 = performance.now(), dur = 900;
    const tick = t => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmtCount(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.4 });
document.querySelectorAll('[data-count]').forEach(el => counterIO.observe(el));
setTimeout(() => document.querySelectorAll('[data-count]').forEach(el => {
  if (el.textContent === '0') el.textContent = fmtCount(Number(el.dataset.count));
}), 2500);

/* ── появление секций (IntersectionObserver, не scroll-listener) ── */

const revealIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  });
}, { rootMargin: '0px 0px -8% 0px' });

function observeReveals() {
  const els = document.querySelectorAll('.screen.is-active [data-reveal]:not(.in)');
  els.forEach(el => revealIO.observe(el));
  // страховка: скрытая вкладка, viewport 0x0, печать: раскрыть всё принудительно
  setTimeout(() => els.forEach(el => el.classList.add('in')), 2000);
}

/* ── шапка: сворачивается в полоску при скролле вниз ────────── */

const mast = document.querySelector('.mast');
const mastTop = mast.querySelector('.mast__top');

function measureMast() {
  const root = document.documentElement.style;
  const topH = mastTop.offsetHeight;
  const fullH = mast.offsetHeight;
  root.setProperty('--mast-top-h', topH + 'px');
  root.setProperty('--mast-full-h', fullH + 'px');
  root.setProperty('--mast-bar-h', (fullH - topH) + 'px');
}

let lastY = 0, ticking = false;
function onScroll() {
  const y = Math.max(0, window.scrollY);
  if (y <= 8) mast.classList.remove('is-compact');
  else if (y > lastY + 4) mast.classList.add('is-compact');
  else if (y < lastY - 6) mast.classList.remove('is-compact');
  lastY = y;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });

window.addEventListener('resize', measureMast);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureMast);
measureMast();

window.addEventListener('hashchange', route);
renderAll();
route();
