import * as T from './vendor/three.module.js';

// Positions and availability come directly from the physics engine, never a
// separate decorative layout. Pickup cylinder heights are not visual elevations.
export function createBoostPads(scene,definitions){
 const pads=definitions.map(p=>{
  const group=new T.Group();group.position.set(p.position[0],.045,p.position[2]);scene.add(group);
  const big=p.isBig,r=big?1.25:.7;
  const plate=new T.Mesh(new T.CylinderGeometry(r,r+.1,.065,32),new T.MeshStandardMaterial({color:0x34434a,metalness:.5,roughness:.65}));plate.receiveShadow=true;group.add(plate);
  const glow=new T.Mesh(new T.CircleGeometry(r*.75,32),new T.MeshBasicMaterial({color:0xffce60}));glow.rotation.x=-Math.PI/2;glow.position.y=.041;group.add(glow);
  const ring=new T.Mesh(new T.RingGeometry(r+.04,r+.14,64),new T.MeshBasicMaterial({color:0xffd276,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.043;group.add(ring);
  let orb=null;
  if(big){orb=new T.Mesh(new T.IcosahedronGeometry(.38,1),new T.MeshStandardMaterial({color:0xffd16e,emissive:0xffaa22,emissiveIntensity:1.3,roughness:.3,metalness:.25}));orb.position.y=.8;group.add(orb)}
  return {id:p.id,group,glow,ring,orb,big};
 });
 return {count:pads.length,update(states,time=0){
  for(let i=0;i<pads.length;i++){
   const v=pads[i],s=states[i];if(!s)continue;
   v.glow.visible=s.active;if(v.orb){v.orb.visible=s.active;v.orb.rotation.y=time*.8;v.orb.position.y=.8+Math.sin(time*2+i)*.1}
   const progress=s.active?1:T.MathUtils.clamp(1-s.cooldown/(v.big?10:4),0,1);
   v.ring.geometry.setDrawRange(0,Math.floor(progress*64)*6);
   v.ring.material.color.setHex(s.active?0xffd276:0xa67b42);
  }
 },dispose(){for(const p of pads){scene.remove(p.group);p.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}}};
}
