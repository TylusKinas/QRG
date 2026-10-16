// @name Invaders
// @color #ff77a8
// @about Drag to move, hold to shoot.
// ============================================================================
//  INVADERS
// ============================================================================
//  Drag to move your ship and hold your finger down to shoot. Destroy the rows of aliens before they reach you.
//
//  HOW IT IS BUILT
//   - Aliens are a list E of [x, y, row]. They march sideways together and drop down when one hits the edge.
//     The fewer are left, the faster they march: the step happens every (1 + half the number left) frames.
//   - Bullets are lists of [x, y]: B yours (going up), EB the aliens' (going down).
// ============================================================================
// Two 8x8 sprites: iv = alien, sh = your ship.
const iv=[24,60,126,219,255,36,90,165],sh=[16,56,56,124,254,254,238,0];
// State: x ship, B my bullets, EB alien bullets, E aliens, dx march direction, T timer, sc score, lv lives, cd shot cooldown, over = game over.
let x,B,EB,E,dx,T,sc,lv,over,cd;
// wave() = a new wave of 4 rows x 8 aliens, and clear all bullets.
const wave=()=>{E=[];for(let a=0;a<4;a++)for(let c=0;c<8;c++)E.push([30+c*24,30+a*20,a]);dx=1;B=[];EB=[]};
// init() = new game.
const init=()=>{x=120;sc=T=over=cd=0;lv=3;wave()};
// Start the first game.
init();
// The frame function.
return i=>{
// Black background.
r(0,0,W,H,0);
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
else{
// Move the ship with the d-pad or by following the finger, and keep it on screen.
if(i.l)x-=2.5;if(i.r)x+=2.5;if(i.t)x+=Math.max(-3,Math.min(3,(i.x-x-8)/3));x=Math.max(8,Math.min(W-24,x));
// Count down the time until the next shot is allowed.
if(cd>0)cd--;
// Shoot while A or a finger is held, at most 3 bullets in the air, one every 12 frames.
if((i.a||i.t)&&!cd&&B.length<3)B.push([x+7,206]),cd=12,s(900);
// Advance the march timer.
T++;
// March: if any alien would leave the screen, reverse and step down; otherwise step sideways.
if(T%(1+(E.length>>1))<1){if(E.some(e=>e[0]+dx*4<8||e[0]+dx*4>W-24))dx=-dx,E.map(e=>e[1]+=8);else E.map(e=>e[0]+=dx*4)}
// Now and then a random alien shoots.
if(!R(40)&&E.length){let e=E[R(E.length)];EB.push([e[0]+7,e[1]+16])}
// Move my bullets up; if one hits an alien, remove both and score 10.
B=B.filter(b=>{b[1]-=5;if(b[1]<0)return 0;let h=E.findIndex(e=>b[0]>e[0]&&b[0]<e[0]+16&&b[1]>e[1]&&b[1]<e[1]+16);if(h>=0){E.splice(h,1);sc+=10;s(400);return 0}return 1});
// Move alien bullets down; if one hits my ship, lose a life.
EB=EB.filter(b=>{b[1]+=3;if(b[1]>H)return 0;if(Math.abs(b[0]-x-8)<9&&b[1]>206){if(--lv<1)over=1;s(100);return 0}return 1});
// All aliens dead: bring a new wave.
if(!E.length)wave();
// Aliens reached the bottom: game over.
if(E.some(e=>e[1]>192))over=1}
// Draw the aliens (each row has its own color).
E.map(e=>d(iv,e[0],e[1],[11,10,8,14][e[2]],2));
// Draw all bullets.
B.map(b=>r(b[0],b[1],2,6,7));EB.map(b=>r(b[0],b[1],2,6,8));
// Draw the ship.
d(sh,x,208,3,2);
// Score and lives.
t('SCORE '+sc,4,4,7);t('LIVES '+lv,200,4,7);
// Show GAME OVER.
if(over)t('GAME OVER',64,110,8,2)
}
