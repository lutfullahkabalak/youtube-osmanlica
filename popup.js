'use strict';
const el = id => document.getElementById(id);
async function init() {
  const settings = OttomanCaptions.settings(await chrome.storage.local.get(OttomanCaptions.defaults));
  for (const key of ['enabled', 'bilingual']) el(key).checked = settings[key];
  for (const key of ['server', 'fontSize']) el(key).value = settings[key];
  el('sizeValue').value = settings.fontSize;
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {type: 'status'});
    el('status').textContent = response.status;
  } catch { el('status').textContent = 'Bir YouTube videosu açın. Kurulumdan sonra açık YouTube sekmesini yenileyin.'; }
}
el('fontSize').addEventListener('input', () => { el('sizeValue').value = el('fontSize').value; });
el('settings').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const settings = OttomanCaptions.settings({enabled: el('enabled').checked, server: el('server').value.trim(), fontSize: el('fontSize').value, bilingual: el('bilingual').checked});
    if (settings.server.startsWith('https:')) {
      const origin = new URL(settings.server).origin + '/*';
      if (!await chrome.permissions.request({origins: [origin]})) throw new Error('Bu servis adresine erişim izni verilmedi.');
    }
    await chrome.storage.local.set(settings);
    el('status').textContent = settings.enabled ? 'Kaydedildi. YouTube’da Türkçe altyazıyı açın.' : 'Kaydedildi. Osmanlıca altyazı kapalı.';
  } catch (error) { el('status').textContent = error.message; }
});
el('health').addEventListener('click', async () => {
  el('status').textContent = 'Kaydedilmiş servis adresi kontrol ediliyor…';
  try {
    const result = await chrome.runtime.sendMessage({type: 'health'});
    el('status').textContent = result.ok ? 'Çeviri servisine bağlantı başarılı.' : `Bağlantı kurulamadı: ${result.error}`;
  } catch (error) { el('status').textContent = `Bağlantı kurulamadı: ${error.message}`; }
});
init().catch(error => { el('status').textContent = error.message; });
