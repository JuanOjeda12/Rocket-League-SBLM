import * as T from './vendor/three.module.js';
let glowMap;
export function softGlow(){
 if(glowMap)return glowMap;const size=32,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+0.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),1.8))}
 glowMap=new T.DataTexture(pixels,size,size);glowMap.needsUpdate=true;return glowMap;
}
export function createBoostVisual(){
 const group=new T.Group(),jets=[];
 for(const x of [-.17,.17]){
  const jet=new T.Group();jet.position.set(x,.15,.56);group.add(jet);
  for(const [radius,length,color,opacity] of [[.11,1.12,0xff6a13,.55],[.073,.88,0xffca55,.8],[.042,.48,0xfff4c1,1]]){
   const mesh=new T.Mesh(new T.ConeGeometry(radius,length,8),new T.MeshBasicMaterial({map:softGlow(),color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));mesh.rotation.x=Math.PI/2;mesh.position.z=length/2;jet.add(mesh);
  }
  const halo=new T.Sprite(new T.SpriteMaterial({map:softGlow(),color:0xffbd48,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.scale.set(.5,.5,1);jet.add(halo);jets.push(jet);
 }
 const positions=new Float32Array(48*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const material=new T.PointsMaterial({map:softGlow(),color:0xffa047,size:.14,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});const embers=new T.Points(geometry,material);embers.frustumCulled=false;group.add(embers);
 group.visible=false;
 return{group,update(time){if(!group.visible)return;jets.forEach((jet,i)=>{const pulse=1+Math.sin(time*71+i*2)*.09;jet.scale.set(1,1,pulse)});for(let i=0;i<48;i++){const age=(time*1.8+i/48)%1,j=i*3;positions[j]=(i%2?.17:-.17)+Math.sin(i*9.1)*age*.15;positions[j+1]=.15+Math.cos(i*4.2)*age*.12;positions[j+2]=.6+age*1.6}geometry.attributes.position.needsUpdate=true},dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}};
}
