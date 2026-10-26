import * as T from './vendor/three.module.js';
import {softGlow} from './boost-visual.js';
// One atlas, one plane per spectator, one instanced draw call. No 3D crowd bodies.
export function createCrowd(scene,people){
 const colors=['#78b8ed','#edaa67','#9fc682','#db8499','#d9d5c4','#aa96d0','#64a8a8','#d8c268'];
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');
 colors.forEach((color,i)=>{
  const x=i*64;ctx.save();ctx.translate(x,0);const g=ctx.createRadialGradient(24,38,5,32,58,44);g.addColorStop(0,'#ffffff');g.addColorStop(.24,color);g.addColorStop(1,'#324358');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(32,10);ctx.bezierCurveTo(15,10,7,57,8,79);ctx.bezierCurveTo(8,105,56,105,56,79);ctx.bezierCurveTo(57,57,49,10,32,10);ctx.fill();
  for(const ex of [24,40]){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,49,5,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#15283d';ctx.beginPath();ctx.ellipse(ex,51,2.4,4,0,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='#31445a';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(32,64,5,0,Math.PI);ctx.stroke();ctx.restore();
 });
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;
 const geometry=new T.PlaneGeometry(.76,1.13),indices=new Float32Array(people.length);
 geometry.setAttribute('eggIndex',new T.InstancedBufferAttribute(indices,1));
 const material=new T.MeshBasicMaterial({map:texture,alphaTest:.18,side:T.DoubleSide,color:0xd3dbea});
 const time={value:0};material.onBeforeCompile=shader=>{
  shader.uniforms.crowdTime=time;shader.vertexShader='attribute float eggIndex;uniform float crowdTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv.x=(vMapUv.x+eggIndex)/8.0;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=sin(crowdTime*2.6+instanceMatrix[3].x*.7+instanceMatrix[3].z*.45)*.026;');
 };
 const mesh=new T.InstancedMesh(geometry,material,people.length),dummy=new T.Object3D();
 people.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);indices[i]=(i*13+p.row*3+p.tier)%8});
 mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
 const lightPositions=[],lightColors=[];people.forEach((p,i)=>{if(i%37)return;lightPositions.push(p.x+Math.sin(p.angle)*.12,p.y+.38,p.z+Math.cos(p.angle)*.12);const c=new T.Color(i%2?0xa1dbff:0xffd2a4);lightColors.push(c.r,c.g,c.b)});
 const lightsGeometry=new T.BufferGeometry();lightsGeometry.setAttribute('position',new T.Float32BufferAttribute(lightPositions,3));lightsGeometry.setAttribute('color',new T.Float32BufferAttribute(lightColors,3));const lightMaterial=new T.PointsMaterial({map:softGlow(),vertexColors:true,size:.75,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});const lights=new T.Points(lightsGeometry,lightMaterial);scene.add(lights);
 return{count:people.length,triangles:people.length*2,update(t,night=0){time.value=t;material.color.setScalar(1-night*.27);lightMaterial.opacity=night*.9;lights.visible=night>.01},mesh};
}
