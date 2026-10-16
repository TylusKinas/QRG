// @name 2048
// @color #ab5236
// @about Swipe to merge tiles.
// ============================================================================
//  2048
// ============================================================================
//  Swipe to slide all tiles. Two equal tiles that meet merge into one with double the value. Reach the big numbers!
//
//  HOW IT IS BUILT
//   - The board g is 16 numbers; a tile stores its EXPONENT (1 = 2, 2 = 4, 3 = 8 ...), 0 = empty.
//   - mv(dx, dy) slides along one direction: for every line it collects the tiles, merges equal neighbours once,
//     pads with zeros and writes the line back. If anything changed, a new tile appears.
// ============================================================================
// A color for each tile value.
const CC=[1,13,12,11,3,10,9,8,14,2,15,7];
// State: g the 16 tiles, sc score, over = game over.
let g,sc,over;
// add() puts a new tile (mostly a 2, sometimes a 4) on a random empty cell.
const add=()=>{let e=[];g.map((v,k)=>v||e.push(k));if(e.length)g[e[R(e.length)]]=R(10)?1:2};
// init() = new game with two tiles.
const init=()=>{g=Array(16).fill(0);sc=over=0;add();add()};
// mv(dx, dy) = slide everything one way. ch remembers whether anything changed.
const mv=(dx,dy)=>{let ch=0;
// For each of the 4 lines (rows or columns)...
for(let a=0;a<4;a++){let L=[];
// ...list its 4 cells ordered from the side the tiles are sliding TO.
for(let b=0;b<4;b++){let x=dx?(dx>0?3-b:b):a,y=dy?(dy>0?3-b:b):a;L.push(y*4+x)}
// Take the non-empty tiles of that line.
let v=L.map(k=>g[k]).filter(Boolean),o=[];
// Merge equal neighbours (each tile merges once per move) and add to the score.
for(let j=0;j<v.length;j++)if(v[j]==v[j+1])o.push(v[j]+1),sc+=2<<v[j],j++;else o.push(v[j]);
// Fill the rest of the line with empty cells.
while(o.length<4)o.push(0);
// Write the line back and note if something moved.
L.map((k,j)=>{if(g[k]!=o[j])ch=1;g[k]=o[j]})}
// If the board changed: add a new tile and beep.
if(ch)add(),s(500);
// Game over when the board is full and no two neighbours are equal.
if(!g.includes(0)&&!g.some((v,k)=>k%4<3&&v==g[k+1]||k<12&&v==g[k+4]))over=1};
// Start the first game.
init();
// The frame function.
return i=>{
// Gray background.
r(0,0,W,H,5);
// After game over, A or Start restarts.
if(over){if(i.A||i.S)init()}
// Swipes (or arrow keys) slide the tiles.
else{if(i.L)mv(-1,0);if(i.R)mv(1,0);if(i.U)mv(0,-1);if(i.D)mv(0,1)}
// Draw all 16 cells: work out the top-left corner of each cell.
g.map((v,k)=>{let x=22+k%4*52,y=24+(k>>2)*52;
// The tile square, in the color of its value (dark when empty).
r(x,y,48,48,v?CC[Math.min(v,11)]:1);
// The number on it, centered; the text gets smaller for 5+ digits.
if(v){let n=String(1<<v),z=n.length>4?2:3;t(n,x+(48-(n.length*4-1)*z)/2,y+19,0,z)}});
// The score.
t('SCORE '+sc,22,8,7,2);
// Show GAME OVER.
if(over)t('GAME OVER',48,112,8,3)
}
