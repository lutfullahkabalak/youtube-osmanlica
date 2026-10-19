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
  function timedCaptions(data) {
    if (!Array.isArray(data?.events) || data.events.length > 20000) throw new Error('Altyazı zaman kodları geçersiz.');
    const cues = [], windows = new Map(); let characters = 0;
    function add(start, end, raw) {
      const text = captionText([raw]);
      if (text && text.length <= 4000 && end > start) cues.push({start: start / 1000, end: end / 1000, text});
      if (cues.length > 60000) throw new Error('Altyazı çok büyük.');
    }
    for (const event of data.events) {
      const start = event.tStartMs, duration = event.dDurationMs;
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0 || duration > 600000 || !Array.isArray(event.segs)) continue;
      if (event.segs.length > 1000 || event.segs.some(seg => typeof seg.utf8 !== 'string' || seg.utf8.length > 4000)) throw new Error('Altyazı parçası geçersiz.');
      characters += event.segs.reduce((sum, seg) => sum + seg.utf8.length, 0);
      if (characters > 4 * 1024 * 1024) throw new Error('Altyazı çok büyük.');
      const before = event.aAppend ? windows.get(event.wWinId) || '' : '';
      const raw = before + event.segs.map(seg => seg.utf8).join('');
      const full = raw.split('\n').slice(-2).join('\n');
      windows.set(event.wWinId, full);
      add(start, start + duration, full);
      // Recorded ASR tracks can reveal words at individual offsets. Prepare those
      // exact prefixes too; the visible native text still decides what is shown.
      if (event.segs.some(seg => Number.isFinite(seg.tOffsetMs) && seg.tOffsetMs > 0)) {
        let prefix = before, offset = 0;
        for (const seg of event.segs) {
          prefix += seg.utf8;
          if (Number.isFinite(seg.tOffsetMs)) offset = Math.max(offset, seg.tOffsetMs);
          if (offset >= 0 && offset < duration) add(start + offset, start + duration, prefix.split('\n').slice(-2).join('\n'));
        }
      }
    }
    return cues.sort((a, b) => a.start - b.start);
  }
  function upcomingTexts(cues, time, cached) {
    if (!Number.isFinite(time) || time < 0) return [];
    const texts = [], seen = new Set(), windowTexts = new Set(); let length = 0;
    for (const cue of cues) {
      if (cue.start > time + 20) break;
      if (cue.end <= time) continue;
      windowTexts.add(cue.text);
      if (windowTexts.size > 128) break;
      if (cached.has(cue.text) || seen.has(cue.text)) continue;
      if (length + cue.text.length > 12000) break;
      texts.push(cue.text); seen.add(cue.text); length += cue.text.length;
      if (texts.length === 8) break;
    }
    return texts;
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
    remember(text, result) {
      this.cache.set(text, result);
      if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value);
      if (text === this.current && this.isFresh(text)) this.render(result, text);
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
  root.OttomanCaptions = {defaults, serverURL, settings, captionText, timedCaptions, upcomingTexts, CaptionQueue};
})(globalThis);
