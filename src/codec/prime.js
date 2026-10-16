/* Shared dictionary the compressor is "primed" with before coding a game.
 * It holds typical patterns of the QRG language and library: NOT the text of the demo games, so the
 * QR sizes reported for them are what a brand-new game costs.
 * !! Changing this text (or the model in cm.js, or the alphabet in base43.js) changes the wire format:
 *    QR codes made before the change will no longer decode. Bump the hosting URL when you do. */
const PRIME = `let x=0,y=0,v=0,n=0,T=0,sc=0,lv=3,over=0,g,c,E=[],B=[];
const init=()=>{x=120;y=100;sc=T=over=0;lv=3};
init();
return i=>{
cls(NAVY);
r(0,0,W,H,0);
if(i.l)x-=2;if(i.r)x+=2;if(i.u)y-=2;if(i.d)y+=2;
if(i.L&&ok(c,px-1,py))px--;
if(i.A||i.S)init();
if(i.C&&tap(0,0,64,64))sc++;
if(over){if(i.A||i.S)init()}
else{T++;
E=E.filter(e=>{e[1]+=v;if(Math.abs(e[0]-x)<9&&Math.abs(e[1]-y)<8){s(100);return 0}return e[1]<H});
B=B.filter(b=>(b[1]-=4)>0);
B.map(b=>r(b[0],b[1],2,6,7));
g.map((v,j)=>v&&r(40+j%10*10,20+(j/10|0)*10,10,10,v));
x=Math.max(8,Math.min(W-24,x));
for(let y=0;y<H;y+=12)r(127,y,2,6,5);
d([60,126,255,255,126,102,102,0],x,y,7,2);
d(SP.heart,x,y,RED,2);
t('SCORE '+sc,4,4,7);t('LIVES '+lv,200,4,7);t(sc,160,34,10);
tc('GAME OVER',100,RED,2);
if(btn('PLAY',90,100,76,24))init();
}
const kPlayer=kind(SP.smile,YELLOW,2),kCoin=kind(SP.coin,ORANGE,2);
add(kCoin,R(W),0,{vy:2});
touch(kPlayer,kCoin,(a,b)=>{kill(b);score++;s(800)});
each(kCoin,a=>{if(a.y>H)kill(a)});
if(every(60))add(kCoin,R(W-16),-16,{vy:1.5});
step();draw();clear();
const map=grid(16,11,0);const D=flood(16,11,ux,uy,3,(x,y)=>map[y*16+x]==1?2:map[y*16+x]>1?null:1);
for(let y=0;y<11;y++)for(let x=0;x<16;x++){}
save('best',score);best=load('best',0);Date.now()/1000;mel([523,659,784,1047],120);
s(500);R(10);rr(1,6);pick(a);Math.min(Math.max(0,x),W);Math.floor(Math.random()*n);
b.some(a=>a[0]==X&&a[1]==Y);a.find(u=>u.x==x&&u.y==y);.forEach(.slice().length`;
