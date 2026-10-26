import createRocketSim from './dist/rocketsim.js';

// Coordinates are converted from Rocket League to Three.js meters:
// RL (x,y,z) -> Three (x,z,-y) / 100.
export async function createPhysics() {
  const m = await createRocketSim();
  m._rs_init();
  let accumulator = 0;
  const padCount=m._rs_pad_count();
  const vector = (data, i, scale = 1) => ({ x: data[i] * scale, y: data[i + 2] * scale, z: -data[i + 1] * scale });
  const state = () => {
    const ptr = m._rs_state() / 4;
    const d = m.HEAPF32.subarray(ptr, ptr + 36);
    const forward = vector(d, 3), right = vector(d, 6), up = vector(d, 9);
    const padPtr=m._rs_pads()/4;const padData=m.HEAPF32.subarray(padPtr,padPtr+padCount*6);
    const pads=Array.from({length:padCount},(_,id)=>{const i=id*6;return {id,position:vector(padData,i,.01),isBig:!!padData[i+3],active:!!padData[i+4],cooldown:padData[i+5]};});
    const opponentPtr=m._rs_opponent_state();let opponent=null;
    if(opponentPtr){const o=m.HEAPF32.subarray(opponentPtr/4,opponentPtr/4+20),forward=vector(o,3),right=vector(o,6),up=vector(o,9);opponent={position:vector(o,0,.01),forward,right,up,quaternion:quaternion(right,up,forward),velocity:vector(o,12,.01),boost:o[15],onGround:!!o[16],isFlipping:!!o[17],isBoosting:!!o[18],isDemoed:!!o[19]};}
    return {
      opponent,
      car: { position: vector(d, 0, .01), forward, right, up, quaternion: quaternion(right, up, forward), velocity: vector(d, 12, .01), boost: d[30], onGround: !!d[31], isFlipping: !!d[33], isBoosting: !!d[34], isDemoed: !!d[35] },
      ball: { position: vector(d, 15, .01), velocity: vector(d, 18, .01), forward: vector(d, 21), right: vector(d, 24), up: vector(d, 27), quaternion: quaternion(vector(d,24), vector(d,27), vector(d,21)) },
      pads,
      goal: d[32] ? (d[16] > 0 ? -1 : 1) : 0,
    };
  };
  return {
    name: 'RocketSim',
    enableOpponent(enabled){m._rs_enable_opponent(+!!enabled);return state();},
    state,
    reset() { accumulator = 0; m._rs_reset(); return state(); },
    step(dt, input = {}, opponentInput = {}) {
      accumulator += Math.min(dt, .1);
      const ticks = Math.floor(accumulator * 120);
      if (ticks > 0) {
        accumulator -= ticks / 120;
        m._rs_opponent_controls(opponentInput.throttle||0,-(opponentInput.steer||0),opponentInput.pitch||0,-(opponentInput.yaw||0),-(opponentInput.roll||0),+!!opponentInput.jump,+!!opponentInput.boost,+!!opponentInput.handbrake);
        m._rs_step(ticks, input.throttle || 0, -(input.steer || 0), input.pitch || 0, -(input.yaw || 0), -(input.roll || 0), +!!input.jump, +!!input.boost, +!!input.handbrake);
      }
      return state();
    },
  };
}

function quaternion(right, up, forward) {
  // Matrix columns correspond to local +X, +Y and +Z (car nose is -Z).
  const a=-right.x,b=up.x,c=-forward.x,d=-right.y,e=up.y,f=-forward.y,g=-right.z,h=up.z,i=-forward.z;
  const trace=a+e+i;
  let x,y,z,w,s;
  if(trace>0){s=2*Math.sqrt(trace+1);w=s/4;x=(h-f)/s;y=(c-g)/s;z=(d-b)/s;}
  else if(a>e&&a>i){s=2*Math.sqrt(1+a-e-i);w=(h-f)/s;x=s/4;y=(b+d)/s;z=(c+g)/s;}
  else if(e>i){s=2*Math.sqrt(1+e-a-i);w=(c-g)/s;x=(b+d)/s;y=s/4;z=(f+h)/s;}
  else{s=2*Math.sqrt(1+i-a-e);w=(d-b)/s;x=(c+g)/s;y=(f+h)/s;z=s/4;}
  return [x,y,z,w];
}

export async function createEngine() {
  const physics = await createPhysics();
  const array = v => [v.x,v.y,v.z];
  const convert = s => ({...s, opponent:s.opponent?{...s.opponent,position:array(s.opponent.position),velocity:array(s.opponent.velocity)}:null, car:{...s.car,position:array(s.car.position),velocity:array(s.car.velocity)},ball:{...s.ball,position:array(s.ball.position),velocity:array(s.ball.velocity)},pads:s.pads.map(p=>({...p,position:array(p.position)}))});
  return { ...physics, state(){return convert(physics.state());},reset(){return convert(physics.reset());},enableOpponent(enabled){return convert(physics.enableOpponent(enabled));},step(input = {},opponentInput = {}) { return convert(physics.step(1/120,input,opponentInput)); } };
}



// Indexed API shared by the offline client and authoritative LAN server.
export async function createMatchEngine(){
 const m=await createRocketSim();m._rs_init();
 const vec=(d,i,s=.01)=>[d[i]*s,d[i+2]*s,-d[i+1]*s];
 const axis=(d,i)=>{const a=vec(d,i,1);return{x:a[0],y:a[1],z:a[2]}};
 const state=()=>{
  const raw=m._rs_state()/4,d=m.HEAPF32.subarray(raw,raw+36);
  const ptr=m._rs_roster_state()/4,n=m._rs_roster_count(),r=m.HEAPF32.subarray(ptr,ptr+n*24);
  const cars=Array.from({length:n},(_,slot)=>{const i=slot*24,forward=axis(r,i+5),right=axis(r,i+8),up=axis(r,i+11);return{slot,team:r[i+1],position:vec(r,i+2),forward,right,up,quaternion:quaternion(right,up,forward),velocity:vec(r,i+14),boost:r[i+17],onGround:!!r[i+18],isFlipping:!!r[i+19],isBoosting:!!r[i+20],isDemoed:!!r[i+21],bodyKind:r[i+22],ballTouchAge:r[i+23]<0?-1:r[i+23]/120}});
  const bp=m._rs_pads()/4,count=m._rs_pad_count(),p=m.HEAPF32.subarray(bp,bp+count*6);
  const pads=Array.from({length:count},(_,id)=>{const i=id*6;return{id,position:vec(p,i),isBig:!!p[i+3],active:!!p[i+4],cooldown:p[i+5]}});
  return{cars,ball:{position:vec(d,15),velocity:vec(d,18),quaternion:quaternion(axis(d,24),axis(d,27),axis(d,21))},pads,goal:d[32]?(d[16]>0?-1:1):0};
 };
 return{
  configure(blue=1,orange=1){m._rs_configure_match(blue,orange);return state()},
  reset(){m._rs_reset();return state()},state,
  setBody(slot,kind){m._rs_slot_body(slot,kind)},
  step(controls=[]){for(let i=0;i<m._rs_roster_count();i++){const c=controls[i]||{};m._rs_slot_controls(i,c.throttle||0,-(c.steer||0),c.pitch||0,-(c.yaw||0),-(c.roll||0),+!!c.jump,+!!c.boost,+!!c.handbrake)}m._rs_match_step(1);return state()},
  placeBall(x,y,z,vx,vy,vz){m._rs_place_ball(x*100,-z*100,y*100,vx*100,-vz*100,vy*100);return state()},
  placeCar(x,y,z,yaw=Math.PI/2){m._rs_place_car(x*100,-z*100,y*100,yaw);return state()}
 };
}
