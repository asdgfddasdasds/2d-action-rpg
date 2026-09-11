const canvas=document.createElement('canvas');
canvas.id='game-canvas';
const mount=document.querySelector('#game');
if(!mount) throw new Error('Game mount missing');
mount.replaceChildren(canvas);
const ctx=canvas.getContext('2d');
let W=innerWidth,H=innerHeight,dpr=1;
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.floor(W*dpr));canvas.height=Math.max(1,Math.floor(H*dpr));canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

const world={w:3600,h:2400};
const player={x:920,y:1510,hp:120,maxHp:120,en:100,maxEn:100,xp:0,level:1,gold:125,aether:8,damage:25,armor:4,crit:.08,speed:220,attack:0,cool:0,dash:0,combo:0,comboTime:0,inv:0,dir:0};
const keys=new Set();
const mouse={x:W/2,y:H/2,down:false};
let camera={x:0,y:0},menu=null,gameTime=0,shake=0,zone='Whispering Wilds';
const particles=[],numbers=[],loot=[],discovered=new Set(),recruited=new Set();
const materials={Wood:12,Ore:8,Crystal:3,Herb:6,Essence:0};
const inventory=[['Moonsteel Saber','Rare','Weapon'],['Wayfarer Mantle','Uncommon','Armor'],['Luminous Shard','Rare','Material']];
const buildings={Workshop:0,Forge:0,Market:0,Guild:0,Research:0,Training:0};
const quests=[{name:'First Light',text:'Reach the Old Watchtower',done:false},{name:'Camp Provisions',text:'Gather 3 resources',done:false},{name:'The Watcher',text:'Defeat the corrupted warden',done:false},{name:'A Place Worth Defending',text:'Recruit 3 camp specialists',done:false}];

const trees=[];const rocks=[];const flowers=[];const ruins=[];const bridges=[];const paths=[];const water=[];
function hash(n){const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x)}
for(let i=0;i<210;i++){let x=80+hash(i*2.1)*3440,y=100+hash(i*3.7)*2200;if(x>650&&x<1250&&y>1320&&y<1700)continue;if(x>1450&&x<1900&&y>900&&y<1300)continue;trees.push({x,y,s:24+hash(i*8)*25,v:hash(i*9)})}
for(let i=0;i<85;i++)rocks.push({x:70+hash(i*6.2)*3460,y:80+hash(i*7.1)*2240,s:7+hash(i*3)*15});
for(let i=0;i<180;i++)flowers.push({x:40+hash(i*5)*3520,y:50+hash(i*4)*2300,c:hash(i*9)>0.5?'cream':'ochre'});
for(let i=0;i<18;i++)ruins.push({x:250+hash(i*13)*3100,y:250+hash(i*17)*1850,w:70+hash(i)*90,h:40+hash(i*2)*65});

// Major world landmarks and hand-authored routes.
const landmarks=[
 {id:'camp',x:920,y:1510,name:'AETHER CAMP',sub:'A safe place in the wilds'},
 {id:'watch',x:2540,y:610,name:'OLD WATCHTOWER',sub:'The corrupted signal'},
 {id:'archive',x:1710,y:1210,name:'SUNKEN ARCHIVE',sub:'Knowledge beneath the roots'},
 {id:'grove',x:520,y:770,name:'CORRUPTED GROVE',sub:'Something listens here'},
 {id:'mine',x:3020,y:1540,name:'GLASSFALL MINE',sub:'Crystal-rich tunnels'},
 {id:'shrine',x:2280,y:1910,name:'ASHEN SHRINE',sub:'An ancient oath'}
];
paths.push({pts:[[920,1510],[1110,1450],[1320,1350],[1540,1190],[1800,1050],[2060,850],[2320,700],[2540,610]]});
paths.push({pts:[[1540,1190],[1650,1200],[1710,1210],[1810,1300],[1980,1450],[2200,1650],[2280,1910]]});
paths.push({pts:[[920,1510],[760,1320],[620,1120],[520,770]]});
paths.push({pts:[[2200,1650],[2520,1580],[2800,1550],[3020,1540]]});
water.push({x:1430,y:-100,w:170,h:2600});
bridges.push({x:1515,y:1130,w:150,h:115});

const npcs=[
 {n:'Mira',role:'Merchant',x:790,y:1480,met:false},
 {n:'Bran',role:'Blacksmith',x:1045,y:1470,met:false},
 {n:'Elowen',role:'Alchemist',x:850,y:1590,met:false},
 {n:'Orin',role:'Explorer',x:1070,y:1600,met:false},
 {n:'Kael',role:'Guildmaster',x:680,y:1580,met:false}
];
const nodes=[
 {t:'herb',x:1090,y:1370,got:false},{t:'herb',x:1160,y:1430,got:false},{t:'ore',x:1280,y:1040,got:false},
 {t:'wood',x:610,y:1280,got:false},{t:'crystal',x:1880,y:1040,got:false},{t:'ore',x:2110,y:760,got:false},
 {t:'herb',x:500,y:920,got:false},{t:'crystal',x:2940,y:1460,got:false},{t:'wood',x:2720,y:1650,got:false}
];
const enemies=[
 {t:'wolf',x:1160,y:1260,hp:55,max:55,spd:78,dmg:10,agg:0,dead:false},
 {t:'wolf',x:1310,y:1320,hp:55,max:55,spd:78,dmg:10,agg:0,dead:false},
 {t:'stalker',x:720,y:1040,hp:82,max:82,spd:55,dmg:14,agg:0,dead:false},
 {t:'stalker',x:1380,y:980,hp:82,max:82,spd:55,dmg:14,agg:0,dead:false},
 {t:'raider',x:2010,y:880,hp:115,max:115,spd:48,dmg:18,agg:0,dead:false},
 {t:'raider',x:2200,y:760,hp:115,max:115,spd:48,dmg:18,agg:0,dead:false},
 {t:'warden',x:2540,y:610,hp:520,max:520,spd:36,dmg:25,agg:0,elite:true,phase:1,dead:false}
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b,c,d){return Math.hypot(a-c,b-d)}
function cameraUpdate(){camera.x=clamp(player.x-W/2,0,Math.max(0,world.w-W));camera.y=clamp(player.y-H/2,0,Math.max(0,world.h-H))}
function sx(x){return x-camera.x} function sy(y){return y-camera.y}
function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function shadow(x,y,w){ctx.fillStyle='rgba(12,13,9,.28)';ctx.beginPath();ctx.ellipse(x,y,w,w*.3,0,0,Math.PI*2);ctx.fill()}
function poly(points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}

function drawBackground(){
 ctx.fillStyle='#6d735d';ctx.fillRect(0,0,W,H);
 const c=camera;
 // distant mountain silhouettes
 ctx.fillStyle='#3c493c';ctx.beginPath();ctx.moveTo(-50,300);for(let x=-50;x<W+100;x+=180){const wx=x+c.x;const h=150+hash(Math.floor(wx/180))*180;ctx.lineTo(x,300-h)}ctx.lineTo(W+50,500);ctx.lineTo(-50,500);ctx.fill();
 ctx.fillStyle='#53614b';ctx.beginPath();ctx.moveTo(-50,390);for(let x=-50;x<W+100;x+=130){const wx=x+c.x;const h=80+hash(Math.floor(wx/130)+91)*130;ctx.lineTo(x,390-h)}ctx.lineTo(W+50,560);ctx.lineTo(-50,560);ctx.fill();
 // ground paper texture
 ctx.fillStyle='#73775d';ctx.fillRect(0,0,W,H);
 for(let i=0;i<90;i++){const x=(i*149)%W,y=(i*83+47)%H;ctx.fillStyle=i%2?'rgba(54,61,45,.12)':'rgba(222,204,158,.08)';ctx.fillRect(x,y,30+(i%5)*12,2)}
 // region washes
 ctx.fillStyle='rgba(41,59,42,.16)';ctx.fillRect(sx(0),sy(0),1900,1800);
 ctx.fillStyle='rgba(112,84,53,.13)';ctx.fillRect(sx(1900),sy(0),1700,1200);
 ctx.fillStyle='rgba(73,80,91,.14)';ctx.fillRect(sx(1900),sy(1200),1700,1200);
 // river
 ctx.fillStyle='#3f5b56';ctx.beginPath();ctx.moveTo(sx(1390),sy(0));ctx.bezierCurveTo(sx(1510),sy(500),sx(1330),sy(900),sx(1450),sy(1300));ctx.bezierCurveTo(sx(1550),sy(1650),sx(1410),sy(2050),sx(1500),sy(2400));ctx.lineTo(sx(1690),sy(2400));ctx.bezierCurveTo(sx(1600),sy(2050),sx(1690),sy(1650),sx(1570),sy(1280));ctx.bezierCurveTo(sx(1460),sy(850),sx(1640),sy(430),sx(1560),sy(0));ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(201,205,172,.28)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sx(1480),sy(0));ctx.bezierCurveTo(sx(1570),sy(500),sx(1420),sy(900),sx(1510),sy(1300));ctx.bezierCurveTo(sx(1580),sy(1650),sx(1500),sy(2050),sx(1570),sy(2400));ctx.stroke();
 // paths
 for(const path of paths){ctx.strokeStyle='rgba(59,48,37,.25)';ctx.lineWidth=42;ctx.lineCap='round';ctx.beginPath();path.pts.forEach((p,i)=>i?ctx.lineTo(sx(p[0]),sy(p[1])):ctx.moveTo(sx(p[0]),sy(p[1])));ctx.stroke();ctx.strokeStyle='#a59670';ctx.lineWidth=30;ctx.beginPath();path.pts.forEach((p,i)=>i?ctx.lineTo(sx(p[0]),sy(p[1])):ctx.moveTo(sx(p[0]),sy(p[1])));ctx.stroke();ctx.strokeStyle='rgba(227,211,167,.25)';ctx.lineWidth=2;ctx.stroke()}
 // ruins and rocks
 for(const r of ruins){const x=sx(r.x),y=sy(r.y);if(x<-150||x>W+150||y<-150||y>H+150)continue;ctx.fillStyle='rgba(46,47,39,.42)';ctx.fillRect(x,y,r.w,r.h);ctx.fillStyle='rgba(178,163,123,.35)';ctx.fillRect(x+5,y+5,r.w-10,7);for(let q=0;q<3;q++)ctx.fillRect(x+12+q*18,y+18,9,r.h-25)}
 for(const r of rocks){const x=sx(r.x),y=sy(r.y);if(x<-30||x>W+30||y<-30||y>H+30)continue;ctx.fillStyle='#4d5445';ctx.beginPath();ctx.ellipse(x,y,r.s,r.s*.65,-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(202,188,149,.2)';ctx.beginPath();ctx.ellipse(x-r.s*.25,y-r.s*.25,r.s*.45,r.s*.2,-.3,0,Math.PI*2);ctx.fill()}
 // flowers
 for(const f of flowers){const x=sx(f.x),y=sy(f.y);if(x<0||x>W||y<0||y>H)continue;ctx.fillStyle=f.c==='cream'?'rgba(221,207,164,.7)':'rgba(178,145,82,.7)';ctx.fillRect(x,y,2,2)}
}
function drawTree(t){const x=sx(t.x),y=sy(t.y);if(x<-80||x>W+80||y<-100||y>H+100)return;shadow(x,y+18,t.s*.65);ctx.fillStyle='#3b3027';ctx.fillRect(x-4,y-3,8,t.s*1.1);ctx.fillStyle='#334637';ctx.beginPath();ctx.arc(x,y-t.s*.55,t.s*.72,0,Math.PI*2);ctx.fill();ctx.fillStyle='#42563f';ctx.beginPath();ctx.arc(x-t.s*.45,y-t.s*.3,t.s*.52,0,Math.PI*2);ctx.arc(x+t.s*.38,y-t.s*.24,t.s*.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(183,169,123,.16)';ctx.beginPath();ctx.arc(x-t.s*.18,y-t.s*.72,t.s*.32,0,Math.PI*2);ctx.fill()}
function drawBridge(){const x=sx(1515),y=sy(1130);ctx.fillStyle='#463a2d';ctx.fillRect(x-75,y-55,150,110);for(let i=-65;i<70;i+=20){ctx.fillStyle=i%40?'#8b7650':'#a48c5d';ctx.fillRect(x+i,y-47,14,94)}ctx.strokeStyle='#332b22';ctx.lineWidth=4;ctx.strokeRect(x-75,y-55,150,110)}
function drawCamp(){const x=sx(920),y=sy(1510);ctx.fillStyle='rgba(30,25,18,.25)';ctx.beginPath();ctx.ellipse(x,y+75,210,70,0,0,Math.PI*2);ctx.fill();
 // tents
 for(const q of [[-105,-10,'#7b684d'],[-35,20,'#8b7652'],[70,-12,'#6c5946']]){ctx.fillStyle=q[2];poly([[x+q[0]-45,y+q[1]+45],[x+q[0],y+q[1]-30],[x+q[0]+48,y+q[1]+45]],q[2]);ctx.strokeStyle='#493c2e';ctx.stroke()}
 // fire
 ctx.fillStyle='#3b2b20';ctx.beginPath();ctx.ellipse(x+15,y+53,38,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c27a45';ctx.beginPath();ctx.moveTo(x+15,y+53);ctx.quadraticCurveTo(x-8,y+28,x+15,y+8);ctx.quadraticCurveTo(x+38,y+30,x+15,y+53);ctx.fill();ctx.fillStyle='#e0bd73';ctx.beginPath();ctx.moveTo(x+15,y+47);ctx.quadraticCurveTo(x+4,y+30,x+17,y+19);ctx.quadraticCurveTo(x+28,y+35,x+15,y+47);ctx.fill();
 // palisade
 ctx.strokeStyle='#57432d';ctx.lineWidth=7;ctx.beginPath();for(let i=-170;i<=170;i+=22){ctx.moveTo(x+i,y+65);ctx.lineTo(x+i,y+20-(Math.abs(i)%44===0?8:0))}ctx.stroke();
}
function drawLandmark(l){const x=sx(l.x),y=sy(l.y);if(x<-250||x>W+250||y<-250||y>H+250)return;shadow(x,y+55,70);
 if(l.id==='camp'){drawCamp();return}
 if(l.id==='watch'){ctx.fillStyle='#4b4438';ctx.fillRect(x-38,y-95,76,150);ctx.fillStyle='#74644c';ctx.fillRect(x-50,y-105,100,20);ctx.fillStyle='#302e27';ctx.fillRect(x-25,y-70,50,55);ctx.fillStyle='#aa8d5d';ctx.fillRect(x-60,y-112,120,7);ctx.strokeStyle='#2c2a24';ctx.lineWidth=5;ctx.strokeRect(x-38,y-95,76,150);ctx.beginPath();ctx.moveTo(x-48,y-105);ctx.lineTo(x,y-135);ctx.lineTo(x+48,y-105);ctx.stroke();}
 else if(l.id==='archive'){ctx.fillStyle='#524a3c';ctx.fillRect(x-95,y-35,190,70);ctx.fillStyle='#84745a';ctx.fillRect(x-75,y-75,45,75);ctx.fillRect(x+30,y-75,45,75);ctx.fillStyle='#302e26';ctx.fillRect(x-25,y-25,50,60);}
 else if(l.id==='grove'){ctx.strokeStyle='#5a6947';ctx.lineWidth=18;ctx.beginPath();ctx.arc(x,y,105,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#9a6b54';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,72,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;drawTree({x:l.x+Math.cos(a)*120,y:l.y+Math.sin(a)*120,s:26})}}
 else if(l.id==='mine'){ctx.fillStyle='#433e35';ctx.beginPath();ctx.moveTo(x-100,y+60);ctx.lineTo(x-70,y-35);ctx.lineTo(x,y-70);ctx.lineTo(x+70,y-35);ctx.lineTo(x+100,y+60);ctx.closePath();ctx.fill();ctx.fillStyle='#171916';ctx.beginPath();ctx.arc(x,y+5,58,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){ctx.fillStyle='#9a9c77';ctx.beginPath();ctx.moveTo(x-45+i*20,y-5);ctx.lineTo(x-38+i*20,y-30);ctx.lineTo(x-30+i*20,y-4);ctx.fill()}}
 else {ctx.fillStyle='#665545';ctx.fillRect(x-55,y-20,110,60);ctx.fillStyle='#9a7650';ctx.fillRect(x-35,y-65,70,45);ctx.fillStyle='#252822';ctx.fillRect(x-17,y-5,34,45)}
 ctx.fillStyle='#e4d1a6';ctx.font='bold 11px Georgia';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=7;ctx.fillText(l.name,x,y-145);ctx.shadowBlur=0;
}
function drawNode(n){if(n.got)return;const x=sx(n.x),y=sy(n.y);if(x<-40||x>W+40||y<-40||y>H+40)return;shadow(x,y+10,13);ctx.strokeStyle=n.t==='crystal'?'#d0c17f':n.t==='ore'?'#857b62':n.t==='wood'?'#6f7654':'#a3a76d';ctx.lineWidth=3;ctx.beginPath();if(n.t==='wood'){ctx.moveTo(x,y+12);ctx.lineTo(x,y-18);ctx.moveTo(x,y-4);ctx.lineTo(x-12,y-16);ctx.moveTo(x,y-9);ctx.lineTo(x+12,y-20)}else if(n.t==='ore'){poly([[x-13,y+8],[x-7,y-15],[x+9,y-20],[x+15,y+7]],null,n.t==='ore'?'#8f8469':'#fff')}else if(n.t==='crystal'){poly([[x,y-24],[x+10,y+8],[x-9,y+10]],null,'#d1c27f')}else{ctx.moveTo(x,y+13);ctx.lineTo(x-4,y-17);ctx.moveTo(x,y-2);ctx.lineTo(x-13,y-13);ctx.moveTo(x,y-7);ctx.lineTo(x+13,y-17)}ctx.stroke()}
function drawNPC(n){const x=sx(n.x),y=sy(n.y);if(x<-50||x>W+50||y<-50||y>H+50)return;shadow(x,y+18,16);ctx.fillStyle='#c0a274';ctx.beginPath();ctx.arc(x,y-13,10,0,Math.PI*2);ctx.fill();const colors={Merchant:'#72583e',Blacksmith:'#59483d',Alchemist:'#526c51',Explorer:'#5f674e',Guildmaster:'#67515a'};ctx.fillStyle=colors[n.role]||'#665744';ctx.beginPath();ctx.moveTo(x-14,y+13);ctx.lineTo(x-10,y-3);ctx.lineTo(x+10,y-3);ctx.lineTo(x+14,y+13);ctx.closePath();ctx.fill();ctx.fillStyle='#e1c17d';ctx.font='bold 16px Georgia';ctx.textAlign='center';ctx.fillText(n.met?'':'!',x,y-34);ctx.fillStyle='#dfd1b2';ctx.font='10px Inter';ctx.fillText(n.n,x,y+29)}
function drawEnemy(a){if(a.dead)return;const x=sx(a.x),y=sy(a.y);if(x<-80||x>W+80||y<-90||y>H+90)return;shadow(x,y+19,a.elite?31:18);ctx.save();ctx.translate(x,y);if(a.t==='wolf'){ctx.fillStyle='#4b463f';poly([[-24,13],[-15,-8],[-10,-28],[-2,-17],[12,-30],[23,10],[10,19],[-12,19]],'#4b463f');ctx.fillStyle='#20211d';ctx.beginPath();ctx.arc(-6,-10,3,0,Math.PI*2);ctx.arc(7,-10,3,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle=a.t==='raider'?'#57453d':a.elite?'#6d5344':'#3f5142';poly([[-18,18],[-13,-22],[0,-38],[13,-22],[18,18]],ctx.fillStyle);ctx.fillStyle='#22231e';ctx.beginPath();ctx.arc(-6,-13,3,0,Math.PI*2);ctx.arc(7,-13,3,0,Math.PI*2);ctx.fill();if(a.t==='raider'){ctx.fillStyle='#a88d64';ctx.fillRect(-17,4,34,7)}}if(a.elite){ctx.strokeStyle='#c3a267';ctx.lineWidth=2;ctx.strokeRect(-32,-48,64,70)}ctx.restore();if(a.hp<a.max){ctx.fillStyle='#1d211a';ctx.fillRect(x-30,y-50,60,5);ctx.fillStyle=a.elite?'#b58b55':'#95594b';ctx.fillRect(x-30,y-50,60*a.hp/a.max,5)}}
function drawPlayer(){const x=sx(player.x),y=sy(player.y);shadow(x,y+21,22);ctx.save();ctx.translate(x,y);ctx.rotate(player.dir);ctx.fillStyle='#7d674d';ctx.beginPath();ctx.moveTo(-16,17);ctx.lineTo(-12,-10);ctx.lineTo(0,-29);ctx.lineTo(12,-10);ctx.lineTo(16,17);ctx.closePath();ctx.fill();ctx.fillStyle='#e4d3b4';ctx.beginPath();ctx.arc(0,-15,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#455a42';ctx.fillRect(-13,0,26,18);ctx.fillStyle='#bca16f';ctx.fillRect(8,-3,20,4);if(player.attack>0){ctx.strokeStyle='#e0bd73';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,56,-1.05,1.05);ctx.stroke();ctx.strokeStyle='rgba(245,226,176,.35)';ctx.lineWidth=13;ctx.beginPath();ctx.arc(0,0,56,-1.0,1.0);ctx.stroke()}ctx.restore()}
function drawFX(){for(let i=particles.length-1;i>=0;i--){const f=particles[i];f.life-=16;f.x+=f.vx*.016;f.y+=f.vy*.016;f.vy+=20*.016;if(f.life<=0){particles.splice(i,1);continue}const x=sx(f.x),y=sy(f.y);ctx.globalAlpha=f.life/f.max;ctx.fillStyle=f.color||'#d7b978';ctx.beginPath();ctx.arc(x,y,f.r||3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}for(let i=numbers.length-1;i>=0;i--){const n=numbers[i];n.life-=16;n.y-=.5;if(n.life<=0){numbers.splice(i,1);continue}ctx.globalAlpha=n.life/n.max;ctx.fillStyle=n.color||'#e1c27e';ctx.font='bold 12px Inter';ctx.textAlign='center';ctx.fillText(n.text,sx(n.x),sy(n.y));ctx.globalAlpha=1}}
function burst(x,y,color='#d5b36d',count=8){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=30+Math.random()*90;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:2+Math.random()*3,life:350,max:350,color})}}
function number(x,y,text,color){numbers.push({x,y:y-25,text,color,life:800,max:800})}

function zoneName(){if(player.x>1900&&player.y<1150)return 'Crown of Stone';if(player.x>1900)return 'Glassfall Expanse';if(player.y>1800)return 'Mire of Bells';if(player.x<700&&player.y<1000)return 'Corrupted Grove';return 'Whispering Wilds'}
function drawWorld(){drawBackground();for(const t of trees)drawTree(t);drawBridge();for(const l of landmarks)drawLandmark(l);for(const n of nodes)drawNode(n);for(const n of npcs)drawNPC(n);for(const a of enemies)drawEnemy(a);for(const l of loot){const x=sx(l.x),y=sy(l.y);ctx.fillStyle='#dfbf73';ctx.font='bold 10px Inter';ctx.textAlign='center';ctx.fillText('✦ '+l.name,x,y-10)}drawPlayer();drawFX();if(shake>0){/* camera shake is visual-only on effects */}}

function gainXP(v){player.xp+=v;while(player.xp>=player.level*100){player.xp-=player.level*100;player.level++;player.maxHp+=12;player.hp=player.maxHp;player.damage+=3;player.maxEn+=4;player.en=player.maxEn;toast('Level Up','Level '+player.level+' — your path grows stronger.')}}
function attack(){if(menu||player.cool>0)return;player.attack=190;player.cool=260;player.combo=player.comboTime>0?player.combo%3+1:1;player.comboTime=850;const a=Math.atan2(mouse.y-H/2,mouse.x-W/2);player.dir=a;for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);const ea=Math.atan2(e.y-player.y,e.x-player.x);let diff=Math.atan2(Math.sin(ea-a),Math.cos(ea-a));if(d<112&&Math.abs(diff)<1.45){let dmg=player.damage+(player.combo-1)*7;if(Math.random()<player.crit)dmg*=2;dmg=Math.round(dmg);e.hp-=dmg;e.agg=1200;number(e.x,e.y,'-'+dmg,dmg>player.damage?'#e5c176':'#d99a71');burst(e.x,e.y,dmg>player.damage?'#e1c77f':'#b96f59',7);if(e.hp<=0){e.dead=true;gainXP(e.elite?180:35);player.gold+=e.elite?75:8;materials.Essence++;loot.push({x:e.x,y:e.y,name:e.elite?'Warden Relic':'Essence'});burst(e.x,e.y,'#d7bd78',16);if(e.elite){quests[2].done=true;toast('The Watcher','The corrupted warden has fallen.')} }else if(e.elite&&e.hp<e.max*.5&&e.phase===1){e.phase=2;e.spd=55;toast('Warden Phase II','The tower guardian enters a furious second phase.')}}}}
function dash(){if(menu||player.en<25)return;const a=Math.atan2(mouse.y-H/2,mouse.x-W/2);player.dir=a;player.x=clamp(player.x+Math.cos(a)*175,35,world.w-35);player.y=clamp(player.y+Math.sin(a)*175,35,world.h-35);player.en-=25;player.inv=350;burst(player.x,player.y,'#cdb57d',14)}
function gather(){for(const n of nodes){if(!n.got&&dist(player.x,player.y,n.x,n.y)<75){n.got=true;const k=n.t==='wood'?'Wood':n.t==='ore'?'Ore':n.t==='crystal'?'Crystal':'Herb';materials[k]++;gainXP(8);number(n.x,n.y,'+'+k,'#d5c28f');quests[1].done=Object.values(materials).reduce((a,b)=>a+b,0)>=32;toast('Gathered',k+' added to your pack.');return}}}
function interact(){for(const n of npcs){if(dist(player.x,player.y,n.x,n.y)<75){n.met=true;recruited.add(n.n);gainXP(12);toast(n.n,n.role+' joined Aether Camp.');if(recruited.size>=3)quests[3].done=true;return}}for(const l of landmarks){if(dist(player.x,player.y,l.x,l.y)<130){discovered.add(l.id);if(l.id==='watch')quests[0].done=true;toast('Discovery',l.name+' added to your journal.');return}}}
function collectLoot(){for(let i=loot.length-1;i>=0;i--)if(dist(player.x,player.y,loot[i].x,loot[i].y)<70){const l=loot[i];player.gold+=5;number(player.x,player.y,'LOOT '+l.name,'#dfc27d');loot.splice(i,1)}}
function update(dt){gameTime+=dt;player.attack=Math.max(0,player.attack-dt);player.cool=Math.max(0,player.cool-dt);player.dash=Math.max(0,player.dash-dt);player.inv=Math.max(0,player.inv-dt);player.comboTime=Math.max(0,player.comboTime-dt);player.en=Math.min(player.maxEn,player.en+dt*.025);if(!menu){let dx=(keys.has('d')?1:0)-(keys.has('a')?1:0),dy=(keys.has('s')?1:0)-(keys.has('w')?1:0);const l=Math.hypot(dx,dy)||1;const sprint=keys.has('shift')?1.42:1;player.x=clamp(player.x+dx/l*player.speed*sprint*dt/1000,35,world.w-35);player.y=clamp(player.y+dy/l*player.speed*sprint*dt/1000,35,world.h-35);if(dx||dy)player.dir=Math.atan2(dy,dx);for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);if(d<330||e.agg>0){e.agg=Math.max(0,e.agg-dt);if(d>70){e.x+=(player.x-e.x)/Math.max(d,1)*e.spd*dt/1000;e.y+=(player.y-e.y)/Math.max(d,1)*e.spd*dt/1000}else if(player.inv<=0&&e.hitTimer<=0){player.hp-=Math.max(2,e.dmg-player.armor);e.hitTimer=850;number(player.x,player.y,'-'+Math.max(2,e.dmg-player.armor),'#c77a65');if(player.hp<=0){player.hp=player.maxHp;player.x=920;player.y=1510;player.gold=Math.max(0,player.gold-20);toast('Fallen','You wake at Aether Camp, shaken but alive.')}}}e.hitTimer=Math.max(0,(e.hitTimer||0)-dt)}collectLoot();cameraUpdate()}if(mouse.down)attack();zone=zoneName()}
function toast(title,text){const stack=document.getElementById('toast-stack');if(!stack)return;const d=document.createElement('div');d.className='toast';d.innerHTML='<b>'+title+'</b><span>'+text+'</span>';stack.appendChild(d);setTimeout(()=>d.remove(),3200)}
function menuOpen(type){menu=type;const overlay=document.getElementById('menu-overlay');overlay.classList.remove('hidden');const title=document.getElementById('menu-title'),content=document.getElementById('menu-content');title.textContent=type==='inventory'?'Inventory':type==='character'?'Character':type==='map'?'Frontier Map':type==='quests'?'Quest Journal':type==='craft'?'Crafting Hall':'Aether Camp';
 if(type==='inventory'){content.innerHTML='<div class="inventory-grid">'+inventory.map(i=>'<div class="item-card"><div class="rarity">'+i[1]+'</div><div class="item-name">'+i[0]+'</div><div class="item-type">'+i[2]+'</div></div>').join('')+'</div><div class="lore-card" style="margin-top:14px"><h2>Materials</h2><div class="stats">'+Object.entries(materials).map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('')+'</div></div>'}
 else if(type==='character'){content.innerHTML='<div class="lore-card"><span class="eyebrow">PATHFINDER</span><h2>Veyra · Level '+player.level+'</h2><p>Your build grows through exploration, combat, crafting, and the people you bring into camp.</p><div class="stats"><div><span>Damage</span><b>'+player.damage+'</b></div><div><span>Armor</span><b>'+player.armor+'</b></div><div><span>Crit</span><b>'+Math.round(player.crit*100)+'%</b></div><div><span>Gold</span><b>'+player.gold+'</b></div><div><span>Aether</span><b>'+player.aether+'</b></div></div><button class="stat-btn" onclick="window.__upgrade()">Invest +3 Damage · 1 Aether</button></div>'}
 else if(type==='quests'){content.innerHTML='<div class="lore-card">'+quests.map(q=>'<div style="padding:13px 0;border-bottom:1px solid #494b40"><b style="font:700 16px Georgia;color:#dfcca7">'+(q.done?'✓ ':'')+q.name+'</b><div style="font-size:10px;color:#989587;margin-top:4px">'+q.text+'</div></div>').join('')+'</div>'}
 else if(type==='craft'){content.innerHTML='<div class="lore-card"><h2>Crafting Hall</h2><p>Turn frontier materials into equipment and supplies.</p><button class="craft-btn" onclick="window.__craft('blade')">Craft Aether Edge · 4 Ore · 2 Crystal</button><button class="craft-btn" onclick="window.__craft('flask')">Craft Aether Flasks · 3 Herb · 1 Crystal</button></div>'}
 else if(type==='camp'){content.innerHTML='<div class="lore-card"><h2>Aether Camp</h2><p>Recruited specialists: '+recruited.size+' / 5. Upgrade buildings as the settlement grows.</p><div class="stats">'+Object.entries(buildings).map(([k,v])=>'<div><span>'+k+'</span><b>Tier '+v+'</b></div>').join('')+'</div><button class="craft-btn" onclick="window.__build()">Upgrade next camp building · 8 Wood · 5 Ore</button></div>'}
 else {content.innerHTML='<div class="map-card"><div class="map-road"></div><b>Whispering Wilds → Crown of Stone → Glassfall Expanse</b><span>Discovered landmarks: '+discovered.size+' / '+landmarks.length+'. Follow the old roads to uncover the frontier.</span></div>'}}
function closeMenu(){menu=null;document.getElementById('menu-overlay').classList.add('hidden')}
window.__upgrade=()=>{if(player.aether>=1){player.aether--;player.damage+=3;toast('Character','Damage increased.');menuOpen('character')}};
window.__craft=(kind)=>{if(kind==='blade'&&materials.Ore>=4&&materials.Crystal>=2){materials.Ore-=4;materials.Crystal-=2;player.damage+=8;inventory.push(['Aether Edge','Rare','Weapon']);toast('Crafted','Aether Edge added to your arsenal.');menuOpen('craft')}else if(kind==='flask'&&materials.Herb>=3&&materials.Crystal>=1){materials.Herb-=3;materials.Crystal--;player.maxHp+=10;player.hp=player.maxHp;toast('Crafted','Aether Flask permanently improved your vitality.');menuOpen('craft')}else toast('Missing Materials','Gather more frontier resources.')};
window.__build=()=>{const names=Object.keys(buildings),i=Object.values(buildings).reduce((a,b)=>a+b,0);if(materials.Wood>=8&&materials.Ore>=5){materials.Wood-=8;materials.Ore-=5;buildings[names[i%names.length]]++;toast('Camp Expanded',names[i%names.length]+' reached a new tier.');menuOpen('camp')}else toast('Camp Needs Supplies','8 Wood and 5 Ore required.')};

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['i','c','m','j','k','b'].includes(k)){e.preventDefault();if(menu)closeMenu();else menuOpen({i:'inventory',c:'character',m:'map',j:'quests',k:'craft',b:'camp'}[k])}if(k==='escape')closeMenu();if(k===' ') {e.preventDefault();dash()}if(k==='e')interact();if(k==='f')gather();});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('mousedown',e=>{if(e.button===0){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY;attack()}});addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false});addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
for(const b of document.querySelectorAll('.skill-slot'))b.addEventListener('click',()=>{document.querySelectorAll('.skill-slot').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});
document.getElementById('menu-close')?.addEventListener('click',closeMenu);

toast('Aether Camp','Follow the old road toward the Old Watchtower.');

function updateHUD(){const hp=clamp(player.hp/player.maxHp*100,0,100),xp=clamp(player.xp/(player.level*100)*100,0,100);const q=quests.findIndex(x=>!x.done);document.getElementById('level-label').textContent='LV '+player.level;document.getElementById('xp-label').textContent=Math.floor(player.xp)+' / '+player.level*100+' XP';document.getElementById('xp-fill').style.width=xp+'%';document.getElementById('health-fill').style.width=hp+'%';document.getElementById('health-label').textContent=Math.ceil(player.hp)+' / '+player.maxHp;document.getElementById('energy-label').textContent=Math.floor(player.en)+' / '+player.maxEn;document.getElementById('gold-label').textContent=player.gold;document.getElementById('crystal-label').textContent=player.aether;document.getElementById('quest-progress').textContent=q<0?'COMPLETE':q===0?(quests[0].done?'1 / 1':'0 / 1'):q+' / '+quests.length;document.querySelector('.zone-title').textContent=zone;document.querySelector('.zone-subtitle').textContent=(zone==='Whispering Wilds'?'Aether Camp':zone)+' · Threat '+(zone==='Whispering Wilds'?'II':'IV');document.getElementById('combo-label').textContent=player.comboTime>0&&player.combo>1?'COMBO '+player.combo:''}
function frame(now){const dt=Math.min(40,now-(frame.last||now));frame.last=now;update(dt);cameraUpdate();drawWorld();updateHUD();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
