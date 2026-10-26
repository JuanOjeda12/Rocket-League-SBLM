export const CARS=[
 {id:'octane',name:'Octane',path:'./assets/octane.glb',kind:0,rotation:Math.PI/2,length:1.4,tint:/Paint|Octane_Body/i,credit:'Jako · CC BY 4.0'},
 {id:'fennec',name:'Fennec',path:'./assets/cars/fennec/scene.gltf',kind:1,rotation:Math.PI/2,length:1.43,tint:/Paint|Fennec.*Body/i,credit:'Jako · CC BY 4.0'},
 {id:'dominus',name:'Dominus',path:'./assets/cars/dominus/scene.gltf',kind:2,rotation:Math.PI/2,length:1.56,tint:/Paint|Dominus_Body/i,credit:'Jako · CC BY 4.0'},
 {id:'f1',name:'F1 Concept',path:'./assets/cars/f1/scene.glb',kind:3,rotation:-Math.PI/2,length:1.95,tint:/chassis|sidepod|halo|engine.cover|mirrors/i,credit:'Qvist_designs · CC BY 4.0 · concepto F1, no modelo oficial de RL'}
];
export const carById=id=>CARS.find(c=>c.id===id)||CARS[0];
export function cleanProfile(p={}){return{name:String(p.name||'Jugador').replace(/[\x00-\x1f]/g,'').slice(0,24),body:carById(p.body).id,color:/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'#248bff'}}
