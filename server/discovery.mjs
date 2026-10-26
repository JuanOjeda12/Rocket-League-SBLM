import dgram from 'node:dgram';
import os from 'node:os';
export function lanAddresses(){return Object.values(os.networkInterfaces()).flat().filter(a=>a&&a.family==='IPv4'&&!a.internal).map(a=>a.address)}
export function startDiscovery(port,summaries){
 const peers=new Map();if(process.env.DISABLE_DISCOVERY==='1')return{peers,close(){}};
 const socket=dgram.createSocket({type:'udp4',reuseAddr:true});let timer;
 socket.on('error',()=>{});
 socket.on('message',(buffer,remote)=>{try{if(buffer.length>12000)return;const packet=JSON.parse(buffer);if(packet.kind!=='rocket-arena-lan'||packet.port<1||packet.port>65535||!Array.isArray(packet.rooms))return;const url=`http://${remote.address}:${packet.port}`;peers.set(url,{url,name:String(packet.name).slice(0,80),rooms:packet.rooms.slice(0,8),seen:Date.now()})}catch{}});
 socket.bind(9182,'0.0.0.0',()=>{
  socket.setBroadcast(true);
  const announce=()=>{const packet=Buffer.from(JSON.stringify({kind:'rocket-arena-lan',port,name:os.hostname(),rooms:summaries()}));socket.send(packet,9182,'255.255.255.255',()=>{});for(const [url,p] of peers)if(Date.now()-p.seen>12000)peers.delete(url)};
  announce();timer=setInterval(announce,3000);timer.unref();
 });
 return{peers,close(){clearInterval(timer);try{socket.close()}catch{}}};
}
