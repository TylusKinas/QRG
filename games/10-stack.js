// @name Stack
// @color #7e2553
// @about Tap to drop the sliding block.
// ============================================================================
//  STACK
// ============================================================================
//  Tap to drop the sliding block on top of the tower. Only the part that overlaps the block below stays, so the
//  tower gets narrower when you miss. The block gets faster the higher you go.
//
//  HOW IT IS BUILT
//   - L is the tower: a list of [x, width] blocks, one 12-pixel-high layer each.
//   - The moving block has the width of the top layer and slides back and forth at speed q.
// ============================================================================
// State: L the tower, x the moving block's x, q its speed (and direction), n score, over = game over.
let L,x,q,n,over;
// init() = a tower of one block, block moving right.
const init=()=>{L=[[78,100]];x=0;q=2;n=over=0};
// Start the first game.
init();
// The frame function.
return i=>{
// Background.
r(0,0,W,H,1);
// The top block of the tower: p is its x, w its width.
let[p,w]=L[L.length-1];
// Slide the moving block; reverse at the screen edges.
x+=q;if(x<0||x+w>W)q=-q,x=Math.max(0,Math.min(W-w,x));
// Tap / A: drop it. After game over this restarts. Otherwise measure how much overlaps the top block...
if(i.A){if(over)init();else{let a=Math.max(x,p),e=Math.min(x+w,p+w);
// ...no overlap = game over; else the overlapping part becomes the new top block, score up, beep rises with the score, block speeds up.
if(e-a<=0)over=1,s(100);else L.push([a,e-a]),n++,s(400+n*15),q=(q<0?-1:1)*(2+n/8)}}
// Camera: once the tower is high, scroll everything down.
let c=Math.max(0,L.length*12-150);
// Draw the tower, each layer in another color.
L.map((b,j)=>r(b[0],228-j*12+c,b[1],11,[8,9,10,11,12,13,14][j%7]));
// Draw the moving block (white).
if(!over)r(x,228-L.length*12+c,w,11,7);
// The score.
t(n,120,12,7,3);
// Show GAME OVER.
if(over)t('GAME OVER',64,100,8,2)
}
