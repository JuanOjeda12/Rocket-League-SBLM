import * as T from './vendor/three.module.js';
import {ARENA} from './arena-shape.js';
const loader=new T.TextureLoader(),cache=new Map();
function texture(file,color=false){
 const key=file+color;if(cache.has(key))return cache.get(key);
 const t=loader.load('./assets/textures/'+file);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;
 t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;cache.set(key,t);return t;
}
export function turfMaterials(width,depth){
 const map=texture('grass-color.jpg',true),normalMap=texture('grass-normal.jpg');
 for(const t of [map,normalMap])t.repeat.set(width/1.4,depth/1.4);
 return [0x78ad83,0x679873].map(color=>new T.MeshStandardMaterial({color,map,normalMap,normalScale:new T.Vector2(.3,.3),roughness:.95}));
}
export function metalMaterial(color=0xb5c7cd){
 return new T.MeshStandardMaterial({color,map:texture('metal-color.jpg',true),normalMap:texture('metal-normal.jpg'),normalScale:new T.Vector2(.45,.45),roughnessMap:texture('metal-roughness.jpg'),roughness:.85,metalnessMap:texture('metal-metalness.jpg'),metalness:.4,side:T.DoubleSide});
}

export function applyArenaUV(geometry){
 const {width:W,length:L,corner:R,ramp:r,height:H,goal:G,goalHeight:GH}=ARENA;
 const cx=W-R,cz=L-R,q=R*Math.PI/2,wide=2*cx,long=2*cz,total=4*q+2*wide+2*long,tiles=Math.round(total/3);
 const uv=[],p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),az=Math.abs(z);let s;
  if(ax>cx&&az>cz){const dx=ax-cx,dz=az-cz;
   if(x>=0&&z>=0)s=R*Math.atan2(dz,dx);
   else if(x<0&&z>=0)s=q+wide+R*Math.atan2(dx,dz);
   else if(x<0)s=2*q+wide+long+R*Math.atan2(dz,dx);
   else s=3*q+2*wide+long+R*Math.atan2(dx,dz);
  }else if(az>cz)s=z>=0?q+cx-x:3*q+wide+long+x+cx;
  else s=x<0?2*q+wide+cz-z:4*q+2*wide+long+z+cz;
  let radius=r;if(az>cz&&ax<cx){let a=T.MathUtils.clamp((ax-G)/3,0,1);radius=r*a*a*(3-2*a)}
  let arc=y;
  if(y<radius&&radius>0)arc=radius*Math.acos(T.MathUtils.clamp(1-y/radius,-1,1));
  else if(y>H-r)arc=radius*Math.PI/2+H-r-radius+r*Math.asin(T.MathUtils.clamp((y-H+r)/r,-1,1));
  else arc=radius*Math.PI/2+y-radius;
  if(az>L+.001&&Math.abs(ax-G)<.001)uv.push((az-L)/3,y/3);
  else if(az>L+.001&&Math.abs(y-GH)<.001)uv.push(x/3,z/3);
  else uv.push(s/total*tiles,arc/3);
 }
 // The mesh is non-indexed so the closing seam can have separate UVs.
 for(let i=0;i<uv.length;i+=6){const u=[uv[i],uv[i+2],uv[i+4]];if(Math.max(...u)-Math.min(...u)>tiles/2)for(const j of [i,i+2,i+4])if(uv[j]<tiles/2)uv[j]+=tiles}
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 return geometry;
}
