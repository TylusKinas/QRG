// @name Racing
// @color #ff004d
// @about Dodge the traffic. Drag to steer.
// ============================================================================
//  RACING
// ============================================================================
//  Dodge the traffic on a scrolling road. Drag your finger (or use left/right) to steer; keeping a finger
//  down or holding A / Up speeds you up. Hit a car and you lose a life.
//
//  HOW IT IS BUILT
//   - The road does not move: the lane lines and trees are drawn again every frame, shifted by y0, which grows
//     with the speed v. That scrolling fakes the movement.
//   - Other cars are a list E of [x, y, color]. They move down a little slower than the scenery.
// ============================================================================
// The car as an 8x8 sprite: 8 numbers, one per row; each number's bits are the pixels of that row (1 = painted).
const car=[60,126,126,255,255,126,102,102];
// State: x my car, v speed, y0 scroll offset, E other cars, sc score, lv lives, T frame counter, inv invincibility frames after a crash, over = game over.
let x,v,y0,E,sc,lv,T,inv,over;
// init() = new game.
const init=()=>{x=120;v=2;y0=0;E=[];sc=T=inv=over=0;lv=3};
// Start the first game.
init();
// The frame function (60 times a second).
return i=>{
// Grass, the gray road and the white road edges.
r(0,0,W,H,3);r(64,0,128,H,5);r(62,0,2,H,7);r(192,0,2,H,7);
// Scroll the scenery: y0 wraps around every 32 pixels.
y0=(y0+v)%32;
// Draw dashed lane lines and trees; they repeat every 32 pixels, shifted by y0.
for(let y=-32;y<H;y+=32){for(let l=96;l<192;l+=32)r(l-1,y+y0,2,16,10);r(24,y+y0,12,12,11);r(220,y+y0+16,12,12,11)}
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
else{
// Steer: d-pad / arrows, or follow the finger (i.t) at a limited speed.
if(i.l)x-=2.5;if(i.r)x+=2.5;if(i.t)x+=Math.max(-3,Math.min(3,(i.x-x)/4));
// Keep the car on the road.
x=Math.max(68,Math.min(172,x));
// Speed: speeds up while A, Up or a finger is held, slows down with Down, otherwise drifts back. Clamped to 2-7.
v=Math.min(7,Math.max(2,v+(i.a||i.u||i.t?.05:i.d?-.1:-.02)));
// Every few frames (more often when faster) add a new car in a random lane at the top.
T++;if(T%Math.max(14,50-v*4|0)<1)E.push([72+R(4)*32,-20,[8,9,12,14,13][R(5)]]);
// Score grows with speed.
sc+=v/10;
// Move every enemy car down; check for a crash with my car (only when not invincible); drop cars that left the screen.
E=E.filter(e=>{e[1]+=v-1;
// A crash: lose a life (game over at 0), become invincible for 60 frames, play a beep, drop to base speed, remove that car.
if(!inv&&Math.abs(e[0]-x)<14&&Math.abs(e[1]-196)<16){if(--lv<1)over=1;inv=60;s(100);v=2;return 0}
return e[1]<H+20});
// Count down the invincibility.
if(inv)inv--}
// Draw the enemy cars with the car sprite (d(sprite, x, y, color, size)).
E.map(e=>d(car,e[0]-8,e[1]-8,e[2],2));
// Draw my car; while invincible it blinks (drawn only half of the time).
if(inv%8<4)d(car,x-8,188,7,2);
// The numbers in the corner: score, lives, speed.
t('SCORE',4,4,7);t(sc|0,4,12,10);t('LIVES',4,28,7);t(lv,4,36,10);t('SPEED',4,52,7);t(v*10|0,4,60,10);
// Show GAME OVER.
if(over)t('GAME OVER',64,100,8,2)
}
