/* URL-safe variant: no space or % (43 symbols, still inside the QR alphanumeric set) */
const A43='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
const b43=o=>{let s='';for(let i=0;i<o.length;i+=2){if(i+1<o.length){const n=o[i]*256+o[i+1];s+=A43[n%43]+A43[(n/43|0)%43]+A43[n/1849|0]}else s+=A43[o[i]%43]+A43[o[i]/43|0]}return s};
const d43=s=>{const o=[];for(let i=0;i<s.length;i+=3){const a=[...s.slice(i,i+3)].map(c=>{const k=A43.indexOf(c);if(k<0)throw Error('bad symbol');return k});if(a.length==3){const n=a[0]+a[1]*43+a[2]*1849;o.push(n>>8,n&255)}else o.push(a[0]+a[1]*43)}return o};
