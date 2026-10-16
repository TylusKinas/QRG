// @name Flappy
// @color #ffec27
// @about Tap to flap through the pipes.
// ============================================================================
//  FLAPPY
// ============================================================================
//  Tap to flap and fly the bird through the gaps between the pipes.
//
//  HOW IT IS BUILT
//   - Gravity adds a little to the fall speed v every frame; a tap sets v to a strong upward speed.
//   - Pipes are a list o of [x, top of the gap, passed?]. They slide left at a constant speed; new ones appear on the right.
// ============================================================================
// The bird sprite: 8 numbers = 8 rows of 8 pixels.
const bird=[60,126,255,239,254,124,56,0];
// State: y bird height, v its vertical speed, o pipes, n score, over = game over.
let y,v,o,n,over;
// init() = bird in the middle, one pipe ready.
const init=()=>{y=100;v=0;o=[[W,80,0]];n=over=0};
// Start the first game.
init();
// The frame function.
return i=>{
// Sky, ground and grass strip.
r(0,0,W,H,12);r(0,200,W,40,4);r(0,200,W,4,11);
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
else{
// Tap / A: flap (an upward speed) and beep.
if(i.A)v=-4.2,s(500);
// Gravity pulls the speed down; the speed moves the bird.
v+=.3;y+=v;
// Slide every pipe left by 2 pixels.
o.map(p=>p[0]-=2);
// When the last pipe has moved far enough, add a new one with a random gap height.
if(o[o.length-1][0]<W-100)o.push([W,40+R(100),0]);
// Forget pipes that have left the screen.
o=o.filter(p=>p[0]>-30);
// Score a point when a pipe has passed the bird (once per pipe)...
o.map(p=>{if(!p[2]&&p[0]+26<60)p[2]=1,n++,s(900);
// ...and check for a collision: inside the pipe's columns but not inside its gap.
if(76>p[0]&&60<p[0]+26&&(y<p[1]||y+16>p[1]+60))over=1,s(100)});
// Touching the ground or the top of the screen is also game over.
if(y>184||y<-10)over=1}
// Draw each pipe: a top part and a bottom part with a lighter rim.
o.map(p=>{r(p[0],0,26,p[1],3);r(p[0]-2,p[1]-8,30,8,11);r(p[0],p[1]+60,26,140,3);r(p[0]-2,p[1]+60,30,8,11)});
// Draw the bird.
d(bird,60,y,10,2);
// The score, in big numbers.
t(n,120,12,7,3);
// Show GAME OVER.
if(over)t('GAME OVER',64,100,8,2)
}
