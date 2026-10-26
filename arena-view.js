import * as T from './vendor/three.module.js';
import {ARENA,createArenaGeometry,floorRadius} from './arena-shape.js';
import {metalMaterial,applyArenaUV} from './surface-materials.js';
export function addRoundedArena(scene){
 const data=createArenaGeometry(),geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
 const kinds=['ramp','wall','glass','ceilingRamp','goal'],indices=[];
 for(let i=0;i<kinds.length;i++){const start=indices.length;for(const g of data.groups)if(g.kind===kinds[i])indices.push(...data.indices.slice(g.start,g.start+g.count));geometry.addGroup(start,indices.length-start,i)}
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.75,side:T.DoubleSide,...extra});
 const materials=[metalMaterial(0xb6c8cc),metalMaterial(0x9db4c1),material(0x7dbbd0,{transparent:true,opacity:.12,depthWrite:false,roughness:.25}),metalMaterial(0x829aaa),metalMaterial(0xa3bac1)];
 const displayGeometry=applyArenaUV(geometry.toNonIndexed());geometry.dispose();
 const mesh=new T.Mesh(displayGeometry,materials);mesh.receiveShadow=true;scene.add(mesh);
 const lineBuckets=new Map();
 const line=(pts,color,opacity=.75)=>{const key=color+':'+opacity;if(!lineBuckets.has(key))lineBuckets.set(key,{color,opacity,vertices:[]});const list=lineBuckets.get(key).vertices;for(let i=1;i<pts.length;i++)list.push(...pts[i-1],...pts[i])};
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.receiveShadow=true;scene.add(m)};
 const ring=(height,inset=0)=>data.perimeter.map(p=>[p.x+p.nx*inset,height,p.z+p.nz*inset]);
 for(const y of [8,12,16]){const pts=ring(y);line([...pts,pts[0]],0x436579,.45)}
 for(let i=0;i<data.perimeter.length;i+=8){const p=data.perimeter[i],lo=Math.abs(p.z)>ARENA.length-.01&&Math.abs(p.x)<ARENA.goal?ARENA.goalHeight:4;line([[p.x,lo,p.z],[p.x,ARENA.height-ARENA.ramp,p.z]],0x5b7d8f,.38)}
 // Segmented team-colored trim follows the exact floor/fillet contact line.
 for(let i=0;i<data.perimeter.length;i++){const p=data.perimeter[i],q=data.perimeter[(i+1)%data.perimeter.length],rp=floorRadius(p),rq=floorRadius(q);line([[p.x+p.nx*rp,.035,p.z+p.nz*rp],[q.x+q.nx*rq,.035,q.z+q.nz*rq]],p.z>0?0x59c8ff:0xffb063)}
 const {width:W,length:L,goal:G,goalHeight:GH,goalBack:B}=ARENA;
 for(const s of [-1,1]){
  const color=s===1?0x53beff:0xffa455,z=s*L;
  for(const x of [-G,G]){box(.25,GH,.25,color,x,GH/2,z);for(let zz=L;zz<=B;zz+=1)line([[x,0,s*zz],[x,GH,s*zz]],0x4c7284,.5)}
  box(G*2,.25,.25,color,0,GH,z);
  for(let x=-G;x<=G;x+=1)line([[x,.05,s*(B-.015)],[x,GH,s*(B-.015)]],0x668b9b,.7);
  for(let y=1;y<GH;y++)line([[-G,y,s*(B-.015)],[G,y,s*(B-.015)]],0x668b9b,.7);
  box(G*2,.08,B-L,0x1e4547,0,-.03,s*(L+B)/2);
  for(let row=0;row<5;row++)box(W*2+15,1.1,2,0x243d4f,0,2+row*1.1,s*(B+4+row*2));
  line([[-17,.04,z-s*13],[-17,.04,z],[17,.04,z],[17,.04,z-s*13],[-17,.04,z-s*13]],color);
 }
 for(const {color,opacity,vertices} of lineBuckets.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));scene.add(new T.LineSegments(g,new T.LineBasicMaterial({color,transparent:true,opacity})))} 
 return mesh;
}

