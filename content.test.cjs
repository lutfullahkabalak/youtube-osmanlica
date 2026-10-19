const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const flush = () => new Promise(setImmediate);

// Run the real content script against a small caption DOM and a controllable clock.
async function playerHarness() {
  let now = 1000, nextId = 0, observer;
  const windowEvents = {};
  const window = {postMessage(){},addEventListener:(type,fn)=>{windowEvents[type]=fn;}};
  const timers = new Map(), requests = [];
  class Element {
    constructor(name) { this.nodeType = 1; this.name = name; this.textContent = ''; this.isConnected = true; this.style = {}; this.children = []; this.events = {}; }
    append(...nodes) { this.children.push(...nodes); }
    attachShadow() { return this.shadowRoot = new Element('shadow'); }
    remove() { this.isConnected = false; }
    addEventListener(type, fn) { this.events[type] = fn; }
    removeEventListener(type) { delete this.events[type]; }
    getClientRects() { return [{}]; }
    closest(selector) { return this.name === 'line' && selector === '.ytp-caption-window-container' ? container : null; }
    matches(selector) { return this.name === 'cc' && selector === '.ytp-subtitles-button'; }
    querySelector() { return null; }
  }
  const line = new Element('line'); line.textContent = 'bir';
  const cc = new Element('cc'); cc.pressed = 'true'; cc.getAttribute = () => cc.pressed;
  const container = new Element('captions'), video = new Element('video'), player = new Element('player');
  player.ad = false; player.classList = {contains: () => player.ad};
  player.querySelector = selector => selector === 'video' ? video : selector === '.ytp-subtitles-button' ? cc : null;
  player.querySelectorAll = () => [line];
  const document = {hidden:false, fonts:{add(){}}, querySelector:()=>player, createElement:name=>new Element(name)};
  const schedule = (fn, delay, interval=0) => { const id=++nextId; timers.set(id,{fn,at:now+delay,interval}); return id; };
  const context = vm.createContext({
    URL, window, document, location:{pathname:'/watch',search:'?v=test',origin:'https://www.youtube.com'}, Date:{now:()=>now},
    FontFace:class { async load(){return this;} },
    MutationObserver:class {constructor(fn){observer=fn;} observe(){} disconnect(){}},
    setInterval:(fn,ms)=>schedule(fn,ms,ms), setTimeout:(fn,ms)=>schedule(fn,ms), clearTimeout:id=>timers.delete(id),
    chrome:{runtime:{getURL:s=>s,onMessage:{addListener(){}},sendMessage:message=>new Promise((resolve,reject)=>requests.push({...message,resolve,reject}))},
      storage:{local:{get:async()=>({enabled:true})},onChanged:{addListener(){}}}}
  });
  for (const name of ['core.js','content.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),context,{filename:name});
  const advance = async ms => {
    const end=now+ms;
    for (;;) {
      const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due)break;
      const [id,timer]=due; now=timer.at;
      if(timer.interval)timer.at+=timer.interval;else timers.delete(id);
      timer.fn();await flush();
    }
    now=end;await flush();
  };
  await flush(); await advance(120);
  const host = () => player.children.findLast(n=>n.id==='osmanlica-subtitles' && n.isConnected);
  const byClass = name => host().shadowRoot.children.find(n=>n.className==='box').children.find(n=>n.className===name);
  const pair = () => [byClass('text').textContent,byClass('latin').textContent];
  const mutate = async text => {line.textContent=text; observer([{target:line,addedNodes:[],removedNodes:[]}]); await flush();};
  const reply = async (index,fail=false) => {requests[index].resolve(fail?{ok:false,error:'kapalı'}:{ok:true,data:{output:'OT('+requests[index].text+')',complete:true}});await flush();};
  await reply(0);
  const receiveTrack = async (data,videoId='test') => {windowEvents.message({source:window,origin:'https://www.youtube.com',data:{type:'ottoman-caption-data',videoId,data}});await flush();};
  return {advance,mutate,reply,pair,requests,video,cc,player,document,observer,container,receiveTrack,location:context.location,
    native:()=>player.children.findLast(n=>n.name==='style'&&n.isConnected).textContent};
}

test('hazır altyazı geçişinde önceki çift yeni çeviri hazır olana kadar korunur',async()=>{
  const h=await playerHarness(); assert.deepEqual(h.pair(),['OT(bir)','bir']);
  await h.mutate('iki'); await h.advance(240);
  assert.deepEqual(h.pair(),['OT(bir)','bir']);
  await h.reply(1); assert.deepEqual(h.pair(),['OT(iki)','iki']);
  await h.advance(800); assert.deepEqual(h.pair(),['OT(iki)','iki']);
});
test('YouTube satırı kısa süre söküp aynı metni eklediğinde görüntü yanıp sönmez',async()=>{
  const h=await playerHarness(); await h.mutate('');await h.advance(80);
  assert.deepEqual(h.pair(),['OT(bir)','bir']);
  await h.mutate('bir');await h.advance(240);
  assert.deepEqual(h.pair(),['OT(bir)','bir']); assert.equal(h.requests.length,1);
});
test('gerçek altyazı boşluğunda iki metin de kısa tolerans sonunda silinir',async()=>{
  const h=await playerHarness();await h.mutate('');await h.advance(80);
  assert.deepEqual(h.pair(),['OT(bir)','bir']);
  await h.advance(120);assert.deepEqual(h.pair(),['','']);
});
test('yavaş serviste eski altyazı art arda yeni satırlar gelse de en fazla 750ms tutulur',async()=>{
  const h=await playerHarness();await h.mutate('iki');await h.advance(400);
  assert.deepEqual(h.pair(),['OT(bir)','bir']);
  await h.mutate('üç');await h.advance(350);assert.deepEqual(h.pair(),['','']);
  await h.reply(1);assert.deepEqual(h.pair(),['','']);
  await h.reply(2);assert.deepEqual(h.pair(),['OT(üç)','üç']);
});
test('servis hatasında eski çift temizlenir ve doğal altyazı geri gelir',async()=>{
  const h=await playerHarness();await h.mutate('iki');await h.advance(240);await h.reply(1,true);
  assert.deepEqual(h.pair(),['','']);assert.equal(h.native(),'');
});
test('sarma, reklam ve CC kapatma eski altyazıyı tolerans beklemeden temizler',async()=>{
  for(const mode of ['seek','ad','cc','hidden']){
    const h=await playerHarness();
    if(mode==='seek'){h.video.seeking=true;h.video.events.seeking();}
    if(mode==='ad')h.player.ad=true;
    if(mode==='cc')h.cc.pressed='false';
    if(mode==='hidden')h.document.hidden=true;
    await h.advance(120);assert.deepEqual(h.pair(),['',''],mode);
  }
});
test('yeni satır için çeviri isteği sonraki 120ms taramasını beklemez',async()=>{
  const h=await playerHarness();await h.mutate('iki');
  assert.equal(h.requests.length,2);assert.equal(h.requests[1].text,'iki');
  assert.deepEqual(h.pair(),['OT(bir)','bir']);
});

test('yaklaşan altyazılar toplu hazırlanır, zamanı gelmeden gösterilmez ve ek istek gerektirmez',async()=>{
 const h=await playerHarness();h.video.currentTime=0;
 await h.receiveTrack({events:[{tStartMs:2000,dDurationMs:1000,segs:[{utf8:'iki'}]},{tStartMs:4000,dDurationMs:1000,segs:[{utf8:'üç'}]}]});
 assert.equal(h.requests[1].type,'translateBatch');assert.deepEqual(Array.from(h.requests[1].texts),['iki','üç']);
 h.requests[1].resolve({ok:true,data:{results:[{output:'OT(iki)',complete:true},{output:'OT(üç)',complete:true}]}});await flush();
 assert.deepEqual(h.pair(),['OT(bir)','bir']);
 await h.mutate('iki');assert.deepEqual(h.pair(),['OT(iki)','iki']);assert.equal(h.requests.length,2);
});
test('başka videoya ait veya geçersiz zaman kodu toplu çeviri başlatmaz',async()=>{
 const h=await playerHarness();h.video.currentTime=0;
 await h.receiveTrack({events:[{tStartMs:1000,dDurationMs:1000,segs:[{utf8:'iki'}]}]},'başka');
 await h.receiveTrack({events:null});assert.equal(h.requests.length,1);
});
test('video değiştikten sonra dönen toplu sonuç yeni videonun önbelleğine girmez',async()=>{
 const h=await playerHarness();h.video.currentTime=0;
 await h.receiveTrack({events:[{tStartMs:2000,dDurationMs:1000,segs:[{utf8:'iki'}]}]});
 h.location.search='?v=new';await h.advance(120);
 h.requests[1].resolve({ok:true,data:{results:[{output:'ESKİ',complete:true}]}});await flush();
 await h.reply(2);await h.mutate('iki');
 assert.equal(h.requests.length,4);assert.equal(h.requests[3].type,'translate');
 assert.deepEqual(h.pair(),['OT(bir)','bir']);
});
test('toplu hazırlama kullanılamıyorsa görünür satır normal yoldan çevrilir',async()=>{
 const h=await playerHarness();h.video.currentTime=0;
 await h.receiveTrack({events:[{tStartMs:2000,dDurationMs:1000,segs:[{utf8:'iki'}]}]});
 h.requests[1].resolve({ok:false,error:'HTTP 400'});await flush();
 await h.mutate('iki');assert.equal(h.requests[2].type,'translate');
 await h.reply(2);assert.deepEqual(h.pair(),['OT(iki)','iki']);
});
