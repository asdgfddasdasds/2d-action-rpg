import { PlayerController } from './player-controller.js';

const root = document.querySelector('#game');
const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
root.replaceChildren(canvas);
const ctx = canvas.getContext('2d');
let W = innerWidth, H = innerHeight, DPR = 1;
function resize(){ W=innerWidth; H=innerHeight; DPR=Math.min(2,devicePixelRatio||1); canvas.width=W*DPR; canvas.height=H*DPR; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
addEventListener('resize',resize); resize();

const WORLD={w:4800,h:3200};
const keys=new Set();
const input={down:k=>keys.has(k)||keys.has(k==='shift'?'shift':k)};
const mouse={x:W/2,y:H/2};
const p={x:1120,y:1650,vx:0,vy:0,r:17,hp:130,maxHp:130,energy:100,maxEnergy:100,level:1,xp:0,gold:125,action:0,actionCd:0,combo:0,comboTimer:0,step:0,hit:0,inv:0};
const controller=new PlayerController(p,input);
let cam={x:0,y:0}, clock=0, hitstop=0, shake=0, zone='Whispering Wilds';
const particles=[], texts=[], sparks=[], pickups=[];
const enemies=[
 {kind:'mossling',x:1540,y:1490,r:21,hp:70,max:70,speed:78,hit:0,dead:false,ai:0,tele:0,attack:0},
 {kind:'mossling',x:1740,y:1390,r:21,hp:70,max:70,speed:78,hit:0,dead:false,ai:1,tele:0,attack:0},
 {kind:'stalker',x:2010,y:1040,r:25,hp:115,max:115,speed:62,hit:0,dead:false,ai:2,tele:0,attack:0},
 {kind:'stalker',x:2530,y:930,r:25,hp:115,max:115,speed:62,hit:0,dead:false,ai:3,tele:0,attack:0},
 {kind:'warden',x:3290,y:720,r:48,hp:720,max:720,speed:42,hit:0,dead:false,ai:4,tele:0,attack:0,boss:true,phase:1}
];
const nodes=[['herb',1270,1450],['ore',1510,1080],['wood',720,1390],['crystal',2290,1180],['ore',2800,820],['herb',520,980],['crystal',3650,1780],['ore',4020,2150]].map(a=>({type:a[0],x:a[1],y:a[2],got:false}));
const npcs=[['Mira','Merchant',970,1580],['Bran','Blacksmith',1210,1500],['Elowen','Alchemist',1010,1740],['Orin','Explorer',1260,1780]].map(a=>({name:a[0],role:a[1],x:a[2],y:a[3]}));
const landmarks=[['camp','Aether Camp',1120,1650],['archive','Sunken Archive',2300,1430],['mine','Hollow Mine',3650,1800],['grove','Corrupted Grove',500,850],['watch','Old Watchtower',3290,720]];
const discovered=new Set();
const toastStack=document.querySelector('#toast-stack');

function hash(n){const v=Math.sin(n*127.19+3.17)*43758.5453;return v-Math.floor(v)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function d(a,b,c,d){return Math.hypot(a-c,b-d)}
function sx(x){return x-cam.x} function sy(y){return y-cam.y}
function shadow(x,y,r){ctx.fillStyle='rgba(20,19,15,.24)';ctx.beginPath();ctx.ellipse(x,y,r,r*.3,0,0,Math.PI*2);ctx.fill()}

function terrain(){
  ctx.fillStyle='#6d735c';ctx.fillRect(0,0,W,H);
  // Broad hand-painted value masses.
  for(let i=0;i<34;i++){const x=sx(hash(i+2)*WORLD.w),y=sy(430+hash(i+80)*2450),rx=180+hash(i+100)*430,ry=100+hash(i+130)*240;ctx.fillStyle=i%3===0?'rgba(42,57,43,.20)':i%3===1?'rgba(118,103,67,.13)':'rgba(211,193,140,.07)';ctx.beginPath();ctx.ellipse(x,y,rx,ry,hash(i+20)*Math.PI,0,Math.PI*2);ctx.fill()}
  // River.
  ctx.fillStyle='#35565a';ctx.beginPath();ctx.moveTo(sx(1880),sy(0));ctx.bezierCurveTo(sx(2080),sy(430),sx(1700),sy(850),sx(1980),sy(1280));ctx.bezierCurveTo(sx(2210),sy(1700),sx(1800),sy(2150),sx(2030),sy(3200));ctx.lineTo(sx(2320),sy(3200));ctx.bezierCurveTo(sx(2090),sy(2150),sx(2500),sy(1710),sx(2250),sy(1260));ctx.bezierCurveTo(sx(1980),sy(820),sx(2320),sy(430),sx(2150),sy(0));ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(208,215,185,.20)';ctx.lineWidth=3;for(let i=0;i<13;i++){const y=sy(90+i*250+Math.sin(clock*.001+i)*10);ctx.beginPath();ctx.moveTo(sx(1930),y);ctx.quadraticCurveTo(sx(2100),y-18,sx(2240),y+8);ctx.stroke()}
  // Roads.
  const roads=[[[1120,1650],[1440,1490],[1760,1210],[2210,1070],[2700,870],[3290,720]],[[1760,1210],[2170,1450],[2500,1770],[2900,2260]],[[1120,1650],[820,1370],[500,850]],[[2500,1770],[3100,1800],[3650,1800],[4150,2200]]];
  for(const pts of roads){ctx.lineCap='round';ctx.strokeStyle='rgba(55,44,32,.35)';ctx.lineWidth=80;path(pts);ctx.stroke();ctx.strokeStyle='#a08a62';ctx.lineWidth=58;path(pts);ctx.stroke();ctx.strokeStyle='rgba(230,212,170,.22)';ctx.lineWidth=2;path(pts);ctx.stroke()}
  // Grass strokes.
  for(let i=0;i<380;i++){const x=sx(hash(i*2.7)*WORLD.w),y=sy(400+hash(i*4.1)*2500);if(x<-20||x>W+20||y<-20||y>H+20)continue;ctx.strokeStyle=i%5?'rgba(31,54,39,.19)':'rgba(224,207,157,.14)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x-2,y-3);ctx.moveTo(x,y+5);ctx.lineTo(x+3,y-4);ctx.stroke()}
}
function path(pts){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(sx(q[0]),sy(q[1])):ctx.moveTo(sx(q[0]),sy(q[1])))}
function tree(wx,wy,s,v=0){const x=sx(wx),y=sy(wy);if(x<-100||x>W+100||y<-180||y>H+150)return;shadow(x,y+20,s*.58);ctx.fillStyle='#493b2c';ctx.fillRect(x-5,y-s*.18,10,s*.7);ctx.fillStyle=v?'#294634':'#233d30';ctx.beginPath();ctx.moveTo(x,y-s*2);ctx.bezierCurveTo(x-s*1.05,y-s*1.25,x-s*.95,y-s*.4,x-s*.55,y);ctx.bezierCurveTo(x-s*.1,y+s*.1,x+s*.5,y+s*.05,x+s*.78,y-s*.25);ctx.bezierCurveTo(x+s*.9,y-s*.9,x+s*.6,y-s*1.55,x,y-s*2);ctx.fill();ctx.fillStyle=v?'#526448':'#40573e';ctx.beginPath();ctx.arc(x-s*.3,y-s*1.35,s*.4,0,Math.PI*2);ctx.arc(x+s*.3,y-s*.95,s*.5,0,Math.PI*2);ctx.fill()}
function forest(){for(let i=0;i<270;i++){const x=50+hash(i*5.2)*WORLD.w,y=420+hash(i*8.4)*2500;if(x>700&&x<1450&&y>1260&&y<1880)continue;if(x>1550&&x<2300&&y>900&&y<1510)continue;tree(x,y,18+hash(i*9)*38,i%9===0?1:0)}}

function camp(){const x=sx(1120),y=sy(1650);ctx.fillStyle='rgba(30,31,23,.20)';ctx.beginPath();ctx.ellipse(x,y+90,330,120,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#59654d';ctx.beginPath();ctx.ellipse(x,y+20,265,125,0,0,Math.PI*2);ctx.fill();for(const q of [[-145,-10,.9],[-25,20,1],[95,-5,.82]]){const tx=x+q[0],ty=y+q[1],s=76*q[2];ctx.fillStyle='#806648';ctx.beginPath();ctx.moveTo(tx-s,ty+s*.7);ctx.lineTo(tx,ty-s*.65);ctx.lineTo(tx+s,ty+s*.7);ctx.closePath();ctx.fill();ctx.strokeStyle='#49392a';ctx.lineWidth=3;ctx.stroke()}ctx.fillStyle='#3d2c20';ctx.beginPath();ctx.ellipse(x+25,y+68,52,20,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#cf8749';ctx.beginPath();ctx.moveTo(x+25,y+67);ctx.quadraticCurveTo(x-12,y+27,x+25,y-4);ctx.quadraticCurveTo(x+62,y+30,x+25,y+67);ctx.fill();ctx.fillStyle='#eed488';ctx.beginPath();ctx.moveTo(x+25,y+57);ctx.quadraticCurveTo(x+8,y+31,x+26,y+12);ctx.quadraticCurveTo(x+42,y+34,x+25,y+57);ctx.fill();label('AETHER CAMP',x,y-138)}
function ruins(){const x=sx(2300),y=sy(1430);shadow(x,y+55,150);ctx.fillStyle='#575044';ctx.fillRect(x-145,y-62,290,100);ctx.fillStyle='#8b795b';for(let i=-118;i<100;i+=72)ctx.fillRect(x+i,y-125,48,125);ctx.fillStyle='#272923';ctx.fillRect(x-42,y-48,84,86);ctx.strokeStyle='#302d27';ctx.lineWidth=6;ctx.strokeRect(x-145,y-62,290,100)}
function tower(){const x=sx(3290),y=sy(720);shadow(x,y+80,100);ctx.fillStyle='#504a3e';ctx.fillRect(x-62,y-155,124,205);ctx.fillStyle='#766e59';ctx.fillRect(x-82,y-173,164,20);ctx.strokeStyle='#2e2c28';ctx.lineWidth=7;ctx.strokeRect(x-62,y-155,124,205);ctx.beginPath();ctx.moveTo(x-76,y-173);ctx.lineTo(x,y-225);ctx.lineTo(x+76,y-173);ctx.stroke();ctx.fillStyle='#1e211e';ctx.fillRect(x-36,y-92,72,92);const a=.14+.06*Math.sin(clock*.003);ctx.fillStyle=`rgba(235,211,144,${a})`;ctx.beginPath();ctx.moveTo(x,y-92);ctx.lineTo(x+130,y-12);ctx.lineTo(x-130,y-12);ctx.closePath();ctx.fill();label('OLD WATCHTOWER',x,y-250)}
function landmarkDraw(){camp();ruins();tower();const x=sx(500),y=sy(850);ctx.strokeStyle='#52684b';ctx.lineWidth=30;ctx.beginPath();ctx.arc(x,y,130,0,Math.PI*2);ctx.stroke()}
function label(t,x,y){ctx.fillStyle='#ddc995';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText(t,x,y)}

function drawNode(n){if(n.got)return;const x=sx(n.x),y=sy(n.y);shadow(x,y+12,14);ctx.strokeStyle=n.type==='crystal'?'#d8c17c':n.type==='ore'?'#aaa28f':n.type==='wood'?'#7c8d68':'#b5b777';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();if(n.type==='wood'){ctx.moveTo(x,y+12);ctx.lineTo(x,y-18);ctx.moveTo(x,y-4);ctx.lineTo(x-15,y-17);ctx.moveTo(x,y-8);ctx.lineTo(x+14,y-20)}else{ctx.moveTo(x,y+11);ctx.lineTo(x-11,y-12);ctx.lineTo(x+2,y-25);ctx.lineTo(x+14,y+7)}ctx.stroke()}
function drawNpc(n){const x=sx(n.x),y=sy(n.y);shadow(x,y+20,15);ctx.fillStyle='#d6b27e';ctx.beginPath();ctx.arc(x,y-18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle={Merchant:'#735b45',Blacksmith:'#5b483b',Alchemist:'#50694f',Explorer:'#657058'}[n.role];ctx.beginPath();ctx.moveTo(x-16,y+16);ctx.lineTo(x-11,y-7);ctx.lineTo(x+11,y-7);ctx.lineTo(x+16,y+16);ctx.closePath();ctx.fill();ctx.fillStyle='#ead9b4';ctx.font='10px Inter';ctx.textAlign='center';ctx.fillText(n.name,x,y+33)}
function drawEnemy(e){if(e.dead)return;const x=sx(e.x),y=sy(e.y);shadow(x,y+22,e.boss?42:24);ctx.save();ctx.translate(x,y);if(e.tele>0){ctx.strokeStyle=e.boss?'rgba(207,110,76,.85)':'rgba(191,126,79,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+10+Math.sin(clock*.02)*3,0,Math.PI*2);ctx.stroke()}const hurt=e.hit>0;ctx.fillStyle=hurt?'#c47765':e.boss?'#60483f':e.kind==='stalker'?'#3b4638':'#3f5641';ctx.beginPath();if(e.boss){for(let i=0;i<10;i++){const a=i*Math.PI/5;const r=i%2?e.r*.76:e.r*1.15;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}}else{ctx.moveTo(-e.r,e.r*.7);ctx.lineTo(-e.r*.7,-e.r*.7);ctx.lineTo(0,-e.r*1.35);ctx.lineTo(e.r*.7,-e.r*.7);ctx.lineTo(e.r,e.r*.7)}ctx.closePath();ctx.fill();ctx.strokeStyle=e.boss?'#d0ac70':'#252c24';ctx.lineWidth=e.boss?3:2;ctx.stroke();ctx.fillStyle='#dbc17e';ctx.fillRect(-8,-9,5,5);ctx.fillRect(4,-9,5,5);if(e.boss){ctx.strokeStyle='rgba(221,188,115,.32)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,e.r+13+Math.sin(clock*.006)*3,0,Math.PI*2);ctx.stroke()}ctx.restore();if(e.hp<e.max){ctx.fillStyle='#242820';ctx.fillRect(x-e.r-5,y-e.r*1.75,2*(e.r+5),5);ctx.fillStyle=e.boss?'#b99058':'#985a4c';ctx.fillRect(x-e.r-5,y-e.r*1.75,2*(e.r+5)*e.hp/e.max,5)}}
function drawPlayer(state){const x=sx(p.x),y=sy(p.y);shadow(x,y+24,21);const sp=Math.hypot(p.vx,p.vy);const bob=state.dashing?0:Math.sin(p.step)*Math.min(2.5,sp/105);ctx.save();ctx.translate(x,y+bob);const a=Math.atan2(controller.facing.y,controller.facing.x);ctx.rotate(a);if(state.dashing){for(let i=4;i>=1;i--){ctx.globalAlpha=.045*i;ctx.fillStyle='#e0c47c';ctx.beginPath();ctx.ellipse(-i*17,0,15,22,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}ctx.fillStyle='#3f5141';ctx.beginPath();ctx.moveTo(-18,20);ctx.lineTo(-14,-10);ctx.lineTo(0,-38);ctx.lineTo(14,-10);ctx.lineTo(18,20);ctx.closePath();ctx.fill();ctx.strokeStyle='#202920';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#d9b982';ctx.beginPath();ctx.arc(0,-21,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#987b50';ctx.fillRect(-14,1,28,20);if(p.action>0){const progress=1-p.action/170;const reach=48+Math.sin(Math.min(1,progress)*Math.PI)*26;ctx.strokeStyle='#e5c77e';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,reach,-1.02,1.02);ctx.stroke()}ctx.restore()}

function burst(x,y,c,n=12,s=130){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=30+Math.random()*s;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:1.5+Math.random()*3,life:260+Math.random()*240,max:500,c})}}
function slashSpark(x,y,a){for(let i=0;i<7;i++){const aa=a+(Math.random()-.5)*.7;const v=130+Math.random()*220;sparks.push({x,y,vx:Math.cos(aa)*v,vy:Math.sin(aa)*v,life:170,max:170})}}
function floatText(x,y,t,c='#dfc47f'){texts.push({x,y,t,c,life:650,max:650})}
function fx(dt){for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.life-=dt;q.x+=q.vx*dt/1000;q.y+=q.vy*dt/1000;q.vy+=90*dt/1000;if(q.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=q.life/q.max;ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(sx(q.x),sy(q.y),q.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}for(let i=sparks.length-1;i>=0;i--){const q=sparks[i];q.life-=dt;q.x+=q.vx*dt/1000;q.y+=q.vy*dt/1000;if(q.life<=0){sparks.splice(i,1);continue}ctx.globalAlpha=q.life/q.max;ctx.strokeStyle='#e6c97e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx(q.x),sy(q.y));ctx.lineTo(sx(q.x-q.vx*.025),sy(q.y-q.vy*.025));ctx.stroke();ctx.globalAlpha=1}for(let i=texts.length-1;i>=0;i--){const q=texts[i];q.life-=dt;q.y-=.42;if(q.life<=0){texts.splice(i,1);continue}ctx.globalAlpha=q.life/q.max;ctx.fillStyle=q.c;ctx.font='bold 12px Inter';ctx.textAlign='center';ctx.fillText(q.t,sx(q.x),sy(q.y));ctx.globalAlpha=1}}

function attack(){controller.press('action')}
function resolveAttack(){if(p.actionCd>0||hitstop>0)return false;const a=Math.atan2(mouse.y-H/2,mouse.x-W/2);controller.facing.x=Math.cos(a);controller.facing.y=Math.sin(a);p.action=170;p.actionCd=205;p.combo=p.comboTimer>0?(p.combo%3)+1:1;p.comboTimer=720;const reach=104+(p.combo===3?14:0);let hits=0;for(const e of enemies){if(e.dead)continue;const dd=d(p.x,p.y,e.x,e.y),ea=Math.atan2(e.y-p.y,e.x-p.x),dif=Math.atan2(Math.sin(ea-a),Math.cos(ea-a));if(dd<reach+e.r&&Math.abs(dif)<1.12){const amount=24+(p.combo-1)*9+(e.boss&&p.combo===3?8:0);e.hp-=amount;e.hit=125;e.tele=0;e.attack=0;hits++;floatText(e.x,e.y,'−'+amount,amount>30?'#ead07f':'#d08b6f');burst(e.x,e.y,amount>30?'#e3c477':'#b86b58',9,170);slashSpark(e.x,e.y,a);if(e.hp<=0){e.dead=true;p.xp+=e.boss?300:42;p.gold+=e.boss?120:10;pickups.push({x:e.x,y:e.y,t:e.boss?'Warden Relic':'Aether Shard'});burst(e.x,e.y,'#e2c77e',24,240);if(e.boss)toast('The Warden falls','The sealed road beyond the tower is open.')}}}if(hits){hitstop=hits>1?62:48;shake=hits>1?8:5;controller.facing.x=Math.cos(a);controller.facing.y=Math.sin(a)}return true}
function gather(){for(const n of nodes)if(!n.got&&d(p.x,p.y,n.x,n.y)<72){n.got=true;p.xp+=12;floatText(n.x,n.y,'+'+n.type,'#d8c88f');burst(n.x,n.y,'#b7b47c',8,70);toast('Gathered',n.type+' added to your pack.');return}}
function interact(){for(const n of npcs)if(d(p.x,p.y,n.x,n.y)<78){toast(n.name,n.role+' · Camp service unlocked soon.');return}for(const l of landmarks)if(d(p.x,p.y,l[2],l[3])<150){discovered.add(l[0]);toast('Discovery',l[1]);return}}
function collect(){for(let i=pickups.length-1;i>=0;i--)if(d(p.x,p.y,pickups[i].x,pickups[i].y)<72){const q=pickups[i];p.gold+=q.t==='Warden Relic'?40:6;floatText(p.x,p.y,'+'+(q.t==='Warden Relic'?40:6)+' gold');pickups.splice(i,1)}}

function enemyAI(e,dt){if(e.dead)return;e.hit=Math.max(0,e.hit-dt);e.tele=Math.max(0,e.tele-dt);e.attack=Math.max(0,e.attack-dt);const dd=d(p.x,p.y,e.x,e.y);if(dd>520)return;if(e.tele>0)return;if(dd>92){const nx=(p.x-e.x)/Math.max(1,dd),ny=(p.y-e.y)/Math.max(1,dd);const wob=Math.sin(clock*.002+e.ai)*.18;e.x+=(nx*Math.cos(wob)-ny*Math.sin(wob))*e.speed*dt/1000;e.y+=(nx*Math.sin(wob)+ny*Math.cos(wob))*e.speed*dt/1000;return}if(e.attack<=0&&!controller.invulnerable){e.tele=e.boss?420:300;e.attack=e.boss?1000:800;setTimeout(()=>{},0)}else if(e.attack<e.tele+30&&e.attack>e.tele-20){if(!controller.invulnerable){const dmg=e.boss?20:10;p.hp-=dmg;p.hit=180;p.inv=260;shake=6;floatText(p.x,p.y,'−'+dmg,'#c97865');if(p.hp<=0)respawn()}}}
function respawn(){p.hp=p.maxHp;p.x=1120;p.y=1650;p.vx=p.vy=0;p.gold=Math.max(0,p.gold-20);toast('Fallen','Back to Aether Camp. Keep moving.')}

function update(dt){
  if(hitstop>0){hitstop=Math.max(0,hitstop-dt);return}
  clock+=dt;p.action=Math.max(0,p.action-dt);p.actionCd=Math.max(0,p.actionCd-dt);p.comboTimer=Math.max(0,p.comboTimer-dt);p.hit=Math.max(0,p.hit-dt);p.inv=Math.max(0,p.inv-dt);
  const menu=document.querySelector('#menu-overlay');if(menu&&!menu.classList.contains('hidden'))return;
  const state=controller.update(dt);
  if(controller.consumeAction())resolveAttack();
  if(state.moving)p.step+=dt*.018*(state.sprinting?1.25:1);
  p.x=clamp(p.x,38,WORLD.w-38);p.y=clamp(p.y,38,WORLD.h-38);
  for(const e of enemies)enemyAI(e,dt);
  collect();
  const look=controller.dash.active?105:68;const tx=clamp(p.x-W*.5+controller.facing.x*look,0,Math.max(0,WORLD.w-W));const ty=clamp(p.y-H*.5+controller.facing.y*look*.65,0,Math.max(0,WORLD.h-H));const follow=Math.min(1,dt/70);cam.x+=(tx-cam.x)*follow;cam.y+=(ty-cam.y)*follow;
  shake*=Math.pow(.015,dt/1000);if(shake<.05)shake=0;cam.x+=(Math.random()-.5)*shake;cam.y+=(Math.random()-.5)*shake;
  zone=p.x>2400&&p.y<1350?'Crown of Stone':p.x>2400?'Glassfall Expanse':p.y>2150?'Mire of Bells':p.x<780&&p.y<1100?'Corrupted Grove':'Whispering Wilds';
  fx(dt);
}
function draw(){ctx.save();terrain();forest();landmarkDraw();for(const n of nodes)drawNode(n);for(const n of npcs)drawNpc(n);for(const e of enemies)drawEnemy(e);for(const q of pickups){ctx.fillStyle='#e3c97e';ctx.font='bold 11px Inter';ctx.textAlign='center';ctx.fillText('✦ '+q.t,sx(q.x),sy(q.y)-10)}const state={moving:Math.hypot(p.vx,p.vy)>20,sprinting:Math.hypot(p.vx,p.vy)>300,dashing:controller.dash.active};drawPlayer(state);fx(0);const vign=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.82);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(16,18,14,.24)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);ctx.restore()}
function toast(a,b){if(!toastStack)return;const el=document.createElement('div');el.className='toast';el.innerHTML='<b>'+a+'</b><span>'+b+'</span>';toastStack.appendChild(el);setTimeout(()=>el.remove(),2800)}
function hud(){let xpPct=clamp(p.xp/(p.level*100)*100,0,100);while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.maxHp+=10;p.hp=p.maxHp;toast('Level Up','Level '+p.level)}xpPct=clamp(p.xp/(p.level*100)*100,0,100);const hp=clamp(p.hp/p.maxHp*100,0,100);document.querySelector('#level-label').textContent='LV '+p.level;document.querySelector('#xp-label').textContent=Math.floor(p.xp)+' / '+p.level*100+' XP';document.querySelector('#xp-fill').style.width=xpPct+'%';document.querySelector('#health-fill').style.width=hp+'%';document.querySelector('#health-label').textContent=Math.ceil(p.hp)+' / '+p.maxHp;document.querySelector('#energy-label').textContent=Math.floor(p.energy)+' / '+p.maxEnergy;document.querySelector('#gold-label').textContent=p.gold;document.querySelector('.zone-title').textContent=zone;document.querySelector('.zone-subtitle').textContent=(zone==='Whispering Wilds'?'Aether Camp':zone)+' · Threat '+(zone==='Whispering Wilds'?'II':'IV');document.querySelector('#combo-label').textContent=p.comboTimer>0&&p.combo>1?'COMBO '+p.combo:''}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' ')e.preventDefault();if(!keys.has(k)){if(k===' ')controller.press('dash');if(k==='e')interact();if(k==='f')gather();if(k==='i'||k==='c'||k==='m'||k==='j'||k==='k'||k==='b'){e.preventDefault();document.querySelector('#menu-overlay')?.classList.remove('hidden');const title=document.querySelector('#menu-title');if(title)title.textContent={i:'Inventory',c:'Character',m:'Frontier Map',j:'Quest Journal',k:'Crafting Hall',b:'Aether Camp'}[k]}}keys.add(k);if(k==='escape')document.querySelector('#menu-overlay')?.classList.add('hidden')});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
addEventListener('mousedown',e=>{if(e.button===0){mouse.x=e.clientX;mouse.y=e.clientY;attack()}});
addEventListener('contextmenu',e=>e.preventDefault());

toast('Aether frontier','WASD move · Shift sprint · Space dash · LMB attack');
let last=performance.now();function loop(now){const dt=Math.min(33,now-last);last=now;update(dt);draw();hud();requestAnimationFrame(loop)}requestAnimationFrame(loop);
