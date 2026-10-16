// @name Tetris
// @color #29adff
// @about Falling blocks. Swipe to move, tap to rotate, hold down to drop.
// ============================================================================
//  TETRIS
// ============================================================================
//  The classic falling-block game. Swipe left/right to move a piece, tap (or swipe up) to rotate it,
//  hold down to make it fall faster. Complete rows to score; every 10 rows the game speeds up.
//
//  HOW IT IS BUILT
//   - You write a game as plain JavaScript that ends with  return i => { ... }  (the frame function).
//     The engine calls it 60 times a second. `i` is the input: i.l i.r i.u i.d (held), i.L i.R i.U i.D (pressed
//     now), i.A i.B i.S, and the finger (i.t i.x i.y). A swipe counts as a direction press, a tap as A.
//   - Drawing: r(x, y, w, h, color) rectangle, t(text, x, y, color, size) text, s(hz) beep, R(n) random.
//   - The board g is a flat list of 10 x 20 cells: 0 = empty, 1-7 = a locked block (the number picks the color).
//   - The falling piece c is 4 [x, y] cells; (px, py) is where its top-left corner is on the board.
// ============================================================================
// The 7 pieces, each as 4 cells [x, y] inside a 4x4 box, and one color (0-15) per piece. PC = pieces, CL = colors.
const PC=[[[0,1],[1,1],[2,1],[3,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]]],CL=[12,10,13,11,8,14,9];
// State: g board, c falling piece, k its type, nk next type, px/py its position, T drop timer, sc score, ln lines, lv level, over = game over.
let g,c,k,nk,px,py,T,sc,ln,lv,over;
// ok(cells, x, y): does a piece with these cells fit at (x, y)? Inside the walls, above the floor, not on a locked block.
const ok=(c,x,y)=>c.every(([a,b])=>{let u=x+a,v=y+b;return u>=0&&u<10&&v<20&&(v<0||!g[v*10+u])});
// sp() = spawn: take the next piece, choose a new "next", put it at the top. If it does not fit, the game is over.
const sp=()=>{k=nk;nk=R(7);c=PC[k].map(a=>a.slice());px=3;py=-1;if(!ok(c,px,py))over=1};
// init() = start a new game: empty board, scores to zero, first piece.
const init=()=>{g=Array(200).fill(0);sc=ln=lv=T=over=0;nk=R(7);sp()};
// B(x, y, color) draws one block: a square with a white top edge and a black bottom edge, so it looks 3D.
const B=(x,y,m)=>{r(x,y,10,10,m);r(x,y,10,2,7);r(x,y+8,10,2,0)};
// Start the first game.
init();
// The frame function: everything below runs once per frame.
return i=>{
// Paint the background, the gray border of the well and the black well itself.
r(0,0,W,H,1);r(38,18,104,204,6);r(40,20,100,200,0);
// After game over, A or Start begins a new game.
if(over){if(i.A||i.S)init()}
else{
// Move left / right (d-pad, arrow keys or swipe) if the piece still fits one square over.
if(i.L&&ok(c,px-1,py))px--;
if(i.R&&ok(c,px+1,py))px++;
// Rotate (A, B, tap or Up): turn the cells 90 degrees. If it does not fit, try shifting 1-2 squares so it can turn next to a wall.
if(i.A||i.B||i.U){let q=c.map(([x,y])=>[(k?3:4)-1-y,x]);for(let e of[0,-1,1,-2,2])if(ok(q,px+e,py)){c=q;px+=e;break}}
// Gravity: T counts frames. When it reaches the limit the piece falls one row. Holding Down makes the limit 2 frames; a higher level makes it shorter.
if(++T>=(i.d?2:Math.max(2,48-lv*4))){T=0;
// Fall one row if there is room...
if(ok(c,px,py+1))py++;
// ...otherwise the piece lands: copy its cells into the board.
else{c.map(([a,b])=>{if(py+b>=0)g[(py+b)*10+px+a]=k+1});
// Look for full rows from the bottom up; remove each one (everything above drops down) and count them in n.
let n=0;for(let y=19;y>=0;y--)if(g.slice(y*10,y*10+10).every(a=>a)){g.splice(y*10,10);g.unshift(...Array(10).fill(0));n++;y++}
// Scoring: 40 / 100 / 300 / 1200 points for 1-4 rows, times level + 1. Every 10 lines the level goes up. s(hz) plays a beep.
if(n){sc+=[0,40,100,300,1200][n]*(lv+1);ln+=n;lv=ln/10|0;s(800)}else s(200);
// Bring in the next piece.
sp()}}}
// Draw every locked block of the board.
g.map((v,j)=>v&&B(40+j%10*10,20+(j/10|0)*10,CL[v-1]));
// Draw the falling piece (only the cells that are already inside the well).
if(!over)c.map(([a,b])=>py+b>=0&&B(40+(px+a)*10,20+(py+b)*10,CL[k]));
// The side panel: score, lines and level.
t('SCORE',160,24,7);t(sc,160,34,10);t('LINES',160,52,7);t(ln,160,62,10);t('LEVEL',160,80,7);t(lv,160,90,10);t('NEXT',160,108,7);
// Preview of the next piece.
PC[nk].map(([a,b])=>B(164+a*10,120+b*10,CL[nk]));
// Show GAME OVER (the last number is the text size).
if(over)t('GAME OVER',48,100,8,2)
}
