export function serverURL(value){const input=String(value||location.origin).trim().replace(/^ws:/,'http:').replace(/^wss:/,'https:');const url=new URL(input.includes('://')?input:'http://'+input);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Dirección de servidor inválida.');return url.origin}
export class NetClient{
 constructor(url,onMessage){this.url=serverURL(url);this.onMessage=onMessage;this.closed=false}
 connect(){return new Promise((resolve,reject)=>{const u=this.url.replace(/^http/,'ws')+'/socket';this.ws=new WebSocket(u);const timeout=setTimeout(()=>{this.ws.close();reject(Error('El servidor no respondió.'))},10000);this.ws.onopen=()=>{clearTimeout(timeout);resolve(this)};this.ws.onmessage=e=>{try{this.onMessage(JSON.parse(e.data))}catch(error){console.error(error)}};this.ws.onerror=()=>{clearTimeout(timeout);reject(Error('No se pudo conectar al servidor.'))};this.ws.onclose=()=>{clearTimeout(timeout);if(!this.closed)this.onMessage({type:'closed',message:'Se perdió la conexión con el servidor.'})}})}
 send(type,data={}){if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify({type,...data}))}
 close(){this.closed=true;this.ws?.close()}
}
