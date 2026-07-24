import * as THREE from 'three';
import RAPIER from 'rapier';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['hud','time','phase','score','combo','health-bar','health-text','crosshair','ammo','rounds','reload-prompt','warning','warning-direction','subtitle','subtitle-text','menu','pause','game-over','final-score','final-kills','final-time','damage-flash'].map(id => [id,$(id)]));

// ---------------------------------------------------------------------------
// Rapier physics world (open-source, Rust/WASM). The compat build ships the
// WASM inline so there is no extra network fetch.
// ---------------------------------------------------------------------------
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.82, z: 0 });
world.timestep = 1 / 60;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaeb7b6);
scene.fog = new THREE.FogExp2(0x929995, .0065);
const weather = {
  windSpeed: 0,
  windDirection: 0,
  fogDensity: 0.0065,
  targetFog: 0.0065,
  dustStorm: false,
  dustStormTimer: 0
};
const camera = new THREE.PerspectiveCamera(68, innerWidth/innerHeight, .1, 700);
camera.position.set(0, 2.62, 1.7);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
$('game').append(renderer.domElement);
renderer.domElement.setAttribute('tabindex','0');

scene.add(new THREE.HemisphereLight(0xd7e7ed,0x493a2b,1.55));
const sun=new THREE.DirectionalLight(0xffd29a,3.5); sun.position.set(-55,70,35); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;sun.shadow.bias=-.0003; scene.add(sun);
const cabinFill=new THREE.PointLight(0xbfd8dd,1.7,12,2);cabinFill.position.set(1,4,4);scene.add(cabinFill);

// A large sky dome gives the horizon a believable vertical colour gradient.
const skyCanvas=document.createElement('canvas');skyCanvas.width=8;skyCanvas.height=512;
const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,512);
skyGradient.addColorStop(0,'#3f6478');skyGradient.addColorStop(.42,'#91a7ad');skyGradient.addColorStop(.72,'#d2b896');skyGradient.addColorStop(1,'#756650');
skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,8,512);
const skyMap=new THREE.CanvasTexture(skyCanvas);skyMap.colorSpace=THREE.SRGBColorSpace;
const sky=new THREE.Mesh(new THREE.SphereGeometry(620,32,18),new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,fog:false,depthWrite:false}));
sky.position.y=-90;scene.add(sky);
const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(7,32),new THREE.MeshBasicMaterial({color:0xffd7a0,fog:false,transparent:true,opacity:.72,depthWrite:false}));
sunDisc.position.set(-150,105,-430);sunDisc.lookAt(camera.position);scene.add(sunDisc);

function noiseTexture(base,spots,rough=false){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,512,512);for(let i=0;i<9000;i++){const a=Math.random()*(rough?0.18:0.08);x.fillStyle=`rgba(${spots},${a})`;const s=Math.random()*(rough?4:2)+.5;x.fillRect(Math.random()*512,Math.random()*512,s,s)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t}
const asphaltMap=noiseTexture('#393b39','220,210,190',true);asphaltMap.repeat.set(2,70);
const dirtMap=noiseTexture('#77654c','225,202,160',true);dirtMap.repeat.set(18,55);

const mats={
  road:new THREE.MeshStandardMaterial({map:asphaltMap,color:0x777777,roughness:.98}), dirt:new THREE.MeshStandardMaterial({map:dirtMap,color:0x9b886c,roughness:1}),
  truck:new THREE.MeshStandardMaterial({color:0x374338,roughness:.62,metalness:.38}), dark:new THREE.MeshStandardMaterial({color:0x111412,roughness:.48,metalness:.65}),
  skin:new THREE.MeshStandardMaterial({color:0x9a7559,roughness:1}), cloth:new THREE.MeshStandardMaterial({color:0x555b42,roughness:1}), drone:new THREE.MeshStandardMaterial({color:0x252827,roughness:.6,metalness:.55}),
  debris:new THREE.MeshStandardMaterial({color:0x2c2e2c,roughness:.7,metalness:.4}),
  rubber:new THREE.MeshStandardMaterial({color:0x090a09,roughness:.96}),
  steel:new THREE.MeshStandardMaterial({color:0x59605b,roughness:.34,metalness:.82}),
  red:new THREE.MeshStandardMaterial({color:0x6e1009,emissive:0x240300,roughness:.45})
};
const box=(w,h,d,mat=mats.truck)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=m.receiveShadow=true;return m};
const cyl=(r,h,mat=mats.dark)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.castShadow=true;return m};

// Endless road and sparse terrain props move toward the player.
const worldGroup=new THREE.Group(); scene.add(worldGroup);
const road=box(16,.12,720,mats.road); road.position.set(0,-.05,-310);road.receiveShadow=true;worldGroup.add(road);
const ground=box(220,.2,720,mats.dirt);ground.position.set(0,-.18,-310);ground.receiveShadow=true;worldGroup.add(ground);
const edgeMat=new THREE.MeshStandardMaterial({color:0xc3b58b,roughness:1});
for(const x of [-8,8]){const line=box(.16,.025,720,edgeMat);line.position.set(x,.03,-310);worldGroup.add(line)}
const laneMat=new THREE.MeshBasicMaterial({color:0xd6c69b});
const laneMarks=[]; for(let z=-650;z<30;z+=12){const m=box(.15,.025,4,laneMat);m.position.set(0,.04,z);worldGroup.add(m);laneMarks.push(m)}
const props=[];
function makeProp(z,side){const g=new THREE.Group(); const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1+Math.random()*2,1),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.08,.13,.28+Math.random()*.12),roughness:1}));rock.scale.set(1+Math.random()*1.4,.45+Math.random()*.65,1+Math.random());rock.castShadow=true;g.add(rock);if(Math.random()>.65){const scrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.7+Math.random()*.5,1),new THREE.MeshStandardMaterial({color:0x4c5034,roughness:1}));scrub.position.set(1,.3,.4);scrub.scale.y=.55;g.add(scrub)}g.position.set(side*(12+Math.random()*65),.2,z);g.rotation.y=Math.random()*6;worldGroup.add(g);props.push(g)}
function makeWreck(z,side){const g=new THREE.Group();const body=box(3.2,.8,7,mats.steel);body.position.y=.4;body.rotation.y=Math.random()*Math.PI;body.castShadow=true;g.add(body);const wheel1=cyl(.45,.25,mats.rubber);wheel1.position.set(-1.3,.2,-2.5);wheel1.rotation.z=Math.PI/2;g.add(wheel1);const wheel2=cyl(.45,.25,mats.rubber);wheel2.position.set(1.3,.2,-2.5);wheel2.rotation.z=Math.PI/2;g.add(wheel2);const wheel3=cyl(.45,.25,mats.rubber);wheel3.position.set(-1.3,.2,2.5);wheel3.rotation.z=Math.PI/2;g.add(wheel3);const wheel4=cyl(.45,.25,mats.rubber);wheel4.position.set(1.3,.2,2.5);wheel4.rotation.z=Math.PI/2;g.add(wheel4);const hatch=new THREE.Mesh(new THREE.ConeGeometry(.6,.8,6),mats.red);hatch.position.set(0,.9,0);hatch.rotation.y=Math.random()*Math.PI;hatch.castShadow=true;g.add(hatch);g.position.set(side*(14+Math.random()*60),.1,z);g.rotation.y=Math.random()*Math.PI;worldGroup.add(g);props.push(g)}
function makeRoadSign(z,side){const g=new THREE.Group();const post=cyl(.1,2.5,mats.steel);post.position.y=1.25;post.castShadow=true;g.add(post);const sign=box(2,.08,1.2,new THREE.MeshStandardMaterial({color:0x2a5a2a,roughness:0.7}));sign.position.y=2.5;sign.castShadow=true;g.add(sign);const arrow=new THREE.Shape();arrow.moveTo(0,-.3);arrow.lineTo(.5,.1);arrow.lineTo(0,.05);arrow.lineTo(-.5,.1);arrow.lineTo(0,-.3);const arrowGeo=new THREE.ExtrudeGeometry(arrow,{depth:.02,curveSegments:4});const arrowMesh=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:0xffd27a}));arrowMesh.position.set(-.2,2.5,.01);arrowMesh.rotation.y=side>0?Math.PI:0;g.add(arrowMesh);g.position.set(side*(13+Math.random()*55),.1,z);worldGroup.add(g);props.push(g)}
for(let z=-650;z<30;z+=8) if(Math.random()>.35) makeProp(z,Math.random()>.5?1:-1);
for(let z=-600;z<0;z+=45) if(Math.random()>.7) makeWreck(z,Math.random()>.5?1:-1);
for(let z=-550;z<0;z+=60) if(Math.random()>.65) makeRoadSign(z,Math.random()>.5?1:-1);

// Layered mountain silhouettes add scale and parallax to the pass.
const mountains=[];for(let i=0;i<28;i++){const radius=18+Math.random()*28,height=22+Math.random()*50;const geo=new THREE.IcosahedronGeometry(1,2),pos=geo.attributes.position;for(let n=0;n<pos.count;n++){const x=pos.getX(n),y=pos.getY(n),z=pos.getZ(n),j=1+(Math.sin(n*12.73+i)*.11);pos.setXYZ(n,x*j,y*(1+Math.max(0,y)*.4)*j,z*j)}geo.computeVertexNormals();const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.075,.1,.25+Math.random()*.1),roughness:1,flatShading:true}));m.scale.set(radius*1.8,height,radius);m.position.set((Math.random()>.5?1:-1)*(45+Math.random()*120),-height*.34,-90-Math.random()*470);m.rotation.y=Math.random()*Math.PI;m.receiveShadow=true;worldGroup.add(m);mountains.push(m)}

// ---------------------------------------------------------------------------
// Real physics floor that debris and wreckage collide with.
// ---------------------------------------------------------------------------
const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-0.18,0));
world.createCollider(RAPIER.ColliderDesc.cuboid(110,0.1,360), groundBody);

// Pickup bed establishes the first-person moving vehicle viewpoint.
const truck=new THREE.Group();scene.add(truck);
const floor=box(4.7,.18,4.9,mats.truck);floor.position.set(0,.75,1.25);truck.add(floor);
for(const x of [-2.25,2.25]){const side=box(.28,1.15,5.05,mats.truck);side.position.set(x,1.35,1.25);truck.add(side);for(let z=-.7;z<3.5;z+=.55){const rib=box(.035,.76,.09,mats.dark);rib.position.set(x-(Math.sign(x)*.17),1.34,z);truck.add(rib)}}
const tail=box(4.7,1.05,.25,mats.truck);tail.position.set(0,1.3,-1.3);truck.add(tail);
const cab=box(4.55,2.25,2.15,mats.truck);cab.position.set(0,1.52,4.75);truck.add(cab);
const roof=box(4.15,.16,1.95,mats.truck);roof.position.set(0,2.7,4.7);roof.rotation.x=-.04;truck.add(roof);
const windowMat=new THREE.MeshStandardMaterial({color:0x172426,roughness:.12,metalness:.25});const rearWindow=box(2.9,.78,.04,windowMat);rearWindow.position.set(0,1.9,3.66);truck.add(rearWindow);
for(const x of [-1.78,1.78]){const wheel=cyl(.67,.42,new THREE.MeshStandardMaterial({color:0x0c0d0c,roughness:1}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.68,4.7);truck.add(wheel)}
const bumper=box(4.8,.22,.32,mats.dark);bumper.position.set(0,.72,-1.48);truck.add(bumper);
const hitch=box(.32,.18,.55,mats.steel);hitch.position.set(0,.5,-1.72);truck.add(hitch);
for(const x of [-1.55,1.55]){const tailLight=box(.48,.38,.06,mats.red);tailLight.position.set(x,1.37,-1.44);truck.add(tailLight)}
for(let z=-.8;z<3.3;z+=.48){const bedRib=box(4.2,.035,.1,mats.dark);bedRib.position.set(0,.855,z);truck.add(bedRib)}
const rollBar=cyl(.065,4.15,mats.steel);rollBar.rotation.z=Math.PI/2;rollBar.position.set(0,2.55,3.45);truck.add(rollBar);
for(const x of [-1.9,1.9]){const upright=cyl(.065,1.7,mats.steel);upright.position.set(x,1.72,3.45);truck.add(upright)}

// Physics proxy for the truck so debris bounces off it realistically.
const truckBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,1.0,1.25));
world.createCollider(RAPIER.ColliderDesc.cuboid(2.4,1.0,2.6), truckBody);

function limb(r,length,material){const pivot=new THREE.Group(),mesh=cyl(r,length,material);mesh.position.y=-length/2;pivot.add(mesh);return pivot}
function makeSoldier(){
  const g=new THREE.Group(),vest=new THREE.MeshStandardMaterial({color:0x30372d,roughness:.94});
  const hips=box(.62,.32,.42,mats.cloth);hips.position.y=.76;g.add(hips);
  const torso=box(.72,.88,.46,mats.cloth);torso.position.y=1.25;torso.rotation.x=-.08;g.add(torso);
  const armor=box(.79,.64,.13,vest);armor.position.set(0,1.25,-.29);armor.rotation.x=-.08;g.add(armor);
  const neck=cyl(.11,.18,mats.skin);neck.position.y=1.76;g.add(neck);
  const headPivot=new THREE.Group();headPivot.position.y=1.91;g.add(headPivot);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,20,16),mats.skin);head.scale.set(.9,1.08,.92);head.castShadow=true;headPivot.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.32,20,10,0,Math.PI*2,0,Math.PI*.58),mats.dark);helmet.position.y=.08;headPivot.add(helmet);
  const goggles=box(.4,.1,.05,windowMat);goggles.position.set(0,.01,-.25);headPivot.add(goggles);
  const arms=[];
  for(const x of [-.46,.46]){const upper=limb(.115,.64,mats.cloth);upper.position.set(x,1.56,-.03);upper.rotation.set(-1.05,0,x>0?-.22:.22);g.add(upper);arms.push(upper)}
  // Bent thighs and shins make the silhouette unmistakably seated.
  for(const x of [-.23,.23]){const thigh=limb(.155,.78,mats.cloth);thigh.position.set(x,.79,-.05);thigh.rotation.x=-1.36;g.add(thigh);const shin=limb(.145,.82,mats.cloth);shin.position.set(x,.62,-.77);shin.rotation.x=.18;g.add(shin);const boot=box(.28,.2,.48,mats.rubber);boot.position.set(x,.16,-.87);g.add(boot)}
  const weapon=box(.11,.13,1.32,mats.dark);weapon.position.set(.12,1.14,-.7);weapon.rotation.set(-.12,-.16,-.04);g.add(weapon);
  g.userData={headPivot,arms};return g
}
const mate=makeSoldier();mate.position.set(-1.28,.72,.18);mate.rotation.y=-.08;truck.add(mate);

// The camera is the second rider; visible knees and boots ground the first-person view.
const playerBody=new THREE.Group();camera.add(playerBody);
for(const x of [-.34,.34]){const thigh=cyl(.17,.92,mats.cloth);thigh.position.set(x,-.75,-.16);thigh.rotation.x=-1.12;playerBody.add(thigh);const knee=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),mats.cloth);knee.position.set(x,-.57,-.58);playerBody.add(knee);const boot=box(.32,.22,.58,mats.rubber);boot.position.set(x,-.72,-1.05);boot.rotation.x=-.1;playerBody.add(boot)}

// Visible rifle, anchored to camera.
const rifle=new THREE.Group();camera.add(rifle);scene.add(camera);
const receiver=box(.25,.24,1.35,mats.dark);rifle.add(receiver);const rail=box(.18,.055,1.05,mats.dark);rail.position.set(0,.14,-.2);rifle.add(rail);const sight=box(.11,.14,.2,mats.dark);sight.position.set(0,.23,-.58);rifle.add(sight);const barrel=cyl(.045,1.25,mats.dark);barrel.rotation.x=Math.PI/2;barrel.position.z=-1.25;rifle.add(barrel);const hand=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),mats.cloth);hand.scale.set(1,1.2,1.5);hand.position.set(-.18,-.16,-.28);rifle.add(hand);rifle.position.set(.42,-.45,-.78);rifle.rotation.x=-.02;
const muzzle=new THREE.PointLight(0xffaa44,0,5);muzzle.position.set(0,0,-1.9);rifle.add(muzzle);
const muzzleSprite=new THREE.Mesh(new THREE.CircleGeometry(.12,8),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
muzzleSprite.position.set(0,0,-1.91);rifle.add(muzzleSprite);
const shellGeometry=new THREE.CylinderGeometry(.02,.018,.06,8);
const shellMaterial=new THREE.MeshStandardMaterial({color:0xb8860b,roughness:0.3,metalness:0.8});
const casings=[];

// Dust motes near the vehicle make speed legible without expensive volumetrics.
const dustCount=220,dustPositions=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPositions[i*3]=(Math.random()-.5)*24;dustPositions[i*3+1]=Math.random()*4;dustPositions[i*3+2]=-38+Math.random()*55}
const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xd8b98a,size:.075,transparent:true,opacity:.38,depthWrite:false,sizeAttenuation:true}));scene.add(dust);

// Smoke particles for truck damage
const smokeCount=80,smokePositions=new Float32Array(smokeCount*3),smokeColors=new Float32Array(smokeCount*3);
for(let i=0;i<smokeCount;i++){smokePositions[i*3]=(Math.random()-.5)*3;smokePositions[i*3+1]=Math.random()*2;smokePositions[i*3+2]=-1+Math.random()*2;smokeColors[i*3]=0.4;smokeColors[i*3+1]=0.4;smokeColors[i*3+2]=0.4;}
const smokeGeometry=new THREE.BufferGeometry();smokeGeometry.setAttribute('position',new THREE.BufferAttribute(smokePositions,3));smokeGeometry.setAttribute('color',new THREE.BufferAttribute(smokeColors,3));
const smoke=new THREE.Points(smokeGeometry,new THREE.PointsMaterial({size:0.15,vertexColors:true,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true}));smoke.position.set(0,2.5,1.25);truck.add(smoke);
const smokeVelocities=[];for(let i=0;i<smokeCount;i++)smokeVelocities.push(new THREE.Vector3((Math.random()-.5)*0.3,Math.random()*0.2+0.1,(Math.random()-.5)*0.3));

let state='menu', startTime=0, elapsed=0, score=0, kills=0, health=100, ammo=30, reloading=false, lastShot=0, nextSpawn=0, level=1, combo=0, shake=0;
let yaw=0,pitch=0,targetYaw=0,targetPitch=0; const drones=[],particles=[],fragments=[]; const raycaster=new THREE.Raycaster(); const clock=new THREE.Clock();
const truckTarget=new THREE.Vector3(0,1.35,1.15);

// ---------------------------------------------------------------------------
// Drones are now real rigid bodies: they fly under thrust, wobble from torque,
// tumble when shot, and collide with the truck using the physics solver.
// ---------------------------------------------------------------------------
function makeDrone(){
  const g=new THREE.Group();
  const behavior = Math.random();
  let aiType;
  if(behavior < 0.3) aiType = 'diver';
  else if(behavior < 0.6) aiType = 'strafe';
  else if(behavior < 0.8) aiType = 'kamikaze';
  else aiType = 'patrol';
  g.userData={
    hp:level>=4?2:1,
    speed:10+level*1.8+Math.random()*4,
    wobble:Math.random()*6.28,
    hit:false,
    velocity:new THREE.Vector3(),
    aiType:aiType,
    targetPos:new THREE.Vector3(),
    lastEvasive:0,
    divePhase:0,
    formationOffset:new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*2, (Math.random()-0.5)*4),
    maxHealth:level>=4?2:1
  };
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.65,4,8),mats.drone);body.rotation.x=Math.PI/2;body.castShadow=true;g.add(body);
  const cameraEye=box(.2,.16,.14,windowMat);cameraEye.position.set(0,-.12,-.38);g.add(cameraEye);
  g.userData.rotors=[];
  for(const x of [-.62,.62])for(const z of [-.4,.4]){const arm=box(.75,.045,.06,mats.drone);arm.position.set(x/2,0,z);arm.rotation.y=x*z>0?.45:-.45;g.add(arm);const rotor=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.012,24),new THREE.MeshBasicMaterial({color:0x111211,transparent:true,opacity:.32,depthWrite:false}));rotor.position.set(x,.025,z);g.add(rotor);g.userData.rotors.push(rotor)}
  const led=new THREE.PointLight(0xff2600,2.2,3);led.position.z=.42;g.add(led);
  const angle=(Math.random()-.5)*2.2, dist=75+Math.random()*45;
  const px=Math.sin(angle)*dist, py=7+Math.random()*22, pz=-35-Math.abs(Math.cos(angle))*dist;
  g.position.set(px,py,pz);scene.add(g);

  const bodyDesc=RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(px,py,pz)
    .setLinearDamping(0.35).setAngularDamping(1.2)
    .setGravityScale(0.15);
  const rb=world.createRigidBody(bodyDesc);
  world.createCollider(RAPIER.ColliderDesc.capsule(0.32,0.17).setDensity(0.6).setRestitution(0.2).setFriction(0.4), rb);
  g.userData.body=rb;
  drones.push(g);
  if(drones.length===1 || Math.random()<.34) warnDrone(g);
}
function warnDrone(d){const x=d.position.x;ui.warningDirection.textContent=Math.abs(x)<10?'FRONT!':x<0?'LEFT SIDE!':'RIGHT SIDE!';ui.warning.classList.remove('hidden');speak(Math.abs(x)<10?'Drone, front!':x<0?'Contact, left side!':'Drone on the right!');setTimeout(()=>ui.warning.classList.add('hidden'),1300)}
function speak(text){ui.subtitleText.textContent=text;ui.subtitle.classList.remove('hidden');clearTimeout(speak.t);speak.t=setTimeout(()=>ui.subtitle.classList.add('hidden'),2200)}

// ---------------------------------------------------------------------------
// Physics-driven debris: real fragments with mass, restitution and gravity
// that bounce off the road and truck instead of fake scripted particles.
// ---------------------------------------------------------------------------
function burst(pos,color=0xff8b32,count=12){
  for(let i=0;i<count;i++){
    const r=.04+Math.random()*.06;
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),mats.debris);
    m.position.copy(pos);m.castShadow=true;scene.add(m);
    const rb=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x,pos.y,pos.z)
      .setLinvel((Math.random()-.5)*6,(Math.random()-.2)*6,(Math.random()-.5)*6)
      .setAngvel({x:(Math.random()-.5)*10,y:(Math.random()-.5)*10,z:(Math.random()-.5)*10})
      .setGravityScale(1));
    world.createCollider(RAPIER.ColliderDesc.ball(r).setDensity(1.2).setRestitution(0.45).setFriction(0.6), rb);
    m.userData.body=rb;m.userData.life=.9+Math.random()*.6;fragments.push(m);
  }
}

function shoot(){if(state!=='playing'||reloading)return;const now=performance.now();if(now-lastShot<105)return;lastShot=now;if(ammo<=0){reload();return}ammo--;ui.rounds.textContent=ammo;shake=.045;muzzle.intensity=12;muzzleSprite.material.opacity=1;muzzleSprite.rotation.z=Math.random()*Math.PI;muzzleSprite.scale.setScalar(.8+Math.random()*.9);setTimeout(()=>{muzzle.intensity=0;muzzleSprite.material.opacity=0},50);
  // Enhanced recoil: camera kick + rifle movement
  camera.rotation.x-=0.003;
  rifle.position.z=-.65;rifle.rotation.x=.065;
  setTimeout(()=>{rifle.position.z=-.78;rifle.rotation.x=-.02},80);
  // Shell casing ejection
  const casing=new THREE.Mesh(shellGeometry,shellMaterial);
  casing.position.set(.18,-.18,-.65);
  casing.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
  rifle.add(casing);
  const casingRb=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(casing.position.x,casing.position.y,casing.position.z)
    .setLinvel((Math.random()-.5)*2+1.5,-0.5,(Math.random()-.5)*1)
    .setAngvel({x:(Math.random()-.5)*5,y:(Math.random()-.5)*5,z:(Math.random()-.5)*5})
    .setGravityScale(1.5));
  world.createCollider(RAPIER.ColliderDesc.cylinder(0.03,0.06).setDensity(8).setRestitution(0.3).setFriction(0.5),casingRb);
  casings.push({mesh:casing,body:casingRb});
  audioShot();
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const hits=raycaster.intersectObjects(drones,true);if(hits.length){let d=hits[0].object;while(d.parent&&!drones.includes(d))d=d.parent;if(drones.includes(d)){
    d.userData.hp--;
    // Trigger evasive maneuver if drone survives
    if(d.userData.hp>0 && d.userData.aiType==='kamikaze'){
      d.userData.lastEvasive=performance.now();
      const rb=d.userData.body;
      if(rb){rb.applyImpulse({x:(Math.random()-.5)*8,y:(Math.random()-.2)*8,z:(Math.random()-.5)*8},true);}
    }
    burst(hits[0].point,0xffcc66,5);
    if(d.userData.hp<=0)destroyDrone(d)
  }}
  if(ammo===0)ui.reloadPrompt.textContent='R — RELOAD';
}
function destroyDrone(d){const i=drones.indexOf(d);if(i<0)return;
  // Convert the drone into a real explosion: knock the body outward, spawn debris.
  const rb=d.userData.body;
  if(rb){const v=rb.linvel();rb.setLinvel({x:v.x*0.4+(Math.random()-.5)*4,y:v.y+3,z:v.z*0.4+(Math.random()-.5)*4},true);rb.applyTorqueImpulse({x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,z:(Math.random()-.5)*2},true);}
  burst(d.position,0xff6a1a,24);combo++;kills++;score+=100*level+Math.min(combo,10)*20;updateHUD();audioBoom();
  // Remove the drone body shortly after so it falls away as wreckage.
  setTimeout(()=>{const j=drones.indexOf(d);if(j>=0){drones.splice(j,1);if(d.userData.body)world.removeRigidBody(d.userData.body);scene.remove(d)}},600);
}
function reload(){if(reloading||ammo===30||state!=='playing')return;reloading=true;ui.reloadPrompt.textContent='RELOADING…';setTimeout(()=>{if(state==='playing'){ammo=30;ui.rounds.textContent=ammo;ui.reloadPrompt.textContent='';reloading=false}},1450)}
function damage(){health=Math.max(0,health-(17+level*2));combo=0;shake=.3;ui.damageFlash.style.opacity=.9;setTimeout(()=>ui.damageFlash.style.opacity=0,160);updateHUD();audioBoom();speak(health>0?'Impact! Keep firing!':'We lost the truck!');
  // Visual damage effects
  if(health<50){mats.truck.emissive=new THREE.Color(0x331100);mats.truck.emissiveIntensity=0.2;}
  if(health<30){scene.fog.color.setHSL(0.08,0.3,0.25);setTimeout(()=>scene.fog.color.setHSL(0.08,0.1,0.35),3000);}
  if(health<=0)endGame()
}

function updateHUD(){ui.score.textContent=String(score).padStart(6,'0');ui.combo.textContent=combo>=3?`${combo}× STREAK`:'STEADY';ui.healthBar.style.width=health+'%';ui.healthBar.style.background=health<35?'#ef4b32':'#ffb23e';ui.healthText.textContent=Math.ceil(health)+'%'}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function setPlayUI(on){['hud','crosshair','ammo'].forEach(k=>ui[k].classList.toggle('hidden',!on))}
function requestAim(){renderer.domElement.focus();if(document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock?.()}
function startGame(){drones.splice(0).forEach(d=>{if(d.userData.body)world.removeRigidBody(d.userData.body);scene.remove(d)});fragments.splice(0).forEach(f=>{if(f.userData.body)world.removeRigidBody(f.userData.body);scene.remove(f)});state='playing';score=kills=elapsed=combo=0;health=100;ammo=30;level=1;reloading=false;yaw=pitch=targetYaw=targetPitch=0;startTime=performance.now();nextSpawn=.8;ui.menu.classList.add('hidden');ui['game-over'].classList.add('hidden');ui.pause.classList.add('hidden');setPlayUI(true);ui.rounds.textContent=ammo;ui.reloadPrompt.textContent='';updateHUD();speak("We're moving. Watch our six.");requestAim()}
function endGame(){state='over';document.exitPointerLock?.();setPlayUI(false);ui['game-over'].classList.remove('hidden');ui.finalScore.textContent=score;ui.finalKills.textContent=kills;ui.finalTime.textContent=formatTime(elapsed)}
function pauseGame(){if(state!=='playing')return;state='paused';document.exitPointerLock?.();ui.pause.classList.remove('hidden');setPlayUI(false)}
function resume(){if(state!=='paused')return;state='playing';startTime=performance.now()-elapsed*1000;ui.pause.classList.add('hidden');setPlayUI(true);requestAim()}

let audio,engineAudio,windAudio,ambientOsc;
function initAudio(){if(audio)return;audio=new (window.AudioContext||window.webkitAudioContext)();const master=audio.createGain(),low=audio.createBiquadFilter();master.gain.value=.045;low.type='lowpass';low.frequency.value=150;const a=audio.createOscillator(),b=audio.createOscillator();a.type='sawtooth';b.type='square';a.frequency.value=42;b.frequency.value=63;a.connect(low);b.connect(low);low.connect(master).connect(audio.destination);a.start();b.start();engineAudio={a,b,master};
  // Ambient wind sound
  ambientOsc=audio.createOscillator();ambientOsc.type='pink';const windGain=audio.createGain();windGain.gain.value=0.02;ambientOsc.connect(windGain).connect(master);ambientOsc.start();
  windAudio={osc:ambientOsc,gain:windGain};
}
function audioShot(){if(!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='sawtooth';o.frequency.setValueAtTime(140,audio.currentTime);o.frequency.exponentialRampToValueAtTime(45,audio.currentTime+.08);g.gain.setValueAtTime(.18,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.1)}
function audioBoom(){if(!audio)return;const len=audio.sampleRate*.35,b=audio.createBuffer(1,len,audio.sampleRate),data=b.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);const s=audio.createBufferSource(),g=audio.createGain();s.buffer=b;g.gain.value=.35;s.connect(g).connect(audio.destination);s.start()}
function audioDroneBuzz(distance){if(!audio)return;const dist=Math.max(1,distance);const vol=Math.min(0.15,1/dist*2);const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=80+Math.random()*40;g.gain.value=vol;o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+0.1+Math.random()*0.1)}

// YouTube-backed in-game radio. Playback begins only after the player's click.
const radioPlaylists=[
  {id:'PLRteMtxF9z8v9cM7XypQyl8jvfC3Fms0t',video:'S-xfrvfsAr4'},
  {id:'PLRteMtxF9z8u06pcas4OVadcGx0Ga4m9w',video:'CjRx6K5N_-Q'},
  {id:'PLRteMtxF9z8tMEeHJfPUeLawesyFHrsGx',video:'6gXoNuGVOKw'}
];
let ytPlayer,radioReady=false,radioWanted=false,station=Math.floor(Math.random()*radioPlaylists.length);
function loadStation(index,autoplay=true,randomStart=true){station=(index+radioPlaylists.length)%radioPlaylists.length;const channel=radioPlaylists[station];$('radio-station').textContent=`CH ${station+1}`;$('radio-status').textContent=`PLAYLIST ${station+1} / ${radioPlaylists.length}`;if(!radioReady)return;ytPlayer.loadPlaylist({list:channel.id,listType:'playlist',index:0,startSeconds:0});ytPlayer.setShuffle(true);if(randomStart)ytPlayer.nextVideo();if(!autoplay)ytPlayer.pauseVideo()}
$('radio-station').textContent=`CH ${station+1}`;
window.onYouTubeIframeAPIReady=()=>{
  const channel=radioPlaylists[station];
  ytPlayer=new YT.Player('youtube-player',{width:240,height:135,videoId:channel.video,playerVars:{listType:'playlist',list:channel.id,playsinline:1,controls:0,rel:0,modestbranding:1},events:{
    onReady:()=>{radioReady=true;ytPlayer.setVolume(+$('radio-volume').value);ytPlayer.setShuffle(true);ytPlayer.nextVideo();$('radio-status').textContent=`CH ${station+1} · SHUFFLED`;if(radioWanted)ytPlayer.playVideo();else ytPlayer.pauseVideo()},
    onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){$('radio-toggle').textContent='Ⅱ';$('radio-status').textContent=`CH ${station+1} · ON AIR`}else if(e.data===YT.PlayerState.PAUSED){$('radio-toggle').textContent='▶';$('radio-status').textContent='PAUSED'}else if(e.data===YT.PlayerState.ENDED){loadStation(station+1,true)}},
    onError:()=>{$('radio-status').textContent='TRACK UNAVAILABLE';setTimeout(()=>ytPlayer?.nextVideo(),800)}
  }});
};
const ytApi=document.createElement('script');ytApi.src='https://www.youtube.com/iframe_api';document.head.appendChild(ytApi);
function startRadio(){radioWanted=true;if(radioReady)ytPlayer.playVideo()}
$('radio-toggle').addEventListener('click',()=>{if(!radioReady)return;const playing=ytPlayer.getPlayerState()===YT.PlayerState.PLAYING;radioWanted=!playing;playing?ytPlayer.pauseVideo():ytPlayer.playVideo()});
$('radio-prev').addEventListener('click',()=>ytPlayer?.previousVideo());
$('radio-next').addEventListener('click',()=>ytPlayer?.nextVideo());
$('radio-station').addEventListener('click',()=>loadStation(station+1,true,true));
$('radio-volume').addEventListener('input',e=>ytPlayer?.setVolume(+e.target.value));

function update(dt){
  const active=state==='playing';
  if(active){
    elapsed=(performance.now()-startTime)/1000;const newLevel=Math.floor(elapsed/120)+1;if(newLevel!==level){level=newLevel;speak(`Sector ${String(level).padStart(2,'0')}. They're getting faster.`)}ui.time.textContent=formatTime(elapsed);ui.phase.textContent=`SECTOR ${String(level).padStart(2,'0')}`;
    nextSpawn-=dt;if(nextSpawn<=0){makeDrone();nextSpawn=Math.max(.42,2.5-level*.23+Math.random()*1.5)}
    yaw+=(targetYaw-yaw)*Math.min(1,dt*10);pitch+=(targetPitch-pitch)*Math.min(1,dt*10);camera.rotation.set(pitch,yaw,0,'YXZ');
    world.timestep=dt;
    // Physics step for drones + debris runs below in stepPhysics().
    for(let i=drones.length-1;i>=0;i--){const d=drones[i];const rb=d.userData.body;if(!rb)continue;
      const toTruck=truckTarget.clone().sub(d.position);const dist=toTruck.length();
      const aiType=d.userData.aiType;
      let thrustDir=new THREE.Vector3();
      let thrustMult=0.6;
      switch(aiType){
        case 'diver':{
          // Diving attack: climb high then plunge down
          const diveProgress=d.userData.divePhase;
          if(dist>40 && diveProgress===0){
            // Ascend before dive
            thrustDir.set(0,1,0);
            thrustMult=0.8;
          } else if(dist>40 && diveProgress===0 && d.position.y>25){
            d.userData.divePhase=1;
          }
          if(d.userData.divePhase===1){
            // Dive toward truck
            const diveDir=toTruck.normalize();
            thrustDir.add(diveDir);
            thrustMult=1.2;
          }
          if(dist<5){d.userData.divePhase=0;}
          break;
        }
        case 'strafe':{
          // Strafing run: approach from side, circle, then attack
          const sideOffset=d.userData.formationOffset.x;
          const strafeTarget=truckTarget.clone().add(new THREE.Vector3(sideOffset,2,0));
          const toStrafe=strafeTarget.sub(d.position);
          if(toStrafe.length()>5){
            thrustDir=toStrafe.normalize();
            thrustMult=0.7;
          } else {
            thrustDir=toTruck.normalize();
            thrustMult=0.9;
          }
          // Add some lateral movement
          thrustDir.x+=(Math.sin(elapsed*1.3+d.userData.wobble)*0.3);
          break;
        }
        case 'kamikaze':{
          // Direct charge with occasional evasion
          thrustDir=toTruck.normalize();
          thrustMult=1.1;
          // Occasionally do evasive maneuver if shot at
          if(performance.now()-d.userData.lastEvasive<500){
            thrustDir.x+=Math.sin(performance.now()*0.01)*0.5;
            thrustDir.y+=Math.cos(performance.now()*0.015)*0.3;
            thrustMult=0.8;
          }
          break;
        }
        case 'patrol':{
          // Patrol pattern with periodic attacks
          const patrolPoint=truckTarget.clone().add(new THREE.Vector3(
            Math.sin(elapsed*0.5+d.userData.wobble)*15,
            Math.cos(elapsed*0.3+d.userData.wobble)*5,
            0
          ));
          const toPatrol=patrolPoint.sub(d.position);
          if(toPatrol.length()>8){
            thrustDir=toPatrol.normalize();
            thrustMult=0.6;
          } else {
            thrustDir=toTruck.normalize();
            thrustMult=0.8;
          }
          break;
        }
        default:{
          thrustDir=toTruck.normalize();
          thrustMult=0.6;
        }
      }
      // Apply thrust with physics
      if(dist>3){
        thrustDir.normalize();
        const thrust=d.userData.speed;
        const wobbleX=Math.sin(elapsed*2+d.userData.wobble)*dt*0.4;
        const wobbleY=Math.cos(elapsed*1.7+d.userData.wobble)*dt*0.3;
        rb.applyImpulse({
          x:(thrustDir.x*thrust*dt*thrustMult)+wobbleX,
          y:(thrustDir.y*thrust*dt*thrustMult)+wobbleY+Math.sin(elapsed*2+d.userData.wobble)*dt*0.4,
          z:(thrustDir.z*thrust*dt*thrustMult)
        },true);
      }
      d.userData.rotors.forEach((r,n)=>r.rotation.y+=(n%2?1:-1)*dt*65);
      // Drone buzzing sound when close
      if(dist<30 && Math.random()<dt*3)audioDroneBuzz(dist);
      if(dist<2.6){drones.splice(i,1);if(rb)world.removeRigidBody(rb);scene.remove(d);burst(d.position,0xff5b1f,28);damage()}
    }
  }
  // Step the physics solver and sync meshes.
  if(state!=='menu') world.step();
  if(active||state==='over'){
    for(const d of drones){const rb=d.userData.body;if(rb){const t=rb.translation(),v=rb.linvel();d.position.set(t.x,t.y,t.z);d.userData.velocity.set(v.x,v.y,v.z);const bank=THREE.MathUtils.clamp(-v.x*.035,-.42,.42),pitchBank=THREE.MathUtils.clamp(v.y*.025,-.2,.2);d.rotation.z+=(bank-d.rotation.z)*Math.min(1,dt*5);d.rotation.x+=(pitchBank-d.rotation.x)*Math.min(1,dt*5)}}
  }
  for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];const rb=f.userData.body;if(rb){const t=rb.translation(),q=rb.rotation();f.position.set(t.x,t.y,t.z);f.quaternion.set(q.x,q.y,q.z,q.w)}
    f.userData.life-=dt;f.scale.multiplyScalar(0.985);
    if(f.userData.life<=0||f.position.y<-5){if(rb)world.removeRigidBody(rb);scene.remove(f);fragments.splice(i,1)}}

  // Update and clean up shell casings
  for(let i=casings.length-1;i>=0;i--){const c=casings[i];const rb=c.body;if(rb){const t=rb.translation();c.mesh.position.set(t.x,t.y,t.z);const q=rb.rotation();c.mesh.quaternion.set(q.x,q.y,q.z,q.w)}
    if(c.mesh.position.y<-5||c.mesh.position.z>50){if(rb)world.removeRigidBody(rb);scene.remove(c.mesh);casings.splice(i,1)}
  }

  // The pickup drives forward (+Z) while the riders face backward out of the bed.
  // Scenery therefore recedes toward the rear horizon (-Z).
  // Dynamic weather: wind affects dust, fog density changes
  weather.windDirection += (Math.random()-0.5)*0.02;
  weather.windSpeed = 5 + Math.sin(elapsed*0.05)*3 + Math.cos(elapsed*0.03)*2;
  // Occasional fog changes
  if(Math.random()<0.001 && !weather.dustStorm){
    weather.dustStorm = true;
    weather.dustStormTimer = 15 + Math.random()*20;
    weather.targetFog = 0.012;
  }
  if(weather.dustStorm){
    weather.dustStormTimer -= dt;
    if(weather.dustStormTimer <= 0){
      weather.dustStorm = false;
      weather.targetFog = 0.0065;
    }
  }
  scene.fog.density += (weather.targetFog - scene.fog.density) * dt * 0.1;
  const roadSpeed=active?18+level*.7:5;asphaltMap.offset.y=(asphaltMap.offset.y+roadSpeed*dt*.009)%1;dirtMap.offset.y=(dirtMap.offset.y+roadSpeed*dt*.004)%1;for(const m of laneMarks){m.position.z-=roadSpeed*dt;if(m.position.z<-656)m.position.z+=684}for(const p of props){p.position.z-=roadSpeed*dt;if(p.position.z<-655){p.position.z+=690;p.position.x=(Math.random()>.5?1:-1)*(12+Math.random()*65)}}for(const m of mountains){m.position.z-=roadSpeed*dt*.1;if(m.position.z<-650)m.position.z+=560}
  const dustAttribute=dust.geometry.attributes.position;for(let i=0;i<dustCount;i++){let z=dustAttribute.getZ(i)-roadSpeed*dt*(.7+((i%7)/20));let x=dustAttribute.getX(i)+Math.sin(weather.windDirection+i)*weather.windSpeed*dt*0.05;if(z<-38)z=18;dustAttribute.setX(i,x);dustAttribute.setZ(i,z)}dustAttribute.needsUpdate=true;
  // Update smoke particles based on truck health
  const smokeOpacity = health < 70 ? (100 - health) / 100 * 0.5 : 0;
  smoke.material.opacity = smokeOpacity;
  if(health < 70){
    const smokeAttr = smoke.geometry.attributes.position;
    for(let i=0;i<smokeCount;i++){
      smokeVelocities[i].y += 0.01;
      smokeVelocities[i].x += (Math.random()-0.5)*0.02;
      let y = smokeAttr.getY(i) + smokeVelocities[i].y * 0.02;
      if(y > 3) { y = 0; smokeVelocities[i].set((Math.random()-0.5)*0.3, Math.random()*0.2+0.1, (Math.random()-0.5)*0.3); }
      smokeAttr.setY(i, y);
    }
    smoke.geometry.attributes.position.needsUpdate = true;
  }
  const now=performance.now(),suspension=Math.sin(now*.013)*.009+Math.sin(now*.0047)*.014,bump=suspension+(Math.random()-.5)*shake;
  camera.position.set(0,2.62+bump,1.7);truck.rotation.z=Math.sin(now*.003)*.006;truck.rotation.x=Math.sin(now*.0053)*.004;
  mate.rotation.z=Math.sin(now*.006)*.018-truck.rotation.z*.7;mate.position.y=.72+suspension*.8;
  const nearest=drones.reduce((best,d)=>!best||d.position.distanceToSquared(mate.position)<best.position.distanceToSquared(mate.position)?d:best,null);
  if(nearest){const localTarget=truck.worldToLocal(nearest.position.clone());mate.userData.headPivot.rotation.y=THREE.MathUtils.clamp(Math.atan2(localTarget.x,-localTarget.z),-.8,.8);mate.userData.headPivot.rotation.x=THREE.MathUtils.clamp(-Math.atan2(localTarget.y-2,Math.hypot(localTarget.x,localTarget.z)),-.35,.35)}else{mate.userData.headPivot.rotation.y*=.96;mate.userData.headPivot.rotation.x*=.96}
  playerBody.position.y=-bump*.65;rifle.position.y=-.45-bump*.45;
  if(engineAudio){const target=active?1:0;engineAudio.master.gain.setTargetAtTime(.025+target*.035,audio.currentTime,.18);engineAudio.a.frequency.setTargetAtTime(38+roadSpeed*.34,audio.currentTime,.12);engineAudio.b.frequency.setTargetAtTime(58+roadSpeed*.46,audio.currentTime,.12)}
  if(windAudio){windAudio.gain.gain.setTargetAtTime(0.01+weather.windSpeed*0.003,audio.currentTime,.3);windAudio.osc.frequency.setTargetAtTime(80+weather.windSpeed*15,audio.currentTime,.2)}
  shake*=.87;
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera)}

$('start-button').addEventListener('click',()=>{initAudio();startRadio();startGame()});$('restart-button').addEventListener('click',()=>{startRadio();startGame()});$('resume-button').addEventListener('click',resume);
renderer.domElement.addEventListener('mousedown',e=>{if(state==='playing'&&document.pointerLockElement!==renderer.domElement){requestAim();return}if(e.button===0)shoot()});
addEventListener('mousemove',e=>{if(state!=='playing'||document.pointerLockElement!==renderer.domElement)return;targetYaw-=e.movementX*.00165;targetPitch-=e.movementY*.00165;targetYaw=THREE.MathUtils.clamp(targetYaw,-1.35,1.35);targetPitch=THREE.MathUtils.clamp(targetPitch,-.85,.72)});
addEventListener('keydown',e=>{if(e.code==='KeyR')reload();if(e.code==='Escape'&&state==='playing')pauseGame();if(e.code==='KeyM'&&radioReady){const playing=ytPlayer.getPlayerState()===YT.PlayerState.PLAYING;playing?ytPlayer.pauseVideo():ytPlayer.playVideo()}if(e.code==='KeyN'&&radioReady)ytPlayer.nextVideo()});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='playing')pauseGame()});
document.addEventListener('pointerlockerror',()=>{if(state==='playing')speak('Click the game view to enable aiming.')});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
animate();
