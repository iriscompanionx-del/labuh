/* Drawing: vector fallback hijabs + 2D catalog cutouts (PNG/WEBP) with optional tint. */
export const BUILTIN=[
  {id:'bawal',name:'Bawal',style:'bawal',vec:{top:-.85,sw:.6,drape:.95,bw:.74}},
  {id:'instant',name:'Instant',style:'instant',vec:{top:-.8,sw:.56,drape:.6,bw:.62}},
  {id:'shawl',name:'Shawl',style:'shawl',vec:{top:-.9,sw:.66,drape:1.25,bw:1}}
];
export const COLOURS=[['Original',null],['Sage','#8A9A7B'],['Olive','#6B6B3A'],['Terracotta','#B8603E'],['Mustard','#C99A2E'],
  ['Camel','#B58B5E'],['Coral','#E07A62'],['Ivory','#EDE6D8'],['Dusty rose','#C98B96'],['Mauve','#9A6F86'],
  ['Lilac','#A99BC8'],['Plum','#5B2B4E'],['Navy','#2B3A67'],['Teal','#2F7F86'],['Charcoal','#3B3B40']];
const DEFAULT_VEC_COLOUR='#C98B96';

/* catalog.json item: {id,name,style,src,face:{cx,cy,w}}  (face = the head opening, as fractions of the image) */
export async function loadCatalog(){
  try{
    const list=await (await fetch('catalog.json',{cache:'no-cache'})).json();
    return BUILTIN.concat(list.map(i=>({...i,face:{cx:.5,cy:.42,w:.4,...i.face}})));
  }catch{return BUILTIN}
}
export function ensureImage(item){
  if(!item.src||item.img)return Promise.resolve();
  return item.loading||(item.loading=new Promise(res=>{
    const im=new Image();im.onload=()=>{item.img=im;res()};im.onerror=()=>{item.src=null;res()};im.src=item.src;
  }));
}

function vecPath(a){
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
function drawVector(ctx,a,colour){
  const p=vecPath(a);
  ctx.fillStyle=colour||DEFAULT_VEC_COLOUR;ctx.fill(p,'evenodd');
  ctx.save();ctx.clip(p,'evenodd');
  const g=ctx.createLinearGradient(0,a.top,0,a.drape+.1);
  g.addColorStop(0,'rgba(255,255,255,.2)');g.addColorStop(.55,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.25)');
  ctx.fillStyle=g;ctx.fillRect(-2,-2,4,4);
  ctx.lineWidth=.012;ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-a.bw*.9,a.drape*.62);ctx.quadraticCurveTo(0,a.drape*.4,a.bw*.7,a.drape*.78);ctx.stroke();
  ctx.restore();
  ctx.lineWidth=.02;ctx.strokeStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(0,.02,.4,.52,0,0,Math.PI*2);ctx.stroke();
}

/* Tint a cutout: multiply the colour in, then restore the original alpha. Cached per item+colour. */
const tintCache=new Map();
function tinted(item,hex){
  if(!hex)return item.img;
  const key=item.id+hex;if(tintCache.has(key))return tintCache.get(key);
  const k=Math.min(1,800/Math.max(item.img.width,item.img.height)),c=document.createElement('canvas');
  c.width=Math.round(item.img.width*k);c.height=Math.round(item.img.height*k);
  const x=c.getContext('2d');
  x.drawImage(item.img,0,0,c.width,c.height);
  x.globalCompositeOperation='multiply';x.fillStyle=hex;x.fillRect(0,0,c.width,c.height);
  x.globalCompositeOperation='destination-in';x.drawImage(item.img,0,0,c.width,c.height);
  tintCache.set(key,c);return c;
}

/* g = {x,y,w,rot}: head centre in canvas px, unit width (face width = .8*w), rotation in radians */
export function drawHijab(ctx,item,hex,g){
  ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.rot);
  if(item.vec){ctx.scale(g.w,g.w);drawVector(ctx,item.vec,hex)}
  else if(item.img){
    const im=tinted(item,hex),k=.8*g.w/(item.face.w*im.width);
    ctx.scale(k,k);ctx.drawImage(im,-item.face.cx*im.width,-item.face.cy*im.height);
  }
  ctx.restore();
}
export function thumb(item,hex){
  if(item.img||item.src){const i=new Image();i.src=item.src;i.alt=item.name;return i}
  const c=document.createElement('canvas');c.width=128;c.height=120;
  drawHijab(c.getContext('2d'),item,hex,{x:64,y:50,w:46,rot:0});return c;
}
