(()=>{'use strict';
const $=id=>document.getElementById(id);
let reader=null,controls=null,stream=null,running=false,token=0,tries=0,hits=0,startTime=0,confirmed='',seen=new Map(),log=[],busy=false,interval=null,rotationTimer=null,rotationBusy=false,rotationAttempts=0,rotationHits=0,confirmedAngle="";
const addLog=(msg)=>{log.push(new Date().toLocaleTimeString('sv-SE')+' '+msg);log=log.slice(-35);$('diagnostics').textContent=log.join('\n')};
const status=(msg,type='')=>{$('status').textContent=msg;$('status').className='status '+type};
function validEAN(s){if(!/^\d{8}$|^\d{12}$|^\d{13}$/.test(s))return false;let sum=0;for(let i=s.length-2,w=3;i>=0;i--,w=w===3?1:3)sum+=Number(s[i])*w;return (10-sum%10)%10===Number(s.at(-1))}
function normalized(s){const digits=String(s||'').replace(/\D/g,'');return digits.length===14&&digits[0]==='0'?digits.slice(1):digits}
function reset(){rotationAttempts=0;rotationHits=0;confirmedAngle='';$('rotationAttempts').textContent='0';$('rotationHits').textContent='0';$('angle').textContent='–';tries=0;hits=0;seen.clear();confirmed='';startTime=0;$('attempts').textContent='0';$('candidates').textContent='0';$('elapsed').textContent='–';$('result').textContent='Ingen kod ännu';$('validation').textContent='Väntar på giltig och bekräftad kod.';$('lookup').disabled=true;$('copy').disabled=true;$('product').classList.add('hidden');addLog('Testvärden nollställda')}
function onCandidate(value,source,angle=""){if(!running)return;const code=normalized(value);hits++;$('candidates').textContent=String(hits);if(!validEAN(code)){if(hits<=6)addLog('Ogiltig kontrollsiffra eller längd: '+code);return}const n=(seen.get(code)||0)+1;seen.set(code,n);if(n===1){status('Möjlig kod '+code+' – väntar på en andra avläsning…');addLog('Första giltiga avläsning: '+code+' ('+source+')');return}if(confirmed)return;confirmed=code;confirmedAngle=angle;$('angle').textContent=angle||'Automatisk';$('result').textContent=code;$('validation').textContent='EAN/UPC-kontrollsiffran stämmer. Samma kod avläst minst två gånger.';$('lookup').disabled=false;$('copy').disabled=false;$('elapsed').textContent=((performance.now()-startTime)/1000).toFixed(1)+' s';status('Bekräftad streckkod: '+code+'. Kontrollera siffrorna på förpackningen.','ok');addLog('BEKRÄFTAD: '+code+' efter '+$('elapsed').textContent+' · riktning: '+(angle||'standard'));stopCamera()}
function loadZXing(){return new Promise((resolve,reject)=>{if(window.ZXing?.BrowserMultiFormatReader)return resolve();const urls=['https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js','https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js'];let i=0;function next(){if(i===urls.length)return reject(Error('Kunde inte ladda ZXing. Kontrollera internetanslutningen.'));const script=document.createElement('script');script.src=urls[i++];script.onload=()=>window.ZXing?.BrowserMultiFormatReader?resolve():next();script.onerror=next;document.head.append(script)}next()})}
function stopCamera(){running=false;token++;if(rotationTimer){clearTimeout(rotationTimer);rotationTimer=null}if(interval){clearInterval(interval);interval=null}try{controls?.stop()}catch{}controls=null;try{reader?.reset()}catch{}reader=null;try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;const v=$('video');try{v.pause()}catch{}if(v.srcObject){try{v.srcObject.getTracks().forEach(t=>t.stop())}catch{}v.srcObject=null}$('start').disabled=false;$('stop').disabled=true}
// Kompletterande rotationsavkodning: prövar bildrutor i 90°, 180° och 270°.
// Den ordinarie ZXing-videoläsaren fortsätter att hantera 0° utan extra belastning.
function startRotationAssist(myToken,hints){
 const video=$('video');
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx||!ZXing.MultiFormatReader||!ZXing.RGBLuminanceSource||!ZXing.HybridBinarizer||!ZXing.BinaryBitmap){
   addLog('Rotationsstöd saknar nödvändiga ZXing-API:er; standardavkodning fortsätter.');return;
 }
 const decoder=new ZXing.MultiFormatReader();decoder.setHints(hints);
 let index=0;
 const step=()=>{
   if(myToken!==token||!running)return;
   rotationTimer=setTimeout(step,240);
   if(rotationBusy||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
   rotationBusy=true;
   try{
     const angle=[90,270,90,270,180][index++%5];
     const w=video.videoWidth,h=video.videoHeight;
     const scale=Math.min(1,1100/Math.max(w,h));
     const sw=Math.max(1,Math.round(w*scale)),sh=Math.max(1,Math.round(h*scale));
     canvas.width=angle===180?sw:sh;
     canvas.height=angle===180?sh:sw;
     ctx.setTransform(1,0,0,1,0,0);
     if(angle===90){ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2)}
     else if(angle===180){ctx.translate(canvas.width,canvas.height);ctx.rotate(Math.PI)}
     else{ctx.translate(0,canvas.height);ctx.rotate(3*Math.PI/2)}
     ctx.drawImage(video,0,0,sw,sh);
     ctx.setTransform(1,0,0,1,0,0);
     const rgba=ctx.getImageData(0,0,canvas.width,canvas.height);
     const source=new ZXing.RGBLuminanceSource(rgba.data,canvas.width,canvas.height);
     const bitmap=new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
     rotationAttempts++;$('rotationAttempts').textContent=String(rotationAttempts);
     try{const result=decoder.decode(bitmap);if(result){rotationHits++;$('rotationHits').textContent=String(rotationHits);onCandidate(result.getText(),'ZXing rotation',angle+'°')}}catch(e){
       if(rotationAttempts===1&&!(e instanceof ZXing.NotFoundException))addLog('Rotationsavkodning: '+(e.message||e));
     }finally{decoder.reset()}
   }catch(e){if(rotationAttempts<2)addLog('Rotationsfel: '+(e.message||e))}
   finally{rotationBusy=false}
 };
 rotationTimer=setTimeout(step,180);
}
async function startCamera(){if(running)return;reset();running=true;const myToken=++token;startTime=performance.now();$('start').disabled=true;$('stop').disabled=false;status('Kontrollerar kameran…');addLog('Startar '+$('engine').value+' · '+navigator.userAgent);
try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Kamera-API saknas. Öppna via HTTPS i Safari.');if($('engine').value==='native'){
 if(!('BarcodeDetector' in window))throw Error('BarcodeDetector stöds inte av den här webbläsaren. Välj ZXing.');const supported=await BarcodeDetector.getSupportedFormats();const formats=['ean_13','ean_8','upc_a','upc_e'].filter(f=>supported.includes(f));if(!formats.length)throw Error('Inga EAN/UPC-format stöds av BarcodeDetector.');const detector=new BarcodeDetector({formats});stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(myToken!==token){stream.getTracks().forEach(t=>t.stop());return}$('video').srcObject=stream;await $('video').play();addLog('Native stödda format: '+formats.join(', '));const loop=async()=>{if(myToken!==token||!running)return;tries++;$('attempts').textContent=String(tries);try{const results=await detector.detect($('video'));for(const r of results)onCandidate(r.rawValue,'native')}catch(e){if(tries===1)addLog('Native detect: '+e.message)}if(myToken===token&&running)interval=setTimeout(loop,180)};loop();
}else{await loadZXing();if(myToken!==token)return;const hints=new Map();hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8,ZXing.BarcodeFormat.UPC_A]);reader=new ZXing.BrowserMultiFormatReader(hints,180);controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result,error)=>{if(myToken!==token||!running)return;tries++;$('attempts').textContent=String(tries);if(result)onCandidate(result.getText(),'ZXing');else if(error&&tries===1)addLog('Avkodning pågår: '+(error.name||'inget resultat'))});if(myToken!==token){try{controls.stop()}catch{}return}addLog('ZXing kameran startad. Rotationsassistans testar hela kamerabilden, främst 90°/270°.');startRotationAssist(myToken,hints);}
if(myToken===token&&running)status('Kameran är igång. Prova att vrida streckkoden i olika riktningar. Håll den skarp och synlig.');
}catch(e){if(myToken===token){addLog('FEL: '+(e.message||e));stopCamera();status('Kunde inte starta: '+(e.message||e),'warn')}}}
async function lookup(){const code=confirmed;if(!validEAN(code))return;const p=$('product');p.classList.remove('hidden');p.textContent='Söker produkt i Open Food Facts…';try{const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);let r;try{r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_sv,brands,quantity',{signal:ctl.signal})}finally{clearTimeout(timer)}if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json(),product=data.product||{},name=(product.product_name_sv||product.product_name||'').trim();p.textContent=name?'Produkt: '+name+'\nVarumärke: '+(product.brands||'–')+'\nMängd: '+(product.quantity||'–'):'Ingen produkt hittades i Open Food Facts för '+code+'. Du kan ändå registrera varan manuellt i Matsmart.';p.style.whiteSpace='pre-wrap';addLog('Produktsökning: '+(name||'ingen träff'))}catch(e){p.textContent='Produktsökningen misslyckades: '+e.message;addLog('Produktsökning fel: '+e.message)}}
$('start').onclick=startCamera;$('stop').onclick=()=>{stopCamera();status('Kameran stoppad.')};$('reset').onclick=()=>{stopCamera();reset();status('Test nollställt. Starta kameran när du är redo.')};$('lookup').onclick=lookup;$('copy').onclick=()=>navigator.clipboard.writeText(confirmed).then(()=>status('EAN-koden kopierad.','ok')).catch(()=>status('Kunde inte kopiera koden.','warn'));
$('useManual').onclick=()=>{const code=normalized($('manual').value.trim());if(!validEAN(code)){status('Den manuella koden har fel längd eller kontrollsiffra.','warn');return}stopCamera();confirmed=code;confirmedAngle='manuell';$('angle').textContent='Manuell';$('result').textContent=code;$('validation').textContent='Manuellt angiven kod med giltig kontrollsiffra (inte kameraverifierad).';$('lookup').disabled=false;$('copy').disabled=false;status('Manuell EAN/UPC-kod godkänd.','ok');addLog('Manuell kod: '+code)};
$('copyReport').onclick=async()=>{const report='Matsmart 0.3 Skannerlabbet\nMotor: '+$('engine').value+'\nFörsök: '+tries+'\nAvläsningar: '+hits+'\nBekräftad kod: '+(confirmed||'ingen')+'\nTid: '+$('elapsed').textContent+'\nRiktning vid bekräftelse: '+(confirmedAngle||'standard/manuell')+'\nRotationsförsök: '+rotationAttempts+'\nRotationsavläsningar: '+rotationHits+'\n'+log.join('\n');try{await navigator.clipboard.writeText(report);status('Testrapport kopierad.','ok')}catch(e){status('Kunde inte kopiera. Markera texten i diagnostikrutan.','warn')}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stopCamera();status('Kameran stoppades när appen lades i bakgrunden.')}});addLog('Skannerlabbet redo. Ingen matförrådsdata läses eller ändras.');
})();
