/* Playwright CLI run-code, in a separate profile with this extension loaded.
   Uses the live API and clears only the test profile's extension settings. */
async (page) => {
  const worker = page.context().serviceWorkers().find(item => item.url().endsWith('/background.js'));
  if (!worker) throw new Error('Eklenti yüklenmedi.');
  await worker.evaluate(() => chrome.storage.local.clear());
  const popup = worker.url().replace('background.js', 'popup.html');
  await page.goto(popup);
  await page.locator('#server').waitFor();
  const server = await page.locator('#server').inputValue();
  if (server !== 'https://osmanlica-ceviri.abapnews.tr') throw new Error('Canlı API varsayılan değil.');
  await page.locator('#health').click();
  await page.locator('#status').filter({hasText: 'Çeviri servisine bağlantı başarılı.'}).waitFor({timeout: 20000});
  await page.locator('#enabled').check();
  await page.locator('button[type="submit"]').click();
  await page.locator('#status').filter({hasText: 'Kaydedildi.'}).waitFor();
  const translated = await page.evaluate(async () => chrome.runtime.sendMessage({type: 'translate', text: 'Kitaplarımızdan birini aldım.'}));
  if (!translated.ok || translated.data.output !== 'كتابلریمزدن برینی آلدم.') throw new Error('Canlı API çevirisi doğrulanamadı.');
  const permission = await worker.evaluate(() => chrome.permissions.contains({origins: ['https://osmanlica-ceviri.abapnews.tr/*']}));
  if (!permission) throw new Error('Varsayılan servis erişim izni yok.');
  return {defaultServer: server, health: true, translation: translated.data.output, permission};
}
