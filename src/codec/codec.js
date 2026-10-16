/* Codec: minify -> CM compress (primed with PRIME) -> bytes, and back.
   The compressed stream ends with a NUL terminator that is coded like any byte; trailing zero bytes are dropped. */
const U8=new TextEncoder(),D8=new TextDecoder();
const mkm=()=>{const m=Model();for(const b of U8.encode(PRIME))for(let i=7;i>=0;i--){m.p();m.u(b>>i&1)}return m};
const mid=(a,b,p)=>{const r=b-a;return a+Math.floor(r/4096)*p+Math.floor(r%4096*p/4096)};
function pack(s){
 const m=mkm();let x1=0,x2=4294967295;const o=[];
 for(const b of [...U8.encode(s),0])for(let i=7;i>=0;i--){
  const y=b>>i&1,xm=mid(x1,x2,m.p());y?x2=xm:x1=xm+1;m.u(y);
  while(((x1^x2)&0xff000000)==0){o.push(x2>>>24);x1=(x1<<8)>>>0;x2=((x2<<8)|255)>>>0}}
 for(let k=0;k<5;k++){const u=2**(32-8*k),v=Math.ceil(x1/u)*u;if(v<=x2){for(let j=0;j<k;j++)o.push(Math.floor(v/2**(24-8*j))&255);break}}
 while(o.length&&!o[o.length-1])o.pop();
 return o}
function unpack(o){
 const m=mkm();let i=0,x=0,x1=0,x2=4294967295;const nx=()=>o[i++]|0,B=[];
 for(let k=0;k<4;k++)x=x*256+nx();
 for(;;){let c=0;
  for(let b=0;b<8;b++){
   const xm=mid(x1,x2,m.p()),y=x<=xm?1:0;y?x2=xm:x1=xm+1;m.u(y);c=c*2+y;
   while(((x1^x2)&0xff000000)==0){x1=(x1<<8)>>>0;x2=((x2<<8)|255)>>>0;x=((x<<8)|nx())>>>0}}
  if(!c||B.length>9000)break;B.push(c)}
 return D8.decode(new Uint8Array(B))}
