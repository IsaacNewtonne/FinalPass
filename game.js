import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['hud','time','phase','score','combo','health-bar','health-text','crosshair','ammo','rounds','reload-prompt','warning','warning-direction','subtitle','subtitle-text','menu','pause','game-over','final-score','final-kills','final-time','damage-flash'].map(id => [id,$(id)]));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8b9aa0);
scene.fog = new THREE.FogExp2(0x87918f, .009);
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, .1, 700);
camera.position.set(0, 2.55, 3.7);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
$('game').append(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xb9d1d8,0x4b3a28,2.25));
const sun=new THREE.DirectionalLight(0xffe1b0,2.6); sun.position.set(-40,60,15); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70; scene.add(sun);

const mats={
  road:new THREE.MeshStandardMaterial({color:0x343736,roughness:.96}), dirt:new THREE.MeshStandardMaterial({color:0x75634b,roughness:1}),
  truck:new THREE.MeshStandardMaterial({color:0x48513e,roughness:.8,metalness:.25}), dark:new THREE.MeshStandardMaterial({color:0x161a18,roughness:.7,metalness:.5}),
  skin:new THREE.MeshStandardMaterial({color:0x9a7559,roughness:1}), cloth:new THREE.MeshStandardMaterial({color:0x555b42,roughness:1}), drone:new THREE.MeshStandardMaterial({color:0x252827,roughness:.6,metalness:.55})
};
const box=(w,h,d,mat=mats.truck)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=m.receiveShadow=true;return m};
const cyl=(r,h,mat=mats.dark)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.castShadow=true;return m};

// Endless road and sparse terrain props move toward the player.
const world=new THREE.Group(); scene.add(world);
const road=box(16,.12,720,mats.road); road.position.set(0,-.05,-310);road.receiveShadow=true;world.add(road);
const ground=box(220,.2,720,mats.dirt);ground.position.set(0,-.18,-310);ground.receiveShadow=true;world.add(ground);
const edgeMat=new THREE.MeshStandardMaterial({color:0xc3b58b,roughness:1});
for(const x of [-8,8]){const line=box(.16,.025,720,edgeMat);line.position.set(x,.03,-310);world.add(line)}
const laneMat=new THREE.MeshBasicMaterial({color:0xd6c69b});
const laneMarks=[]; for(let z=-650;z<30;z+=12){const m=box(.15,.025,4,laneMat);m.position.set(0,.04,z);world.add(m);laneMarks.push(m)}
const props=[];
function makeProp(z,side){const g=new THREE.Group(); const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1+Math.random()*2,0),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.08,.13,.28+Math.random()*.12),roughness:1}));rock.scale.y=.45+Math.random()*.65;rock.castShadow=true;g.add(rock);g.position.set(side*(12+Math.random()*65),.2,z);g.rotation.y=Math.random()*6;world.add(g);props.push(g)}
for(let z=-650;z<30;z+=8) if(Math.random()>.35) makeProp(z,Math.random()>.5?1:-1);

// Pickup bed establishes the first-person moving vehicle viewpoint.
const truck=new THREE.Group();scene.add(truck);
const floor=box(4.7,.18,4.6,mats.truck);floor.position.set(0,.75,2.6);truck.add(floor);
for(const x of [-2.25,2.25]){const side=box(.28,1.15,4.8,mats.truck);side.position.set(x,1.35,2.6);truck.add(side)}
const tail=box(4.7,1.1,.25,mats.truck);tail.position.set(0,1.33,4.9);truck.add(tail);
const cab=box(4.5,2.4,2.25,mats.truck);cab.position.set(0,1.55,-.7);truck.add(cab);
const windowMat=new THREE.MeshStandardMaterial({color:0x192527,roughness:.15,metalness:.2});const rearWindow=box(2.9,.75,.03,windowMat);rearWindow.position.set(0,1.85,.44);truck.add(rearWindow);

function makeSoldier(){const g=new THREE.Group(); const torso=box(.7,1,.42,mats.cloth);torso.position.y=1.1;g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),mats.skin);head.position.y=1.83;head.castShadow=true;g.add(head);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.31,16,8,0,Math.PI*2,0,Math.PI*.55),mats.dark);helmet.position.y=1.91;g.add(helmet);for(const x of [-.47,.47]){const arm=cyl(.11,.85,mats.cloth);arm.position.set(x,1.1,0);arm.rotation.z=x>0?-.35:.35;g.add(arm)}return g}
const mate=makeSoldier();mate.position.set(-1.45,.78,2.7);mate.rotation.y=.25;truck.add(mate);

// Visible rifle, anchored to camera.
const rifle=new THREE.Group();camera.add(rifle);scene.add(camera);
const receiver=box(.25,.24,1.35,mats.dark);rifle.add(receiver);const barrel=cyl(.045,1.25,mats.dark);barrel.rotation.x=Math.PI/2;barrel.position.z=-1.25;rifle.add(barrel);const hand=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),mats.skin);hand.scale.set(1,1.2,1.5);hand.position.set(-.18,-.16,-.28);rifle.add(hand);rifle.position.set(.42,-.45,-.78);rifle.rotation.x=-.02;
const muzzle=new THREE.PointLight(0xffaa44,0,5);muzzle.position.set(0,0,-1.9);rifle.add(muzzle);

let state='menu', startTime=0, elapsed=0, score=0, kills=0, health=100, ammo=30, reloading=false, lastShot=0, nextSpawn=0, level=1, combo=0, shake=0;
let yaw=0,pitch=0,targetYaw=0,targetPitch=0; const drones=[],particles=[]; const raycaster=new THREE.Raycaster(); const clock=new THREE.Clock();

function makeDrone(){
  const g=new THREE.Group();g.userData={hp:level>=4?2:1,speed:10+level*1.8+Math.random()*4,wobble:Math.random()*6.28,hit:false};
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.65,4,8),mats.drone);body.rotation.x=Math.PI/2;body.castShadow=true;g.add(body);
  for(const x of [-.62,.62])for(const z of [-.4,.4]){const arm=box(.75,.045,.06,mats.drone);arm.position.set(x/2,0,z);arm.rotation.y=x*z>0?.45:-.45;g.add(arm);const rotor=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.025,12),mats.dark);rotor.position.set(x,0,z);g.add(rotor)}
  const led=new THREE.PointLight(0xff2600,2.2,3);led.position.z=.42;g.add(led);
  const angle=Math.random()*Math.PI*2, dist=75+Math.random()*45;g.position.set(Math.sin(angle)*dist,8+Math.random()*24,-25-Math.abs(Math.cos(angle))*dist);g.lookAt(camera.position);scene.add(g);drones.push(g);
  if(drones.length===1 || Math.random()<.34) warnDrone(g);
}
function warnDrone(d){const x=d.position.x;ui.warningDirection.textContent=Math.abs(x)<10?'FRONT!':x<0?'LEFT SIDE!':'RIGHT SIDE!';ui.warning.classList.remove('hidden');speak(Math.abs(x)<10?'Drone, front!':x<0?'Contact, left side!':'Drone on the right!');setTimeout(()=>ui.warning.classList.add('hidden'),1300)}
function speak(text){ui.subtitleText.textContent=text;ui.subtitle.classList.remove('hidden');clearTimeout(speak.t);speak.t=setTimeout(()=>ui.subtitle.classList.add('hidden'),2200)}
function burst(pos,color=0xff8b32,count=12){for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035+Math.random()*.06,5,4),new THREE.MeshBasicMaterial({color}));m.position.copy(pos);m.userData.vel=new THREE.Vector3((Math.random()-.5)*5,(Math.random()-.2)*5,(Math.random()-.5)*5);m.userData.life=.5+Math.random()*.5;scene.add(m);particles.push(m)}}

function shoot(){if(state!=='playing'||reloading)return;const now=performance.now();if(now-lastShot<105)return;lastShot=now;if(ammo<=0){reload();return}ammo--;ui.rounds.textContent=ammo;shake=.035;muzzle.intensity=8;setTimeout(()=>muzzle.intensity=0,45);rifle.position.z=-.69;setTimeout(()=>rifle.position.z=-.78,55);audioShot();
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(drones,true);if(hits.length){let d=hits[0].object;while(d.parent&&!drones.includes(d))d=d.parent;if(drones.includes(d)){d.userData.hp--;burst(hits[0].point,0xffcc66,5);if(d.userData.hp<=0)destroyDrone(d)}}
  if(ammo===0)ui.reloadPrompt.textContent='R — RELOAD';
}
function destroyDrone(d){const i=drones.indexOf(d);if(i<0)return;drones.splice(i,1);scene.remove(d);burst(d.position,0xff6a1a,24);combo++;kills++;score+=100*level+Math.min(combo,10)*20;updateHUD();audioBoom()}
function reload(){if(reloading||ammo===30||state!=='playing')return;reloading=true;ui.reloadPrompt.textContent='RELOADING…';setTimeout(()=>{if(state==='playing'){ammo=30;ui.rounds.textContent=ammo;ui.reloadPrompt.textContent='';reloading=false}},1450)}
function damage(){health=Math.max(0,health-(17+level*2));combo=0;shake=.3;ui.damageFlash.style.opacity=.9;setTimeout(()=>ui.damageFlash.style.opacity=0,160);updateHUD();audioBoom();speak(health>0?'Impact! Keep firing!':'We lost the truck!');if(health<=0)endGame()}

function updateHUD(){ui.score.textContent=String(score).padStart(6,'0');ui.combo.textContent=combo>=3?`${combo}× STREAK`:'STEADY';ui.healthBar.style.width=health+'%';ui.healthBar.style.background=health<35?'#ef4b32':'#ffb23e';ui.healthText.textContent=Math.ceil(health)+'%'}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function setPlayUI(on){['hud','crosshair','ammo'].forEach(k=>ui[k].classList.toggle('hidden',!on))}
function startGame(){drones.splice(0).forEach(d=>scene.remove(d));particles.splice(0).forEach(p=>scene.remove(p));state='playing';score=kills=elapsed=combo=0;health=100;ammo=30;level=1;reloading=false;startTime=performance.now();nextSpawn=.8;ui.menu.classList.add('hidden');ui['game-over'].classList.add('hidden');ui.pause.classList.add('hidden');setPlayUI(true);ui.rounds.textContent=ammo;ui.reloadPrompt.textContent='';updateHUD();speak("Eyes up. We're entering the pass.");renderer.domElement.requestPointerLock?.()}
function endGame(){state='over';document.exitPointerLock?.();setPlayUI(false);ui['game-over'].classList.remove('hidden');ui.finalScore.textContent=score;ui.finalKills.textContent=kills;ui.finalTime.textContent=formatTime(elapsed)}
function pauseGame(){if(state!=='playing')return;state='paused';document.exitPointerLock?.();ui.pause.classList.remove('hidden');setPlayUI(false)}
function resume(){if(state!=='paused')return;state='playing';startTime=performance.now()-elapsed*1000;ui.pause.classList.add('hidden');setPlayUI(true);renderer.domElement.requestPointerLock?.()}

let audio;
function initAudio(){if(audio)return;audio=new (window.AudioContext||window.webkitAudioContext)()}
function audioShot(){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='sawtooth';o.frequency.setValueAtTime(140,audio.currentTime);o.frequency.exponentialRampToValueAtTime(45,audio.currentTime+.08);g.gain.setValueAtTime(.18,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.1)}
function audioBoom(){if(!audio)return;const len=audio.sampleRate*.35,b=audio.createBuffer(1,len,audio.sampleRate),data=b.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);const s=audio.createBufferSource(),g=audio.createGain();s.buffer=b;g.gain.value=.35;s.connect(g).connect(audio.destination);s.start()}

function update(dt){
  const active=state==='playing'; if(active){elapsed=(performance.now()-startTime)/1000;const newLevel=Math.floor(elapsed/120)+1;if(newLevel!==level){level=newLevel;speak(`Sector ${String(level).padStart(2,'0')}. They're getting faster.`)}ui.time.textContent=formatTime(elapsed);ui.phase.textContent=`SECTOR ${String(level).padStart(2,'0')}`;
    nextSpawn-=dt;if(nextSpawn<=0){makeDrone();nextSpawn=Math.max(.42,2.5-level*.23+Math.random()*1.5)}
    yaw+=(targetYaw-yaw)*Math.min(1,dt*10);pitch+=(targetPitch-pitch)*Math.min(1,dt*10);camera.rotation.set(pitch,yaw,0,'YXZ');
    for(let i=drones.length-1;i>=0;i--){const d=drones[i];const toTruck=new THREE.Vector3(0,1.4,2.5).sub(d.position);const dist=toTruck.length();d.position.addScaledVector(toTruck.normalize(),d.userData.speed*dt);d.position.y+=Math.sin(elapsed*8+d.userData.wobble)*dt*.7;d.rotation.z=Math.sin(elapsed*12+d.userData.wobble)*.08;d.lookAt(0,1.4,2.5);if(dist<2.6){drones.splice(i,1);scene.remove(d);burst(d.position,0xff5b1f,28);damage()}}
  }
  const roadSpeed=active?18+level*.7:5;for(const m of laneMarks){m.position.z+=roadSpeed*dt;if(m.position.z>28)m.position.z-=684}for(const p of props){p.position.z+=roadSpeed*dt;if(p.position.z>35){p.position.z-=690;p.position.x=(Math.random()>.5?1:-1)*(12+Math.random()*65)}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.userData.life-=dt;p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.y-=6*dt;p.scale.multiplyScalar(.96);if(p.userData.life<=0){scene.remove(p);particles.splice(i,1)}}
  const bump=Math.sin(performance.now()*.012)*.008+(Math.random()-.5)*shake;camera.position.set(0,2.55+bump,3.7);truck.rotation.z=Math.sin(performance.now()*.003)*.002;shake*=.87;
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera)}

$('start-button').addEventListener('click',()=>{initAudio();startGame()});$('restart-button').addEventListener('click',startGame);$('resume-button').addEventListener('click',resume);
renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0)shoot()});
addEventListener('mousemove',e=>{if(state!=='playing'||document.pointerLockElement!==renderer.domElement)return;targetYaw-=e.movementX*.00165;targetPitch-=e.movementY*.00165;targetYaw=THREE.MathUtils.clamp(targetYaw,-1.35,1.35);targetPitch=THREE.MathUtils.clamp(targetPitch,-.85,.72)});
addEventListener('keydown',e=>{if(e.code==='KeyR')reload();if(e.code==='Escape'&&state==='playing')pauseGame()});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='playing')pauseGame()});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
animate();
