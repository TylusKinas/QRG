// @name Snake
// @color #00e436
// @about Swipe to steer. Eat, grow, do not crash.
// ============================================================================
//  SNAKE
// ============================================================================
//  Swipe (or use the d-pad) to steer the snake, eat the red food to grow, and do not hit the wall or yourself.
//
//  HOW IT IS BUILT
//   - The board is a grid of 21 x 18 cells of 12 pixels. The snake is a list b of [x, y] cells, head first.
//   - It moves one cell every few frames: add a new head, and remove the tail unless it just ate.
//   - The step delay shrinks as the score grows, so the game speeds up.
// ============================================================================
// The four directions as [dx, dy]: 0 right, 1 down, 2 left, 3 up.
const D=[[1,0],[0,1],[-1,0],[0,-1]];
// State: b the snake (head first), dr direction now, nd direction asked for, f the food cell, c step timer, n score, over = game over.
let b,dr,nd,f,c,n,over;
// init() = a new snake of three cells, pointing right, and the first food.
const init=()=>{b=[[10,9],[9,9],[8,9]];dr=nd=c=n=over=0;f=[15,9]};
// Start the first game.
init();
// The frame function.
return i=>{
// Background and the black playing field.
r(0,0,W,H,1);r(2,20,252,216,0);
// Steering: remember the direction asked for, but never allow turning straight back into the body.
if(i.l&&dr!=0)nd=2;if(i.r&&dr!=2)nd=0;if(i.u&&dr!=1)nd=3;if(i.d&&dr!=3)nd=1;
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
// Every few frames (fewer as the score grows) the snake takes one step.
else if(++c>=Math.max(4,10-(n/5|0))){c=0;dr=nd;
// Where the head will be after this step.
let X=b[0][0]+D[dr][0],Y=b[0][1]+D[dr][1];
// Hit a wall or the snake itself? Game over.
if(X<0||Y<0||X>=21||Y>=18||b.some(a=>a[0]==X&&a[1]==Y))over=1,s(100);
// Otherwise move: add the new head. If it is on the food: score, beep, and place new food on a free cell; if not, drop the tail.
else{b.unshift([X,Y]);if(X==f[0]&&Y==f[1]){n++;s(800);do f=[R(21),R(18)];while(b.some(a=>a[0]==f[0]&&a[1]==f[1]))}else b.pop()}}
// Draw the snake (the head is light green, the body darker).
b.map((a,j)=>r(3+a[0]*12,21+a[1]*12,11,11,j?3:11));
// Draw the food.
r(3+f[0]*12,21+f[1]*12,11,11,8);
// The score.
t('SCORE '+n,4,6,7);
// Show GAME OVER.
if(over)t('GAME OVER',64,100,8,2)
}
