import * as T from './vendor/three.module.js';
export class GoalEffects{
 constructor(scene){
  this.group=new T.Group();scene.add(this.group);this.count=420;this.positions=new Float32Array(this.count*3);this.speeds=new Float32Array(this.count*3);
  this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.positions,3));
  this.sparks=new T.Points(this.geometry,new T.PointsMaterial({color:0x64caff,size:.24,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.sparks.frustumCulled=false;this.group.add(this.sparks);
  this.rings=[0,1].map(()=>{const ring=new T.Mesh(new T.TorusGeometry(1,.045,8,96),new T.MeshBasicMaterial({color:0x64caff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.group.add(ring);return ring});
  this.core=new T.Mesh(new T.SphereGeometry(1,20,12),new T.MeshBasicMaterial({color:0xd9f5ff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.group.add(this.core);
  this.light=new T.PointLight(0x64caff,0,28,2);this.group.add(this.light);this.reset();
 }
 reset(){this.group.visible=false;this.age=10;this.seen=new Set()}
 seed(events=[]){for(const e of events)this.seen.add(e.id)}
 sync(events,ownSlot,onSave){for(const event of events||[]){if(this.seen.has(event.id))continue;this.seen.add(event.id);if(event.type==='goal')this.explode(event.end);else if(event.slot===ownSlot)onSave(event)} }
 explode(end){
  this.end=end;this.age=0;this.group.visible=true;this.group.position.set(0,2.5,end*50.6);
  const color=end<0?0x39b7ff:0xff8b30;
  this.sparks.material.color.setHex(color);this.core.material.color.setHex(color);this.light.color.setHex(color);this.rings.forEach(r=>r.material.color.setHex(color));
  for(let i=0;i<this.count;i++){const a=i*2.39996,u=(i+.5)/this.count,r=Math.sqrt(u),j=i*3;this.speeds[j]=Math.cos(a)*r*16;this.speeds[j+1]=Math.sin(a)*r*12+4;this.speeds[j+2]=-end*(5+14*(1-u));this.positions[j]=this.positions[j+1]=this.positions[j+2]=0}
  this.geometry.attributes.position.needsUpdate=true;
 }
 update(dt,visible=true){
  this.age+=dt;const t=this.age;this.group.visible=visible&&t<2.4;if(!this.group.visible)return;
  for(let i=0;i<this.count;i++){const j=i*3;this.positions[j]=this.speeds[j]*t;this.positions[j+1]=this.speeds[j+1]*t-3*t*t;this.positions[j+2]=this.speeds[j+2]*t}
  this.geometry.attributes.position.needsUpdate=true;this.sparks.material.opacity=Math.max(0,1-t/2.4);this.sparks.material.size=.24*(1-t*.23);
  this.rings.forEach((r,i)=>{const radius=Math.max(.01,t*10-i*1.3);r.scale.setScalar(radius);r.position.z=-this.end*i*.3;r.material.opacity=Math.max(0,.85-t*.5)});
  this.core.scale.setScalar(.2+Math.min(t,.16)*20);this.core.material.opacity=Math.max(0,.95-t*3);this.light.intensity=Math.max(0,160*(1-t/1.1));
 }
}
