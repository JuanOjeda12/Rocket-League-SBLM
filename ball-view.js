import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {BALL_RADIUS} from './proportions.js';
export function createBallVisual(radius=BALL_RADIUS){
 const ball=new T.Group();ball.name='Rocket League ball';ball.userData.modelLoaded=false;
 const placeholder=new T.Mesh(new T.SphereGeometry(radius,32,24),new T.MeshStandardMaterial({color:0xe7eee9,roughness:.45}));placeholder.castShadow=true;ball.add(placeholder);
 new GLTFLoader().load('./assets/ball/scene.gltf',g=>{
  const model=g.scene;model.updateMatrixWorld(true);
  const center=new T.Box3().setFromObject(model).getCenter(new T.Vector3()),point=new T.Vector3();let modelRadius=0;
  model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);modelRadius=Math.max(modelRadius,point.distanceTo(center))}o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=8});
  model.position.sub(center);const normalized=new T.Group();normalized.scale.setScalar(radius/modelRadius);normalized.add(model);
  ball.remove(placeholder);placeholder.geometry.dispose();placeholder.material.dispose();ball.add(normalized);ball.userData.modelLoaded=true;ball.userData.radius=radius;
 },undefined,e=>console.error('Rocket League ball model could not load',e));
 return ball;
}
