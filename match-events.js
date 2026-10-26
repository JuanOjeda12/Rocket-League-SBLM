import {incomingShot} from './ball-prediction.js';
export class MatchEvents{
 constructor(){this.serial=0;this.time=0;this.list=[];this.resetRound()}
 resetRound(){this.pending=[];this.lastAward=new Map();this.contactCooldown=new Map();this.list=[]}
 emit(type,details){const event={id:++this.serial,type,...details};this.list.push(event);this.list=this.list.slice(-12);return event}
 goal(end,position){this.pending=[];this.emit('goal',{end,position:[...position],team:end<0?0:1})}
 update(before,after,dt){
  this.time+=dt;
  if(after.goal){this.pending=[];return}
  for(const car of after.cars){
   if(car.ballTouchAge<0||car.ballTouchAge>dt*1.5||car.isDemoed||this.time-(this.contactCooldown.get(car.slot)??-99)<.12)continue;
   this.contactCooldown.set(car.slot,this.time);
   const shot=incomingShot(before.ball,car.team);
   if(!shot||this.time-(this.lastAward.get(car.slot)??-99)<2.5)continue;
   this.pending.push({slot:car.slot,team:car.team,due:this.time+.22,deadline:this.time+shot.time,epic:shot.time<.7||car.position[2]*shot.end>45,position:[...car.position]});
  }
  const keep=[];
  for(const save of this.pending){
   if(this.time<save.due){keep.push(save);continue}
   const still=incomingShot(after.ball,save.team);
   if(!still&&this.time-(this.lastAward.get(save.slot)??-99)>2.5){this.emit(save.epic?'epic-save':'save',{slot:save.slot,team:save.team,position:save.position});this.lastAward.set(save.slot,this.time)}
  }
  this.pending=keep;
 }
}
