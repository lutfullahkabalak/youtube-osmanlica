/* Run via Playwright CLI in an isolated profile with the built extension loaded.
   YouTube metadata/timedtext are controlled fixtures; translations use the real candidate. */
async page => {
  const worker=page.context().serviceWorkers().find(item=>item.url().endsWith('/background.js'));
  if(!worker)throw new Error('Eklenti yüklenmedi.');
  await worker.evaluate(()=>chrome.storage.local.set({enabled:true,server:'http://127.0.0.1:8765',fontSize:38,bilingual:true}));
  const endpoint='http://127.0.0.1:8765/api/subtitles/translate',calls=[];
  let prepared;const preparation=new Promise(resolve=>{prepared=resolve;});
  await page.context().route(endpoint,async route=>{
    const body=route.request().postDataJSON();calls.push(body);
    if(Object.keys(body).some(key=>!['text','texts'].includes(key)))throw new Error('API metin dışında veri aldı.');
    const response=await page.context().request.fetch('http://192.168.1.102:18765/api/subtitles/translate',{method:'POST',data:body});
    await route.fulfill({response});
    if(body.texts)prepared();
  });
  const first='Kitaplarımızdan birini aldım.',next='Bir kitap okudum.',third='Merhaba dünya.';
  const track='https://www.youtube.com/api/timedtext?v=prefetch-test&lang=tr';
  await page.route('https://www.youtube.com/api/timedtext**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({events:[
    {tStartMs:0,dDurationMs:2000,segs:[{utf8:first}]},{tStartMs:2000,dDurationMs:2000,segs:[{utf8:next}]},{tStartMs:4000,dDurationMs:2000,segs:[{utf8:third}]}
  ]})}));
  await page.route('https://www.youtube.com/watch?v=prefetch-test',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><body><div id="movie_player" style="position:relative;width:1000px;height:560px;background:#19414a"><video></video><button class="ytp-subtitles-button" aria-pressed="true">Altyazı</button><div class="ytp-caption-window-container"><span class="caption-visual-line">${first}</span></div></div><script>document.querySelector('#movie_player').getPlayerResponse=()=>(${JSON.stringify({videoDetails:{videoId:'prefetch-test'},captions:{playerCaptionsTracklistRenderer:{captionTracks:[{languageCode:'tr',baseUrl:track}]}}})});Object.defineProperty(document.querySelector('video'),'currentTime',{value:0,writable:true});</script>`}));
  await page.goto('https://www.youtube.com/watch?v=prefetch-test');
  await page.locator('#osmanlica-subtitles .text').filter({hasText:'كتابلریمزدن برینی آلدم.'}).waitFor({timeout:20000});
  await Promise.race([preparation,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Toplu hazırlama gelmedi.')),15000))]);
  await page.waitForTimeout(100);
  const timings=[];
  for(const [text,output,time] of [[next,'بر كتاب اوقودم.',2],[third,'مرحبا دنیا.',4]]){
    timings.push(await page.evaluate(({text,output,time})=>new Promise((resolve,reject)=>{
      const root=document.querySelector('#osmanlica-subtitles').shadowRoot;
      const target=root.querySelector('.text');const start=performance.now();
      const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('Önceden hazırlanan satır gösterilmedi'));},2000);
      const observer=new MutationObserver(()=>{if(target.textContent===output){clearTimeout(timeout);observer.disconnect();resolve(performance.now()-start);}});
      observer.observe(target,{childList:true,characterData:true,subtree:true});
      document.querySelector('video').currentTime=time;document.querySelector('.caption-visual-line').textContent=text;
    }),{text,output,time}));
    if(await page.locator('#osmanlica-subtitles .latin').textContent()!==text)throw new Error('Çift eşleşmedi.');
  }
  if(calls.filter(call=>call.texts).length!==1||calls.filter(call=>call.text).length!==1)throw new Error('Hazır satır için ek API isteği: '+JSON.stringify(calls));
  if(timings.some(ms=>ms>100))throw new Error('Önbellekten gösterim gecikti: '+timings);
  await page.screenshot({path:'output/playwright/prefetched-captions.png'});
  await page.context().unroute(endpoint);
  return {mainWorldBridge:true,timedCaptions:true,realBatchAPI:true,singleRequests:1,batchRequests:1,preparedCues:2,displayLatencyMs:timings,apiMetadata:'text only'};
}
