// @name Runner
// @color #83769c
// @about Tap to jump over the cacti.
// ============================================================================
//  RUNNER
// ============================================================================
//  Tap to jump over the cacti. The longer you run, the faster it gets.
//
//  HOW IT IS BUILT
//   - y is the height above the ground and v the vertical speed. A jump sets v; every frame gravity lowers it.
//   - Cacti are a list o of [x, height, width]. They move left; the next one appears once there is room.
// ============================================================================
// The runner sprite.
const dn=[56,124,126,222,254,126,100,102];
// State: y height above ground, v vertical speed, o cacti, T frame counter, n distance (the score), sp running speed, over = game over.
let y,v,o,T,n,sp,over;
// init() = new run.
const init=()=>{y=v=T=n=over=0;o=[];sp=3};
// Start the first run.
init();
// The frame function.
return i=>{
// Sky, ground and the light edge of the ground.
r(0,0,W,H,6);r(0,190,W,50,5);r(0,190,W,3,7);
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
// Playing: count frames.
else{T++;
// Jump with A, Up or a tap, but only while standing on the ground.
if((i.A||i.U)&&!y)v=9,s(500);
// Physics: move up/down; in the air gravity pulls the speed down; on landing stop.
y+=v;if(y>0)v-=.55;else y=v=0;
// When the last cactus is far enough away, add a new one with a random height and width.
if(!o.length||o[o.length-1][0]<W-70-R(120))o.push([W,16+R(3)*6,8+R(2)*6]);
// Move cacti left and drop the ones that left the screen.
o.map(c=>c[0]-=sp);o=o.filter(c=>c[0]>-20);
// Run faster and faster (up to a maximum) and count the distance.
sp=Math.min(8,3+n/300);n+=sp/6;
// Collision: a cactus overlaps the runner's columns and the runner is not high enough: game over.
if(o.some(c=>c[0]<76&&c[0]+c[2]>60&&y<c[1]-2))over=1,s(100)}
// Draw the cacti.
o.map(c=>r(c[0],190-c[1],c[2],c[1],3));
// Draw the runner (red when crashed).
d(dn,60,174-y,over?8:7,2);
// The distance.
t('SCORE '+(n|0),4,6,7);
// Show GAME OVER.
if(over)t('GAME OVER',64,100,8,2)
}
