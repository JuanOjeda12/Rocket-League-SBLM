export class RenderBudget{
 constructor(renderer,pixelRatio=1){this.renderer=renderer;this.maximum=Math.min(1.4,pixelRatio);this.ratio=this.maximum;this.average=16.7;this.samples=0;this.lastChange=0;this.lastShadow=0;renderer.setPixelRatio(this.ratio);renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true}
 update(ms,now,visible=true){
  if(visible&&ms>0&&ms<150){this.average=this.average*.97+ms*.03;this.samples++;
   if(this.samples>60&&now-this.lastChange>5000){let next=this.ratio;if(this.average>27)next=Math.max(.75,this.ratio*.85);else if(this.average<18&&this.ratio<this.maximum)next=Math.min(this.maximum,this.ratio+.1);
    if(Math.abs(next-this.ratio)>.03){this.ratio=next;this.renderer.setPixelRatio(next);this.lastChange=now;this.samples=0}
   }
  }
  if(now-this.lastShadow>50){this.renderer.shadowMap.needsUpdate=true;this.lastShadow=now}
 }
}
