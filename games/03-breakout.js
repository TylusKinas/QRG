// @name Breakout
// @color #ffa300
// @about Drag the paddle, tap to launch the ball.
// ============================================================================
//  BREAKOUT
// ============================================================================
//  Drag the paddle, tap to launch the ball and break all the bricks. Lose the ball three times and it is over.
//
//  HOW IT IS BUILT
//   - The ball moves by (vx, vy) pixels per frame. Hitting a wall or brick flips the matching sign.
//   - Where the ball hits the paddle decides the new sideways speed: the edges send it off at an angle.
//   - Bricks are a flat list B of 84 flags (14 columns x 6 rows): 1 = still there, 0 = broken.
// ============================================================================
// State: p paddle x, w paddle width, bx/by ball, vx/vy its speed, on = ball launched, B bricks, sc score, lv lives.
let p,w=40,bx,by,vx,vy,on,B,sc,lv;
// rs() puts the ball back on the paddle, waiting for a launch.
const rs=()=>{on=0;vx=vy=0};
// init() = new game: all bricks back, score 0, 3 lives.
const init=()=>{B=Array(84).fill(1);sc=0;lv=3;p=108;rs()};
// Start the first game.
init();
// The frame function.
return i=>{
// Background and the three walls (top, left, right).
r(0,0,W,H,1);r(0,0,W,8,6);r(0,0,8,H,6);r(W-8,0,8,H,6);
// Move the paddle with left/right or by following the finger.
if(i.l)p-=4;if(i.r)p+=4;if(i.t)p=i.x-w/2;
// Keep the paddle between the walls.
p=Math.max(8,Math.min(W-8-w,p));
// The ball waits on the paddle until A, Start or a tap launches it.
if(!on){bx=p+w/2;by=218;if(i.A||i.S)on=1,vx=2,vy=-3}
// Move the ball.
else{bx+=vx;by+=vy;
// Bounce off the side walls.
if(bx<10||bx>W-10)vx=-vx,bx=Math.max(10,Math.min(W-10,bx));
// Bounce off the ceiling.
if(by<10)vy=-vy;
// Bounce off the paddle. The hit position (-1 at the left edge ... +1 at the right edge) sets the sideways speed.
if(vy>0&&by>216&&by<226&&bx>p-3&&bx<p+w+3)vy=-vy,vx=(bx-p-w/2)/w*6,s(300);
// Ball lost: lose a life and relaunch, or start over when no lives are left.
if(by>H){s(100);if(--lv<0)init();else rs()}}
// For every brick that still exists: work out its position, test the ball against it...
B.map((a,j)=>{if(a){let x=9+j%14*17,y=30+(j/14|0)*10;
// ...and if hit: remove it, bounce, add 10 points, beep.
if(bx+2>x&&bx<x+16&&by+2>y&&by<y+8)B[j]=0,vy=-vy,sc+=10,s(700);
// Draw the brick; each row has its own color.
r(x,y,16,8,[8,9,10,11,12,13][j/14|0])}});
// All bricks gone: refill them and put the ball back.
if(!B.some(a=>a))B.fill(1),rs();
// Draw the paddle and the ball.
r(p,224,w,6,7);r(bx-2,by-2,4,4,7);
// Score and lives.
t('SCORE '+sc,12,12,7);t('LIVES '+lv,190,12,7)
}
