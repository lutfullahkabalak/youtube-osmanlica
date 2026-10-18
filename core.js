/* Shared by the content script, service worker and Node regression tests. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({enabled: false, server: 'https://osmanlica-ceviri.abapnews.tr', fontSize: 38, bilingual: true});
  function serverURL(value) {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
      throw new Error('Servisin yalnız ana adresini girin; örnek: http://127.0.0.1:8765');
    }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
      throw new Error('Uzak servis için HTTPS, yerel servis için localhost veya 127.0.0.1 kullanın.');
    }
    return url.origin;
  }
  function settings(value = {}) {
    return {
      enabled: value.enabled === true,
      server: serverURL(value.server || defaults.server),
      fontSize: Math.min(72, Math.max(22, Number(value.fontSize) || defaults.fontSize)),
      bilingual: value.bilingual !== false,
    };
  }
  function captionText(lines) {
    return lines.map(line => line.replace(/\s+/gu, ' ').trim()).filter(Boolean).join(' ');
  }
  // Only the newest caption can be rendered; one request at a time, bounded cache.
  class CaptionQueue {
    constructor(translate, render, fail, isFresh = () => true) {
      this.translate = translate;
      this.render = render;
      this.fail = fail;
      this.isFresh = isFresh;
      this.cache = new Map();
      this.epoch = 0;
      this.current = '';
      this.busy = false;
      this.pending = null;
    }
    reset(clearCache = false) {
      this.epoch++;
      this.current = '';
      this.pending = null;
      if (clearCache) this.cache.clear();
    }
    async show(text) {
      this.current = text;
      if (!text) { this.pending = null; return; }
      if (this.cache.has(text)) { this.pending = null; if (this.isFresh(text)) this.render(this.cache.get(text), text); return; }
      this.pending = {text, epoch: this.epoch};
      if (this.busy) return;
      this.busy = true;
      try {
        while (this.pending) {
          const task = this.pending;
          this.pending = null;
          try {
            const result = await this.translate(task.text);
            if (task.epoch !== this.epoch) continue;
            this.cache.set(task.text, result);
            if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value);
            if (task.text === this.current && this.isFresh(task.text)) this.render(result, task.text);
          } catch (error) {
            if (task.epoch === this.epoch && task.text === this.current && this.isFresh(task.text)) this.fail(error);
          }
        }
      } finally { this.busy = false; }
    }
  }
  root.OttomanCaptions = {defaults, serverURL, settings, captionText, CaptionQueue};
})(globalThis);
