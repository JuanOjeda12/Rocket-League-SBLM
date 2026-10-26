export class ReplayBuffer {
 constructor(seconds=6){this.seconds=seconds;this.clear()}
 clear(){this.frames=[];this.last=-Infinity}
 record(time,state,force=false){
  if(!force&&time-this.last<1/30-1e-6)return;
  const snapshot=structuredClone(state),frame={time,state:snapshot};
  if(this.frames.length&&Math.abs(time-this.last)<1e-7)this.frames[this.frames.length-1]=frame;else this.frames.push(frame);
  this.last=time;
  while(this.frames.length>2&&this.frames[1].time<time-this.seconds)this.frames.shift();
 }
 clip(){return{frames:this.frames.slice(),start:this.frames[0]?.time||0,duration:this.frames.length>1?this.frames.at(-1).time-this.frames[0].time:0}}
 static sample(clip,time){
  const frames=clip?.frames;if(!frames?.length)return null;
  const t=clip.start+Math.max(0,Math.min(clip.duration,time));
  let low=0,high=frames.length-1;while(low+1<high){const mid=(low+high)>>1;if(frames[mid].time<=t)low=mid;else high=mid}
  const a=frames[low],b=frames[Math.min(low+1,frames.length-1)];return{a:a.state,b:b.state,alpha:b.time>a.time?(t-a.time)/(b.time-a.time):0};
 }
}
export class MatchFlow {
 constructor(onNextRound){this.onNextRound=onNextRound;this.score=[0,0];this.history=new ReplayBuffer();this.beginRound(false)}
 beginRound(duel){this.phase=duel?'kickoff':'live';this.clock=duel?3:0;this.time=0;this.playback=0;this.clip=null;this.history.clear()}
 record(state,dt){if(this.phase==='live'){this.time+=dt;this.history.record(this.time,state)}}
 goal(end,state){
  if(this.phase!=='live')return false;
  this.score[end<0?0:1]++;this.end=end;this.history.record(this.time,state,true);this.clip=this.history.clip();this.phase='goal';this.clock=1.15;return true;
 }
 update(dt){
  if(this.phase==='kickoff'){this.clock-=dt;if(this.clock<=0)this.phase='live'}
  else if(this.phase==='goal'){this.clock-=dt;if(this.clock<=0){this.phase='replay';this.playback=0}}
  else if(this.phase==='replay'){this.playback+=dt*.8;if(this.playback>this.clip.duration+.6)this.onNextRound()}
 }
 skip(){if(this.phase==='goal'||this.phase==='replay')this.onNextRound()}
 sample(){return this.phase==='replay'?ReplayBuffer.sample(this.clip,this.playback):null}
}
