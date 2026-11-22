/* MediaPipe Face Landmarker (runs fully in the browser). Loaded lazily; failure is non-fatal. */
const V='0.10.21',CDN=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}`;
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
let lm=null,mode='VIDEO';

export async function initTracker(){
  if(lm)return lm;
  const m=await import(`${CDN}/vision_bundle.mjs`),fs=await m.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
  const opt=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numFaces:1});
  try{lm=await m.FaceLandmarker.createFromOptions(fs,opt('GPU'))}catch{lm=await m.FaceLandmarker.createFromOptions(fs,opt('CPU'))}
  return lm;
}
export async function useMode(m){if(lm&&mode!==m){await lm.setOptions({runningMode:m});mode=m}}

/* Landmarks -> head pose in source pixels. 10 forehead, 152 chin, 234/454 cheeks, 33/263 outer eye corners. */
function measure(res,w,h){
  const L=res&&res.faceLandmarks&&res.faceLandmarks[0];if(!L)return null;
  const P=i=>({x:L[i].x*w,y:L[i].y*h}),d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const t=P(10),c=P(152),e1=P(33),e2=P(263);
  return{cx:(t.x+c.x)/2,cy:(t.y+c.y)/2,fw:d(P(234),P(454)),fh:d(t,c),roll:Math.atan2(e2.y-e1.y,e2.x-e1.x)};
}
export const trackVideo=(video,ts)=>measure(lm.detectForVideo(video,ts),video.videoWidth,video.videoHeight);
export async function trackPhoto(canvas){await useMode('IMAGE');return measure(lm.detect(canvas),canvas.width,canvas.height)}
