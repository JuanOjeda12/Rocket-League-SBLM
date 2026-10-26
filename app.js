import * as T from './vendor/three.module.js';
import {createVehicle} from './vehicle-view.js';import {CARS,cleanProfile} from './catalog.js';import {Simulation} from './simulation.js';
import {GoalEffects} from './goal-effects.js';
import {BallTrail} from './ball-trail.js';
import {RenderBudget} from './render-budget.js';
import {createBoostPads} from './boost-pads.js';import {createPlaySession} from './play-session.js';import {NetClient,serverURL} from './net-client.js';import {constrainArenaCamera} from './arena-shape.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function startApp({scene,camera,renderer,canvas,ball,ballShadow,followCamera,stadium}){
 const matchFov=camera.fov;
 const renderBudget=new RenderBudget(renderer,devicePixelRatio);let statsAt=0;
 const $=id=>document.getElementById(id),front=$('front'),views=new Map(),preview=createVehicle(scene);
 let saved={};try{saved=JSON.parse(localStorage.getItem('rocket-garage')||'{}')}catch{}
 let profile=cleanProfile(saved),screen='home',screenBack='home',running=false,keys={},ballCam=false,simulation=null,simulationReady=null,loading=false;
 let source='offline',network=null,networkOwner=false,slot=0,room=null,netA=null,netB=null,netAt=0,lastInput=0,transport='lan',serverBase=location.origin,serverInfo=null,selectedRoom=null,admissions=[];
 let stateA=null,stateB=null,lastPhase='',label='ENTRENAMIENTO',pads=null,last=performance.now(),elapsed=0,acc=0,replayReady=false,previousCam=false,previousStart=false;
 const velocity=new T.Vector3(),effects=new GoalEffects(scene),ballTrail=new BallTrail(scene);let awardUntil=0,frameDelta=1/60;preview.root.position.set(0,.17,30);preview.root.rotation.y=Math.PI+.35;preview.apply(profile);
 const persist=()=>{try{localStorage.setItem('rocket-garage',JSON.stringify(profile))}catch{}};
 function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,5000)}
 const session=createPlaySession(canvas,value=>{running=value;keys={};acc=0;if(value){screen='game';front.hidden=true}else if(screen==='game'){screen='pause';renderFront();if(source==='network')network?.send('input',{controls:{}})}});
 const button=(text,action,classes='')=>`<button class="${classes}" data-action="${action}">${text}</button>`;
 const back=()=>button('‹ VOLVER',screenBack,'back');
 function show(next,backTo='home'){screen=next;screenBack=backTo;front.hidden=false;renderFront()}
 function mainMenu(){return `<div class="home-title"><span>ROCKET</span><strong>ARENA</strong><small>FAN PROJECT / BROWSER EDITION</small></div><nav class="main-nav">${button('JUGAR','play')}${button('GARAJE','garage')}<button disabled>TIENDA <small>COMING SOON</small></button><button disabled>ROCKET PASS <small>COMING SOON</small></button><button disabled>PERFIL <small>COMING SOON</small></button></nav><div class="home-caption"><b>${esc(profile.name)}</b><span>${esc(CARS.find(c=>c.id===profile.body)?.name)} / LISTO PARA SALIR</span></div>`}
 function card(title,sub,action,tone='blue',disabled=false){return `<button class="mode-card ${tone}" ${disabled?'disabled':`data-action="${action}"`}><span class="card-mark">${esc(title==='CASUAL'?'01':title==='COMPETITIVO'?'02':title==='ENTRENAMIENTO'?'∞':title)}</span><strong>${title}</strong><small>${disabled?'COMING SOON':sub}</small></button>`}
 function playMenu(){return `<div class="page-title">JUGAR</div><div class="card-grid">${card('CASUAL','Partidos contra bots','casual')}${card('COMPETITIVO','Bots más rápidos y exigentes','competitive','orange')}${card('TORNEOS','','','green',true)}${card('ENTRENAMIENTO','Free play / Play offline','training','purple')}${card('PARTIDA PRIVADA','Crear o unirse · LAN / ONLINE','private','teal')}${card('EXTRAS','','','red',true)}</div>${back()}`}
 function matchMenu(difficulty){return `<div class="page-title">${difficulty==='casual'?'CASUAL':'COMPETITIVO'}</div><p class="page-sub">${difficulty==='casual'?'Tú y tu equipo contra bots.':'Mismos equipos. Bots con reacción más rápida, mejor anticipación y uso de boost.'}</p><div class="card-grid">${[3,2,1].map(n=>card(`${n}v${n}`,n===1?'DUELO':n===2?'DOBLES':'ESTÁNDAR',`offline:${difficulty}:${n}`,difficulty==='casual'?'blue':'orange')).join('')}${['HEATSEEKER','DROPSHOT','KNOCKOUT','RUMBLE','HOOPS','SNOW DAY'].map(n=>card(n,'','','purple',true)).join('')}</div>${back()}`}
 function garageMenu(){return `<div class="page-title">GARAJE</div><div class="garage-panel"><label>CONDUCTOR<input id="driver-name" maxlength="24" value="${esc(profile.name)}"></label><label>CARRO</label><div class="car-options">${CARS.map(c=>button(c.name,`car:${c.id}`,profile.body===c.id?'selected':'')).join('')}</div><label>COLOR DE LA CARROCERÍA</label><div class="swatches">${['#248bff','#ff8b32','#ef3340','#ffd35b','#74d6ab','#b57bff','#f2f5f7','#252b35'].map(c=>`<button class="swatch" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}<input id="car-color" type="color" value="${profile.color}" aria-label="Elegir color"></div><p id="garage-credit">${esc(CARS.find(c=>c.id===profile.body)?.credit)}</p><p class="muted">Tu selección se guarda en este navegador y se usa también en LAN.</p></div>${back()}`}
 function privateMenu(){return `<div class="page-title">PARTIDA PRIVADA</div><div class="transport-tabs">${button('LAN','transport:lan',transport==='lan'?'selected':'')}${button('ONLINE · BETA','transport:online',transport==='online'?'selected':'')}</div><div class="server-line"><label>SERVIDOR<input id="server-address" placeholder="${transport==='lan'?'http://192.168.1.10:8080':'https://tu-servidor.onrender.com'}" value="${esc(serverBase)}"></label>${button('BUSCAR SALAS','refresh')}</div><p class="muted">${transport==='lan'?'Las salas públicas de este servidor y los servidores LAN descubiertos aparecen aquí. También puedes escribir la dirección del anfitrión.':'La conexión online está preparada. Necesitas la dirección de un servidor publicado con HTTPS.'}</p><div class="private-columns"><section class="panel"><h2>UNIRSE A UNA SALA</h2><div id="room-list">Buscando salas…</div></section><section class="panel"><h2>CREAR SALA</h2><form id="create-room"><label>NOMBRE<input name="name" maxlength="40" value="Sala de ${esc(profile.name)}" required></label><div class="field-pair"><label>AZUL<select name="blue">${[1,2,3,4,5].map(n=>`<option ${n===2?'selected':''}>${n}</option>`).join('')}</select></label><label>NARANJA<select name="orange">${[1,2,3,4,5].map(n=>`<option ${n===2?'selected':''}>${n}</option>`).join('')}</select></label></div><label>DIFICULTAD<select name="difficulty"><option value="casual">Normal</option><option value="competitive">Difícil</option></select></label><label>TU EQUIPO<select name="team"><option value="0">Azul</option><option value="1">Naranja</option></select></label><label class="check"><input type="checkbox" name="public" checked> Pública en la lista de salas</label><label>CONTRASEÑA<input type="password" name="password" maxlength="64" required autocomplete="new-password"></label><p class="muted">Desmarca «Pública» para una sala solo para ti y bots. Máximo 5 puestos por equipo.</p><button type="submit" class="primary">CREAR PARTIDA</button></form></section></div>${back()}`}
 function shareAddress(){if(transport==='lan'&&/localhost|127\.0\.0\.1/.test(serverBase)&&serverInfo?.addresses?.length){const ip=serverInfo.addresses.find(a=>/^(192\.168\.|10\.)/.test(a))||serverInfo.addresses[0];return`http://${ip}:${serverInfo.port}`}return serverBase}
 function lobbyMenu(){return `<div class="page-title">SALA ${esc(room?.id||'')}</div><section class="lobby panel"><h2>${esc(room?.name)}</h2><p class="muted">Comparte esta dirección con los demás: <strong>${esc(shareAddress())}</strong></p><div id="lobby-players"></div><p>${networkOwner?'Tú decides el equipo de cada persona que solicita entrar. Los puestos libres los ocupan bots.':'Ya tienes un puesto asignado. Reemplazas a un bot del equipo.'}</p>${button(networkOwner&&(stateB?.phase==='lobby')?'INICIAR PARTIDO':'ENTRAR AL PARTIDO','enter-room','primary')}${networkOwner?button('REINICIAR PARTIDO','restart-network'):''}${button(networkOwner?'CERRAR SALA Y SALIR':'ABANDONAR SALA','leave-room','danger')}</section>`}
 function pauseMenu(){return `<div class="pause-panel panel"><span class="eyebrow">${esc(label)}</span><h1>EN PAUSA</h1><p>${source==='network'?'Tu carro queda sin controles; los demás siguen jugando.':'La simulación está pausada.'}</p>${button('CONTINUAR','resume','primary')}${source==='offline'||networkOwner?button('REINICIAR SAQUE','reset'):''}${button(source==='network'?(networkOwner?'CERRAR SALA Y SALIR':'ABANDONAR SALA'):'VOLVER AL MENÚ','leave-room','danger')}</div>`}
 function results(){const score=stateB?.score||[0,0];return `<div class="pause-panel panel"><span class="eyebrow">PARTIDO TERMINADO</span><h1>${score[0]>score[1]?'AZUL':'NARANJA'} GANA</h1><p class="result-score">${score[0]} — ${score[1]}</p>${source==='offline'||networkOwner?button('REVANCHA','rematch','primary'):'<p>Espera a que el anfitrión reinicie.</p>'}${button('VOLVER AL MENÚ','leave-room')}</div>`}
 function renderFront(){
  front.hidden=screen==='game';document.body.dataset.screen=screen;
  front.innerHTML=screen==='home'?mainMenu():screen==='play'?playMenu():screen==='casual'||screen==='competitive'?matchMenu(screen):screen==='garage'?garageMenu():screen==='private'?privateMenu():screen==='lobby'?lobbyMenu():screen==='pause'?pauseMenu():screen==='results'?results():screen==='pending'?`<div class="pause-panel panel"><h1>ESPERANDO EQUIPO</h1><p>El anfitrión debe aprobar tu entrada y elegir tu equipo.</p>${button('CANCELAR','leave-room')}</div>`:`<div class="pause-panel panel"><h1>PREPARANDO…</h1><p>La simulación estará lista en unos segundos.</p></div>`;
  if(screen==='garage'){
   $('driver-name').onchange=e=>{profile=cleanProfile({...profile,name:e.target.value});persist();preview.apply(profile)};
   $('car-color').oninput=e=>{profile.color=e.target.value;persist();preview.apply(profile)};
  }
  if(screen==='private'){
   const form=$('create-room');form.elements.public.onchange=()=>{form.elements.password.required=form.elements.public.checked;form.elements.password.disabled=!form.elements.public.checked};form.onsubmit=e=>{e.preventDefault();createRoom(form)};
   refreshRooms();
  }
  if(screen==='lobby')updateLobby();
 }
 front.addEventListener('click',e=>{const color=e.target.closest('[data-color]');if(color){profile.color=color.dataset.color;persist();preview.apply(profile);$('car-color').value=profile.color;return}const target=e.target.closest('[data-action]');if(target&&!target.disabled)action(target.dataset.action)});
 async function action(a){
  if(a==='home'||a==='play'||a==='garage'||a==='private'){show(a,a==='private'?'play':'home');if(a==='home'||a==='garage')preview.apply(profile);return}
  if(a==='casual'||a==='competitive'){show(a,'play');return}
  if(a==='training'){await offline({blue:1,orange:0,training:true});return}
  if(a.startsWith('offline:')){const[,difficulty,n]=a.split(':');await offline({blue:+n,orange:+n,difficulty});return}
  if(a.startsWith('car:')){profile.body=a.split(':')[1];persist();preview.apply(profile);renderFront();return}
  if(a.startsWith('transport:')){transport=a.split(':')[1];try{serverBase=localStorage.getItem('rocket-server-'+transport)||(transport==='lan'?location.origin:'')}catch{serverBase=transport==='lan'?location.origin:''}renderFront();return}
  if(a==='refresh'){refreshRooms();return}
  if(a.startsWith('join:')){selectedRoom=roomEntries[+a.split(':')[1]];showJoin();return}
  if(a==='resume'){followCamera.reset();session.start();return}
  if(a==='reset'){if(source==='network')network?.send('reset');else simulation?.resetRound();return}
  if(a==='leave-room'){leaveRoom();return}
  if(a==='enter-room'){if(networkOwner&&stateB?.phase==='lobby')network.send('start');followCamera.reset();session.start();return}
  if(a==='restart-network'){network.send('restart');return}
  if(a==='rematch'){if(source==='network')network.send('restart');else simulation.restart();lastPhase='';session.start();return}
 }
 async function offline(options){
  if(loading)return;loading=true;show('loading');
  try{simulation=await simulationReady;simulation.configure(options);simulation.assign(0,profile,true);simulation.start();effects.reset();awardUntil=0;source='offline';slot=0;room=null;stateA=stateB=simulation.view();lastPhase='';label=options.training?'ENTRENAMIENTO':`${options.difficulty==='competitive'?'COMPETITIVO':'CASUAL'} ${options.blue}v${options.orange}`;followCamera.reset();acc=0;session.start()}catch(e){toast(e.message);show('play','home')}finally{loading=false}
 }
 function leaveRoom(){screen='home';session.pause();network?.send('leave');network?.close();network=null;room=null;admissions=[];$('admission').hidden=true;source='offline';stateA=stateB=null;show('home');preview.apply(profile)}
 let roomEntries=[];
 async function refreshRooms(){
  if(screen!=='private')return;const list=$('room-list');try{
   if(!$('server-address').value.trim())throw Error('Escribe la dirección del servidor publicado.');serverBase=serverURL($('server-address').value);try{localStorage.setItem('rocket-server-'+transport,serverBase)}catch{}
   const [info,response,discovery]=await Promise.all([fetch(serverBase+'/api/info',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()),fetch(serverBase+'/api/rooms',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()),transport==='lan'?fetch(serverBase+'/api/discovery',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).catch(()=>[]):[]]);
   if(screen!=='private')return;serverInfo=info;roomEntries=response.map(r=>({...r,url:serverBase}));for(const peer of discovery)for(const r of peer.rooms||[])if(!roomEntries.some(p=>p.id===r.id))roomEntries.push({...r,url:peer.url});
   list.innerHTML=roomEntries.length?roomEntries.map((r,i)=>`<div class="room-row"><div><strong>${esc(r.name)}</strong><small>${r.blue}v${r.orange} · ${r.players}/${r.max} personas · ${r.difficulty==='competitive'?'Difícil':'Normal'} · ${r.password?'Con contraseña':'Abierta'}</small></div><button data-action="join:${i}" ${!r.ready?'disabled':''}>${r.ready?'UNIRSE':'PREPARANDO'}</button></div>`).join(''):'<p class="muted">No hay salas públicas. Puedes crear una.</p>';
  }catch{if(screen==='private')list.innerHTML='<p class="muted">No se encontró un servidor. Revisa la dirección del anfitrión y que esté encendido.</p>'}
 }
 async function connect(url){network?.close();network=new NetClient(url,networkMessage);await network.connect();return network}
 async function createRoom(form){
  if(!form.reportValidity())return;const f=new FormData(form),options={name:f.get('name'),blue:+f.get('blue'),orange:+f.get('orange'),team:+f.get('team'),difficulty:f.get('difficulty'),public:f.get('public')==='on',password:f.get('public')==='on'?f.get('password'):''};
  try{serverBase=serverURL($('server-address').value);await connect(serverBase);source='network';show('loading');network.send('create',{options,profile})}catch(e){toast(e.message);show('private','play')}
 }
 function showJoin(){
  $('join-modal').hidden=false;$('join-title').textContent=selectedRoom.name;$('join-password').value='';$('join-password').focus();
 }
 $('join-cancel').onclick=()=>$('join-modal').hidden=true;
 $('join-form').onsubmit=async e=>{e.preventDefault();try{serverBase=selectedRoom.url;await connect(serverBase);source='network';network.send('join',{id:selectedRoom.id,password:$('join-password').value,profile});$('join-modal').hidden=true;show('loading')}catch(error){toast(error.message)}};
 function updateLobby(){const target=$('lobby-players');if(!target||!stateB)return;target.innerHTML=[0,1].map(team=>`<div class="team-list ${team?'orange':'blue'}"><h3>${team?'NARANJA':'AZUL'}</h3>${stateB.cars.filter(c=>c.team===team).map(c=>`<p>${esc(c.profile?.name||'BOT')} <small>${c.profile?.human?'JUGADOR':'BOT'}${c.slot===slot?' · TÚ':''}</small></p>`).join('')}</div>`).join('')}
 function networkMessage(m){
  if(m.type==='loading'){show('loading');return}
  if(m.type==='joined'){effects.reset();effects.seed(m.state?.events);awardUntil=0;room=m.room;slot=m.slot;networkOwner=m.owner;source='network';label=`PRIVADA ${m.options.blue}v${m.options.orange}`;netA=netB=m.state;stateA=stateB=m.state;netAt=performance.now();lastPhase='';show('lobby');return}
  if(m.type==='snapshot'){
   if(!Array.isArray(m.state?.cars)||m.state.cars.length>10)return;netA=netB?.phase===m.state.phase?netB:m.state;netB=m.state;netAt=performance.now();
   if(screen==='lobby'){stateB=netB;updateLobby()}
   return;
  }
  if(m.type==='pending'){room=m.room;show('pending');return}
  if(m.type==='admission'){admissions.push(m);session.pause('admission');showAdmission();return}
  if(m.type==='admitted'||m.type==='request-cancelled'){admissions=admissions.filter(a=>a.pendingId!==m.pendingId);showAdmission();return}
  if(m.type==='error'){toast(m.message);if(screen==='loading')show('private','play');return}
  if(m.type==='closed'||m.type==='rejected'){toast(m.message);network?.close();network=null;room=null;admissions=[];$('admission').hidden=true;screen='home';session.pause();stateA=stateB=null;show('private','play')}
 }
 function showAdmission(){const q=admissions[0];$('admission').hidden=!q;if(q)$('admission-name').textContent=q.name}
 for(const team of [-1,0,1])$('admit-'+team).onclick=()=>{const q=admissions[0];if(q)network?.send('admit',{pendingId:q.pendingId,team})};
 $('skip-replay').onclick=()=>source==='network'?network?.send('skip'):simulation?.skip();
 function readInput(){
  let throttle=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),steer=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),pitch=-throttle,yaw=steer,roll=(keys.KeyE?1:0)-(keys.KeyQ?1:0),jump=!!(keys.Mouse2||keys.KeyJ),boost=!!(keys.Mouse0||keys.KeyK),handbrake=!!(keys.ShiftLeft||keys.ShiftRight||keys.ControlLeft);
  const gp=Array.from(navigator.getGamepads?.()||[]).find(g=>g?.connected);if(gp){const x=Math.abs(gp.axes[0])>.12?gp.axes[0]:0,y=Math.abs(gp.axes[1])>.12?gp.axes[1]:0;if(x||y){steer=x;pitch=y;yaw=x}throttle=gp.buttons[7].value-gp.buttons[6].value||throttle;jump=jump||gp.buttons[0].pressed;boost=boost||gp.buttons[1].pressed;handbrake=handbrake||gp.buttons[2].pressed;const cam=gp.buttons[3].pressed;if(cam&&!previousCam)ballCam=!ballCam;previousCam=cam;const start=gp.buttons[9]?.pressed;if(start&&!previousStart)session.pause('controller');previousStart=start}
  if(handbrake){roll+=yaw;yaw=0}return{throttle,steer,pitch,yaw,roll:T.MathUtils.clamp(roll,-1,1),jump,boost,handbrake};
 }
 addEventListener('keydown',e=>{
  if(!running){if(e.code==='Escape'&&['garage','play','casual','competitive','private'].includes(screen))show(screen==='casual'||screen==='competitive'?'play':'home');return}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(!keys[e.code]){if(e.code==='Escape')session.pause('escape');if(e.code==='Space'||e.code==='KeyC')ballCam=!ballCam;if(e.code==='Enter')source==='network'?network?.send('skip'):simulation?.skip();if(e.code==='KeyR'){if(source==='offline')simulation?.resetRound();else if(networkOwner)network?.send('reset')}}keys[e.code]=true;
 });addEventListener('keyup',e=>keys[e.code]=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('mousedown',e=>{if(running){e.preventDefault();keys['Mouse'+e.button]=true}});addEventListener('mouseup',e=>keys['Mouse'+e.button]=false);
 function paint(a,b,t){
  effects.sync(b.events,slot,event=>{const epic=event.type==='epic-save';$('save-title').textContent=epic?'¡SALVADA ÉPICA!':'¡SALVADA!';$('save-award').dataset.epic=String(epic);$('save-award').style.animation='none';void $('save-award').offsetWidth;$('save-award').style.animation='';awardUntil=elapsed+2.8});
  if(camera.fov!==matchFov){camera.fov=matchFov;camera.updateProjectionMatrix()}
  if(!pads)pads=createBoostPads(scene,b.pads);pads.update(b.pads,elapsed);preview.setVisible(false);
  for(const [id,v] of views)if(!b.cars.some(c=>c.slot===id))v.setVisible(false);
  for(const c of b.cars){let v=views.get(c.slot);if(!v){v=createVehicle(scene);views.set(c.slot,v)}v.apply(c.profile||{name:'BOT',body:'octane',color:c.team?'#ff8b32':'#248bff'});const p=a.cars.find(x=>x.slot===c.slot)||c;const smooth=p.isDemoed===c.isDemoed&&new T.Vector3().fromArray(p.position).distanceTo(new T.Vector3().fromArray(c.position))<8;
   v.root.position.fromArray(smooth?p.position:c.position).lerp(new T.Vector3().fromArray(c.position),smooth?t:1);v.root.quaternion.fromArray(smooth?p.quaternion:c.quaternion).slerp(new T.Quaternion().fromArray(c.quaternion),smooth?t:1);v.setVisible(!c.isDemoed,c.slot!==slot);v.flame.visible=c.isBoosting&&['live','replay'].includes(b.phase);v.update(elapsed);
  }
  ball.visible=true;ballShadow.visible=true;ball.position.fromArray(a.ball.position).lerp(new T.Vector3().fromArray(b.ball.position),t);ball.quaternion.fromArray(a.ball.quaternion).slerp(new T.Quaternion().fromArray(b.ball.quaternion),t);ballShadow.position.set(ball.position.x,.015,ball.position.z);ballShadow.material.opacity=Math.max(.04,.22-ball.position.y*.008);
  ballTrail.update(ball.position,b.ball.velocity,source==='offline'&&!running?0:frameDelta,b.phase,b.ball.lastTouchTeam);
  const own=b.cars.find(c=>c.slot===slot)||b.cars[0],view=views.get(own.slot);
  if(b.phase==='goal'){
   const target=new T.Vector3(0,2.5,b.goalEnd*50.6),desired=new T.Vector3(13,6,b.goalEnd*35);camera.position.lerp(desired,.16);camera.up.set(0,1,0);camera.lookAt(target);replayReady=false;
  }else if(b.phase==='replay'){
   const target=ball.position.clone(),desired=constrainArenaCamera(target.clone().add(new T.Vector3(target.x>0?-9:9,6.5,-b.goalEnd*12)));if(replayReady)camera.position.lerp(desired,.12);else camera.position.copy(desired);camera.up.set(0,1,0);camera.lookAt(target);replayReady=true;
  }else{replayReady=false;velocity.fromArray(own.velocity);followCamera.update(1/60,{position:view.root.position,quaternion:view.root.quaternion,velocity,ball:ball.position,onGround:own.onGround,isFlipping:own.isFlipping,ballCam})}
  $('blue').textContent=b.score[0];$('orange').textContent=b.score[1];$('match-type').textContent=label;$('match-clock').textContent=b.training?'∞':b.overtime?'OT':`${Math.floor(Math.ceil(b.remaining)/60)}:${String(Math.ceil(b.remaining)%60).padStart(2,'0')}`;
  $('speed').textContent=Math.round(Math.hypot(...own.velocity)*3.6);$('boost').textContent=Math.round(own.boost);$('boostbar').style.width=own.boost+'%';$('boost-track').setAttribute('aria-valuenow',Math.round(own.boost));
  $('boost-track').parentElement.style.setProperty('--boost',`${own.boost}%`);$('boost-track').parentElement.classList.toggle('boosting',own.isBoosting);
  const showGoal=running&&['kickoff','goal'].includes(b.phase);$('goal').hidden=!showGoal;$('goal').textContent=b.phase==='kickoff'?Math.max(1,Math.ceil(b.countdown)):b.goalEnd<0?'¡GOL AZUL!':'¡GOL NARANJA!';
  $('replay').hidden=b.phase!=='replay';document.body.classList.toggle('replaying',b.phase==='replay');$('replay-progress').style.width=b.replayProgress*100+'%';
 }
 function frame(now){
  requestAnimationFrame(frame);const frameMs=now-last,dt=Math.min(.05,frameMs/1000);frameDelta=dt;last=now;elapsed+=dt;renderBudget.update(frameMs,now,!document.hidden);
  const inMatch=['game','pause','results','lobby'].includes(screen)&&!!stateB;
  $('hud').hidden=!inMatch;
  $('save-award').hidden=!inMatch||elapsed>awardUntil||awardUntil===0;
  effects.update(source==='offline'&&!running?0:dt,inMatch);
  if(source==='offline'&&simulation&&running){const controls=readInput();acc+=dt;while(acc>=1/120){simulation.tick(1/120,{0:controls});acc-=1/120}const next=simulation.view();stateA=stateB?.phase===next.phase?stateB:next;stateB=next}
  if(source==='network'&&netB){stateA=netA||netB;stateB=netB;if(running&&now-lastInput>1000/30){network.send('input',{controls:readInput()});lastInput=now}}
  if(inMatch&&stateB){paint(stateA||stateB,stateB,source==='network'?Math.min(1,(now-netAt)/(1000/30)):1);if(stateB.phase==='finished'&&lastPhase!=='finished'){screen='results';session.pause('finished');renderFront()}lastPhase=stateB.phase}
  else{ballTrail.clear();for(const v of views.values())v.setVisible(false);preview.setVisible(true,false);preview.flame.visible=false;ball.visible=false;ballShadow.visible=false;$('replay').hidden=true;$('goal').hidden=true;document.body.classList.remove('replaying');if(camera.fov!==36){camera.fov=36;camera.updateProjectionMatrix()}camera.position.set(1.7+Math.sin(elapsed*.12)*.06,.85,32.2);camera.up.set(0,1,0);camera.lookAt(-.45,.38,30)}
  stadium.update(inMatch?stateB.remaining:300,inMatch?stateB.training:true,inMatch&&stateB.overtime,elapsed);
  renderer.render(scene,camera);
  if(now-statsAt>1000){statsAt=now;canvas.dataset.renderStats=JSON.stringify({fps:Math.round(1000/renderBudget.average),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:Number(renderBudget.ratio.toFixed(2)),crowd:stadium.crowdCount,crowdTriangles:stadium.crowdTriangles})}
 }
 show('home');simulationReady=Simulation.create({training:true,blue:1,orange:0}).then(s=>{simulation=s;return s}).catch(e=>{toast('No se pudo preparar la física. Recarga la página.');throw e});
 requestAnimationFrame(frame);addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});
 window.arenaApp={get state(){return{screen,source,profile,slot,room,phase:stateB?.phase,cars:stateB?.cars?.length,score:stateB?.score}},get ready(){return!!simulation}};
}
