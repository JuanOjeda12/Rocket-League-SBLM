import * as T from './vendor/three.module.js';
import {airEventAt} from './stadium-time.js';
import {softGlow} from './boost-visual.js';
export function createAirTraffic(scene){
 const plane=new T.Group(),white=new T.MeshStandardMaterial({color:0xe3e8ee,roughness:.65}),blue=new T.MeshStandardMaterial({color:0x2782bd,roughness:.6});
 const body=new T.Mesh(new T.CylinderGeometry(.24,.3,5.2,8),white);body.rotation.z=Math.PI/2;plane.add(body);
 const nose=new T.Mesh(new T.ConeGeometry(.24,.7,8),white);nose.rotation.z=-Math.PI/2;nose.position.x=2.9;plane.add(nose);
 function triangles(vertices,material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const m=new T.Mesh(g,material);plane.add(m);return m}
 const wingsMaterial=white.clone();wingsMaterial.side=T.DoubleSide;
 for(const side of [-1,1]){triangles([1,0,0,-1.1,0,side*3.8,-2,0,side*3.8,1,0,0,-2,0,side*3.8,-.8,0,0],wingsMaterial);triangles([-1.7,.15,0,-2.6,.15,side*1.35,-2.9,.15,0],wingsMaterial)}
 const tailMaterial=blue.clone();tailMaterial.side=T.DoubleSide;triangles([-2.7,0,0,-2.5,1.1,0,-1.4,0,0],tailMaterial);
 for(const side of [-1,1]){const light=new T.Sprite(new T.SpriteMaterial({map:softGlow(),color:side<0?0xff5e4c:0x9bffd7,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));light.position.set(-1.5,0,side*3.8);light.scale.setScalar(.55);plane.add(light)}
 const trailGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-1,.05,-.8),new T.Vector3(-18,.05,-.8),new T.Vector3(-1,.05,.8),new T.Vector3(-18,.05,.8)]);plane.add(new T.LineSegments(trailGeometry,new T.LineBasicMaterial({color:0xe9edf5,transparent:true,opacity:.22,depthWrite:false})));
 plane.visible=false;scene.add(plane);
 const birdGeometry=new T.BufferGeometry();birdGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,-.18,-.75,0,.12,-.2,0,.32,0,0,-.18,.2,0,.32,.75,0,.12],3));birdGeometry.computeVertexNormals();
 const birdMaterial=new T.MeshBasicMaterial({color:0x283343,side:T.DoubleSide}),time={value:0};birdMaterial.onBeforeCompile=shader=>{shader.uniforms.birdTime=time;shader.vertexShader='uniform float birdTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y+=abs(position.x)*sin(birdTime*8.0+instanceMatrix[3].x*1.7)*.65;')};
 const birds=new T.InstancedMesh(birdGeometry,birdMaterial,7);birds.frustumCulled=false;birds.visible=false;scene.add(birds);const dummy=new T.Object3D();
 return{update(elapsed,training,night){const event=airEventAt(elapsed,training);plane.visible=event?.type==='plane';birds.visible=event?.type==='birds';if(!event)return null;
  const x=(event.progress*250-125)*event.direction;
  if(plane.visible){plane.position.set(x,event.height+Math.sin(event.progress*Math.PI)*2,event.z);plane.rotation.y=event.direction>0?0:Math.PI;white.color.setScalar(1-night*.3)}
  if(birds.visible){time.value=elapsed;birdMaterial.color.setHex(night>.5?0x8b9cb3:0x283343);for(let i=0;i<7;i++){const row=Math.ceil(i/2),side=i%2?1:-1;dummy.position.set(x-row*1.1*event.direction,event.height+Math.sin(elapsed+i)*.16,event.z+side*row*1.3);dummy.rotation.y=event.direction>0?-Math.PI/2:Math.PI/2;dummy.updateMatrix();birds.setMatrixAt(i,dummy.matrix)}birds.instanceMatrix.needsUpdate=true}
  return event.index;
 }};
}
