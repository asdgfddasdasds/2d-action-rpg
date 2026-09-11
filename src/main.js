const W = 1280, H = 720;
const WORLD_W = 3200, WORLD_H = 2200;

const state = {
  player: {x:1500,y:1100,hp:100,maxHp:100,energy:100,xp:0,level:1,gold:125,crystal:8},
  kills:0, inventory:[
    ['Moonsteel Saber','Rare','Weapon'],['Wayfarer Mantle','Uncommon','Armor'],['Luminous Shard','Rare','Material'],['Wild Herb','Common','Material'],['Aether Flask','Uncommon','Consumable']
  ], cooldown:0, attacking:false
};

const keys = new Set();
const enemies = [];
const resources = [];
const particles = [];
const trees = [];
const rocks = [];

function hash(n){const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x)}
function rand(a,b){return a+(b-a)*Math.random()}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

class WorldScene extends Phaser.Scene {
  constructor(){super('world')}
  create(){
    this.cameras.main.setBackgroundColor('#07111b');
    this.input.mouse.disableContextMenu();
    this.makeTextures();
    this.buildWorld();
    this.player = this.add.sprite(state.player.x,state.player.y,'player');
    this.player.setDepth(20);
    this.player.setScale(.9);
    this.spawnEnemies();
    this.spawnResources();
    this.cameras.main.startFollow(this.player,true,.08,.08);
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.input.on('pointerdown', p=>{if(p.leftButtonDown()) this.attack()});
    this.add.text(50,50,'',{fontFamily:'Inter'}).setScrollFactor(0);
  }
  makeTextures(){
    const g=this.make.graphics({x:0,y:0,add:false});
    // Player sprite: layered, detailed silhouette with cloak and weapon.
    g.clear(); g.fillStyle(0x0a1423);g.fillCircle(32,20,13);g.fillStyle(0x5fe4ff);g.fillCircle(32,19,7);g.fillStyle(0x182e49);g.fillTriangle(10,58,32,27,54,58);g.fillStyle(0x5b83a8);g.fillRect(18,35,28,22);g.lineStyle(3,0x8de9ff);g.lineBetween(45,32,60,18);g.strokeCircle(32,39,25);g.generateTexture('player',64,64);
    g.clear();g.fillStyle(0x0d1722);g.fillCircle(28,29,18);g.fillStyle(0x83b9cf);g.fillCircle(23,24,7);g.fillStyle(0x263c4b);g.fillTriangle(8,50,28,35,48,50);g.lineStyle(3,0x7de1ef);g.strokeCircle(28,29,18);g.generateTexture('wolf',56,56);
    g.clear();g.fillStyle(0x17202e);g.fillCircle(30,25,17);g.fillStyle(0x70e3ff);g.fillCircle(25,22,5);g.fillStyle(0x334b65);g.fillTriangle(7,54,30,34,53,54);g.lineStyle(2,0x8ceaff);g.strokeCircle(30,25,18);g.generateTexture('stalker',60,60);
    g.clear();g.fillStyle(0x385f42);g.fillCircle(18,18,18);g.fillCircle(39,17,18);g.fillCircle(29,5,14);g.fillStyle(0x214a35);g.fillRect(24,18,10,35);g.generateTexture('tree',58,70);
    g.clear();g.fillStyle(0x53677c);g.fillCircle(19,20,15);g.fillCircle(35,17,17);g.fillCircle(30,31,18);g.fillStyle(0x2b4053);g.fillEllipse(28,42,38,12);g.generateTexture('rock',58,50);
    g.destroy();
  }
  buildWorld(){
    const bg=this.add.graphics();
    bg.fillStyle(0x091722);bg.fillRect(0,0,WORLD_W,WORLD_H);
    // biome bands and subtle terrain tiles
    for(let y=0;y<WORLD_H;y+=64){for(let x=0;x<WORLD_W;x+=64){
      const n=hash(x*.013+y*.007); const c=n>.72?0x0e2630:n>.45?0x0c222b:0x0a1c27;
      bg.fillStyle(c,1);bg.fillRect(x,y,64,64);
      if(n>.9){bg.lineStyle(1,0x1b3b43,.55);bg.strokeCircle(x+32,y+30,8+n*12)}
    }}
    // glowing river
    bg.lineStyle(26,0x163c52,.9);bg.beginPath();bg.moveTo(0,380);bg.bezierCurveTo(600,520,900,300,1400,470);bg.bezierCurveTo(2000,660,2400,400,3200,560);bg.strokePath();
    bg.lineStyle(3,0x3b9db7,.45);bg.beginPath();bg.moveTo(0,380);bg.bezierCurveTo(600,520,900,300,1400,470);bg.bezierCurveTo(2000,660,2400,400,3200,560);bg.strokePath();
    // region landmarks
    this.add.text(260,180,'WHISPERING WILDS',{fontFamily:'Rajdhani',fontSize:28,color:'#4fa8a9',letterSpacing:7,alpha:.55});
    this.add.text(2340,1720,'FROSTFALL PASS',{fontFamily:'Rajdhani',fontSize:30,color:'#76cde0',letterSpacing:7,alpha:.45});
    this.add.text(2480,420,'ANCIENT RUINS',{fontFamily:'Rajdhani',fontSize:28,color:'#a99fe5',letterSpacing:7,alpha:.45});
    for(let i=0;i<75;i++){const x=rand(80,3120),y=rand(80,2120); if(Math.hypot(x-1500,y-1100)<270)continue;const t=this.add.sprite(x,y,'tree').setAlpha(rand(.55,.9)).setScale(rand(.75,1.2));t.setDepth(5);trees.push(t)}
    for(let i=0;i<40;i++){const x=rand(70,3130),y=rand(70,2130); if(Math.hypot(x-1500,y-1100)<240)continue;const r=this.add.sprite(x,y,'rock').setAlpha(.7).setScale(rand(.65,1.15));r.setDepth(4);rocks.push(r)}
    const shrine=this.add.circle(1500,1100,185,0x1c5b72,.10).setStrokeStyle(2,0x62e4ff,.35); shrine.setDepth(2);
    this.add.text(1500,870,'AETHER CAMP',{fontFamily:'Rajdhani',fontSize:18,color:'#9eeaff',stroke:'#06101a',strokeThickness:4}).setOrigin(.5).setDepth(30);
  }
  spawnEnemies(){
    const spots=[[850,700,'wolf'],[1060,1460,'wolf'],[1900,760,'stalker'],[2160,1240,'stalker'],[720,1650,'wolf'],[2380,980,'stalker'],[1820,1640,'wolf'],[2700,730,'stalker']];
    spots.forEach((s,i)=>{const e=this.add.sprite(s[0],s[1],s[2]).setDepth(18);e.hp=s[2]==='stalker'?60:45;e.maxHp=e.hp;e.speed=s[2]==='stalker'?70:55;e.cool=0;e.dead=false;e.name=s[2]==='stalker'?'Crystal Stalker':'Gloom Wolf';e.t=s[2];enemies.push(e)})
  }
  spawnResources(){
    for(let i=0;i<30;i++){const x=rand(120,3080),y=rand(120,2080);if(Math.hypot(x-1500,y-1100)<220)continue;const type=i%3===0?'crystal':i%3===1?'herb':'ore';const col={crystal:0x7eeaff,herb:0x69d7a0,ore:0x95a9c0}[type];const g=this.add.circle(x,y,8,col,.7).setStrokeStyle(2,col,.25);g.setDepth(8);g.type=type;resources.push(g)}
  }
  attack(){
    if(state.cooldown>0)return;
    state.cooldown=280;state.attacking=true;this.player.setTint(0xbff8ff);
    this.time.delayedCall(110,()=>{state.attacking=false;this.player.clearTint()});
    enemies.forEach(e=>{if(!e.dead && Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y)<115){e.hp-=32;this.hitFX(e.x,e.y);if(e.hp<=0)this.killEnemy(e)}});
    if(state.player.energy>=10){state.player.energy=Math.max(0,state.player.energy-10)}
  }
  hitFX(x,y){for(let i=0;i<8;i++){const p=this.add.circle(x,y,rand(2,5),0x79e8ff,.9).setDepth(40);particles.push({obj:p,vx:rand(-90,90),vy:rand(-120,20),life:400})}}
  killEnemy(e){e.dead=true;e.setVisible(false);state.kills++;state.player.xp+=35;state.player.gold+=12;state.player.crystal+=1;this.toast(`Defeated ${e.name}`,`+35 XP  ·  +12 gold`);this.updateProgress();this.levelCheck()}
  levelCheck(){const need=state.player.level*100;if(state.player.xp>=need){state.player.xp-=need;state.player.level++;state.player.maxHp+=12;state.player.hp=state.player.maxHp;this.toast('LEVEL UP',`You reached level ${state.player.level}`)}}
  toast(title,msg){const el=document.createElement('div');el.className='toast';el.innerHTML=`<strong>${title}</strong><br><span>${msg}</span>`;document.querySelector('#toast-stack').appendChild(el);setTimeout(()=>el.remove(),2200)}
  update(_,dt){
    const speed=210*(keys.has('shift')?1.35:1);let dx=0,dy=0;if(keys.has('w'))dy--;if(keys.has('s'))dy++;if(keys.has('a'))dx--;if(keys.has('d'))dx++;if(dx||dy){const l=Math.hypot(dx,dy);this.player.x=Phaser.Math.Clamp(this.player.x+dx/l*speed*dt/1000,35,WORLD_W-35);this.player.y=Phaser.Math.Clamp(this.player.y+dy/l*speed*dt/1000,35,WORLD_H-35);this.player.flipX=dx<0}
    enemies.forEach(e=>{if(e.dead)return;e.cool=Math.max(0,e.cool-dt);const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,e.x,e.y);if(d<340){const a=Math.atan2(this.player.y-e.y,this.player.x-e.x);e.x+=Math.cos(a)*e.speed*dt/1000;e.y+=Math.sin(a)*e.speed*dt/1000;if(d<52&&e.cool<=0){e.cool=900;state.player.hp=Math.max(0,state.player.hp-8);this.hitFX(this.player.x,this.player.y)}}});
    if(state.cooldown>0)state.cooldown-=dt;state.player.energy=Math.min(100,state.player.energy+dt*.018);
    particles.forEach((p,i)=>{p.obj.x+=p.vx*dt/1000;p.obj.y+=p.vy*dt/1000;p.vy+=180*dt/1000;p.life-=dt;p.obj.alpha=Math.max(0,p.life/400);if(p.life<=0){p.obj.destroy();particles.splice(i,1)}});
    this.updateHud();
    if(state.player.hp<=0){state.player.hp=state.player.maxHp;this.player.setPosition(1500,1100);this.toast('Aether Camp','You recovered at camp.')}
  }
  updateHud(){
    const p=state.player;document.querySelector('#health-fill').style.width=`${p.hp/p.maxHp*100}%`;document.querySelector('#xp-fill').style.width=`${p.xp/(p.level*100)*100}%`;document.querySelector('#health-label').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;document.querySelector('#energy-label').textContent=`${Math.floor(p.energy)} / 100`;document.querySelector('#xp-label').textContent=`${Math.floor(p.xp)} / ${p.level*100} XP`;document.querySelector('#level-label').textContent=`LV ${p.level}`;document.querySelector('#gold-label').textContent=p.gold;document.querySelector('#crystal-label').textContent=p.crystal;document.querySelector('#quest-progress').textContent=`${Math.min(state.kills,8)} / 8`;const c=document.querySelector('#cooldown');c.style.height=`${Math.max(0,state.cooldown)/280*55}px`;
  }
}

const config={type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#07111b',physics:{default:'arcade',arcade:{debug:false}},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[WorldScene]};
const game=new Phaser.Game(config);

window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['1','2','3','4','5'].includes(k))selectSkill(k);if(k==='i')openMenu('Inventory');if(k==='m')openMenu('World Map');if(k==='c')openMenu('Character');if(k==='escape')closeMenu()});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
document.querySelectorAll('.skill-slot').forEach(b=>b.addEventListener('click',()=>selectSkill(b.dataset.slot)));
document.querySelector('#menu-close').addEventListener('click',closeMenu);
function selectSkill(n){document.querySelectorAll('.skill-slot').forEach(x=>x.classList.toggle('selected',x.dataset.slot===n))}
function openMenu(type){const o=document.querySelector('#menu-overlay'),title=document.querySelector('#menu-title'),c=document.querySelector('#menu-content');o.classList.remove('hidden');title.textContent=type;if(type==='Inventory'){c.innerHTML=`<div class="inventory-grid">${state.inventory.map(i=>`<div class="item-card"><div class="rarity">${i[1]}</div><div class="item-name">${i[0]}</div><div class="item-type">${i[2]}</div></div>`).join('')}</div>`}else if(type==='Character'){c.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="item-card"><div class="rarity">LEVEL</div><div class="item-name">Veyra · ${state.player.level}</div><div class="item-type">Aetherbound Vanguard</div></div><div class="item-card"><div class="rarity">BUILD</div><div class="item-name">Agile Fighter</div><div class="item-type">Dash / Parry / Critical</div></div></div>`}else{c.innerHTML=`<div class="item-card" style="min-height:250px;text-align:center;padding:60px"><div class="rarity">WORLD MAP</div><div class="item-name">Moonlit Frontier</div><div class="item-type">Whispering Wilds · Ancient Ruins · Frostfall Pass</div></div>`}}
function closeMenu(){document.querySelector('#menu-overlay').classList.add('hidden')}
