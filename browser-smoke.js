/* Run with playwright-cli run-code in a separate Chromium profile with the built extension loaded.
   Requires the real translation service at http://127.0.0.1:8765. */
async (page) => {
  const worker = page.context().serviceWorkers().find(item => item.url().endsWith('/background.js'));
  if (!worker) throw new Error('Eklentinin service worker süreci yüklenmedi.');
  await worker.evaluate(() => chrome.storage.local.set({enabled: true, server: 'http://127.0.0.1:8765', fontSize: 38, bilingual: true}));
  await page.route('https://www.youtube.com/watch?v=osmanlica-extension-test', route => route.fulfill({
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><html lang="tr"><meta charset="utf-8"><title>Osmanlıca altyazı denemesi</title>
      <body style="margin:0;background:#112329;color:white;font-family:system-ui">
      <h1 style="margin:30px">Osmanlıca altyazı · tarayıcı denemesi</h1>
      <div id="movie_player" style="position:relative;width:1000px;height:560px;margin:30px;background:linear-gradient(135deg,#193c41,#071b24)">
      <video></video><div class="ytp-caption-window-container" style="position:absolute;bottom:50px;width:100%;text-align:center">
      <span class="caption-visual-line">Kitaplarımızdan birini aldım.</span></div>
      <button onclick="document.getElementById('movie_player').requestFullscreen()">Tam ekran</button></div></body></html>`
  }));
  // A deliberately slow real-service request reproduces the old Latin-first flash.
  await page.context().route('http://127.0.0.1:8765/api/subtitles/translate', async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('https://www.youtube.com/watch?v=osmanlica-extension-test');
  await page.locator('#osmanlica-subtitles').waitFor();
  const pending = await page.evaluate(() => {
    const root = document.querySelector('#osmanlica-subtitles').shadowRoot;
    return {latin: root.querySelector('.latin')?.textContent, ottoman: root.querySelector('.text').textContent,
      native: getComputedStyle(document.querySelector('.ytp-caption-window-container')).visibility};
  });
  if (pending.latin !== '' || pending.ottoman !== '' || pending.native !== 'hidden') throw new Error('Çeviri beklenirken Latin altyazı tek başına beliriyor.');
  await page.locator('#osmanlica-subtitles .text').filter({hasText: 'كتابلریمزدن برینی آلدم.'}).waitFor({timeout: 20000});
  const font = await page.evaluate(() => [...document.fonts].some(face => face.family === 'OttomanEKalem' && face.status === 'loaded'));
  if (!font) throw new Error('eKalem fontu yüklenmedi; yedek font kullanılıyor.');
  const placement = await page.locator('#osmanlica-subtitles .box').evaluate(node => {
    const box = node.getBoundingClientRect();
    const player = document.querySelector('#movie_player').getBoundingClientRect();
    return (player.bottom - box.bottom) / player.height;
  });
  if (placement > 0.08) throw new Error('Altyazı videonun altına yeterince yakın değil.');
  const latin = page.locator('#osmanlica-subtitles .latin');
  if (await latin.textContent() !== 'Kitaplarımızdan birini aldım.') throw new Error('Latin ve Osmanlıca aynı kutuda eşleşmiyor.');
  if (await page.locator('.ytp-caption-window-container').evaluate(node => getComputedStyle(node).visibility !== 'hidden')) throw new Error('YouTube altyazısı ayrıca gösteriliyor.');
  await page.screenshot({path: 'output/playwright/subtitles.png'});
  await page.evaluate(() => { document.querySelector('.caption-visual-line').textContent = ''; });
  await page.waitForFunction(() => document.querySelector('#osmanlica-subtitles').shadowRoot.querySelector('.text').textContent === '');
  if (await latin.textContent() !== '') throw new Error('Latin satırı Osmanlıca ile birlikte silinmedi.');
  await page.evaluate(() => { document.querySelector('.caption-visual-line').textContent = 'Kitaplarımızdan birini aldım.'; });
  await worker.evaluate(() => chrome.storage.local.set({bilingual: false, fontSize: 48}));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.ytp-caption-window-container')).visibility === 'hidden');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#osmanlica-subtitles').shadowRoot.querySelector('.text')).fontSize === '48px');
  const size = await page.locator('#osmanlica-subtitles .text').evaluate(node => getComputedStyle(node).fontSize);
  if (await latin.isVisible()) throw new Error('Çift dil kapalıyken Latin satırı görünüyor.');
  if (size !== '48px') throw new Error('Yazı boyutu ayarı uygulanmadı.');
  // Changing display settings resets the translation generation; wait for its reply.
  await page.locator('#osmanlica-subtitles .text').filter({hasText: 'كتابلریمزدن برینی آلدم.'}).waitFor({timeout: 20000});
  await page.getByRole('button', {name: 'Tam ekran', exact: true}).click();
  await page.waitForFunction(() => document.fullscreenElement?.id === 'movie_player');
  if (!await page.locator('#osmanlica-subtitles .text').isVisible()) throw new Error('Tam ekranda altyazı görünmüyor.');
  await page.screenshot({path: 'output/playwright/subtitles-fullscreen.png'});
  await worker.evaluate(() => chrome.storage.local.set({enabled: false}));
  await page.waitForFunction(() => !document.querySelector('#osmanlica-subtitles'));
  const nativeVisible = await page.locator('.ytp-caption-window-container').evaluate(node => getComputedStyle(node).visibility === 'visible');
  if (!nativeVisible) throw new Error('Eklenti kapatılınca Türkçe altyazı geri gelmedi.');
  return {realService: true, eKalemLoaded: font, clearCaption: true, synchronizedPair: true, bottomRatio: placement, fontSize: size, bilingualToggle: true, fullscreen: true, disableRestoresNative: nativeVisible};
}
