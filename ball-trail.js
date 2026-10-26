import * as T from './vendor/three.module.js';
import {softGlow} from './boost-visual.js';
export class BallTrail{
 constructor(scene){
  this.capacity=42;this.samples=[];this.clock=0;this.lastPhase='';this.p=new Float32Array(this.capacity*3);this.colors=new Float32Array(this.capacity*3);
  this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.BufferAttribute(this.p,3));this.geometry.setAttribute('color',new T.BufferAttribute(this.colors,3));
  this.material=new T.PointsMaterial({map:softGlow(),color:0xd0e9ff,size:1.15,vertexColors:true,transparent:true,opacity:.62,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});this.points=new T.Points(this.geometry,this.material);this.points.frustumCulled=false;scene.add(this.points);
  const lineGeometry=new T.BufferGeometry();lineGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(this.capacity*3),3));lineGeometry.setAttribute('color',new T.BufferAttribute(new Float32Array(this.capacity*3),3));this.line=new T.Line(lineGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}));this.line.frustumCulled=false;scene.add(this.line);this.clear();
 }
 clear(){this.samples=[];this.points.visible=this.line.visible=false;this.lastPosition=null;this.clock=0}
 update(position,velocity,dt,phase,team=null){
  if(!['live','replay'].includes(phase)){this.clear();this.lastPhase=phase;return}
  if(phase!==this.lastPhase||this.lastPosition&&this.lastPosition.distanceTo(position)>8)this.clear();this.lastPhase=phase;
  for(const s of this.samples)s.age+=dt;
  const speed=Math.hypot(...velocity),active=speed>13;
  this.clock+=dt;
  if(active&&this.clock>1/90){this.clock=0;this.samples.unshift({p:position.clone(),age:0});if(this.samples.length>this.capacity)this.samples.pop()}
  this.samples=this.samples.filter(s=>s.age<.38);this.lastPosition=position.clone();
  this.points.visible=this.line.visible=this.samples.length>1;if(!this.points.visible)return;
  const color=new T.Color(team===0?0x55bdff:team===1?0xffad60:0xdcefff),lineP=this.line.geometry.attributes.position.array,lineC=this.line.geometry.attributes.color.array;
  for(let i=0;i<this.samples.length;i++){const s=this.samples[i],j=i*3,a=Math.pow(1-s.age/.38,1.8);this.p[j]=lineP[j]=s.p.x;this.p[j+1]=lineP[j+1]=s.p.y;this.p[j+2]=lineP[j+2]=s.p.z;for(let k=0;k<3;k++)this.colors[j+k]=lineC[j+k]=[color.r,color.g,color.b][k]*a}
  this.geometry.setDrawRange(0,this.samples.length);this.line.geometry.setDrawRange(0,this.samples.length);this.geometry.attributes.position.needsUpdate=this.geometry.attributes.color.needsUpdate=true;this.line.geometry.attributes.position.needsUpdate=this.line.geometry.attributes.color.needsUpdate=true;
  this.material.opacity=Math.min(.78,.35+(speed-13)*.025);
 }
}
