/* Лесник · исходные данные прототипа
   Партии из Telegram-канала клиента (июнь-август 2026).
   В боевой версии этот файл заменяется на content/lots.json, который пишет админка.
   Розничные цены с пометкой demo — заглушки для прохода по сценарию. */

window.LESNIK_SEED = {

  lots: [
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
  ],


  categories: {
    kinds: [
      { id: 'mushroom', name: 'Грибы', plural: 'грибов' },
      { id: 'berry',    name: 'Ягоды', plural: 'ягод' },
      { id: 'herb',     name: 'Травы', plural: 'трав' }
    ],
    states: [
      { id: 'fresh',  name: 'свежая' },
      { id: 'dry',    name: 'сушёная' },
      { id: 'frozen', name: 'замороженная' },
      { id: 'salted', name: 'солёная' },
      { id: 'pureed', name: 'протёртая' }
    ]
  },

  texts: {
    phone: '8 932 474-83-83',
    heroTitle: 'Грибы и ягоды с Урала, прямо от заготовителя',
    heroPromo: 'Доставка по Москве бесплатно от 300 кг',
    inn: 'подставим из документов',
    ogrnip: 'подставим из документов',
    account: 'подставим из документов'
  },

  leads: [
    { id: 'l-1', date: '11.08.2026 09:14', name: 'Ресторан «Пихта»', phone: '+7 916 200-14-02', qty: '40 кг', lot: 'Лисичка свежая', who: 'Ресторан или кафе', status: 'new' },
    { id: 'l-2', date: '10.08.2026 18:40', name: 'Заготпром', phone: '+7 495 774-11-90', qty: '500 кг', lot: 'Лисичка сушёная', who: 'Переработчик', status: 'new' },
    { id: 'l-3', date: '09.08.2026 12:05', name: 'Сеть «Полка»', phone: '+7 926 331-08-77', qty: '120 кг', lot: 'Клюква замороженная', who: 'Магазин или сеть', status: 'done' }
  ]
};
