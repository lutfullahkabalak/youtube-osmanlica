'use strict';
(() => {
  const core = OttomanCaptions;
  let options = {...core.defaults};
  let player, host, shadow, output, latin, note, nativeStyle, observer;
  const captionGapGrace = 180, translationHold = 750;
  let presentationTimer, transitionStartedAt = null, renderedText = '';
  let timedCues = [], trackData = '', prefetchGeneration = 0, prefetchBusy = false, prefetchRetryAt = 0, bridgeState = '';
  function currentVideoId() { return new URL('https://www.youtube.com' + location.pathname + location.search).searchParams.get('v') || ''; }
  function signalTrack(enabled) {
    const videoId = currentVideoId(), key = videoId + ':' + enabled;
    if (key === bridgeState) return;
    bridgeState = key;
    window.postMessage({type:'ottoman-caption-request',videoId,enabled},location.origin);
  }
  function resetPrefetch() {
    prefetchGeneration++;
    timedCues = []; trackData = ''; prefetchRetryAt = 0;
    signalTrack(false);
  }
  const hideNative = '.ytp-caption-window-container { visibility: hidden !important; }';
  function readCaption() {
    if (!player || player.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed') === 'false' || player.classList.contains('ad-showing')) return '';
    return core.captionText([...player.querySelectorAll('.ytp-caption-window-container .caption-visual-line')]
      .filter(line => line.getClientRects().length > 0)
      .map(line => line.textContent));
  }
  function isFresh(text) {
    return options.enabled && player?.isConnected && !document.hidden && !boundVideo?.seeking && !boundVideo?.ended &&
      videoKey === location.pathname + location.search && readCaption() === text;
  }
  function cancelPresentationExpiry() {
    clearTimeout(presentationTimer);
    presentationTimer = null;
    transitionStartedAt = null;
  }
  function clearPresentation() {
    cancelPresentationExpiry();
    renderedText = '';
    if (output) output.textContent = '';
    if (latin) latin.textContent = '';
    if (note) note.textContent = '';
  }
  function retainPresentation(text) {
    if (!output?.textContent) return;
    if (text === renderedText) { cancelPresentationExpiry(); return; }
    // Keep the matched pair through a cue replacement, but never indefinitely.
    // YouTube can briefly remove its caption nodes while rebuilding a cue.
    transitionStartedAt ??= Date.now();
    const remaining = Math.max(0, translationHold - (Date.now() - transitionStartedAt));
    clearTimeout(presentationTimer);
    if (!remaining) { clearPresentation(); return; }
    presentationTimer = setTimeout(clearPresentation, text ? remaining : Math.min(captionGapGrace, remaining));
  }
  function applySize() {
    if (output) output.style.fontSize = `${options.fontSize}px`;
    if (latin) latin.style.fontSize = `${Math.min(26, Math.max(16, Math.round(options.fontSize * 0.5)))}px`;
  }
  let observed = '', submitted = '', retryAt = 0, videoKey = '', boundVideo;
  let status = 'Eklenti kapalı.';
  let fontReady;
  function loadFont() {
    // Chromium does not register @font-face rules placed inside a shadow root.
    if (!fontReady) fontReady = new FontFace('OttomanEKalem', `url("${chrome.runtime.getURL('fonts/eKalemDuz.ttf')}")`).load()
      .then(font => { document.fonts.add(font); return font; })
      .catch(() => { fontReady = null; throw new Error('eKalem Düz fontu yüklenemedi; eklentiyi yeniden yükleyin.'); });
    return fontReady;
  }
  const queue = new core.CaptionQueue(async text => {
    await loadFont();
    const response = await chrome.runtime.sendMessage({type: 'translate', text});
    if (!response?.ok) throw new Error(response?.error || 'Çeviri servisine bağlanılamadı.');
    return response.data;
  }, (result, text) => {
    if (!output) return;
    cancelPresentationExpiry();
    renderedText = text;
    output.textContent = result.output;
    latin.textContent = options.bilingual ? text : '';
    note.textContent = result.complete === false ? 'Eksik çözümleme · işaretli kelimeleri kontrol edin' : '';
    status = note.textContent || 'Osmanlıca altyazı gösteriliyor.';
    nativeStyle.textContent = hideNative;
  }, error => {
    clearPresentation();
    status = `Servise bağlanılamadı: ${error.message} Adresi eklentiden kontrol edin.`;
    note.textContent = 'Çeviri servisine ulaşılamıyor · eklenti ayarlarını kontrol edin';
    nativeStyle.textContent = '';
    retryAt = Date.now() + 5000;
  }, isFresh);
  function prefetch() {
    const cc = player?.querySelector('.ytp-subtitles-button');
    const active = options.enabled && (cc ? cc.getAttribute('aria-pressed') === 'true' : !!readCaption());
    signalTrack(active);
    if (!active || !timedCues.length || prefetchBusy || Date.now() < prefetchRetryAt) return;
    const cached = new Set(queue.cache.keys());
    if (submitted) cached.add(submitted); // the visible cue has priority in its own request
    const texts = core.upcomingTexts(timedCues, boundVideo?.currentTime, cached);
    if (!texts.length) return;
    const generation = prefetchGeneration, key = videoKey;
    prefetchBusy = true;
    void chrome.runtime.sendMessage({type:'translateBatch',texts}).then(response => {
      if (!response?.ok || !Array.isArray(response.data?.results) || response.data.results.length !== texts.length) throw new Error('Önden hazırlama kullanılamıyor.');
      if (!options.enabled || generation !== prefetchGeneration || key !== location.pathname + location.search) return;
      texts.forEach((text,index) => queue.remember(text,response.data.results[index]));
    }).catch(() => {
      if (generation === prefetchGeneration) prefetchRetryAt = Date.now() + 30000;
    }).finally(() => { prefetchBusy = false; });
  }
  window.addEventListener('message',event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'ottoman-caption-data' ||
      !options.enabled || event.data.videoId !== currentVideoId() || videoKey !== location.pathname + location.search) return;
    try {
      const serialized = JSON.stringify(event.data.data);
      if (serialized.length > 4 * 1024 * 1024 || serialized === trackData) return;
      const cues = core.timedCaptions(event.data.data);
      if (!cues.length) return;
      timedCues = cues; trackData = serialized; prefetchGeneration++; prefetchRetryAt = 0;
      prefetch();
    } catch { /* untrusted page metadata never replaces the visible-caption fallback */ }
  });
  function clear() {
    queue.reset();
    observed = submitted = '';
    retryAt = 0;
    clearPresentation();
    if (nativeStyle) nativeStyle.textContent = hideNative;
  }
  function mount(nextPlayer) {
    observer?.disconnect();
    clear();
    host?.remove();
    nativeStyle?.remove();
    player = nextPlayer;
    host = document.createElement('div');
    host.id = 'osmanlica-subtitles';
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:60;';
    shadow = host.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = `:host{color:white} .box{position:absolute;bottom:clamp(12px,4%,32px);left:5%;width:90%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.65}
      .text{font-family:OttomanEKalem,serif;font-synthesis:none;font-weight:400;white-space:pre-wrap;overflow-wrap:anywhere;background:rgba(5,34,38,.92);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:3px 12px;border-radius:6px}
      .text:empty,.latin:empty{display:none}.latin{font-family:system-ui,sans-serif;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;padding:3px 10px;border-radius:5px;background:rgba(5,34,38,.92)}.text{max-width:100%;box-sizing:border-box}.note{font:12px/1.5 system-ui;color:#fff;display:table;margin:5px auto 0;background:rgba(5,34,38,.92);padding:2px 8px;border-radius:4px}.note:empty{display:none}`;
    const box = document.createElement('div'); box.className = 'box';
    output = document.createElement('span'); output.className = 'text'; output.lang = 'ota'; output.dir = 'rtl';
    latin = document.createElement('div'); latin.className = 'latin'; latin.lang = 'tr'; latin.dir = 'ltr';
    note = document.createElement('div'); note.className = 'note'; note.lang = 'tr';
    box.append(output, latin, note); shadow.append(style, box); player.append(host);
    nativeStyle = document.createElement('style'); nativeStyle.textContent = hideNative; player.append(nativeStyle);
    applySize();
    // React to YouTube caption mutations before the next polling tick. Ignore our overlay.
    observer = new MutationObserver(records => {
      if (records.some(record => {
        const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        return target?.closest('.ytp-caption-window-container') || target?.matches('.ytp-subtitles-button') ||
          [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
            (node.matches('.ytp-caption-window-container') || node.querySelector('.ytp-caption-window-container')));
      })) tick();
    });
    observer.observe(player, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-pressed', 'style', 'class', 'hidden']});
  }
  function invalidate() { clear(); }
  function tick() {
    if (!options.enabled) { observer?.disconnect(); host?.remove(); nativeStyle?.remove(); host = null; player = null; return; }
    const next = document.querySelector('#movie_player');
    if (!next) { observer?.disconnect(); clear(); host?.remove(); nativeStyle?.remove(); player = null; status = 'Bir YouTube videosu açın.'; return; }
    if (player !== next || !host?.isConnected) mount(next);
    const key = location.pathname + location.search;
    if (key !== videoKey) { videoKey = key; resetPrefetch(); queue.reset(true); clear(); }
    const video = player.querySelector('video');
    if (video !== boundVideo) {
      boundVideo?.removeEventListener('seeking', invalidate);
      boundVideo?.removeEventListener('emptied', invalidate);
      boundVideo = video;
      video?.addEventListener('seeking', invalidate);
      video?.addEventListener('emptied', invalidate);
      invalidate();
    }
    if (video?.seeking || video?.ended || document.hidden || player.classList.contains('ad-showing') ||
      player.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed') === 'false') { signalTrack(false); clear(); return; }
    const text = readCaption();
    if (text !== observed) {
      observed = text; retryAt = 0;
      queue.show('');
      retainPresentation(text); nativeStyle.textContent = hideNative;
      submitted = '';
    }
    if (!text) { prefetch(); status = 'YouTube’da altyazıyı açıp Türkçe seçin.'; return; }
    if (submitted !== text || (retryAt && Date.now() >= retryAt)) {
      submitted = text; retryAt = 0; status = 'Altyazı Osmanlı harflerine aktarılıyor…';
      void queue.show(text);
    }
    prefetch();
  }
  async function load() {
    try { options = core.settings(await chrome.storage.local.get(core.defaults)); }
    catch { options = {...core.defaults}; }
    clear(); queue.reset(true); resetPrefetch();
    applySize();
    status = options.enabled ? 'YouTube’da altyazıyı açıp Türkçe seçin.' : 'Eklenti kapalı.';
    tick();
  }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local') void load(); });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message.type === 'status') {
      const preparation = prefetchRetryAt > Date.now() ? 'Önden hazırlama şu an kullanılamıyor; görünen satırlar çevriliyor.' :
        timedCues.length ? 'Zaman kodlu altyazılar önden hazırlanıyor.' : 'Görünen satırlar çevriliyor; önden altyazı verisi bekleniyor.';
      reply({status: options.enabled ? status + ' ' + preparation : status, enabled: options.enabled});
    }
  });
  void load();
  setInterval(tick, 120);
})();
