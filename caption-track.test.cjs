const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const flush=()=>new Promise(setImmediate);
async function harness(trackURL='https://www.youtube.com/api/timedtext?v=test&lang=tr') {
 const calls=[],messages=[];let listener;
 const data={events:[{tStartMs:1000,dDurationMs:1000,segs:[{utf8:'kitap'}]}]};
 const window={fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(data));},postMessage:message=>messages.push(message),addEventListener:(name,fn)=>{listener=fn;}};
 class XHR{open(){}send(){}}
 vm.runInNewContext(readFileSync(join(__dirname,'caption-track.js'),'utf8'),{
  window,URL,AbortSignal,TextDecoder,XMLHttpRequest:XHR,location:{href:'https://www.youtube.com/watch?v=test',origin:'https://www.youtube.com'},setInterval(){},
  document:{querySelector:()=>({getPlayerResponse:()=>({videoDetails:{videoId:'test'},captions:{playerCaptionsTracklistRenderer:{captionTracks:[{languageCode:'tr',kind:'asr',baseUrl:trackURL}]}}})})}
 });
 const request=async(enabled=true,id='test')=>{listener({source:window,origin:'https://www.youtube.com',data:{type:'ottoman-caption-request',enabled,videoId:id}});await flush();};
 return {calls,messages,window,request};
}
test('kanal yalnız etkinleştirildiğinde YouTube üzerinden alınır; metin ve zaman kodu yayınlanır',async()=>{
 const h=await harness();await h.request(false);assert.equal(h.calls.length,0);
 await h.request(true);assert.equal(h.calls.length,1);
 assert.equal(new URL(h.calls[0].url).searchParams.get('fmt'),'json3');assert.equal(h.calls[0].options.credentials,'same-origin');
 assert.equal(h.messages.length,1);assert.equal(h.messages[0].videoId,'test');assert.equal(h.messages[0].data.events[0].segs[0].utf8,'kitap');
});
test('sayfa başka sunucuya veya başka videonun kanalına istek yaptıramaz',async()=>{
 for(const url of ['https://evil.example/api/timedtext?v=test&lang=tr','https://www.youtube.com/api/timedtext?v=other&lang=tr','https://www.youtube.com/api/timedtext?v=test&lang=en']){
  const h=await harness(url);await h.request();assert.equal(h.calls.length,0);
 }
 const h=await harness();await h.request(true,'other');assert.equal(h.calls.length,0);
});
