// @name Pong
// @color #fff1e8
// @about Drag the paddle up and down.
// ============================================================================
//  PONG
// ============================================================================
//  Drag your finger up and down to move the left paddle. First to 7 points wins, then it starts again.
//
//  HOW IT IS BUILT
//   - The computer paddle simply chases the ball, but with a speed limit, so you can beat it.
//   - Where the ball hits a paddle decides its vertical speed, like in the real game.
// ============================================================================
// State: p my paddle y, a computer paddle y, bx/by ball, vx/vy ball speed, ps/as scores, w paddle height.
let p,a,bx,by,vx,vy,ps,as,w=36;
// sv(q) = serve: ball to the middle, flying left (-1) or right (1) with a random slope.
const sv=q=>{bx=128;by=120;vx=3*q;vy=R(4)-1.5};
// init() = new match.
const init=()=>{p=a=100;ps=as=0;sv(1)};
// Start the first match.
init();
// The frame function.
return i=>{
// Black background.
r(0,0,W,H,0);
// The dashed net in the middle.
for(let y=0;y<H;y+=12)r(127,y,2,6,5);
// Move my paddle: up/down keys or follow the finger.
if(i.u)p-=4;if(i.d)p+=4;if(i.t)p=i.y-w/2;
// Keep it on the screen.
p=Math.max(8,Math.min(H-8-w,p));
// The computer paddle moves toward the ball, at most 2.6 pixels per frame.
a+=Math.max(-2.6,Math.min(2.6,by-w/2-a));a=Math.max(8,Math.min(H-8-w,a));
// Move the ball.
bx+=vx;by+=vy;
// Bounce off the top and bottom walls.
if(by<8||by>H-12)vy=-vy;
// Hit my paddle (left): reverse and speed up a little; the hit position sets the new vertical speed.
if(vx<0&&bx<20&&bx>10&&by>p-4&&by<p+w+4)vx=Math.min(6,-vx*1.05),vy=(by-p-w/2)/6,s(400);
// Hit the computer paddle (right): the same.
if(vx>0&&bx>232&&bx<246&&by>a-4&&by<a+w+4)vx=-Math.min(6,vx*1.05),vy=(by-a-w/2)/6,s(400);
// The ball went past my paddle (left edge): the computer scores, serve again.
if(bx<0){as++;sv(1);s(150)}
// The ball went past the computer paddle (right edge): I score, serve the other way.
if(bx>W){ps++;sv(-1);s(900)}
// First to 7 wins: a new match starts.
if(ps>6||as>6)init();
// Draw both paddles and the ball.
r(12,p,4,w,7);r(240,a,4,w,7);r(bx,by,4,4,10);
// The two scores.
t(ps,100,12,7,3);t(as,140,12,7,3)
}
