/* Лесник · слой Telegram Mini App
   Сайт остаётся обычным сайтом: вне Телеграма файл ничего не делает.
   Внутри — разворачивает окно на весь экран, отдаёт нативную кнопку «Назад»
   и держит отступ под шапку Телеграма, чтобы она не накрывала наш хедер. */
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  // SDK создаёт объект всегда, даже на обычном сайте: там платформа 'unknown'.
  // Без этой проверки стили мини-аппа поехали бы и в обычном браузере.
  if (!tg || !tg.platform || tg.platform === 'unknown') return;

  document.documentElement.classList.add('is-tma');

  tg.ready();
  tg.expand();                                          // из половины экрана на всю высоту

  // Полный экран — Bot API 8.0 и новее. На десктопе не просим: там окно
  // и так во всю доступную высоту, а fullscreen прячет управление окном.
  var mobile = ['android', 'ios', 'android_x'].indexOf(tg.platform) >= 0;
  if (mobile && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
    try { tg.requestFullscreen(); } catch (e) {}
    try { tg.disableVerticalSwipes(); } catch (e) {}    // свайп по странице не закрывает окно
  }

  /* Высота вьюпорта у мини-аппа своя: 100vh врёт, пока окно разворачивается.
     Телеграм отдаёт её переменной, отражаем в нашу и обновляем на каждое событие. */
  function syncViewport() {
    var h = tg.viewportStableHeight || tg.viewportHeight;
    if (h) document.documentElement.style.setProperty('--tma-vh', h + 'px');

    var top = 0;
    if (tg.contentSafeAreaInset) top += tg.contentSafeAreaInset.top || 0;
    if (tg.safeAreaInset) top += tg.safeAreaInset.top || 0;
    document.documentElement.style.setProperty('--tma-top', top + 'px');
  }
  syncViewport();
  tg.onEvent('viewportChanged', syncViewport);
  if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
    tg.onEvent('safeAreaChanged', syncViewport);
    tg.onEvent('contentSafeAreaChanged', syncViewport);
    tg.onEvent('fullscreenChanged', syncViewport);
  }

  /* Нативная кнопка «Назад» вместо своей: в мини-аппе она уже есть сверху,
     дублировать её на странице — лишний элемент. На главной прячем. */
  var back = tg.BackButton;
  function syncBack() {
    if (!back) return;
    var atHome = !location.hash || location.hash === '#/' || location.hash.indexOf('#tgWebApp') === 0;
    atHome ? back.hide() : back.show();
  }
  if (back) {
    back.onClick(function () { history.length > 1 ? history.back() : (location.hash = '#/'); });
    window.addEventListener('hashchange', syncBack);
    syncBack();
  }

  /* Цвета шапки и фона под нашу гамму: иначе окно обрамляется чужим белым. */
  try {
    var ink = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-paper').trim();
    if (ink && tg.setBackgroundColor) tg.setBackgroundColor(ink);
    if (tg.setHeaderColor) tg.setHeaderColor(mobile ? 'secondary_bg_color' : 'bg_color');
  } catch (e) {}
})();
