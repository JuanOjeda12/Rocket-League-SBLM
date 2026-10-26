import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {cleanProfile} from '../catalog.js';import {startDiscovery,lanAddresses} from './discovery.mjs';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.md':'text/plain'};
export function createGameServer({port=Number(process.env.PORT)||8080,host=process.env.HOST||'0.0.0.0',discovery=true}={}){
 const rooms=new Map(),clients=new Set();let finder={peers:new Map(),close(){}};
 const send=(c,m)=>{if(c.ws.readyState===WebSocket.OPEN)c.ws.send(JSON.stringify(m))};
 const error=(c,message)=>send(c,{type:'error',message});
 const summary=r=>({id:r.id,name:r.name,blue:r.options.blue,orange:r.options.orange,players:r.occupants.size,max:r.options.blue+r.options.orange,password:!!r.hash,ready:r.ready,phase:r.last?.phase||'loading',difficulty:r.options.difficulty});
 const list=()=>[...rooms.values()].filter(r=>r.public).map(summary);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return}
  let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400).end();return}
  const json=value=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
  if(url.pathname==='/api/info'){json({name:'Rocket Arena',port:server.address()?.port,addresses:lanAddresses(),online:true});return}
  if(url.pathname==='/api/rooms'){json(list());return}
  if(url.pathname==='/api/discovery'){json([...finder.peers.values()].filter(p=>Date.now()-p.seen<12000));return}
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))}catch{res.writeHead(400).end();return}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes)}catch{res.writeHead(404).end('No encontrado')}
 });
 const wss=new WebSocketServer({server,path:'/socket',maxPayload:8192,perMessageDeflate:false});
 function closeRoom(room,message='El anfitrión cerró la sala.'){
  if(!rooms.has(room.id))return;rooms.delete(room.id);room.worker.terminate();
  for(const c of clients)if(c.room===room){send(c,{type:'closed',message});c.room=null;c.slot=null}
 }
 function leave(c){const room=c.room;if(!room)return;if(room.owner===c){closeRoom(room);return}if(c.slot!==null){room.occupants.delete(c.slot);room.worker.postMessage({type:'release',slot:c.slot})}if(room.pending.delete(c.id))send(room.owner,{type:'request-cancelled',pendingId:c.id});c.room=null;c.slot=null}
 function joined(c,room){send(c,{type:'joined',room:summary(room),slot:c.slot,owner:room.owner===c,options:room.options,state:room.last})}
 function workerState(room,m){
  if(!rooms.has(room.id))return;
  if(m.type==='ready'){room.ready=true;room.last=m.state;joined(room.owner,room)}
  if(m.type==='state'){room.last=m.state;const text=JSON.stringify({type:'snapshot',state:m.state});for(const c of clients)if(c.room===room&&c.slot!==null&&c.ws.readyState===WebSocket.OPEN&&c.ws.bufferedAmount<512000)c.ws.send(text)}
 }
 wss.on('connection',ws=>{
  if(clients.size>=40){ws.close(1013,'Servidor lleno');return}
  const c={ws,id:randomBytes(8).toString('hex'),room:null,slot:null,alive:true,rate:0,rateAt:Date.now(),attempts:0};clients.add(c);
  ws.on('pong',()=>c.alive=true);ws.on('error',()=>{});
  ws.on('close',()=>{leave(c);clients.delete(c)});
  ws.on('message',data=>{
   try{
    if(Date.now()-c.rateAt>1000){c.rateAt=Date.now();c.rate=0}if(++c.rate>100){ws.close(1008,'Demasiados mensajes');return}
    const m=JSON.parse(data),room=c.room;
    if(m.type==='create'){
     if(c.room)throw Error('Sal de la sala actual primero.');if(rooms.size>=(Number(process.env.MAX_ROOMS)||4))throw Error('El servidor no admite más salas por ahora.');
     const o=m.options||{},blue=Number(o.blue),orange=Number(o.orange);if(!Number.isInteger(blue)||blue<1||blue>5||!Number.isInteger(orange)||orange<1||orange>5)throw Error('Elige entre 1 y 5 puestos por equipo.');
     const password=String(o.password||'');if(password.length>64)throw Error('Contraseña demasiado larga.');if(o.public&&password.length<1)throw Error('Añade una contraseña a la sala pública.');
     const id=randomBytes(4).toString('hex').toUpperCase(),salt=randomBytes(16),options={blue,orange,difficulty:o.difficulty==='competitive'?'competitive':'casual'};
     const ownerSlot=o.team===1?blue:0;c.slot=ownerSlot;
     const worker=new Worker(new URL('./room-worker.mjs',import.meta.url),{workerData:{options,ownerSlot,profile:cleanProfile(m.profile)}});
     const r={id,name:String(o.name||'Partida privada').slice(0,40),public:!!o.public,salt,hash:password?scryptSync(password,salt,32):null,owner:c,occupants:new Map([[ownerSlot,c]]),pending:new Map(),worker,options,ready:false,last:null};
     c.room=r;rooms.set(id,r);send(c,{type:'loading',message:'Preparando la sala y su simulación…'});
     worker.on('message',m=>workerState(r,m));worker.on('error',e=>closeRoom(r,'No se pudo preparar la sala: '+e.message));return;
    }
    if(m.type==='join'){
     if(c.room)throw Error('Sal de la sala actual primero.');if(++c.attempts>12)throw Error('Demasiados intentos. Vuelve a conectar.');
     const r=rooms.get(String(m.id).toUpperCase());if(!r||!r.public)throw Error('Sala no disponible o privada.');if(!r.ready)throw Error('La sala todavía se está preparando.');
     const password=String(m.password||'');if(password.length>64||r.hash&&!timingSafeEqual(r.hash,scryptSync(password,r.salt,32)))throw Error('Contraseña incorrecta.');
     if(r.occupants.size>=r.options.blue+r.options.orange)throw Error('Sala llena.');
     c.room=r;c.profile=cleanProfile(m.profile);r.pending.set(c.id,c);send(c,{type:'pending',room:summary(r)});send(r.owner,{type:'admission',pendingId:c.id,name:c.profile.name});return;
    }
    if(m.type==='leave'){leave(c);send(c,{type:'left'});return}
    if(!room)throw Error('No estás en una sala.');
    if(m.type==='admit'){
     if(room.owner!==c)throw Error('Solo el anfitrión puede asignar equipos.');const guest=room.pending.get(String(m.pendingId));if(!guest)throw Error('La solicitud ya no está disponible.');
     if(m.team===-1){room.pending.delete(guest.id);guest.room=null;send(guest,{type:'rejected',message:'El anfitrión rechazó la solicitud.'});send(c,{type:'admitted',pendingId:guest.id});return}
     const team=Number(m.team);if(team!==0&&team!==1)throw Error('Equipo inválido.');const start=team===0?0:room.options.blue,end=team===0?room.options.blue:room.options.blue+room.options.orange;
     let slot=-1;for(let i=start;i<end;i++)if(!room.occupants.has(i)){slot=i;break}if(slot<0)throw Error('Ese equipo no tiene puestos de bot libres.');
     room.pending.delete(guest.id);room.occupants.set(slot,guest);guest.slot=slot;room.worker.postMessage({type:'assign',slot,profile:guest.profile});joined(guest,room);send(c,{type:'admitted',pendingId:guest.id});return;
    }
    if(c.slot===null)throw Error('Espera a que el anfitrión te asigne equipo.');
    if(m.type==='input'){
     const raw=m.controls||{},controls={};for(const key of ['throttle','steer','pitch','yaw','roll']){const v=Number(raw[key]);controls[key]=Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0}for(const key of ['jump','boost','handbrake'])controls[key]=raw[key]===true;
     room.worker.postMessage({type:'input',slot:c.slot,controls});return;
    }
    if(['start','reset','restart'].includes(m.type)&&room.owner!==c)throw Error('Solo el anfitrión puede iniciar o reiniciar.');
    if(['start','reset','restart','skip'].includes(m.type))room.worker.postMessage({type:m.type});
   }catch(e){error(c,e.message||'Solicitud inválida.')}
  });
 });
 const heartbeat=setInterval(()=>{for(const c of clients){if(!c.alive){c.ws.terminate();continue}c.alive=false;c.ws.ping()}},25000);heartbeat.unref();
 return{server,rooms,async listen(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve)});if(discovery)finder=startDiscovery(server.address().port,list);return server.address()},async close(){clearInterval(heartbeat);finder.close();for(const r of [...rooms.values()])closeRoom(r,'Servidor cerrado.');for(const c of clients)c.ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r))}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const game=createGameServer();const a=await game.listen();console.log(`Local: http://127.0.0.1:${a.port}`);for(const ip of lanAddresses())console.log(`LAN: http://${ip}:${a.port}`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>game.close().then(()=>process.exit(0)));
}

