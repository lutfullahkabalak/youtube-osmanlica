'use strict';
importScripts('core.js');
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const fromYouTube = sender.id === chrome.runtime.id && sender.tab && /^https:\/\/www\.youtube\.com\//.test(sender.url || '');
  const fromPopup = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
  if (!fromYouTube && !fromPopup) return;
  if (!['translate', 'health'].includes(message.type)) return;
  (async () => {
    const options = OttomanCaptions.settings(await chrome.storage.local.get(OttomanCaptions.defaults));
    if (message.type === 'translate' && !options.enabled) throw new Error('Eklenti kapalı.');
    if (message.type === 'translate' && (typeof message.text !== 'string' || !message.text.trim() || message.text.length > 4000)) {
      throw new Error('Altyazı metni geçersiz veya çok uzun.');
    }
    const response = await fetch(options.server + (message.type === 'health' ? '/api/health' : '/api/translate'), {
      method: message.type === 'health' ? 'GET' : 'POST',
      headers: {'Content-Type': 'application/json'},
      ...(message.type === 'translate' ? {body: JSON.stringify({text: message.text})} : {}),
      signal: AbortSignal.timeout(15000),
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`Çeviri servisi HTTP ${response.status} döndürdü.`);
    const data = await response.json();
    if (message.type === 'translate' && (typeof data.output !== 'string' || !data.output.trim())) throw new Error('Servis geçerli bir çeviri döndürmedi.');
    reply({ok: true, data});
  })().catch(error => reply({ok: false, error: error.name === 'TimeoutError' ? 'Çeviri servisi zaman aşımına uğradı.' : error.message || 'Servise bağlanılamadı.'}));
  return true;
});
