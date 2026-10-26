// Shared by the renderer, collision-mesh builder and camera boundary handling.
export const ARENA={width:40.96,length:51.2,height:20.44,corner:11.52,ramp:2.56,goal:8.92755,goalHeight:6.42775,goalBack:60};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function arenaPerimeter(){
 const {width:W,length:L,corner:R}=ARENA,points=[];
 const push=(x,z,nx,nz)=>{const last=points.at(-1);if(!last||Math.hypot(last.x-x,last.z-z)>1e-7)points.push({x,z,nx,nz})};
 for(let q=0;q<4;q++){
  const cx=(q===0||q===3?1:-1)*(W-R),cz=(q<2?1:-1)*(L-R);
  for(let j=0;j<=48;j++){const a=q*Math.PI/2+j/48*Math.PI/2;push(cx+R*Math.cos(a),cz+R*Math.sin(a),-Math.cos(a),-Math.sin(a))}
  const a=(q+1)*Math.PI/2,nq=(q+1)%4,ncx=(nq===0||nq===3?1:-1)*(W-R),ncz=(nq<2?1:-1)*(L-R);
  const from=points.at(-1),to={x:ncx+R*Math.cos(a),z:ncz+R*Math.sin(a)};
  const count=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/2),ts=[];
  for(let j=1;j<count;j++)ts.push(j/count);
  if(Math.abs(to.z-from.z)<1e-6)for(const x of [-ARENA.goal-3,-ARENA.goal,ARENA.goal,ARENA.goal+3]){const t=(x-from.x)/(to.x-from.x);if(t>0&&t<1)ts.push(t)}
  ts.sort((a,b)=>a-b);for(const t of ts)push(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,-Math.cos(a),-Math.sin(a));
 }
 return points;
}
export function floorRadius(p){
 // Fade the end-wall ramp into the goalposts, leaving the goal mouth flat.
 return Math.abs(p.z)>ARENA.length-1e-5?ARENA.ramp*smooth((Math.abs(p.x)-ARENA.goal)/3):ARENA.ramp;
}
export function createArenaGeometry(){
 const positions=[],indices=[],groups=[],map=new Map(),perimeter=arenaPerimeter();
 const index=p=>{const key=p.map(v=>v.toFixed(6)).join(',');if(map.has(key))return map.get(key);const i=positions.length/3;positions.push(...p);map.set(key,i);return i};
 const quad=(a,b,c,d,normal,kind,collide=true)=>{
  const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(cross.reduce((s,x,i)=>s+x*normal[i],0)<0)[b,d]=[d,b];
  const ids=[a,b,c,d].map(index),start=indices.length;
  for(const t of [[0,1,2],[0,2,3]]){const p=t.map(i=>ids[i]);if(new Set(p).size===3)indices.push(...p)}
  if(indices.length>start)groups.push({start,count:indices.length-start,kind,collide});
 };
 const lower=(p,t)=>{const r=floorRadius(p),a=t*Math.PI/2;return[p.x+p.nx*r*(1-Math.sin(a)),r*(1-Math.cos(a)),p.z+p.nz*r*(1-Math.sin(a))]};
 const upper=(p,t)=>{const r=ARENA.ramp,a=t*Math.PI/2;return[p.x+p.nx*r*(1-Math.sin(a)),ARENA.height-r*(1-Math.cos(a)),p.z+p.nz*r*(1-Math.sin(a))]};
 for(let i=0;i<perimeter.length;i++){
  const p=perimeter[i],q=perimeter[(i+1)%perimeter.length],normal=[p.nx+q.nx,0,p.nz+q.nz];
  const goal=Math.abs((p.z+q.z)/2)>ARENA.length-1e-5&&Math.abs((p.x+q.x)/2)<ARENA.goal-1e-5;
  if(!goal)for(let j=0;j<32;j++)quad(lower(p,j/32),lower(q,j/32),lower(q,(j+1)/32),lower(p,(j+1)/32),[normal[0],2,normal[2]],'ramp');
  for(let j=0;j<24;j++)quad(upper(p,j/24),upper(q,j/24),upper(q,(j+1)/24),upper(p,(j+1)/24),[normal[0],-2,normal[2]],'ceilingRamp');
  const loP=goal?ARENA.goalHeight:floorRadius(p),loQ=goal?ARENA.goalHeight:floorRadius(q),hi=ARENA.height-ARENA.ramp;
  const sidePlane=Math.abs(Math.abs(p.x)-ARENA.width)<1e-5&&Math.abs(Math.abs(q.x)-ARENA.width)<1e-5;
  const split=4;
  if(!goal)quad([p.x,loP,p.z],[q.x,loQ,q.z],[q.x,split,q.z],[p.x,split,p.z],normal,'wall',!sidePlane);
  quad([p.x,Math.max(split,loP),p.z],[q.x,Math.max(split,loQ),q.z],[q.x,hi,q.z],[p.x,hi,p.z],normal,'glass',!sidePlane);
 }
 // Exact 2044uu ceiling, with the engine's 2048uu plane as backing only.
 // This collision-only cap joins the upper fillets at their shared vertices.
 for(let i=0;i<perimeter.length;i++)quad([0,ARENA.height,0],upper(perimeter[i],0),upper(perimeter[(i+1)%perimeter.length],0),[0,ARENA.height,0],[0,-1,0],'ceiling');
 // Recessed goals retain an unobstructed floor, posts and crossbar opening.
 const {goal:G,goalHeight:GH,length:L,goalBack:B}=ARENA;
 for(const s of [-1,1]){
  quad([-G,0,s*B],[G,0,s*B],[G,GH,s*B],[-G,GH,s*B],[0,0,-s],'goal');
  for(const x of [-G,G])quad([x,0,s*L],[x,0,s*B],[x,GH,s*B],[x,GH,s*L],[-Math.sign(x),0,0],'goal');
  quad([-G,GH,s*L],[G,GH,s*L],[G,GH,s*B],[-G,GH,s*B],[0,-1,0],'goal');
 }
 return{positions,indices,groups,perimeter};
}

export function constrainArenaCamera(p,margin=.18){
 const {width:W,length:L,corner:R,goal:G,goalHeight:GH,goalBack:B,ramp:r,height:H}=ARENA;
 p.y=Math.max(margin,Math.min(H-margin,p.y));
 p.x=Math.max(-W+margin,Math.min(W-margin,p.x));
 const inGoal=Math.abs(p.x)<G-margin&&p.y<GH-margin;
 const end=inGoal?B:L;
 p.z=Math.max(-end+margin,Math.min(end-margin,p.z));
 if(!inGoal){
  // Signed-distance clamp for the rounded rectangle, including lower/upper fillets.
  const h=Math.min(p.y,H-p.y),inset=h<r?r-Math.sqrt(Math.max(0,r*r-(r-h)*(r-h))):0;
  const dx=Math.max(Math.abs(p.x)-(W-R),0),dz=Math.max(Math.abs(p.z)-(L-R),0),d=Math.hypot(dx,dz),limit=R-inset-margin;
  if(d>limit){p.x=Math.sign(p.x)*(Math.min(Math.abs(p.x),W-R)+dx*limit/d);p.z=Math.sign(p.z)*(Math.min(Math.abs(p.z),L-R)+dz*limit/d)}
 }
 return p;
}
