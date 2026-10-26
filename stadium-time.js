export function stadiumTime(remaining=300,training=false,overtime=false){
 const elapsed=training?0:overtime?300:Math.max(0,Math.min(300,300-remaining));
 return{elapsed,segment:elapsed<=180?0:1,blend:elapsed<=180?elapsed/180:Math.min(1,(elapsed-180)/60),night:Math.max(0,Math.min(1,(elapsed-180)/60)),label:elapsed<135?'day':elapsed<240?'sunset':'night'};
}

// Exactly one short flight in each regulation minute, shared by every client.
export const AIR_EVENTS=Object.freeze([
 {start:18,duration:15,type:'birds',direction:1,z:-85,height:42},
 {start:83,duration:18,type:'plane',direction:-1,z:-115,height:58},
 {start:149,duration:15,type:'birds',direction:-1,z:-90,height:40},
 {start:211,duration:18,type:'plane',direction:1,z:95,height:53},
 {start:273,duration:15,type:'birds',direction:1,z:85,height:39}
]);
export function airEventAt(elapsed,training=false){if(training)return null;const index=AIR_EVENTS.findIndex(e=>elapsed>=e.start&&elapsed<e.start+e.duration);return index<0?null:{...AIR_EVENTS[index],index,progress:(elapsed-AIR_EVENTS[index].start)/AIR_EVENTS[index].duration}}
