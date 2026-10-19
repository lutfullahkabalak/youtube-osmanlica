'use strict';
(() => {
  const config = window.LANDING_CONFIG;
  const samples = [
    {latin: 'Kitaplarımızdan birini aldım.', ottoman: 'كتابلریمزدن برینی آلدم.'},
    {latin: 'Bir kitap okudum.', ottoman: 'بر كتاب اوقودم.'},
    {latin: 'Merhaba dünya.', ottoman: 'مرحبا دنیا.'}
  ];
  let index = 0;
  let fontSize = window.matchMedia('(max-width: 760px)').matches ? 32 : 38;
  const root = document.documentElement;
  const latin = document.getElementById('demo-latin');
  const ottoman = document.getElementById('demo-ottoman');
  const smaller = document.getElementById('font-smaller');
  const larger = document.getElementById('font-larger');
  function applySize() {
    root.style.setProperty('--sample-size', `${fontSize}px`);
    smaller.disabled = fontSize <= 22;
    larger.disabled = fontSize >= 58;
  }
  applySize();
  smaller.addEventListener('click', () => {fontSize = Math.max(22, fontSize - 4); applySize();});
  larger.addEventListener('click', () => {fontSize = Math.min(58, fontSize + 4); applySize();});
  document.getElementById('bilingual-toggle').addEventListener('click', event => {
    const button = event.currentTarget;
    const active = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(active));
    latin.hidden = !active;
  });
  document.getElementById('next-caption').addEventListener('click', () => {
    index = (index + 1) % samples.length;
    latin.textContent = samples[index].latin;
    ottoman.textContent = samples[index].ottoman;
    document.getElementById('sample-count').textContent = `0${index + 1} / 03`;
    document.getElementById('sample-progress').style.width = `${(index + 1) / samples.length * 100}%`;
  });
  for (const anchor of document.querySelectorAll('[data-release-link]')) anchor.href = config.releaseUrl;
  for (const anchor of document.querySelectorAll('[data-repository-link]')) anchor.href = config.repositoryUrl;
  if (config.storeUrl) {
    for (const anchor of document.querySelectorAll('[data-install-cta]')) {
      anchor.href = config.storeUrl;
      anchor.textContent = "Chrome'a ekle ↗";
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    document.querySelector('[data-store-status]').textContent = 'Chrome Web Mağazası’nda';
    document.querySelector('.install-heading > p:not(.eyebrow)').textContent = 'Eklentiyi Chrome Web Mağazası’ndan ekle, Türkçe altyazıyı aç ve birlikte okumaya başla.';
    const installLink = document.querySelector('.install-heading [data-release-link]');
    installLink.href = config.storeUrl;
    installLink.textContent = "Chrome'a ekle ↗";
    document.querySelector('.access-note').hidden = true;
    document.querySelector('.steps li:first-child p').textContent = 'Chrome Web Mağazası’ndaki eklenti sayfasını açıp “Chrome’a ekle” düğmesine bas.';
  }
  const gallery = document.getElementById('screenshot-gallery');
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  const close = document.createElement('button');
  close.className = 'dialog-close'; close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Ekran görüntüsünü kapat');
  const largeImage = document.createElement('img');
  dialog.append(close, largeImage); document.body.append(dialog);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  for (const shot of config.screenshots) {
    if (!shot.src) continue;
    const figure = document.createElement('figure'); figure.className = 'screenshot-card';
    const button = document.createElement('button'); button.className = 'screenshot-image-button'; button.type = 'button'; button.setAttribute('aria-label', `${shot.title}: ekran görüntüsünü büyüt`);
    const img = document.createElement('img'); img.src = shot.src; img.alt = shot.alt; img.loading = 'lazy'; img.decoding = 'async';
    button.append(img); figure.append(button);
    button.addEventListener('click', () => {largeImage.src = shot.src; largeImage.alt = shot.alt; dialog.showModal();});
    const caption = document.createElement('figcaption');
    const title = document.createElement('h3'); title.textContent = shot.title;
    const text = document.createElement('p'); text.textContent = shot.caption;
    caption.append(title, text); figure.append(caption); gallery.append(figure);
  }
})();
