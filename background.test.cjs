const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

async function request(type, status = 200) {
  const calls = [];
  let listener;
  const context = vm.createContext({
    AbortSignal,
    URL,
    importScripts() {},
    chrome: {
      runtime: {
        id: 'test',
        getURL: name => 'chrome-extension://test/' + name,
        onMessage: {addListener: callback => { listener = callback; }},
      },
      storage: {local: {get: async defaults => ({...defaults, enabled: true})}},
    },
    fetch: async (url, options) => {
      calls.push({url, options});
      return {ok: status === 200, status, json: async () => type === 'health' ? {status: 'ok'} : {output: 'كتاب'}};
    },
  });
  for (const file of ['core.js', 'background.js']) vm.runInContext(readFileSync(join(__dirname, file), 'utf8'), context);
  const reply = await new Promise(resolve => {
    assert.equal(listener({type, text: 'kitap'}, {id: 'test', url: 'chrome-extension://test/popup.html'}, resolve), true);
  });
  return {calls, reply};
}

test('altyazı yalnız log tutmayan API yoluna gönderilir', async () => {
  const {calls, reply} = await request('translate');
  assert.equal(reply.ok, true);
  assert.equal(calls[0].url, 'https://osmanlica-ceviri.abapnews.tr/api/subtitles/translate');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), {text: 'kitap'});
});
test('yeni API kullanılamıyorsa log tutan eski yola geri dönülmez', async () => {
  for (const status of [404, 503]) {
    const {calls, reply} = await request('translate', status);
    assert.equal(reply.ok, false);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.endsWith('/api/subtitles/translate'));
  }
});
test('sağlık kontrolü metinsiz çalışır', async () => {
  const {calls, reply} = await request('health');
  assert.equal(reply.ok, true);
  assert.ok(calls[0].url.endsWith('/api/health'));
  assert.equal(calls[0].options.body, undefined);
});
