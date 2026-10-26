import * as T from './vendor/three.module.js';
import {arenaPerimeter} from './arena-shape.js';
import {stadiumTime} from './stadium-time.js';
import {createCrowd} from './crowd.js';
import {softGlow} from './boost-visual.js';
import {createAirTraffic} from './air-traffic.js';

// Static architecture is batched; the 2D crowd uses one instanced draw call.
const unitBox=new T.BoxGeometry(1,1,1).toNonIndexed();
class Batch{
 constructor(){this.p=[];this.n=[];this.c=[]}
 add(geometry,matrix,color){const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.applyMatrix4(matrix);const p=g.attributes.position,n=g.attributes.normal,c=new T.Color(color);for(let i=0;i<p.count;i++){this.p.push(p.getX(i),p.getY(i),p.getZ(i));this.n.push(n.getX(i),n.getY(i),n.getZ(i));this.c.push(c.r,c.g,c.b)}g.dispose()}
 box(w,h,d,x,y,z,color,rotation=0){const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),new T.Vector3(w,h,d));this.add(unitBox,matrix,color)}
 beam(a,b,r,color){const direction=b.clone().sub(a),g=new T.CylinderGeometry(r,r,direction.length(),5),matrix=new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()),new T.Vector3(1,1,1));this.add(g,matrix,color);g.dispose()}
 mesh(material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(this.n,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));return new T.Mesh(g,material)}
}
const mix=(a,b,t)=>new T.Color(a).lerp(new T.Color(b),t);
export function createStadium(scene,{sun,hemisphere,renderer}){
 const structure=new Batch(),neon=new Batch(),perimeter=arenaPerimeter(),crowd=[],glowPositions=[],glowColors=[],airTraffic=createAirTraffic(scene);
 const at=(p,offset,y)=>{const extra=9*Math.max(0,1-Math.abs(p.x)/20)*Math.abs(p.nz);return new T.Vector3(p.x-p.nx*(offset+extra),y,p.z-p.nz*(offset+extra))};
 function ribbon(offset,y,width,height,color,glow=false){for(let i=0;i<perimeter.length;i++){const p=perimeter[i],q=perimeter[(i+1)%perimeter.length],a=at(p,offset,y),b=at(q,offset,y),d=a.distanceTo(b),tint=typeof color==='function'?color(p):color;(glow?neon:structure).box(width,height,d+.025,(a.x+b.x)/2,y,(a.z+b.z)/2,tint,Math.atan2(b.x-a.x,b.z-a.z));if(glow){const c=new T.Color(tint);glowPositions.push((a.x+b.x)/2,y,(a.z+b.z)/2);glowColors.push(c.r,c.g,c.b)}}}
 const team=p=>p.z>0?0x29b9ff:0xff8f35;
 // Three seating decks rising behind the arena glass, with walkways between blocks.
 for(let tier=0;tier<3;tier++){
  for(let row=0;row<5;row++){
   const offset=5+tier*9+row*1.25,y=5.3+tier*7.3+row*.83;
   ribbon(offset,y,1.35,.85,row%2?0x35495d:0x293d50);
   for(let i=0;i<perimeter.length;i++){
    const p=perimeter[i],q=perimeter[(i+1)%perimeter.length],length=Math.hypot(q.x-p.x,q.z-p.z)*(1+offset/42),count=Math.max(1,Math.floor(length/.88));
    for(let j=0;j<count;j++){
     const t=(j+.5)/count,x=p.x+(q.x-p.x)*t,nx=p.nx+(q.nx-p.nx)*t,z=p.z+(q.z-p.z)*t,nz=p.nz+(q.nz-p.nz)*t;
     // Aisles remain open at regular intervals.
     if(Math.abs(Math.sin(Math.atan2(z,x)*12))<.13)continue;
     const adjusted=offset+9*Math.max(0,1-Math.abs(x)/20)*Math.abs(nz);crowd.push({x:x-nx*adjusted,y:y+.67,z:z-nz*adjusted,angle:Math.atan2(nx,nz),tier,row});
    }
   }
  }
  ribbon(3.9+tier*9,5+tier*7.3,.7,.65,0x122334);
  ribbon(3.45+tier*9,5.4+tier*7.3,.18,.12,team,true);
  ribbon(11.7+tier*9,9.8+tier*7.3,1.4,.2,0x172b3e);
 }
 ribbon(33,26.7,5,.6,0x14283c);ribbon(29.7,26.5,.22,.18,team,true);
 ribbon(.18,3.9,.12,.13,team,true);ribbon(.22,18.4,.09,.11,team,true);
 // Roof ribs, outer columns and rows of warm ceiling lights.
 for(let i=0;i<perimeter.length;i+=14){const p=perimeter[i],a=at(p,31,14.7),yaw=Math.atan2(-p.nx,-p.nz);structure.box(.8,27,.8,a.x,a.y,a.z,0x546679);const roof=at(p,25,27);structure.box(.4,.65,17,roof.x,27,roof.z,0x607386,yaw);structure.beam(at(p,31,21),at(p,16,27),.12,0x94a7b9);structure.beam(at(p,31,27),at(p,21,24),.1,0x71869b);const strip=at(p,22,26.5);neon.box(.22,.12,10,strip.x,26.5,strip.z,0xffd589,yaw)}
 for(const side of [-1,1])for(const z of [-35,-22,-9,9,22,35]){const x=side*40.78,dir=z>0?-1:1,color=z>0?0x58caff:0xffb25e;for(let i=0;i<2;i++){const c=z+i*dir*.8;neon.beam(new T.Vector3(x,5.1,c-dir*.7),new T.Vector3(x,5.8,c),.045,color);neon.beam(new T.Vector3(x,6.5,c-dir*.7),new T.Vector3(x,5.8,c),.045,color)}}
 for(const end of [-1,1]){const color=end>0?0x4bc4ff:0xffa052,z=end*51.17;neon.beam(new T.Vector3(-8.92755,.1,z),new T.Vector3(-8.92755,6.42775,z),.075,color);neon.beam(new T.Vector3(8.92755,.1,z),new T.Vector3(8.92755,6.42775,z),.075,color);neon.beam(new T.Vector3(-8.92755,6.42775,z),new T.Vector3(8.92755,6.42775,z),.075,color)}
 const architecture=structure.mesh(new T.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.35}));architecture.receiveShadow=true;scene.add(architecture);
 const neonMat=new T.MeshBasicMaterial({vertexColors:true,toneMapped:false});scene.add(neon.mesh(neonMat));
 const glowGeometry=new T.BufferGeometry();glowGeometry.setAttribute('position',new T.Float32BufferAttribute(glowPositions,3));glowGeometry.setAttribute('color',new T.Float32BufferAttribute(glowColors,3));const haloMaterial=new T.PointsMaterial({map:softGlow(),vertexColors:true,size:1.1,transparent:true,opacity:.32,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});scene.add(new T.Points(glowGeometry,haloMaterial));
 const spectators=createCrowd(scene,crowd);
 // Repeating LED advertising fascia, original artwork drawn in canvas.
 const bannerCanvas=document.createElement('canvas');bannerCanvas.width=1024;bannerCanvas.height=128;const ctx=bannerCanvas.getContext('2d');ctx.fillStyle='#08192c';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#72d6ff';ctx.font='bold italic 42px Arial';ctx.fillText('◈  ROCKET ARENA',35,73);ctx.fillStyle='#ffd19a';ctx.font='bold 25px Arial';ctx.fillText('BOOST  /  FLY  /  SCORE',560,70);for(let y=0;y<128;y+=4){ctx.fillStyle='#0003';ctx.fillRect(0,y,1024,1)}
 const bannerTexture=new T.CanvasTexture(bannerCanvas);bannerTexture.colorSpace=T.SRGBColorSpace;bannerTexture.wrapS=T.RepeatWrapping;
 const bp=[],bu=[],bi=[];let distance=0;
 for(let i=0;i<perimeter.length;i++){const p=perimeter[i],q=perimeter[(i+1)%perimeter.length],a=at(p,3,11.1),b=at(q,3,11.1),length=a.distanceTo(b),base=bp.length/3;bp.push(a.x,10.6,a.z,b.x,10.6,b.z,b.x,11.7,b.z,a.x,11.7,a.z);bu.push(distance/25,0,(distance+length)/25,0,(distance+length)/25,1,distance/25,1);bi.push(base,base+1,base+2,base,base+2,base+3);distance+=length}
 const bannerGeometry=new T.BufferGeometry();bannerGeometry.setAttribute('position',new T.Float32BufferAttribute(bp,3));bannerGeometry.setAttribute('uv',new T.Float32BufferAttribute(bu,2));bannerGeometry.setIndex(bi);scene.add(new T.Mesh(bannerGeometry,new T.MeshBasicMaterial({map:bannerTexture,side:T.DoubleSide,toneMapped:false})));
 // Floodlight gantries and the city beyond the open roof.
 const detail=new Batch(),emitters=new Batch();
 for(const x of [-46,46])for(const z of [-39,0,39]){
  detail.box(.5,30,.5,x,15,z,0x526275);detail.box(6,2.4,.6,x,30,z,0x14243a);
  for(let u=0;u<8;u++)for(let v=0;v<3;v++)emitters.box(.48,.42,.08,x-2.5+u*.7,29.3+v*.65,z+(x>0?-.35:.35),0xe2f3ff);
 }
 for(let i=0;i<38;i++){const angle=i/38*Math.PI*2,r=132+(i%3)*15,x=Math.sin(angle)*r,z=Math.cos(angle)*r,h=18+(Math.sin(i*7.3)*.5+.5)*40;detail.box(9+i%5,h,10,x,h/2-3,z,0x70829a);for(let y=6;y<h;y+=5)for(let j=-1;j<=1;j++)emitters.box(1.1,.65,10.05,x+j*2.4,y,z,i%3?0xa4d7ff:0xffd5a0)}
 scene.add(detail.mesh(new T.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:.3})));const windows=emitters.mesh(new T.MeshBasicMaterial({vertexColors:true,toneMapped:false,transparent:true}));scene.add(windows);
 const stadiumLights=[];
 for(const x of [-32,32])for(const z of [-32,32]){const light=new T.PointLight(0xc9e5ff,30,105,2);light.position.set(x,22,z);scene.add(light);stadiumLights.push(light)}
 const uniforms={top:{value:new T.Color()},horizon:{value:new T.Color()},sunDirection:{value:new T.Vector3()},sunColor:{value:new T.Color()},night:{value:0},time:{value:0}};
 const sky=new T.Mesh(new T.SphereGeometry(290,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
  varying vec3 direction;uniform vec3 top,horizon,sunDirection,sunColor;uniform float night,time;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(vec3(i,0)),hash(vec3(i+vec2(1,0),0)),f.x),mix(hash(vec3(i+vec2(0,1),0)),hash(vec3(i+vec2(1,1),0)),f.x),f.y);}
  float cloud(vec2 p){float n=0.0,w=.55;for(int i=0;i<4;i++){n+=noise(p)*w;p=p*2.08+vec2(3.7,9.2);w*=.5;}return n;}
  void main(){vec3 d=normalize(direction);float h=max(d.y,0.0);vec3 c=mix(horizon,top,pow(h,.55));float disk=dot(d,normalize(sunDirection));c+=sunColor*(smoothstep(.9994,.99985,disk)*1.7+pow(max(disk,0.0),70.0)*.23)*(1.0-night);
  vec2 uv=d.xz/max(.14,d.y+.25);float cover=smoothstep(.48,.72,cloud(uv*2.8+vec2(time*.009,0)))*smoothstep(.01,.2,h);c=mix(c,mix(horizon,vec3(1.0),.7),cover*.72*(1.0-night));
  vec3 cell=floor(d*480.0);float stars=step(.9985,hash(cell))*pow(max(d.y,0.0),.3)*night;c+=vec3(stars);float moon=smoothstep(.9992,.99965,dot(d,normalize(vec3(.4,.65,-.5))));c+=vec3(.66,.77,1.0)*moon*night;gl_FragColor=vec4(c,1.0);
 }`}));sky.renderOrder=-100;scene.background=null;scene.add(sky);
 const dayKeys=[{top:0x4396d1,horizon:0xd5e7ec,sun:0xfff0d5,ground:0x65745f,power:3.0,hemi:2.1},{top:0x51447a,horizon:0xffac75,sun:0xffaf72,ground:0x4b4052,power:1.65,hemi:1.25},{top:0x030b22,horizon:0x172d51,sun:0x9cb9ff,ground:0x27394b,power:.32,hemi:.8}];
 function update(remaining=300,training=false,overtime=false,time=0){
  const state=stadiumTime(remaining,training,overtime),a=dayKeys[state.segment],b=dayKeys[state.segment+1],t=state.blend;airTraffic.update(state.elapsed,training,state.night);
  spectators.update(time,state.night);uniforms.top.value.copy(mix(a.top,b.top,t));uniforms.horizon.value.copy(mix(a.horizon,b.horizon,t));uniforms.sunColor.value.copy(mix(a.sun,b.sun,t));uniforms.night.value=state.night;uniforms.time.value=time;
  const height=state.elapsed<=180?T.MathUtils.lerp(.85,.1,t):T.MathUtils.lerp(.1,-.35,t);sun.position.set(-35,height*80,25);uniforms.sunDirection.value.copy(sun.position).normalize();sun.intensity=T.MathUtils.lerp(a.power,b.power,t);sun.color.copy(mix(a.sun,b.sun,t));hemisphere.color.copy(mix(a.horizon,b.horizon,t));hemisphere.groundColor.copy(mix(a.ground,b.ground,t));hemisphere.intensity=T.MathUtils.lerp(a.hemi,b.hemi,t);
  scene.fog.color.copy(mix(a.horizon,b.horizon,t));scene.fog.near=115;scene.fog.far=260;scene.environmentIntensity=T.MathUtils.lerp(.6,.3,state.elapsed/300);renderer.toneMappingExposure=1.05;
  haloMaterial.opacity=.12+.3*state.night;stadiumLights.forEach(light=>light.intensity=45+state.night*1350);windows.material.opacity=.3+.7*Math.max(state.night,state.elapsed/600);document.body.dataset.timeOfDay=state.label;
  return state;
 }
 update();return{update,crowdCount:crowd.length,crowdTriangles:spectators.triangles};
}


