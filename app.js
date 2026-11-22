'use strict';
const W=720,H=960,$=s=>document.querySelector(s),cv=$('#c'),ctx=cv.getContext('2d');
const STYLES={
  bawal:{label:'Bawal',top:-.85,sw:.6,drape:.95,bw:.74,note:'Square-cut and pinned at the chin. Easy to shape and tidy.'},
  instant:{label:'Instant',top:-.8,sw:.56,drape:.6,bw:.62,note:'Slip-on with a sewn shape. No pins, quick for daily wear.'},
  shawl:{label:'Shawl',top:-.9,sw:.66,drape:1.25,bw:1,note:'Long rectangle draped over the shoulders. Most room for styling.'}
};
const COLOURS=[
  ['Sage','#8A9A7B','wn'],['Olive','#6B6B3A','w'],['Terracotta','#B8603E','w'],['Mustard','#C99A2E','w'],
  ['Camel','#B58B5E','wn'],['Coral','#E07A62','w'],['Ivory','#EDE6D8','wn'],['Dusty rose','#C98B96','cn'],
  ['Mauve','#9A6F86','cn'],['Lilac','#A99BC8','c'],['Plum','#5B2B4E','c'],['Navy','#2B3A67','cn'],
  ['Teal','#2F7F86','cn'],['Charcoal','#3B3B40','nc']
];
const SHAPES={
  Oval:'Most styles work. Try a shawl draped with some volume, or a neatly pinned bawal.',
  Round:'Keep fabric falling straight down and pin under the chin. Avoid bulk at the cheeks.',
  Square:'Soften the jaw with a loose drape or a diagonal fold. Skip tight, flat pinning.',
  Heart:'Add fullness around the jaw and chin. Keep the crown smooth, not voluminous.',
  Long:'Add width at the sides and keep the crown flat. A wider shawl balances length.'
};
const S={img:null,style:'bawal',color:COLOURS[7],x:.5,y:.42,w:.48*W,rot:0,tone:null,looks:[],sel:[]};

function hijabPath(a){
  const P=new Path2D();
  P.moveTo(-a.sw,.1);
  P.bezierCurveTo(-a.sw-.04,a.top*.7,-.35,a.top,0,a.top);
  P.bezierCurveTo(.35,a.top,a.sw+.04,a.top*.7,a.sw,.1);
  P.bezierCurveTo(a.sw+.1,a.drape*.5,a.bw+.02,a.drape*.75,a.bw,a.drape);
  P.bezierCurveTo(a.bw*.4,a.drape+.12,-a.bw*.4,a.drape+.12,-a.bw,a.drape);
  P.bezierCurveTo(-a.bw-.02,a.drape*.75,-a.sw-.1,a.drape*.5,-a.sw,.1);
  P.closePath();
  P.moveTo(.4,.02);P.ellipse(0,.02,.4,.52,0,0,Math.PI*2);
  return P;
}
function drawBase(){
  if(S.img){
    const r=Math.max(W/S.img.width,H/S.img.height),w=S.img.width*r,h=S.img.height*r;
    ctx.drawImage(S.img,(W-w)/2,(H-h)/2,w,h);return;
  }
  ctx.fillStyle='#D9DCEA';ctx.fillRect(0,0,W,H);
  const cx=S.x*W,cy=S.y*H,u=S.w;
  ctx.fillStyle='#E3BC9D';
  ctx.beginPath();ctx.ellipse(cx,cy+u*.02,u*.38,u*.5,0,0,7);ctx.fill();
  ctx.fillRect(cx-u*.14,cy+u*.4,u*.28,u*.5);
  ctx.beginPath();ctx.ellipse(cx,cy+u*1.35,u*.8,u*.55,0,0,7);ctx.fill();
}
function draw(){
  ctx.clearRect(0,0,W,H);drawBase();
  const a=STYLES[S.style],u=S.w;
  ctx.save();
  ctx.translate(S.x*W,S.y*H);ctx.rotate(S.rot*Math.PI/180);ctx.scale(u,u);
  const p=hijabPath(a);
  ctx.fillStyle=S.color[1];ctx.fill(p,'evenodd');
  ctx.save();ctx.clip(p,'evenodd');
  const g=ctx.createLinearGradient(0,a.top,0,a.drape+.1);
  g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.55,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.25)');
  ctx.fillStyle=g;ctx.fillRect(-2,-2,4,4);
  ctx.lineWidth=.012;ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-a.bw*.9,a.drape*.62);ctx.quadraticCurveTo(0,a.drape*.4,a.bw*.7,a.drape*.78);ctx.stroke();
  ctx.beginPath();ctx.moveTo(a.sw*.9,.25);ctx.quadraticCurveTo(a.bw*.9,a.drape*.5,a.bw*.8,a.drape*.9);ctx.stroke();
  ctx.restore();
  ctx.lineWidth=.02;ctx.strokeStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(0,.02,.4,.52,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

/* Gestures: one finger moves, two fingers resize */
const P=new Map();
const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,pt(e))});
cv.addEventListener('pointermove',e=>{
  if(!P.has(e.pointerId))return;
  const prev=[...P.values()];P.set(e.pointerId,pt(e));const cur=[...P.values()];
  if(cur.length===1){S.x+=(cur[0].x-prev[0].x)/W;S.y+=(cur[0].y-prev[0].y)/H}
  else if(cur.length===2){
    const d=(q)=>Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y);
    S.w=Math.min(.95*W,Math.max(.2*W,S.w*d(cur)/Math.max(1,d(prev))));
    $('#size').value=Math.round(S.w/W*100);
  }
  draw();
});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>P.delete(e.pointerId)));

/* Photo input */
function load(f){
  if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=()=>{S.img=img;URL.revokeObjectURL(url);$('#hint').textContent='Drag to move. Pinch to resize.';draw()};
  img.onerror=()=>{$('#hint').textContent='That photo could not be opened. Try a JPG or PNG.'};
  img.src=url;
}
['#cam','#pick'].forEach(s=>$(s).addEventListener('change',e=>{load(e.target.files[0]);e.target.value=''}));

/* Style tab */
const stylesEl=$('#styles');
Object.entries(STYLES).forEach(([k,v])=>{
  const b=document.createElement('button');b.type='button';b.textContent=v.label;b.dataset.k=k;
  b.onclick=()=>{S.style=k;syncStyle();draw()};stylesEl.append(b);
});
function syncStyle(){
  stylesEl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===S.style));
  $('#styleNote').textContent=STYLES[S.style].note;
}

/* Colour tab */
const swEl=$('#swatches');
COLOURS.forEach(c=>{
  const b=document.createElement('button');b.type='button';b.className='sw';b.style.background=c[1];b.setAttribute('aria-label',c[0]);
  b.onclick=()=>{S.color=c;syncColour();draw()};swEl.append(b);
});
document.querySelectorAll('#tone button').forEach(b=>b.onclick=()=>{S.tone=S.tone===b.dataset.v?null:b.dataset.v;syncColour()});
function syncColour(){
  document.querySelectorAll('#tone button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.tone));
  swEl.querySelectorAll('.sw').forEach((b,i)=>{
    b.setAttribute('aria-pressed',COLOURS[i]===S.color);
    b.classList.toggle('fit',!!S.tone&&COLOURS[i][2].includes(S.tone));
  });
  const fits=S.tone&&S.color[2].includes(S.tone);
  $('#colourName').textContent=S.color[0]+(S.tone?(fits?' tends to suit your undertone.':' is less typical for your undertone, but try it against your face.'):'. Choose an undertone to see which colours are marked as a good match.');
}

/* Fit tab */
$('#size').oninput=e=>{S.w=e.target.value/100*W;draw()};
$('#tilt').oninput=e=>{S.rot=+e.target.value;draw()};
$('#shape').onchange=e=>{$('#shapeNote').textContent=SHAPES[e.target.value]||'Pick a face shape for styling tips. These are guidelines, not rules.'};

/* Looks: save and compare */
$('#save').onclick=()=>{
  const t=document.createElement('canvas');t.width=240;t.height=320;t.getContext('2d').drawImage(cv,0,0,240,320);
  S.looks.push({src:t.toDataURL('image/jpeg',.8),label:STYLES[S.style].label+', '+S.color[0]});
  if(S.looks.length>6)S.looks.shift();
  S.sel=[];renderLooks();showTab('looks');
};
function renderLooks(){
  const el=$('#looks');el.innerHTML='';
  const list=S.sel.length===2?S.sel.map(i=>S.looks[i]):S.looks;
  el.className='looks'+(S.sel.length===2?' two':'');
  list.forEach((l,n)=>{
    const idx=S.sel.length===2?S.sel[n]:n,b=document.createElement('button');
    b.type='button';b.className='look'+(S.sel.includes(idx)?' sel':'');
    b.innerHTML='<img alt=""><span></span>';b.querySelector('img').src=l.src;b.querySelector('span').textContent=l.label;
    b.onclick=()=>{
      if(S.sel.length===2){S.sel=[]}
      else S.sel=S.sel.includes(idx)?S.sel.filter(i=>i!==idx):[...S.sel,idx];
      renderLooks();
    };
    el.append(b);
  });
  $('#looksNote').textContent=S.looks.length?(S.sel.length===2?'Comparing two looks. Tap one to go back.':'Select two looks to compare them side by side.'):'Tap Save look to keep a version. Select two to compare them side by side.';
}

/* Tabs and export */
function showTab(k){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===k));
  document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!=='p-'+k);
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('#dl').onclick=()=>cv.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='labuh-look.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)});

if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
syncStyle();syncColour();draw();
