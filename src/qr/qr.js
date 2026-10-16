/* QR encoder: byte + alphanumeric segments, error correction level L, versions 1-40.
   QR(segs) takes [['b',[bytes]],['a','ALNUM TEXT']] and returns {size, M (matrix of 0/1), v (version)}. */
const A45='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';   // QR alphanumeric alphabet
function QR(segs){
 const EC=[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30];
 const NB=[0,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25];
 const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const a=(v/7|0)+2;r-=(25*a-10)*a-55;if(v>=7)r-=36}return r};
 const dcw=v=>(raw(v)>>3)-EC[v]*NB[v],cc=(m,v)=>m=='a'?(v<10?9:v<27?11:13):(v<10?8:16),
 len=v=>segs.reduce((s,[m,d])=>s+4+cc(m,v)+(m=='a'?11*(d.length>>1)+6*(d.length&1):8*d.length),0);
 let v=1;for(;;v++){if(v>40)throw Error('game too large (QR limit ~2900 B)');if(len(v)<=dcw(v)*8)break}
 const bits=[],put=(x,l)=>{for(let i=l-1;i>=0;i--)bits.push(x>>i&1)};
 for(const[m,d]of segs){const n=d.length;put(m=='a'?2:4,4);put(n,cc(m,v));
  if(m=='a')for(let i=0;i<n;i+=2)i+1<n?put(A45.indexOf(d[i])*45+A45.indexOf(d[i+1]),11):put(A45.indexOf(d[i]),6);
  else d.forEach(b=>put(b,8))}
 const cap=dcw(v)*8;put(0,Math.min(4,cap-bits.length));while(bits.length&7)bits.push(0);
 for(let p=0xEC;bits.length<cap;p^=0xFD)put(p,8);
 let data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(''),2));
 const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
 const ne=EC[v],nb=NB[v],rc=raw(v)>>3,ns=nb-rc%nb,sl=Math.floor(rc/nb);
 const div=Array(ne).fill(0);div[ne-1]=1;
 for(let i=0,root=1;i<ne;i++){for(let j=0;j<ne;j++){div[j]=mul(div[j],root);if(j+1<ne)div[j]^=div[j+1]}root=mul(root,2)}
 const blocks=[];
 for(let i=0,k=0;i<nb;i++){
  const d=data.slice(k,k+sl-ne+(i<ns?0:1));k+=d.length;
  const res=Array(ne).fill(0);
  for(const b of d){const f=b^res.shift();res.push(0);div.forEach((c,j)=>res[j]^=mul(c,f))}
  if(i<ns)d.push(0);blocks.push(d.concat(res))}
 const out=[];
 for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!=sl-ne||j>=ns)out.push(b[i])});
 const size=v*4+17,M=[],F=[];
 for(let i=0;i<size;i++){M.push(Array(size).fill(0));F.push(Array(size).fill(0))}
 const set=(x,y,d)=>{M[y][x]=d?1:0;F[y][x]=1};
 for(let i=0;i<size;i++){set(6,i,i%2==0);set(i,6,i%2==0)}
 for(const[cx,cy]of[[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;
  if(x>=0&&x<size&&y>=0&&y<size)set(x,y,d!=2&&d!=4)}
 if(v>1){const na=(v/7|0)+2,step=v==32?26:Math.ceil((v*4+4)/(na*2-2))*2,pos=[6];
  for(let p=size-7;pos.length<na;p-=step)pos.splice(1,0,p);
  pos.forEach((a,i)=>pos.forEach((b,j)=>{
   if(i==0&&j==0||i==0&&j==na-1||i==na-1&&j==0)return;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!=1)}))}
 const fmt=mk=>{const d=(1<<3)|mk;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);
  const b=((d<<10)|r)^0x5412,g=i=>(b>>>i)&1;
  for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));
  for(let i=9;i<15;i++)set(14-i,8,g(i));
  for(let i=0;i<8;i++)set(size-1-i,8,g(i));
  for(let i=8;i<15;i++)set(8,size-15+i,g(i));
  set(8,size-8,1)};
 fmt(0);
 if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(v<<12)|r;
  for(let i=0;i<18;i++){const c=(b>>>i)&1,a=size-11+i%3,q=i/3|0;set(a,q,c);set(q,a,c)}}
 for(let i=0,right=size-1;right>=1;right-=2){if(right==6)right=5;
  for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){
   const x=right-j,y=((right+1)&2)==0?size-1-vert:vert;
   if(!F[y][x]&&i<out.length*8){M[y][x]=(out[i>>>3]>>>(7-(i&7)))&1;i++}}}
 const cond=[(x,y)=>(x+y)%2==0,(x,y)=>y%2==0,(x,y)=>x%3==0,(x,y)=>(x+y)%3==0,(x,y)=>((x/3|0)+(y/2|0))%2==0,
  (x,y)=>x*y%2+x*y%3==0,(x,y)=>(x*y%2+x*y%3)%2==0,(x,y)=>((x+y)%2+x*y%3)%2==0];
 const mask=m=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!F[y][x]&&cond[m](x,y))M[y][x]^=1};
 const pen=()=>{let p=0;
  for(let t=0;t<2;t++)for(let a=0;a<size;a++){let run=1;for(let b=1;b<size;b++){
   const c=t?M[b][a]:M[a][b],d=t?M[b-1][a]:M[a][b-1];
   if(c==d){run++;if(run==5)p+=3;else if(run>5)p++}else run=1}}
  for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const c=M[y][x];if(c==M[y][x+1]&&c==M[y+1][x]&&c==M[y+1][x+1])p+=3}
  let dk=0;M.forEach(r=>r.forEach(c=>dk+=c));
  return p+Math.floor(Math.abs(dk*20-size*size*10)/(size*size))*10};
 let best=0,bp=1e9;
 for(let m=0;m<8;m++){mask(m);fmt(m);const p=pen();if(p<bp)bp=p,best=m;mask(m)}
 mask(best);fmt(best);
 return{size,M,v}
}
function drawQR(cv,q,sc){
 const n=q.size+8;sc=sc||Math.max(2,Math.ceil(640/n));cv.width=cv.height=n*sc;const x=cv.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,n*sc,n*sc);x.fillStyle='#000';
 q.M.forEach((r,y)=>r.forEach((c,xx)=>c&&x.fillRect((xx+4)*sc,(y+4)*sc,sc,sc)))
}
