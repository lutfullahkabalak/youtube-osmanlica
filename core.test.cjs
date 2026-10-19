const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./core.js');
const {serverURL, settings, captionText, CaptionQueue} = globalThis.OttomanCaptions;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
test('servis adresi yalnız localhost HTTP veya uzak HTTPS kabul eder', () => {
  assert.equal(serverURL('http://127.0.0.1:8765/'), 'http://127.0.0.1:8765');
  assert.equal(serverURL('https://ceviri.example.com/'), 'https://ceviri.example.com');
  for (const value of ['http://example.com', 'file:///tmp/x', 'https://user:pass@example.com', 'https://example.com/api/translate', 'https://example.com/?key=secret']) assert.throws(() => serverURL(value));
});
test('ayar sınırları ve altyazı satırları', () => {
  assert.equal(settings().enabled, false);
  assert.equal(settings({fontSize: 100}).fontSize, 72);
  assert.equal(settings({fontSize: 3}).fontSize, 22);
  assert.equal(captionText(['  Kitaplarımızdan  ', '', 'birini\n aldım.']), 'Kitaplarımızdan birini aldım.');
});
test('geç gelen cevap gösterilmez, arada bekleyen eski altyazı atlanır', async () => {
  const first = deferred(), latest = deferred(), calls = [], rendered = [];
  const queue = new CaptionQueue(text => { calls.push(text); return calls.length === 1 ? first.promise : latest.promise; }, value => rendered.push(value), assert.fail);
  const running = queue.show('bir');
  await queue.show('iki'); await queue.show('üç');
  first.resolve('بر'); await new Promise(setImmediate);
  assert.deepEqual(rendered, []); assert.deepEqual(calls, ['bir', 'üç']);
  latest.resolve('اوچ'); await running;
  assert.deepEqual(rendered, ['اوچ']);
});
test('altyazı silinince bekleyen cevap görünmez; önbellek geri sarmada kullanılır', async () => {
  const first = deferred(), rendered = []; let calls = 0;
  const queue = new CaptionQueue(() => { calls++; return first.promise; }, value => rendered.push(value), assert.fail);
  const running = queue.show('kitap'); await queue.show(''); first.resolve('كتاب'); await running;
  assert.deepEqual(rendered, []);
  await queue.show('kitap'); assert.deepEqual(rendered, ['كتاب']); assert.equal(calls, 1);
});
test('video veya servis değişimi eski yanıtı ve önbelleği geçersiz kılar', async () => {
  const first = deferred(), rendered = [];
  const queue = new CaptionQueue(() => first.promise, value => rendered.push(value), assert.fail);
  const running = queue.show('kitap'); queue.reset(true); first.resolve('كتاب'); await running;
  assert.equal(queue.cache.size, 0); assert.deepEqual(rendered, []);
});
test('ağ hatasından sonra sonraki altyazı işlenir', async () => {
  const errors = [], rendered = [];
  const queue = new CaptionQueue(async text => { if (text === 'hata') throw new Error('kapalı'); return text; }, value => rendered.push(value), error => errors.push(error.message));
  await queue.show('hata'); await queue.show('yeni');
  assert.deepEqual(errors, ['kapalı']); assert.deepEqual(rendered, ['yeni']);
});
test('önbellek sınırlıdır', async () => {
  const queue = new CaptionQueue(async text => text, () => {}, assert.fail);
  for (let i = 0; i < 305; i++) await queue.show(String(i));
  assert.equal(queue.cache.size, 300); assert.equal(queue.cache.has('0'), false);
});
test('son cevap geldiğinde sayfadaki altyazı değişmişse eski sonuç gösterilmez', async () => {
  const first = deferred(), rendered = [];
  let visible = 'kitap';
  const queue = new CaptionQueue(() => first.promise, (value, text) => rendered.push({value, text}), assert.fail, text => visible === text);
  const running = queue.show('kitap');
  // YouTube clears the DOM before the next polling tick.
  visible = '';
  first.resolve('كتاب'); await running;
  assert.deepEqual(rendered, []);
  visible = 'kitap'; await queue.show('kitap');
  assert.deepEqual(rendered, [{value: 'كتاب', text: 'kitap'}]);
});
test('önbellekteki cevap da kaynak altyazıyla eşleşmeden gösterilmez', async () => {
  let visible = 'kitap'; const rendered = [];
  const queue = new CaptionQueue(async () => 'كتاب', value => rendered.push(value), assert.fail, text => visible === text);
  await queue.show('kitap'); visible = ''; await queue.show('kitap');
  assert.deepEqual(rendered, ['كتاب']);
});
test('yeni kurulum canlı API adresini ve ona ait erişim iznini kullanır', () => {
  const manifest = require('./manifest.json');
  assert.equal(settings().server, 'https://osmanlica-ceviri.abapnews.tr');
  assert.ok(manifest.host_permissions.includes(settings().server + '/*'));
});
test('zaman kodlu altyazı ve kelime eklemeleri videoya göre hazırlanır',()=>{
  const cues=globalThis.OttomanCaptions.timedCaptions({events:[
    {tStartMs:1000,dDurationMs:2000,segs:[{utf8:'Bir '},{utf8:'kitap',tOffsetMs:500}]},
    {tStartMs:4000,dDurationMs:1000,segs:[{utf8:'okudum.'}]}
  ]});
  assert.ok(cues.some(c=>c.text==='Bir kitap'&&c.start===1&&c.end===3));
  assert.ok(cues.some(c=>c.text==='Bir'&&c.start===1));
  assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,0,new Set()),['Bir kitap','Bir','okudum.']);
  assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,3,new Set()),['okudum.']);
  assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,0,new Set(['Bir kitap','Bir'])),['okudum.']);
});
test('önden hazırlama sınırları, bozuk zaman kodları ve yinelenen metinler',()=>{
  assert.throws(()=>globalThis.OttomanCaptions.timedCaptions({events:Array(20001).fill({})}));
  const cues=globalThis.OttomanCaptions.timedCaptions({events:[{tStartMs:-1,dDurationMs:1000,segs:[{utf8:'geçersiz'}]},{tStartMs:1000,dDurationMs:1000,segs:[{utf8:'aynı'}]},{tStartMs:2000,dDurationMs:1000,segs:[{utf8:'aynı'}]},{tStartMs:30000,dDurationMs:1000,segs:[{utf8:'uzak'}]}]});
  assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,0,new Set()),['aynı']);
  assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,29,new Set()),['uzak']);
  const many=Array.from({length:50},(_,i)=>({start:i/10,end:10,text:'satır '+i}));
  assert.equal(globalThis.OttomanCaptions.upcomingTexts(many,0,new Set()).length,8);
});
test('toplu hazırlanan sonuç mevcut satırla eşleştiğinde anında kullanılır',async()=>{
  const rendered=[];const pending=deferred();
  const queue=new CaptionQueue(()=>pending.promise,(result,text)=>rendered.push([result.output,text]),assert.fail);
  const work=queue.show('kitap');
  queue.remember('kitap',{output:'كتاب',complete:true});
  assert.deepEqual(rendered,[['كتاب','kitap']]);
  pending.resolve({output:'كتاب',complete:true});await work;
});
test('yoğun altyazı penceresi önbelleği döndürüp sonsuz hazırlama başlatmaz',()=>{
 const cues=Array.from({length:400},(_,i)=>({start:0,end:10,text:'parça '+i}));
 const cached=new Set(cues.slice(0,300).map(c=>c.text));
 assert.deepEqual(globalThis.OttomanCaptions.upcomingTexts(cues,0,cached),[]);
});
