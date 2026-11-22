import {loadCatalog,ensureImage,drawHijab,thumb,COLOURS} from './render.js';
import {initTracker,useMode,trackVideo,trackPhoto} from './tracker.js';

const $=s=>document.querySelector(s),cv=$('#c'),ctx=cv.getContext('2d'),video=$('#v'),stage=$('#stage');
const S={items:[],item:null,colour:null,tunes:{},src:null,face:null,live:false,ready:false,miss:0,lastT:-1,stream:null};
let W=0,H=0;
const store={
  get(){try{return JSON.parse(localStorage.getItem('labuh.v2'))||{}}catch{return {}}},
  set(){try{localStorage.setItem('labuh.v2',JSON.stringify({tunes:S.tunes,id:S.item&&S.item.id,colour:S.colour}))}catch{}}
};
const status=t=>$('#status').textContent=t||'';
const tune=()=>S.tunes[S.item.id]||(S.tunes[S.item.id]={dx:0,dy:0,s:1,r:0});

/* ---------- canvas + geometry ---------- */
function fitCanvas(){
  const r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  W=cv.width=Math.round(r.width*d);H=cv.height=Math.round(r.height*d);render();
}
new ResizeObserver(fitCanvas).observe(stage);

const cover=()=>{const r=Math.max(W/S.src.w,H/S.src.h);return{r,ox:(W-S.src.w*r)/2,oy:(H-S.src.h*r)/2}};

function geometry(){
  const t=tune();let g;
  if(S.face&&S.src){
    const {r,ox,oy}=cover(),f=S.face,m=S.src.mirror;
    g={x:m?W-(ox+f.cx*r):ox+f.cx*r,y:oy+f.cy*r,w:(f.fw/.8+f.fh/1.04)/2*r,rot:m?-f.roll:f.roll};
  }else g={x:W*.5,y:H*.42,w:W*.48,rot:0};
  g.bw=g.w;g.x+=t.dx*g.w;g.y+=t.dy*g.w;g.w*=t.s;g.rot+=t.r*Math.PI/180;
  return g;
}
function render(){
  if(!W)return;
  ctx.fillStyle='#20284F';ctx.fillRect(0,0,W,H);
  if(S.src){
    const {r,ox,oy}=cover();ctx.save();
    if(S.src.mirror){ctx.translate(W,0);ctx.scale(-1,1)}
    ctx.drawImage(S.src.el,ox,oy,S.src.w*r,S.src.h*r);ctx.restore();
  }
  if(S.item)drawHijab(ctx,S.item,S.colour,geometry());
}

/* ---------- live camera ---------- */
async function startCamera(){
  status('Starting camera…');
  try{
    stopStream();
    S.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=S.stream;await video.play();
  }catch{status('Camera blocked or unavailable. Use Photo instead.');return}
  S.src={el:video,mirror:true,get w(){return video.videoWidth},get h(){return video.videoHeight}};
  S.face=null;S.live=true;S.miss=0;$('#cam').textContent='Snap';
  status(S.ready?'':'Loading face tracking…');
  requestAnimationFrame(loop);
  if(!S.ready)try{await initTracker();await useMode('VIDEO');S.ready=true;status('')}
  catch{status('Tracking unavailable. Drag to place.')}
}
function stopStream(){if(S.stream)S.stream.getTracks().forEach(t=>t.stop());S.stream=null;S.live=false;$('#cam').textContent='Camera'}
function snap(){ /* freeze current frame as a still, keep the last tracked pose */
  const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;
  c.getContext('2d').drawImage(video,0,0);
  S.src={el:c,w:c.width,h:c.height,mirror:true};stopStream();status('');render();
}
const KEYS=['cx','cy','fw','fh','roll'];
function loop(ts){
  if(!S.live)return;requestAnimationFrame(loop);
  if(S.ready&&video.readyState>=2&&video.currentTime!==S.lastT){
    S.lastT=video.currentTime;
    let m=null;try{m=trackVideo(video,ts)}catch{}
    if(m){S.miss=0;if(S.face)KEYS.forEach(k=>S.face[k]+=(m[k]-S.face[k])*.45);else S.face=m;if($('#status').textContent)status('')}
    else if(++S.miss===20)status('Face not found. Move into frame.');
  }
  render();
}
$('#cam').onclick=()=>S.live?snap():startCamera();

/* ---------- photo upload ---------- */
$('#pick').onchange=e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=async()=>{
    URL.revokeObjectURL(url);stopStream();
    const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    S.src={el:c,w:c.width,h:c.height,mirror:false};S.face=null;render();status('Finding face…');
    try{await initTracker();S.ready=true;S.face=await trackPhoto(c);status(S.face?'':'No face found. Drag to place.')}
    catch{status('Tracking unavailable. Drag to place.')}
    render();
  };
  img.onerror=()=>status('That photo could not be opened.');
  img.src=url;
};

/* ---------- gestures: one finger moves, two fingers resize ---------- */
const ptrs=new Map();
const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,pt(e))});
cv.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)||!S.item)return;
  const prev=[...ptrs.values()];ptrs.set(e.pointerId,pt(e));const cur=[...ptrs.values()],t=tune();
  if(cur.length===1){const bw=geometry().bw;t.dx+=(cur[0].x-prev[0].x)/bw;t.dy+=(cur[0].y-prev[0].y)/bw}
  else if(cur.length===2){
    const d=q=>Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y);
    t.s=Math.min(2,Math.max(.5,t.s*d(cur)/Math.max(1,d(prev))));
  }
  clampTune(t);syncFit();if(!S.live)render();
});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,e=>{ptrs.delete(e.pointerId);store.set()}));
const clampTune=t=>{t.dx=Math.max(-.5,Math.min(.5,t.dx));t.dy=Math.max(-.5,Math.min(.5,t.dy))};

/* ---------- controls ---------- */
const FIT={'f-dx':['dx',100],'f-dy':['dy',100],'f-s':['s',100],'f-r':['r',1]};
Object.entries(FIT).forEach(([id,[k,div]])=>$('#'+id).oninput=e=>{tune()[k]=e.target.value/div;store.set();if(!S.live)render()});
function syncFit(){const t=tune();Object.entries(FIT).forEach(([id,[k,div]])=>$('#'+id).value=Math.round(t[k]*div))}
$('#reset').onclick=()=>{delete S.tunes[S.item.id];syncFit();store.set();render()};

document.querySelectorAll('.tabs button[data-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.tabs button[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===b));
  ['style','colour','fit'].forEach(k=>$('#p-'+k).hidden=k!==b.dataset.tab);
});

function buildItems(){
  const el=$('#items');el.innerHTML='';
  S.items.forEach(it=>{
    const b=document.createElement('button');b.className='item';b.setAttribute('aria-pressed',it===S.item);
    b.append(thumb(it,S.colour),document.createTextNode(it.name));
    b.onclick=async()=>{await ensureImage(it);S.item=it;buildItems();syncFit();store.set();render()};
    el.append(b);
  });
}
function buildSwatches(){
  const el=$('#swatches');el.innerHTML='';
  COLOURS.forEach(([name,hex])=>{
    const b=document.createElement('button');b.className='sw'+(hex?'':' orig');b.setAttribute('aria-label',name);
    if(hex)b.style.background=hex;b.setAttribute('aria-pressed',hex===S.colour);
    b.onclick=()=>{S.colour=hex;buildSwatches();buildItems();store.set();render()};el.append(b);
  });
}

/* ---------- save: share sheet on iPhone (Save Image), download elsewhere ---------- */
$('#save').onclick=()=>cv.toBlob(async b=>{
  const f=new File([b],'labuh-look.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch{return}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
});

/* ---------- init ---------- */
(async()=>{
  S.items=await loadCatalog();
  const saved=store.get();Object.assign(S.tunes,saved.tunes);
  S.colour=saved.colour||null;
  S.item=S.items.find(i=>i.id===saved.id)||S.items[0];await ensureImage(S.item);
  S.items.forEach(ensureImage);
  buildItems();buildSwatches();syncFit();render();
})();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
