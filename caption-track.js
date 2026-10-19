/* MAIN world: observe only YouTube's Turkish timed-caption responses. No extension
   APIs, server credentials, arbitrary URL messages or remote code run here. */
'use strict';
(() => {
  let active = false, videoId = '', lastAttempt = '', attemptedAt = 0;
  const originalFetch = window.fetch;
  function currentId() { return new URL(location.href).searchParams.get('v') || ''; }
  function captionURL(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && url.pathname === '/api/timedtext' &&
        /^tr(?:-|$)/i.test(url.searchParams.get('lang') || '') && !url.searchParams.has('tlang') &&
        (!url.searchParams.has('v') || url.searchParams.get('v') === videoId) ? url : null;
    } catch { return null; }
  }
  function publish(raw, id) {
    if (!active || id !== videoId || id !== currentId() || typeof raw !== 'string' || raw.length > 4 * 1024 * 1024) return;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data.events) && data.events.length <= 20000) window.postMessage({type:'ottoman-caption-data',videoId:id,data},location.origin);
    } catch { /* unavailable/unsupported tracks keep the visible-caption fallback */ }
  }
  async function capture(response, id) {
    if (!response.ok) return;
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder(); let raw = '', bytes = 0;
    try {
      for (;;) {
        const {value,done} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4 * 1024 * 1024) { await reader.cancel(); return; }
        raw += decoder.decode(value,{stream:true});
      }
      publish(raw + decoder.decode(),id);
    } catch { /* network failure is handled by the existing live-caption flow */ }
    finally { reader.releaseLock(); }
  }
  window.fetch = function (...args) {
    const id = videoId, shouldCapture = active && captionURL(typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0]?.url);
    const pending = originalFetch.apply(this,args);
    if (shouldCapture) void pending.then(response => capture(response.clone(),id)).catch(()=>{});
    return pending;
  };
  // Some YouTube player versions use XHR instead of fetch for timedtext.
  const urls = new WeakMap(), open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method,url,...rest) { urls.set(this,url); return open.call(this,method,url,...rest); };
  XMLHttpRequest.prototype.send = function (...args) {
    if (active && captionURL(urls.get(this))) {
      const id = videoId;
      this.addEventListener('load',()=>{
        try {
          if (this.status === 200) publish(this.responseType === 'json' ? JSON.stringify(this.response) : this.responseText,id);
        } catch { /* non-text response */ }
      },{once:true});
    }
    return send.apply(this,args);
  };
  function prepare() {
    if (!active || videoId !== currentId()) return;
    try {
      const player = document.querySelector('#movie_player');
      const response = player?.getPlayerResponse?.();
      if (response?.videoDetails?.videoId !== videoId) return;
      const selected = player.getOption?.('captions','track');
      if (selected?.languageCode && !/^tr(?:-|$)/i.test(selected.languageCode)) return;
      const tracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      const track = tracks?.find(t=>/^tr(?:-|$)/i.test(t.languageCode) && t.kind !== 'asr') || tracks?.find(t=>/^tr(?:-|$)/i.test(t.languageCode));
      const url = track && captionURL(track.baseUrl);
      if (!url || (lastAttempt === url.href && Date.now()-attemptedAt < 30000)) return;
      lastAttempt = url.href; attemptedAt = Date.now(); url.searchParams.set('fmt','json3');
      // The request stays on YouTube, with YouTube's normal same-origin credentials.
      const id = videoId;
      void originalFetch.call(window,url.href,{credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(10000)})
        .then(response=>capture(response,id)).catch(()=>{});
    } catch { /* player metadata is not ready yet */ }
  }
  window.addEventListener('message',event=>{
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'ottoman-caption-request') return;
    const id = currentId();
    if (event.data.videoId !== id) return;
    if (videoId !== id) {lastAttempt='';attemptedAt=0;}
    videoId=id;active=event.data.enabled===true;
    prepare();
  });
  setInterval(prepare,2000);
})();
