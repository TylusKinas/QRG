/* Context-mixing (CM) bit predictor. Integer math only -> encoder and decoder are bit-identical everywhere. */
const SQT=[1,2,3,6,10,16,27,45,73,120,194,310,488,747,1101,1546,2047,2549,2994,3348,3607,3785,3901,3975,4022,4050,4068,4079,4085,4089,4092,4093,4094];
const sq=d=>{if(d>2047)return 4095;if(d<-2047)return 0;const w=d&127;d=(d>>7)+16;return(SQT[d]*(128-w)+SQT[d+1]*w+64)>>7};
const ST=new Int16Array(4096);
{let p=0;for(let x=-2047;x<=2047;x++){const v=sq(x);for(let i=p;i<=v;i++)ST[i]=x;p=v+1}for(let i=p;i<4096;i++)ST[i]=2047}
const ORD=[0,1,2,3,4,6,8],NI=7,TB=22,REC=[];
for(let n=0;n<64;n++)REC.push(Math.floor(32768/(n+1.6)));
function Model(){
 const pr=new Uint16Array(1<<TB).fill(32768),cn=new Uint8Array(1<<TB),w=new Int32Array(256*NI).fill(24000),
 ix=new Int32Array(NI),sv=new Int32Array(NI),h=new Int32Array(NI),hist=[];
 let c0=1,pm=2048,wb=0;
 const ctx=()=>{for(let k=0;k<NI;k++){let a=k+1;for(let j=1;j<=ORD[k];j++)a=Math.imul(a^((hist[hist.length-j]|0)+1),0x1000193);h[k]=a}};
 ctx();
 return{
  p(){let d=0;wb=c0*NI;
   for(let k=0;k<NI;k++){const i=Math.imul(h[k]^Math.imul(c0,0x9E3779B1),0x2545F491)>>>(32-TB);ix[k]=i;sv[k]=ST[pr[i]>>4];d+=sv[k]*w[wb+k]}
   d=Math.floor(d/65536);pm=sq(d>2047?2047:d<-2047?-2047:d);return pm<1?1:pm>4095?4095:pm},
  u(y){const e=(y<<12)-pm;
   for(let k=0;k<NI;k++){w[wb+k]+=(sv[k]*e)>>10;const i=ix[k],n=cn[i];pr[i]+=(((y?65535:0)-pr[i])*REC[n])>>15;if(n<12)cn[i]=n+1}
   c0=c0*2+y;if(c0>=256){hist.push(c0&255);c0=1;ctx()}}
 }
}
