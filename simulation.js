import {createMatchEngine} from './engine/adapter.js';
import {OpponentAI} from './opponent-ai.js';
import {MatchFlow} from './match-flow.js';
import {carById,cleanProfile} from './catalog.js';
import {MatchEvents} from './match-events.js';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const rotate=(v,sign)=>[v[0]*sign,v[1],v[2]*sign];
const axis=(v,sign)=>({x:v.x*sign,y:v.y,z:v.z*sign});
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function qlerp(a,b,t){const s=a.reduce((n,v,i)=>n+v*b[i],0)<0?-1:1,q=a.map((v,i)=>v+(b[i]*s-v)*t),n=Math.hypot(...q)||1;return q.map(v=>v/n)}
function blendState(a,b,t){return{...b,cars:b.cars.map((c,i)=>{const p=a.cars[i]||c;return{...c,position:lerp(p.position,c.position,t),quaternion:qlerp(p.quaternion,c.quaternion,t)}}),ball:{...b.ball,position:lerp(a.ball.position,b.ball.position,t),quaternion:qlerp(a.ball.quaternion,b.ball.quaternion,t)}}}
export class Simulation{
 static async create(options={}){const s=new Simulation();s.engine=await createMatchEngine();s.configure(options);return s}
 configure(options={}){
  this.options={blue:1,orange:1,difficulty:'casual',training:false,...options};
  this.options.blue=Math.max(1,Math.min(5,Number(this.options.blue)||1));this.options.orange=this.options.training?0:Math.max(1,Math.min(5,Number(this.options.orange)||1));
  this.live=this.engine.configure(this.options.blue,this.options.orange);this.profiles=this.live.cars.map(c=>({name:`BOT ${c.slot+1}`,body:'octane',color:c.team?'#ff8b32':'#248bff',human:false}));
  this.bots=this.live.cars.map(()=>new OpponentAI({difficulty:this.options.difficulty}));this.roles=[null,null];this.roleClock=0;this.events=new MatchEvents();this.flow=new MatchFlow(()=>this.nextRound());this.remaining=300;this.overtime=false;this.endAfterReplay=false;this.started=false;this.resetRound();
 }
 assign(slot,profile,human=true){if(!this.profiles[slot])throw Error('Puesto inválido');this.profiles[slot]={...cleanProfile(profile),human};this.engine.setBody(slot,carById(profile.body).kind);this.live=this.engine.state()}
 release(slot){const c=this.live.cars[slot];if(c)this.assign(slot,{name:`BOT ${slot+1}`,body:'octane',color:c.team?'#ff8b32':'#248bff'},false)}
 resetRound(){this.live=this.engine.reset();this.lastTouchTeam=null;this.bots?.forEach(b=>b.reset());this.roles=[null,null];this.roleClock=0;this.events?.resetRound();this.flow?.beginRound(!this.options.training)}
 nextRound(){if(this.endAfterReplay){this.flow.phase='finished';return}this.resetRound()}
 start(){this.started=true;this.resetRound()}
 restart(){this.remaining=300;this.overtime=false;this.endAfterReplay=false;this.flow.score=[0,0];this.start()}
 botInput(slot,dt){
  const ai=this.bots[slot];if(ai.time+dt<ai.nextThink){ai.time+=dt;return ai.controls}
  const self=this.live.cars[slot],sign=self.team?1:-1,convert=c=>({...c,position:rotate(c.position,sign),velocity:rotate(c.velocity,sign),forward:axis(c.forward,sign),right:axis(c.right,sign),up:axis(c.up,sign)});
  const team=this.live.cars.filter(c=>c.team===self.team&&!c.isDemoed&&!this.profiles[c.slot].human).sort((a,b)=>distance(a.position,this.live.ball.position)-distance(b.position,this.live.ball.position));
  const chaser=this.roles[self.team]??team[0]?.slot,rank=slot===chaser?0:1+team.filter(c=>c.slot!==chaser).findIndex(c=>c.slot===slot),ball={...this.live.ball,position:rotate(this.live.ball.position,sign),velocity:rotate(this.live.ball.velocity,sign)};
  const enemy=this.live.cars.find(c=>c.team!==self.team)||self;
  const state={opponent:convert(self),car:convert(enemy),ball,pads:this.live.pads.map(p=>({...p,position:rotate(p.position,sign)}))};
  if(rank>0){const [x,,z]=ball.position;state.targetOverride=rank===1?[Math.max(-29,Math.min(29,x+(slot%2?7:-7))),0,Math.max(-41,Math.min(30,z-9))]:[Math.max(-7,Math.min(7,x*.4+(rank-2)*3)),0,Math.max(-46,Math.min(-18,z-20))]}
  return this.bots[slot].update(state,dt);
 }
 tick(dt,inputs={}){
  if(!this.started||this.flow.phase==='finished')return;
  this.flow.update(dt);if(this.flow.phase!=='live')return;
  this.roleClock-=dt;
  if(this.roleClock<=0){this.roleClock=.2;for(const team of [0,1]){
   const sign=team?1:-1,ball=this.live.ball.position;
   const eligible=this.live.cars.filter(c=>c.team===team&&!c.isDemoed&&!this.profiles[c.slot].human);
   const cost=c=>{const dx=ball[0]-c.position[0],dz=ball[2]-c.position[2],angle=Math.abs(Math.atan2(c.forward.x*dz-c.forward.z*dx,c.forward.x*dx+c.forward.z*dz));return distance(c.position,ball)/18+angle*.35+(c.position[2]*sign>ball[2]*sign+2?.55:0)+(c.onGround?0:.4)-(this.roles[team]===c.slot?.35:0)};
   eligible.sort((a,b)=>cost(a)-cost(b));this.roles[team]=eligible[0]?.slot??null;
  }}
  const before=this.live,controls=this.live.cars.map(c=>this.profiles[c.slot].human?(inputs[c.slot]||{}):this.botInput(c.slot,dt));this.live=this.engine.step(controls);
  this.events.update(before,this.live,dt);
  const touch=this.live.cars.filter(c=>c.ballTouchAge>=0&&c.ballTouchAge<=dt*1.5).sort((a,b)=>a.ballTouchAge-b.ballTouchAge)[0];if(touch)this.lastTouchTeam=touch.team;this.live.ball.lastTouchTeam=this.lastTouchTeam;
  this.live.cars=this.live.cars.map(c=>({...c,profile:this.profiles[c.slot]}));this.flow.record(this.live,dt);
  if(this.live.goal){this.events.goal(this.live.goal,this.live.ball.position);this.flow.goal(this.live.goal,this.live)}
  if(!this.options.training){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining===0){if(this.flow.score[0]===this.flow.score[1])this.overtime=true;else if(this.flow.phase==='goal')this.endAfterReplay=true;else this.flow.phase='finished'}if(this.overtime&&this.flow.phase==='goal')this.endAfterReplay=true}
 }
 view(){
  let state=this.live;const replay=this.flow.sample();if(replay)state=blendState(replay.a,replay.b,replay.alpha);
  return{cars:state.cars.map(c=>({...c,profile:c.profile||this.profiles[c.slot]})),ball:state.ball,pads:state.pads,events:this.events.list,phase:!this.started?'lobby':this.flow.phase,score:[...this.flow.score],countdown:this.flow.clock,goalEnd:this.flow.end||1,replayProgress:this.flow.clip?Math.min(1,this.flow.playback/Math.max(.01,this.flow.clip.duration)):0,remaining:this.remaining,overtime:this.overtime,training:this.options.training,difficulty:this.options.difficulty};
 }
 skip(){this.flow.skip()}
}
