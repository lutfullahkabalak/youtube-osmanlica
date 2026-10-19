/* Playwright CLI run-code with the built extension loaded in an isolated profile.
   Uses the real hosted translator, delaying only the second test cue. */
async page => {
  const worker=page.context().serviceWorkers().find(item=>item.url().endsWith('/background.js'));
  if(!worker)throw new Error('Eklenti yüklenmedi.');
  await worker.evaluate(()=>chrome.storage.local.set({enabled:true,server:'https://osmanlica-ceviri.abapnews.tr',fontSize:38,bilingual:true}));
  const first='Kitaplarımızdan birini aldım.',next='Bir kitap okudum.';
  let release,submitted;
  const gate=new Promise(resolve=>{release=resolve;}),sent=new Promise(resolve=>{submitted=resolve;});
  const endpoint='https://osmanlica-ceviri.abapnews.tr/api/subtitles/translate';
  await page.context().route(endpoint,async route=>{
    if(route.request().postDataJSON().text===next){submitted();await gate;}
    const response=await page.context().request.fetch(endpoint,{method:'POST',data:route.request().postData(),headers:{'Content-Type':'application/json'}});
    await route.fulfill({response});
  });
  await page.route('https://www.youtube.com/watch?v=caption-transition-test',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#112329;color:white;font-family:system-ui"><h1>Altyazı geçiş kontrolü</h1><div id="movie_player" style="position:relative;width:1000px;height:560px;background:#19414a"><video></video><button class="ytp-subtitles-button" aria-pressed="true">Altyazı</button><div class="ytp-caption-window-container"><span class="caption-visual-line">${first}</span></div></div>`}));
  await page.goto('https://www.youtube.com/watch?v=caption-transition-test');
  const ottoman=page.locator('#osmanlica-subtitles .text'),latin=page.locator('#osmanlica-subtitles .latin');
  await ottoman.filter({hasText:'كتابلریمزدن برینی آلدم.'}).waitFor({timeout:20000});
  // Sample actual painted frames through the brief empty DOM and the delayed cue.
  await page.evaluate(()=>{
    window.captionFrames=[];window.sampleCaptions=true;
    const sample=()=>{if(!window.sampleCaptions)return;const root=document.querySelector('#osmanlica-subtitles').shadowRoot;
      window.captionFrames.push([root.querySelector('.text').textContent,root.querySelector('.latin').textContent]);requestAnimationFrame(sample);};requestAnimationFrame(sample);
    document.querySelector('.caption-visual-line').textContent='';
  });
  await page.waitForTimeout(50);
  if(await latin.textContent()!==first)throw new Error('Kısa DOM boşluğunda altyazı silindi.');
  await page.locator('.caption-visual-line').evaluate((node,text)=>{node.textContent=text;},next);
  await Promise.race([sent,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Yeni satır isteği gelmedi.')),5000))]);
  await page.waitForTimeout(200);
  if(await latin.textContent()!==first)throw new Error('Çeviri beklenirken önceki çift silindi.');
  release();
  await ottoman.filter({hasText:'بر كتاب اوقودم.'}).waitFor({timeout:20000});
  if(await latin.textContent()!==next)throw new Error('Yeni çift eşleşmiyor.');
  const frames=await page.evaluate(()=>{window.sampleCaptions=false;return window.captionFrames;});
  if(frames.some(([ota,tr])=>!ota||!tr))throw new Error('Geçişte boş kare görüldü.');
  if(frames.some(([ota,tr])=>!((ota==='كتابلریمزدن برینی آلدم.'&&tr===first)||(ota==='بر كتاب اوقودم.'&&tr===next))))throw new Error('İki satır farklı zamanlarda değişti.');
  await page.screenshot({path:'output/playwright/caption-transition.png'});
  await page.locator('.caption-visual-line').evaluate(node=>{node.textContent='';});
  await page.waitForTimeout(240);
  if(await latin.textContent()!==''||await ottoman.textContent()!=='')throw new Error('Gerçek boşlukta eski çift kaldı.');
  await page.context().unroute(endpoint);
  return {realAPI:true,briefDOMGap:true,atomicSwap:true,blankFrames:0,sampledFrames:frames.length,genuineGapCleared:true};
}
