import { PlayerController } from './player-controller.js';

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
document.querySelector('#game').replaceChildren(canvas);
const ctx = canvas.getContext('2d');
let W = innerWidth, H = innerHeight, dpr = 1;
function resize(){ W=innerWidth; H=innerHeight; dpr=Math.min(2,devicePixelRatio||1); canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize',resize); resize();

const world={w:4200,h:2800};
const input={keys:new Set(), down(k){return this.keys.has(k)}};
const mouse={x:W/2,y:H/2,down:false};
const p={x:980,y:1540,vx:0,vy:0,r:18,hp:120,maxHp:120,energy:100,maxEnergy:100,level:1,xp:0,gold:125,action:0,actionCd:0,combo:0,comboTimer:0,step:0,hit:0};
const controller=new PlayerController(p,input);
let cam={x:0,y:0}, time=0, hitstop=0, shake=0, zone='Whispering Wilds';
const particles=[], afterimages=[], floats=[], pickups=[];
const enemies=[
  {x:1450,y:1320,r:22,hp:60,max:60,speed:86,phase:0,hit:0,dead:false},
  {x:1580,y:1435,r:22,hp:60,max:60,speed:86,phase:1,hit:0,dead:false},
  {x:1730,y:1000,r:24,hp:90,max:90,speed:58,phase:2,hit:0,dead:false},
  {x:2450,y:920,r:27,hp:130,max:130,speed:52,phase:3,hit:0,dead:false},
  {x:2750,y:820,r:27,hp:130,max:130,speed:52,phase:4,hit:0,dead:false},
  {x:3090,y:680,r:44,hp:620,max:620,speed:40,phase:5,hit:0,dead:false,boss:true}
];
const nodes=[['herb',1210,1390],['ore',1510,1060],['wood',660,1300],['crystal',2300,1110],['ore',2720,760],['herb',520,1010],['crystal',3380,1700]].map(a=>({t:a[0],x:a[1],y:a[2],got:false}));
const npcs=[['Mira','Merchant',850,1500],['Bran','Blacksmith',1120,1480],['Elowen','Alchemist',900,1620],['Orin','Explorer',1150,1610]].map(a=>({name:a[0],role:a[1],x:a[2],y:a[3]}));
const found=new Set();
const landmarks=[{id:'camp',x:980,y:1540},{id:'watch',x:3090,y:680},{id:'archive',x:2200,y:1330},{id:'mine',x:3440,y:1760},{id:'grove',x:520,y:850}];
const toastStack=document.querySelector('#toast-stack');

function hash(n){const x=Math.sin(n*91.173)*43758.5453;return x-Math.floor(x)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b,c,d){return Math.hypot(a-c,b-d)}
function sx(x){return x-cam.x}
function sy(y){return y-cam.y}
function shadow(x,y,r){ctx.fillStyle='rgba(12,16,12,.28)';ctx.beginPath();ctx.ellipse(x,y,r,r*.27,0,0,Math.PI*2);ctx.fill()}

function terrain(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#6d7867');g.addColorStop(.48,'#78856b');g.addColorStop(1,'#56644d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const horizon=sy(650);
  for(let layer=0;layer<3;layer++){
    ctx.fillStyle=['#394b3d','#465942','#53634b'][layer];ctx.beginPath();ctx.moveTo(0,horizon+120+layer*70);
    for(let x=-80;x<W+100;x+=120){const wx=x+cam.x;ctx.lineTo(x,horizon-90-hash(Math.floor(wx/120)+layer*50)*170+layer*55)}
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  }
  ctx.fillStyle='rgba(222,213,168,.08)';ctx.beginPath();ctx.moveTo(0,sy(1120));ctx.bezierCurveTo(W*.25,sy(880),W*.55,sy(1250),W,sy(970));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  // River with soft banks and moving highlights.
  ctx.fillStyle='#27484a';ctx.beginPath();ctx.moveTo(sx(1640),sy(0));ctx.bezierCurveTo(sx(1810),sy(430),sx(1510),sy(820),sx(1740),sy(1220));ctx.bezierCurveTo(sx(1960),sy(1650),sx(1660),sy(2150),sx(1810),sy(2800));ctx.lineTo(sx(2080),sy(2800));ctx.bezierCurveTo(sx(1930),sy(2200),sx(2220),sy(1650),sx(1980),sy(1240));ctx.bezierCurveTo(sx(1780),sy(820),sx(2060),sy(420),sx(1900),sy(0));ctx.closePath();ctx.fill();
  ctx.fillStyle='#5d7f7e';ctx.beginPath();ctx.moveTo(sx(1735),sy(0));ctx.bezierCurveTo(sx(1870),sy(450),sx(1620),sy(820),sx(1830),sy(1230));ctx.bezierCurveTo(sx(2010),sy(1650),sx(1750),sy(2160),sx(1910),sy(2800));ctx.lineTo(sx(2010),sy(2800));ctx.bezierCurveTo(sx(1860),sy(2140),sx(2110),sy(1650),sx(1930),sy(1240));ctx.bezierCurveTo(sx(1750),sy(820),sx(2010),sy(430),sx(1840),sy(0));ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(225,230,210,.28)';ctx.lineWidth=4;for(let i=0;i<10;i++){const yy=sy(140+i*295+Math.sin(time*.0007+i)*8);ctx.beginPath();ctx.moveTo(sx(1740)+Math.sin(i)*35,yy);ctx.quadraticCurveTo(sx(1840),yy-22,sx(1950)+Math.sin(i*2)*25,yy+4);ctx.stroke()}
  // Roads.
  const roads=[[[980,1540],[1260,1470],[1510,1250],[1850,1120],[2200,980],[2600,820],[3090,680]],[[1850,1120],[2180,1340],[2420,1680],[2600,2240]],[[980,1540],[760,1280],[520,850]],[[2420,1680],[2900,1740],[3440,1760]]];
  for(const pts of roads){ctx.strokeStyle='rgba(53,43,32,.45)';ctx.lineWidth=72;ctx.lineCap='round';ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(sx(q[0]),sy(q[1])):ctx.moveTo(sx(q[0]),sy(q[1])));ctx.stroke();ctx.strokeStyle='#a28d65';ctx.lineWidth=56;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(sx(q[0]),sy(q[1])):ctx.moveTo(sx(q[0]),sy(q[1])));ctx.stroke();ctx.strokeStyle='rgba(232,215,172,.25)';ctx.lineWidth=2;ctx.stroke()}
  for(let i=0;i<260;i++){const x=sx(hash(i*2.3)*world.w),y=sy(700+hash(i*4.7)*2050);if(x<-20||x>W+20||y<-20||y>H+20)continue;ctx.strokeStyle=i%4?'rgba(42,65,45,.22)':'rgba(220,208,156,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x-2,y-3);ctx.moveTo(x,y+4);ctx.lineTo(x+3,y-4);ctx.stroke()}
}

function tree(wx,wy,s,variant=0){const x=sx(wx),y=sy(wy);if(x<-100||x>W+100||y<-160||y>H+100)return;shadow(x,y+18,s*.62);ctx.fillStyle='#40362b';ctx.fillRect(x-5,y-s*.2,10,s*.65);ctx.fillStyle=variant?'#294335':'#203b2e';ctx.beginPath();ctx.moveTo(x,y-s*2);ctx.bezierCurveTo(x-s,y-s*1.15,x-s*.9,y-s*.45,x-s*.55,y-s*.12);ctx.bezierCurveTo(x-s*.2,y+s*.02,x+s*.35,y+s*.04,x+s*.7,y-s*.15);ctx.bezierCurveTo(x+s*.9,y-s*.65,x+s*.65,y-s*1.35,x,y-s*2);ctx.fill();ctx.fillStyle=variant?'#476047':'#3d5740';ctx.beginPath();ctx.arc(x-s*.25,y-s*1.28,s*.35,0,Math.PI*2);ctx.arc(x+s*.3,y-s*.92,s*.48,0,Math.PI*2);ctx.fill()}
function forest(){for(let i=0;i<230;i++){const x=60+hash(i*3.1)*4040,y=430+hash(i*4.9)*2250;if(x>620&&x<1320&&y>1260&&y<1810)continue;if(x>1450&&x<2120&&y>940&&y<1460)continue;tree(x,y,18+hash(i*6)*34,i%7===0?1:0)}}

function camp(){const x=sx(980),y=sy(1540);ctx.fillStyle='rgba(31,38,27,.28)';ctx.beginPath();ctx.ellipse(x,y+90,310,110,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#596548';ctx.beginPath();ctx.ellipse(x,y+20,250,120,0,0,Math.PI*2);ctx.fill();for(const q of [[-130,-15,.9],[-25,25,1],[90,-8,.85]]){const tx=x+q[0],ty=y+q[1],s=70*q[2];ctx.fillStyle='#876c4d';ctx.beginPath();ctx.moveTo(tx-s,ty+s*.7);ctx.lineTo(tx,ty-s*.65);ctx.lineTo(tx+s,ty+s*.7);ctx.closePath();ctx.fill();ctx.strokeStyle='#4c3c2d';ctx.lineWidth=3;ctx.stroke()}ctx.fillStyle='#3e2b1e';ctx.beginPath();ctx.ellipse(x+28,y+63,46,18,0,0,Math.PI*2);ctx.fill();const pulse=1+Math.sin(time*.012)*.08;ctx.fillStyle='#c98247';ctx.beginPath();ctx.moveTo(x+28,y+64);ctx.quadraticCurveTo(x-5,y+25,x+28,y-2);ctx.quadraticCurveTo(x+61,y+29,x+28,y+64);ctx.fill();ctx.fillStyle='#ead17f';ctx.beginPath();ctx.moveTo(x+28,y+56);ctx.quadraticCurveTo(x+11,y+31,x+29,y+13);ctx.quadraticCurveTo(x+44,y+34,x+28,y+56);ctx.fill();ctx.fillStyle='#dec693';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('AETHER CAMP',x,y-130)}
function watchtower(){const x=sx(3090),y=sy(680);shadow(x,y+70,95);ctx.fillStyle='#4b463c';ctx.fillRect(x-60,y-150,120,200);ctx.fillStyle='#77705c';ctx.fillRect(x-78,y-166,156,18);ctx.strokeStyle='#2c2c27';ctx.lineWidth=7;ctx.strokeRect(x-60,y-150,120,200);ctx.beginPath();ctx.moveTo(x-74,y-166);ctx.lineTo(x,y-215);ctx.lineTo(x+74,y-166);ctx.stroke();ctx.fillStyle='#222720';ctx.fillRect(x-34,y-92,68,92);const glow=.18+.06*Math.sin(time*.003);ctx.fillStyle=`rgba(234,211,145,${glow})`;ctx.beginPath();ctx.moveTo(x,y-92);ctx.lineTo(x+115,y-20);ctx.lineTo(x-115,y-20);ctx.closePath();ctx.fill();ctx.fillStyle='#e0cc9a';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('OLD WATCHTOWER',x,y-240)}
function landmarksDraw(){camp();watchtower();const x=sx(2200),y=sy(1330);ctx.fillStyle='#51493c';ctx.fillRect(x-125,y-55,250,90);ctx.fillStyle='#88775b';for(let i=-105;i<=70;i+=70)ctx.fillRect(x+i,y-105,45,105);ctx.fillStyle='#252821';ctx.fillRect(x-35,y-40,70,75);const gx=sx(520),gy=sy(850);ctx.strokeStyle='#536a49';ctx.lineWidth=28;ctx.beginPath();ctx.arc(gx,gy,120,0,Math.PI*2);ctx.stroke();}

function bridge(){const x=sx(1840),y=sy(1200);shadow(x,y+35,110);ctx.save();ctx.translate(x,y);ctx.rotate(-.18);ctx.fillStyle='#4a392b';ctx.fillRect(-135,-48,270,96);for(let i=-120;i<=120;i+=27){ctx.fillStyle=i%54?'#98764e':'#b28e5d';ctx.fillRect(i,-42,20,84)}ctx.strokeStyle='#443326';ctx.lineWidth=6;ctx.strokeRect(-135,-48,270,96);ctx.restore()}

function drawNode(n){if(n.got)return;const x=sx(n.x),y=sy(n.y);shadow(x,y+12,13);ctx.strokeStyle=n.t==='crystal'?'#d9c986':n.t==='ore'?'#aaa08a':n.t==='wood'?'#7d8b65':'#b0b777';ctx.lineWidth=4;ctx.lineCap='round';if(n.t==='wood'){ctx.beginPath();ctx.moveTo(x,y+12);ctx.lineTo(x,y-18);ctx.moveTo(x,y-3);ctx.lineTo(x-14,y-16);ctx.moveTo(x,y-8);ctx.lineTo(x+13,y-19);ctx.stroke()}else{ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(x-10,y-12);ctx.lineTo(x+2,y-25);ctx.lineTo(x+14,y+7);ctx.stroke()}}
function drawNpc(n){const x=sx(n.x),y=sy(n.y);shadow(x,y+19,15);ctx.fillStyle='#d3ae79';ctx.beginPath();ctx.arc(x,y-18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle={Merchant:'#6e5a46',Blacksmith:'#57463c',Alchemist:'#526b4f',Explorer:'#5f6a52'}[n.role];ctx.beginPath();ctx.moveTo(x-16,y+16);ctx.lineTo(x-11,y-7);ctx.lineTo(x+11,y-7);ctx.lineTo(x+16,y+16);ctx.closePath();ctx.fill();ctx.fillStyle='#e9d5ac';ctx.font='10px Inter';ctx.textAlign='center';ctx.fillText(n.name,x,y+33)}
function drawEnemy(e){if(e.dead)return;const x=sx(e.x),y=sy(e.y);shadow(x,y+22,e.boss?40:23);ctx.save();ctx.translate(x,y);const hurt=e.hit>0;ctx.fillStyle=hurt?'#c27b65':e.boss?'#62443d':'#3d5040';ctx.beginPath();ctx.moveTo(-e.r,e.r*.7);ctx.lineTo(-e.r*.7,-e.r*.7);ctx.lineTo(0,-e.r*1.4);ctx.lineTo(e.r*.7,-e.r*.7);ctx.lineTo(e.r,e.r*.7);ctx.closePath();ctx.fill();ctx.strokeStyle=e.boss?'#d0ad70':'#222820';ctx.lineWidth=e.boss?3:2;ctx.stroke();ctx.fillStyle='#d7bd7d';ctx.fillRect(-8,-10,5,5);ctx.fillRect(4,-10,5,5);if(e.boss){ctx.strokeStyle='rgba(218,186,112,.35)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,e.r+12+Math.sin(time*.006)*3,0,Math.PI*2);ctx.stroke()}ctx.restore();if(e.hp<e.max){ctx.fillStyle='#20251d';ctx.fillRect(x-e.r-4,y-e.r*1.8,2*(e.r+4),5);ctx.fillStyle=e.boss?'#b89057':'#98584b';ctx.fillRect(x-e.r-4,y-e.r*1.8,2*(e.r+4)*e.hp/e.max,5)}}

function drawPlayer(state){const x=sx(p.x),y=sy(p.y);shadow(x,y+24,22);const speed=Math.hypot(p.vx,p.vy);const bob=state.dashing?0:Math.sin(p.step)*Math.min(2.5,speed/100);ctx.save();ctx.translate(x,y+bob);let ang=Math.atan2(controller.facing.y,controller.facing.x);ctx.rotate(ang);if(state.dashing){for(let i=3;i>=1;i--){ctx.globalAlpha=.08*i;ctx.fillStyle='#d6bc7c';ctx.beginPath();ctx.ellipse(-i*18,0,15,23,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}ctx.fillStyle='#3f5141';ctx.beginPath();ctx.moveTo(-18,20);ctx.lineTo(-14,-10);ctx.lineTo(0,-37);ctx.lineTo(14,-10);ctx.lineTo(18,20);ctx.closePath();ctx.fill();ctx.strokeStyle='#1f281f';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#d7b681';ctx.beginPath();ctx.arc(0,-21,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9a7d52';ctx.fillRect(-14,1,28,20);if(p.action>0){ctx.strokeStyle='#e2c477';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,58,-1.0,1.0);ctx.stroke()}ctx.restore()}
function fx(){for(let i=particles.length-1;i>=0;i--){const a=particles[i];a.life-=16;a.x+=a.vx*.016;a.y+=a.vy*.016;a.vy+=18*.016;if(a.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=a.life/a.max;ctx.fillStyle=a.c;ctx.beginPath();ctx.arc(sx(a.x),sy(a.y),a.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}for(let i=floats.length-1;i>=0;i--){const a=floats[i];a.life-=16;a.y-=.45;if(a.life<=0){floats.splice(i,1);continue}ctx.globalAlpha=a.life/a.max;ctx.fillStyle=a.c;ctx.font='bold 12px Inter';ctx.textAlign='center';ctx.fillText(a.t,sx(a.x),sy(a.y));ctx.globalAlpha=1}}
function burst(x,y,c='#ddbd73',n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*130;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:2+Math.random()*3,life:420,max:420,c})}}
function floatText(x,y,t,c='#dfc47f'){floats.push({x,y,t,c,life:700,max:700})}

function act(){if(p.actionCd>0||hitstop>0)return;p.action=155;p.actionCd=245;p.combo=p.comboTimer>0?(p.combo%3)+1:1;p.comboTimer=800;const a=Math.atan2(mouse.y-H/2,mouse.x-W/2);controller.facing.x=Math.cos(a);controller.facing.y=Math.sin(a);for(const e of enemies){if(e.dead)continue;const dd=dist(p.x,p.y,e.x,e.y),ea=Math.atan2(e.y-p.y,e.x-p.x),dif=Math.atan2(Math.sin(ea-a),Math.cos(ea-a));if(dd<112&&Math.abs(dif)<1.25){const amount=22+(p.combo-1)*7;e.hp-=amount;e.hit=130;hitstop=48;shake=5;floatText(e.x,e.y,'-'+amount,amount>28?'#e7c977':'#d08a6c');burst(e.x,e.y,amount>28?'#e3c47a':'#b86b58',8);if(e.hp<=0){e.dead=true;p.xp+=e.boss?220:35;p.gold+=e.boss?90:8;pickups.push({x:e.x,y:e.y,t:e.boss?'Warden Relic':'Aether Shard'});burst(e.x,e.y,'#dfc37b',20);if(e.boss)toast('The Watcher','The guardian falls. The road beyond is open.')}}}}
function gather(){for(const n of nodes)if(!n.got&&dist(p.x,p.y,n.x,n.y)<72){n.got=true;floatText(n.x,n.y,'+'+n.t,'#d8c68e');p.xp+=10;toast('Gathered',n.t+' added to your pack.');return}}
function interact(){for(const n of npcs)if(dist(p.x,p.y,n.x,n.y)<75){toast(n.name,n.role+' is ready to help the camp.');return}for(const l of landmarks)if(dist(p.x,p.y,l.x,l.y)<145){found.add(l.id);toast('Discovery','A new landmark has been recorded.');return}}
function collect(){for(let i=pickups.length-1;i>=0;i--)if(dist(p.x,p.y,pickups[i].x,pickups[i].y)<70){p.gold+=5;floatText(p.x,p.y,'+'+pickups[i].t);pickups.splice(i,1)}}

function update(dt){
  if(hitstop>0){hitstop=Math.max(0,hitstop-dt);return}
  time+=dt;p.action=Math.max(0,p.action-dt);p.actionCd=Math.max(0,p.actionCd-dt);p.comboTimer=Math.max(0,p.comboTimer-dt);p.hit=Math.max(0,p.hit-dt);
  if(!document.querySelector('#menu-overlay')?.classList.contains('hidden')) return;
  const state=controller.update(dt);if(state.moving)p.step+=dt*.018*(state.sprinting?1.25:1);
  p.x=clamp(p.x,40,world.w-40);p.y=clamp(p.y,40,world.h-40);
  for(const e of enemies){if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);const dd=dist(p.x,p.y,e.x,e.y);if(dd<390){if(dd>72){const nx=(p.x-e.x)/Math.max(dd,1),ny=(p.y-e.y)/Math.max(dd,1);e.x+=nx*e.speed*dt/1000;e.y+=ny*e.speed*dt/1000}else if(!controller.invulnerable&&e.hit<=0){p.hp-=Math.max(2,e.boss?18:9);e.hit=650;shake=4;floatText(p.x,p.y,'-'+Math.max(2,e.boss?18:9),'#c87965');if(p.hp<=0){p.hp=p.maxHp;p.x=980;p.y=1540;p.vx=p.vy=0;p.gold=Math.max(0,p.gold-20);toast('Fallen','You return to Aether Camp.')}}}}
  collect();
  // Camera uses a small look-ahead, then eases only the camera—not the player.
  const lookX=controller.facing.x*80,lookY=controller.facing.y*48;const targetX=clamp(p.x-W*.5+lookX,0,Math.max(0,world.w-W));const targetY=clamp(p.y-H*.5+lookY,0,Math.max(0,world.h-H));const follow=Math.min(1,dt/95);cam.x+=(targetX-cam.x)*follow;cam.y+=(targetY-cam.y)*follow;
  shake*=Math.pow(.02,dt/1000);if(shake<.05)shake=0;cam.x+=((Math.random()-.5)*shake);cam.y+=((Math.random()-.5)*shake);
  zone=p.x>2200&&p.y<1300?'Crown of Stone':p.x>2200?'Glassfall Expanse':p.y>1950?'Mire of Bells':p.x<750&&p.y<1100?'Corrupted Grove':'Whispering Wilds';
}

function draw(){ctx.save();terrain();forest();bridge();landmarksDraw();for(const n of nodes)drawNode(n);for(const n of npcs)drawNpc(n);for(const e of enemies)drawEnemy(e);for(const l of pickups){ctx.fillStyle='#e4ca7f';ctx.font='bold 11px Inter';ctx.textAlign='center';ctx.fillText('✦ '+l.t,sx(l.x),sy(l.y)-12)}const state={moving:Math.hypot(p.vx,p.vy)>20,sprinting:Math.hypot(p.vx,p.vy)>300,dashing:controller.dash.active};drawPlayer(state);fx();const vign=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.28,W/2,H/2,Math.max(W,H)*.78);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(10,14,10,.28)');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);ctx.restore()}

function toast(a,b){if(!toastStack)return;const e=document.createElement('div');e.className='toast';e.innerHTML='<b>'+a+'</b><span>'+b+'</span>';toastStack.appendChild(e);setTimeout(()=>e.remove(),2800)}
function hud(){const hp=clamp(p.hp/p.maxHp*100,0,100),xp=clamp(p.xp/(p.level*100)*100,0,100);while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.maxHp+=10;p.hp=p.maxHp;toast('Level Up','Level '+p.level)}document.querySelector('#level-label').textContent='LV '+p.level;document.querySelector('#xp-label').textContent=Math.floor(p.xp)+' / '+p.level*100+' XP';document.querySelector('#xp-fill').style.width=xp+'%';document.querySelector('#health-fill').style.width=hp+'%';document.querySelector('#health-label').textContent=Math.ceil(p.hp)+' / '+p.maxHp;document.querySelector('#energy-label').textContent=Math.floor(p.energy)+' / '+p.maxEnergy;document.querySelector('#gold-label').textContent=p.gold;document.querySelector('.zone-title').textContent=zone;document.querySelector('.zone-subtitle').textContent=(zone==='Whispering Wilds'?'Aether Camp':zone)+' · Threat '+(zone==='Whispering Wilds'?'II':'IV');document.querySelector('#combo-label').textContent=p.comboTimer>0&&p.combo>1?'COMBO '+p.combo:''}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!input.keys.has(k)){if(k===' ')controller.press('dash');if(k==='e')interact();if(k==='f')gather();if(k==='i'||k==='c'||k==='m'||k==='j'||k==='k'||k==='b'){e.preventDefault();document.querySelector('#menu-overlay')?.classList.remove('hidden');const title=document.querySelector('#menu-title');if(title)title.textContent={i:'Inventory',c:'Character',m:'Frontier Map',j:'Quest Journal',k:'Crafting Hall',b:'Aether Camp'}[k]}}input.keys.add(k);if(k==='escape')document.querySelector('#menu-overlay')?.classList.add('hidden');if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
addEventListener('mousedown',e=>{if(e.button===0){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;act()}});addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false});addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});

toast('Movement tuned','Instant starts, hard stops, buffered dash, camera look-ahead.');
let last=performance.now();function loop(now){const dt=Math.min(40,now-last);last=now;update(dt);draw();hud();requestAnimationFrame(loop)}requestAnimationFrame(loop);
