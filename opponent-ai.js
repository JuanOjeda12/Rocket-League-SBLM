import {predictBall} from './ball-prediction.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
export class OpponentAI {
 constructor(options={}){this.difficulty=options.difficulty||'competitive';this.reset()}
 reset(){this.time=0;this.nextThink=0;this.stuck=0;this.reverseUntil=0;this.jumpStart=-100;this.jumpReady=0;this.controls={};this.intent='Intercept';this.previousPosition=null}
 update(state,dt){
  this.time+=dt;
  if(this.time<this.nextThink)return this.controls;
  const hard=this.difficulty==='competitive',think=hard?.05:.12;
  this.nextThink=this.time+think;
  const car=state.opponent;if(!car||car.isDemoed)return this.controls={};
  const p=car.position,b=state.ball.position,f=car.forward,up=car.up,speed=Math.hypot(car.velocity[0],car.velocity[2]),ballDistance=distance(p,b);
  let intercept=predictBall(state.ball,.15),arrival=.15;
  // Find a reachable low interception instead of steering at the ball's old position.
  for(let t=.15;t<=2.4;t+=.12){
   const candidate=predictBall(state.ball,t),d=distance(p,candidate),dx=candidate[0]-p[0],dz=candidate[2]-p[2];
   const angle=Math.abs(Math.atan2(f.x*dz-f.z*dx,f.x*dx+f.z*dz));
   const travel=Math.max(0,t-angle*.22),reach=Math.min(23*travel,speed*travel+(car.boost>5?7.5:4.5)*travel*travel);
   intercept=candidate;arrival=t;if(d<reach+1.2&&candidate[1]<(hard?3.5:2))break;
  }
  if(ballDistance<4&&b[1]<2.8){arrival=clamp(ballDistance/Math.max(8,speed),.02,.28);intercept=predictBall(state.ball,arrival)}
  const keeperX=state.car.position[0],aimX=Math.abs(keeperX)<5?(intercept[0]>=0?5.2:-5.2):clamp(-keeperX*.5,-4.5,4.5);
  let sx=aimX-intercept[0],sz=53-intercept[2],sl=Math.hypot(sx,sz);sx/=sl;sz/=sl;
  const behind=(p[0]-intercept[0])*sx+(p[2]-intercept[2])*sz;
  const side=Math.abs((p[0]-intercept[0])*sz-(p[2]-intercept[2])*sx);
  const setup=clamp(ballDistance*.18,.5,3);
  let target=[intercept[0]-sx*setup,0,intercept[2]-sz*setup];this.intent='Intercept';
  // Commit through the ball when aligned. A distant setup point otherwise causes endless circles.
  if(behind<-.2&&side<Math.max(1.4,ballDistance*.35)||ballDistance<2.6){target=[intercept[0]+sx*1.4,0,intercept[2]+sz*1.4];this.intent='Strike'}
  if(behind>1&&ballDistance<10&&intercept[2]>-35){const lateral=(p[0]-intercept[0]>=0?1:-1);target=[intercept[0]+lateral*4,0,intercept[2]-5];this.intent='Rotate behind'}
  // Clear danger immediately, even when the perfect shot setup is unavailable.
  if(b[2]<-34&&state.ball.velocity[2]<1&&ballDistance<12){target=[intercept[0],0,intercept[2]+.8];this.intent='Clear'}
  if(state.targetOverride){target=state.targetOverride;this.intent='Support'}
  target=[clamp(target[0],-38.5,38.5),0,clamp(target[2],-49,50)];
  // Collect only pads roughly along the route; never abandon a nearby ball for fuel.
  if(car.boost<15&&ballDistance>18&&b[2]>-28){
   let best=null,cost=Infinity;const direct=distance(p,target);
   for(const pad of state.pads||[])if(pad.active){const d=distance(p,pad.position),detour=d+distance(pad.position,target)-direct;if(d<15&&detour<3&&(pad.isBig||d<7)&&detour<cost){best=pad;cost=detour}}
   if(best){target=best.position;this.intent='Collect boost'}
  }
  const dx=target[0]-p[0],dz=target[2]-p[2],len=Math.max(.01,Math.hypot(dx,dz));
  const angle=Math.atan2(f.x*dz-f.z*dx,f.x*dx+f.z*dz),turn=Math.abs(angle);
  let steer=clamp(angle*(hard?3.2:2.7),-1,1),desired=hard?23:17;
  if(turn>1.4)desired=5;else if(turn>.8)desired=9;else if(turn>.4)desired=14;
  if(state.targetOverride)desired=Math.min(desired,Math.max(0,len*2));
  if(intercept[1]>3&&ballDistance<9&&!state.targetOverride)desired=Math.min(desired,Math.max(3,ballDistance/Math.max(.25,arrival)));
  let throttle=speed>desired+1?-.8:speed>desired?0:1,handbrake=turn>1.25&&speed>7;
  const forwardSpeed=car.velocity[0]*f.x+car.velocity[2]*f.z;
  // Reverse into a close ball rather than taking a full circle around it.
  if(turn>2.3&&len<8&&speed<7){throttle=-1;steer=-steer;handbrake=false;this.intent='Reverse challenge'}
  if(this.previousPosition&&distance(p,this.previousPosition)<.025&&Math.abs(throttle)>.5&&car.onGround)this.stuck+=think;else this.stuck=Math.max(0,this.stuck-think*2);
  this.previousPosition=[...p];
  if(this.stuck>.8){this.reverseUntil=this.time+.65;this.stuck=0}
  if(this.time<this.reverseUntil){throttle=-1;steer=angle>0?-1:1;handbrake=false;this.intent='Unstick'}
  if(p[1]>2&&car.onGround&&up.y<.7){throttle=1;steer=clamp(Math.atan2(f.x*(-p[2])-f.z*(-p[0]),f.x*(-p[0])+f.z*(-p[2]))*3,-1,1);this.intent='Return to field'}
  if(this.time>this.jumpReady){
   const hitTime=ballDistance/Math.max(5,forwardSpeed);
   if(car.onGround&&!state.targetOverride&&turn<.25&&b[1]>(hard?1.55:1.8)&&b[1]<4.2&&hitTime<.4&&ballDistance<7){this.jumpStart=this.time;this.jumpReady=this.time+1.3}
   else if(hard&&car.onGround&&!state.targetOverride&&turn<.1&&ballDistance>1.6&&ballDistance<2.4&&b[1]<1.5&&speed>13){this.jumpStart=this.time;this.jumpReady=this.time+1.6}
   else if(!car.onGround&&up.y<.25&&speed<2&&p[1]<1){this.jumpStart=this.time;this.jumpReady=this.time+1.5}
  }
  const age=this.time-this.jumpStart,jump=age<.16||(hard&&age>.21&&age<.29&&b[1]<2.4),pitch=age>.21&&age<.32&&hard?-1:!car.onGround?clamp(-f.y*2,-1,1):0;
  const boost=throttle>0&&turn<.18&&speed<22.5&&car.boost>0&&up.y>.7&&car.onGround&&len>3&&this.time>=this.reverseUntil;
  if(!hard&&throttle>0)throttle*=.85;
  this.controls={throttle,steer,handbrake,boost:boost&&(hard||this.time%2<.8),jump,pitch,yaw:!car.onGround?steer:0,roll:!car.onGround?clamp(-car.right.y*2,-1,1):0};
  return this.controls;
 }
}
