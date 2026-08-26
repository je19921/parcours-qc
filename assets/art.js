/* ============================================================
   Generative course art — golden-hour aerials + region scenes
   Deterministic per course id, so a course always looks itself.
   ============================================================ */
const artCache=new Map();
let NOISE=null;
function noisePattern(x){
  if(NOISE)return NOISE;
  const n=document.createElement('canvas'); n.width=n.height=90;
  const g=n.getContext('2d'), im=g.createImageData(90,90), d=im.data;
  let s=20260824;
  for(let i=0;i<d.length;i+=4){
    s=(s*1103515245+12345)&0x7fffffff;
    const v=132+((s>>7)%124);
    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  g.putImageData(im,0,0);
  NOISE=x.createPattern(n,'repeat');
  return NOISE;
}
function rnd(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function shade(hex,k){
  const n=parseInt(hex.slice(1),16);
  const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));
  return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;
}
function blob(x,cx,cy,rx,ry,r,n,wob){
  n=n||9; wob=wob==null?.34:wob;
  const pts=[];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2, k=1-wob/2+r()*wob;
    pts.push([cx+Math.cos(a)*rx*k, cy+Math.sin(a)*ry*k]);
  }
  x.beginPath();
  for(let i=0;i<n;i++){
    const p=pts[i],q=pts[(i+1)%n],m=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    i?x.quadraticCurveTo(p[0],p[1],m[0],m[1]):x.moveTo(m[0],m[1]);
  }
  const p0=pts[0],q0=pts[1];
  x.quadraticCurveTo(p0[0],p0[1],(p0[0]+q0[0])/2,(p0[1]+q0[1])/2);
  x.closePath();
}
function bez(p0,p1,p2,p3,t){
  const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;
  return [a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0], a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]];
}
/* long raking shadows are what make a low-sun aerial read as photographic */
function canopy(x,cx,cy,rad,r,tint,sun){
  const k=.78+r()*.44;
  x.fillStyle='rgba(6,16,10,.42)';
  x.beginPath();
  x.ellipse(cx+rad*sun*1.5,cy+rad*.55,rad*1.5,rad*.52,0,0,7);
  x.fill();
  const g=x.createRadialGradient(cx-rad*.42*sun,cy-rad*.46,rad*.06,cx,cy,rad*1.1);
  g.addColorStop(0,shade(tint[0],k*1.14));
  g.addColorStop(.55,shade(tint[1],k));
  g.addColorStop(1,shade(tint[2],k*.9));
  x.fillStyle=g;
  blob(x,cx,cy,rad,rad*(.84+r()*.2),r,7,.5); x.fill();
}

function aerial(course,w,h){
  const key='a'+course.id+'_'+w+'x'+h;
  if(artCache.has(key))return artCache.get(key);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const cv=document.createElement('canvas');
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const x=cv.getContext('2d'); x.scale(dpr,dpr);
  const r=rnd(course.id*2654435761+17);
  const S=Math.min(w,h);
  const sun=r()<.5?-1:1;               /* light from the left or the right */
  /* Rotate and overscan the whole composition — otherwise every hole in the
     grid runs along the same diagonal and the set reads as wallpaper. */
  const rot=(r()-.5)*0.72, zoom=1.08+r()*0.14;
  x.translate(w/2,h/2); x.rotate(rot); x.scale(zoom,zoom); x.translate(-w/2,-h/2);

  const kind=r();
  const links=kind<.18, boreal=kind>.76;
  const P=links
    ? {r1:'#7d7e40',r2:'#4e5029',f1:'#a9a25c',f2:'#807b43',g1:'#c3bf76',t:['#5c6a36',   '#374725','#1e2915']}
    : boreal
    ? {r1:'#2f5626',r2:'#153313',f1:'#5c8c37',f2:'#3d6624',g1:'#83b64d',t:['#2e5129','#163218','#0a1d0e']}
    : {r1:'#3f6c2e',r2:'#234c1d',f1:'#6e9c40',f2:'#4c7a2b',g1:'#94c053',t:['#4c7d34','#24461d','#101f10']};

  let g=x.createLinearGradient(sun<0?0:w,0,sun<0?w*.7:w*.3,h);
  g.addColorStop(0,shade(P.r1,1.08)); g.addColorStop(1,P.r2);
  x.fillStyle=g; x.fillRect(-w,-h,w*3,h*3);
  for(let i=0;i<20;i++){
    x.globalAlpha=.02+r()*.032;
    x.fillStyle=r()<.4?'#f2f6d8':'#06180c';
    blob(x,r()*w,r()*h,w*(.16+r()*.3),h*(.16+r()*.3),r,7,.62); x.fill();
  }
  x.globalAlpha=1;

  /* the hole: tee left, green right, with a dog-leg */
  const teeY=h*(.36+r()*.3), grnY=h*(.3+r()*.36);
  const p0=[w*.05,teeY], p3=[w*.85,grnY];
  const p1=[w*.34,teeY+(r()-.5)*h*.44];
  const p2=[w*.62,grnY+(r()-.5)*h*.44];
  const N=46, pts=[];
  for(let i=0;i<=N;i++)pts.push(bez(p0,p1,p2,p3,i/N));
  const fw=S*(.105+r()*.05);

  const stroke=(width,style,alpha)=>{
    x.save(); x.globalAlpha=alpha==null?1:alpha;
    x.lineWidth=width; x.lineCap='round'; x.lineJoin='round'; x.strokeStyle=style;
    x.beginPath(); pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1])); x.stroke();
    x.restore();
  };
  stroke(fw*1.7,P.f2,.5);
  x.save(); x.shadowColor='rgba(6,22,10,.5)'; x.shadowBlur=S*.055; x.shadowOffsetY=1.5;
  stroke(fw*1.02,P.f2); x.restore();
  x.save(); x.lineCap='butt'; x.lineJoin='round'; x.lineWidth=fw;
  for(let i=0;i<N;i++){
    x.strokeStyle=(i>>1)%2?P.f1:P.f2;
    x.beginPath(); x.moveTo(pts[i][0],pts[i][1]); x.lineTo(pts[i+1][0],pts[i+1][1]); x.stroke();
  }
  x.restore();
  stroke(fw*.38,'#fff6d8',.11);

  if(r()<.7){
    x.save(); x.globalAlpha=.42; x.lineWidth=Math.max(1,S*.011); x.lineCap='round';
    x.strokeStyle='#ded5bd'; x.beginPath();
    pts.forEach((p,i)=>{
      const q=pts[Math.min(N,i+1)], dx=q[0]-p[0], dy=q[1]-p[1], L=Math.hypot(dx,dy)||1;
      const ox=-dy/L*fw*.98, oy=dx/L*fw*.98;
      i?x.lineTo(p[0]+ox,p[1]+oy):x.moveTo(p[0]+ox,p[1]+oy);
    });
    x.stroke(); x.restore();
  }

  x.save(); x.translate(p0[0],p0[1]); x.rotate((r()-.5)*.45);
  x.globalAlpha=.82; x.fillStyle=P.g1; x.fillRect(-S*.04,-S*.026,S*.08,S*.052); x.restore();

  if(r()<.44){
    const t=.34+r()*.4, wp=bez(p0,p1,p2,p3,t);
    const side=r()<.5?-1:1;
    const wx=wp[0]+(r()-.25)*w*.05, wy=wp[1]+side*fw*(1.6+r()*.8);
    x.save(); x.shadowColor='rgba(4,20,32,.6)'; x.shadowBlur=S*.055;
    const wg=x.createLinearGradient(wx,wy-S*.1,wx,wy+S*.1);
    wg.addColorStop(0,'#6fa9c2'); wg.addColorStop(.5,'#3a7a97'); wg.addColorStop(1,'#245b76');
    x.fillStyle=wg; blob(x,wx,wy,S*.15,S*.09,r,9,.46); x.fill(); x.restore();
    /* sun glint on the water — the detail that sells low light */
    x.save(); x.globalAlpha=.5; x.fillStyle='#ffe9b0';
    blob(x,wx-sun*S*.05,wy-S*.02,S*.05,S*.012,rnd(course.id*7+3),7,.7); x.fill(); x.restore();
  }

  const bunker=(bx,by,rx,ry,seed)=>{
    x.save(); x.shadowColor='rgba(18,30,8,.5)'; x.shadowBlur=S*.03; x.shadowOffsetY=1;
    const bg=x.createLinearGradient(bx,by-ry,bx,by+ry);
    bg.addColorStop(0,'#f7ecca'); bg.addColorStop(1,'#dcc99b');
    x.fillStyle=bg; blob(x,bx,by,rx,ry,rnd(seed),9,.5); x.fill(); x.restore();
    x.save(); x.globalAlpha=.34; x.fillStyle='#8e7c50';
    blob(x,bx+sun*rx*.14,by+ry*.2,rx*.78,ry*.55,rnd(seed+9),9,.5); x.fill(); x.restore();
  };
  const nb=1+Math.floor(r()*3);
  for(let i=0;i<nb;i++){
    const a=Math.PI*(.3+r()*1.35);
    bunker(p3[0]+Math.cos(a)*S*.17, p3[1]+Math.sin(a)*S*.14, S*(.055+r()*.028), S*(.04+r()*.02), course.id*100+i);
  }
  if(r()<.55){
    const t=.4+r()*.28, fp=bez(p0,p1,p2,p3,t);
    bunker(fp[0], fp[1]+(r()<.5?-1:1)*fw*.95, S*.045, S*.032, course.id*200+3);
  }

  x.save(); x.globalAlpha=.5; x.fillStyle=P.f2;
  blob(x,p3[0],p3[1],S*.15,S*.12,rnd(course.id*13),11,.2); x.fill(); x.restore();
  const gg=x.createRadialGradient(p3[0]-sun*S*.05,p3[1]-S*.04,S*.01,p3[0],p3[1],S*.145);
  gg.addColorStop(0,'#c6e493'); gg.addColorStop(1,P.g1);
  x.fillStyle=gg; blob(x,p3[0],p3[1],S*.12,S*.094,rnd(course.id*13),11,.16); x.fill();
  const px=p3[0]+(r()-.5)*S*.08, py=p3[1]+(r()-.5)*S*.05;
  x.save(); x.strokeStyle='rgba(255,255,255,.95)'; x.lineWidth=Math.max(1,S*.011);
  x.beginPath(); x.moveTo(px,py); x.lineTo(px,py-S*.125); x.stroke(); x.restore();
  x.fillStyle='#e2503a';
  x.beginPath(); x.moveTo(px,py-S*.125); x.lineTo(px+S*.052,py-S*.104); x.lineTo(px,py-S*.085); x.closePath(); x.fill();

  const band=(edge)=>{
    const n=Math.round(w/(S*.048));
    for(let i=0;i<=n;i++){
      const tx=(i/n)*w+(r()-.5)*S*.06;
      const depth=r();
      const ty=edge<0 ? S*(.015+depth*.15) : h-S*(.015+depth*.15);
      canopy(x,tx,ty,S*(.036+r()*.034),r,P.t,sun);
    }
  };
  band(-1); band(1);
  for(let i=0;i<3+Math.floor(r()*4);i++)
    canopy(x,w*(.12+r()*.74),h*(.14+r()*.7),S*(.028+r()*.028),r,P.t,sun);

  /* grade: low warm sun one side, cool shadow the other, haze, grain, vignette */
  x.setTransform(dpr,0,0,dpr,0,0);   /* grade in screen space, unrotated */
  g=x.createLinearGradient(sun<0?0:w,0,sun<0?w:0,h*.9);
  g.addColorStop(0,'rgba(255,206,124,.20)');
  g.addColorStop(.4,'rgba(255,206,124,.02)');
  g.addColorStop(1,'rgba(4,20,30,.34)');
  x.fillStyle=g; x.fillRect(0,0,w,h);
  x.save(); x.globalAlpha=.075; x.globalCompositeOperation='overlay';
  x.fillStyle=noisePattern(x); x.fillRect(0,0,w,h); x.restore();
  /* crush the corners hard: it is what makes the tile sit into the dark page */
  g=x.createRadialGradient(w/2,h*.44,Math.min(w,h)*.18,w/2,h/2,Math.max(w,h)*.68);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(.62,'rgba(3,12,7,.30)');
  g.addColorStop(1,'rgba(3,12,7,.74)');
  x.fillStyle=g; x.fillRect(0,0,w,h);

  const url=cv.toDataURL('image/jpeg',.85);
  artCache.set(key,url);
  return url;
}

/* Wide landscape for region cards: rolling Québec hills over a river valley
   at first light. Not alpine — the Appalachian and Laurentian country is low,
   soft and forested, and pointy peaks read as generic mountain clip-art. */
function region(seed,w,h){
  const key='r'+seed+'_'+w+'x'+h;
  if(artCache.has(key))return artCache.get(key);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const cv=document.createElement('canvas');
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const x=cv.getContext('2d'); x.scale(dpr,dpr);
  const r=rnd(seed*40503+7);

  const warm=r();
  const horizon=h*(0.36+r()*0.12);
  const sunX=w*(.14+r()*.72);
  const sunY=horizon-h*(0.01+r()*0.05);

  /* sky */
  let g=x.createLinearGradient(0,0,0,horizon+h*.06);
  g.addColorStop(0, warm<.5?'#16293f':'#1d2a3c');
  g.addColorStop(.46,'#4d4a55');
  g.addColorStop(.76, warm<.5?'#b8794b':'#c98a52');
  g.addColorStop(1, warm<.5?'#eab873':'#f2c887');
  x.fillStyle=g; x.fillRect(0,0,w,horizon+h*.08);

  g=x.createRadialGradient(sunX,sunY,0,sunX,sunY,h*.55);
  g.addColorStop(0,'rgba(255,240,198,.98)');
  g.addColorStop(.16,'rgba(255,212,136,.62)');
  g.addColorStop(1,'rgba(255,190,110,0)');
  x.fillStyle=g; x.fillRect(0,0,w,horizon+h*.1);
  x.beginPath(); x.arc(sunX,sunY,h*.038,0,7);
  x.fillStyle='rgba(255,249,224,.97)'; x.fill();

  /* a smooth ridge: three sines, never a triangle */
  const ridgeY=(px,i,amp,phase)=>
    Math.sin(px*0.0042+phase)*amp
    + Math.sin(px*0.0111+phase*1.7)*amp*0.42
    + Math.sin(px*0.0263+phase*2.6)*amp*0.16;

  const layers=5+Math.floor(r()*3);
  const water = r()<.62;
  const waterTop = horizon+h*(0.30+r()*0.16);

  for(let L=0;L<layers;L++){
    const t=L/(layers-1);
    const baseY=horizon+h*(0.02+t*0.42);
    if(water && baseY>waterTop) continue;      /* ridges stop at the valley floor */
    const amp=h*(0.090-t*0.048)+h*0.016;
    const phase=r()*Math.PI*2;
    x.beginPath(); x.moveTo(0,h); x.lineTo(0,baseY);
    for(let px=0;px<=w;px+=4) x.lineTo(px, baseY - ridgeY(px,L,amp,phase));
    x.lineTo(w,h); x.closePath();
    const k=.24+t*.62;
    const lg=x.createLinearGradient(0,baseY-amp*1.4,0,baseY+h*.3);
    lg.addColorStop(0,`rgb(${Math.round(40+k*74)},${Math.round(58+k*76)},${Math.round(48+k*56)})`);
    lg.addColorStop(1,`rgb(${Math.round(14+k*38)},${Math.round(28+k*46)},${Math.round(22+k*34)})`);
    x.fillStyle=lg; x.fill();
    /* haze in the fold behind each ridge is what builds depth */
    x.save(); x.globalAlpha=.26-t*.17;
    const hz=x.createLinearGradient(0,baseY-amp*1.5,0,baseY+amp*1.8);
    hz.addColorStop(0,'rgba(255,214,158,.9)'); hz.addColorStop(1,'rgba(255,214,158,0)');
    x.fillStyle=hz; x.fillRect(0,baseY-amp*1.6,w,amp*3.4); x.restore();
  }

  /* the St. Lawrence, or one of ten thousand lakes */
  if(water){
    const wg=x.createLinearGradient(0,waterTop,0,h);
    wg.addColorStop(0,'#b39566'); wg.addColorStop(.22,'#5c6a63'); wg.addColorStop(1,'#1d2f38');
    x.fillStyle=wg; x.fillRect(0,waterTop,w,h-waterTop);
    /* sun column on the water */
    x.save();
    const cw=w*(.05+r()*.04);
    for(let i=0;i<26;i++){
      const yy=waterTop+ (i/26)*(h-waterTop);
      const spread=cw*(1+i*0.16);
      x.globalAlpha=(1-i/26)*0.52;
      x.fillStyle='#ffe6ae';
      x.fillRect(sunX-spread/2,yy,spread,Math.max(1,(h-waterTop)/44));
    }
    x.restore();
    x.save(); x.globalAlpha=.4; x.strokeStyle='rgba(255,226,178,.7)'; x.lineWidth=1;
    x.beginPath(); x.moveTo(0,waterTop); x.lineTo(w,waterTop); x.stroke(); x.restore();
  }

  /* low, dense treeline on the nearest bank — small, never spiky */
  const treeBase = water ? waterTop : h*0.92;
  const n=Math.round(w/7);
  for(let i=0;i<n;i++){
    const tx=r()*w;
    const th=h*(0.018+r()*0.030);
    const tw=th*(0.30+r()*0.22);
    const ty=treeBase+ (r()-0.35)*h*0.012;
    x.fillStyle= r()<.5 ? 'rgba(8,20,14,.95)' : 'rgba(12,26,18,.95)';
    x.beginPath();
    x.moveTo(tx,ty-th);
    x.quadraticCurveTo(tx+tw*0.7,ty-th*0.35,tx+tw,ty);
    x.lineTo(tx-tw,ty);
    x.quadraticCurveTo(tx-tw*0.7,ty-th*0.35,tx,ty-th);
    x.closePath(); x.fill();
  }

  /* drifting mist over the valley floor */
  x.save();
  for(let i=0;i<3;i++){
    const my2=horizon+h*(0.05+i*0.07)+r()*h*.02;
    x.globalAlpha=.10+r()*.07;
    const mg=x.createLinearGradient(0,my2-h*.03,0,my2+h*.05);
    mg.addColorStop(0,'rgba(255,232,196,0)');
    mg.addColorStop(.5,'rgba(255,232,196,.85)');
    mg.addColorStop(1,'rgba(255,232,196,0)');
    x.fillStyle=mg; x.fillRect(0,my2-h*.03,w,h*.08);
  }
  x.restore();

  x.save(); x.globalAlpha=.07; x.globalCompositeOperation='overlay';
  x.fillStyle=noisePattern(x); x.fillRect(0,0,w,h); x.restore();
  g=x.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'rgba(4,12,10,.46)'); g.addColorStop(.34,'rgba(4,12,10,0)');
  g.addColorStop(1,'rgba(4,12,10,.58)');
  x.fillStyle=g; x.fillRect(0,0,w,h);

  const url=cv.toDataURL('image/jpeg',.86);
  artCache.set(key,url);
  return url;
}
