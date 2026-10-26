// Start must be called directly from a trusted click to request Pointer Lock.
// Esc and loss of focus always pause; Esc never silently starts play again.
export function createPlaySession(canvas,onChange){
 let playing=false,ownedLock=false;
 function change(value){
  if(playing===value)return;
  playing=value;document.body.dataset.playing=String(value);document.body.classList.toggle('playing',value);onChange(value);
  if(!value&&document.pointerLockElement===canvas)document.exitPointerLock();
 }
 function pause(reason='menu'){document.body.dataset.pauseReason=reason;change(false)}
 function start(){
  change(true);
  if(canvas.requestPointerLock){try{const request=canvas.requestPointerLock();request?.catch(()=>{/* CSS cursor hiding remains available in embedded browsers. */})}catch{/* Older embedded browsers may not support Pointer Lock. */}}
 }
 document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;document.body.dataset.pointerLocked=String(locked);if(ownedLock&&!locked)pause('pointer-unlocked');ownedLock=locked});
 addEventListener('blur',()=>pause('blur'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
 return{start,pause,get playing(){return playing}};
}
