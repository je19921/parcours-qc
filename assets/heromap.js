/* ============================================================
   Hero: the map of Québec as a constellation.
   Base geography is painted once to an offscreen buffer;
   each frame only re-draws the pins, so it stays at 60fps.
   ============================================================ */
const QC=[[51.3,-79.52],[47.55,-79.52],[47.10,-79.30],[46.60,-78.70],[46.20,-77.70],[45.85,-76.90],
[45.60,-76.20],[45.45,-75.72],[45.50,-75.05],[45.62,-74.60],[45.55,-74.42],[45.20,-74.36],[45.005,-74.34],
[45.005,-71.51],[45.24,-70.98],[45.65,-70.72],[46.10,-70.45],[46.42,-70.28],[46.70,-70.06],[47.10,-69.55],
[47.45,-69.24],[47.32,-68.55],[47.60,-68.15],[47.88,-67.75],[48.05,-66.95],[48.00,-66.45],[48.06,-66.10],
[48.09,-65.60],[48.13,-65.00],[48.30,-64.45],[48.52,-64.22],[48.78,-64.16],[48.95,-64.35],[49.60,-62.10],
[50.30,-60.6],[51.3,-60.6]];
const STL=[[45.30,-74.60,.055],[45.36,-74.20,.062],[45.42,-73.90,.070],[45.48,-73.58,.038],
[45.72,-73.26,.046],[46.05,-73.08,.090],[46.24,-72.80,.055],[46.36,-72.55,.048],[46.60,-72.00,.050],
[46.80,-71.20,.048],[47.05,-70.72,.105],[47.35,-70.30,.150],[47.65,-69.90,.185],[48.05,-69.30,.225],
[48.42,-68.52,.280],[48.82,-67.50,.350],[49.15,-66.30,.430],[49.45,-65.20,.520]];
const OTT=[[45.90,-77.60,.030],[45.60,-76.60,.032],[45.45,-75.90,.032],[45.47,-75.40,.034],
[45.55,-75.00,.036],[45.62,-74.60,.040],[45.45,-74.30,.050],[45.34,-74.18,.055]];
const SAG=[[48.55,-71.70,.035],[48.50,-71.20,.030],[48.42,-70.60,.032],[48.30,-70.00,.038],[48.15,-69.72,.045]];
const GULF=[[49.45,-65.30],[49.72,-64.20],[49.95,-62.60],[50.15,-61.00],[50.3,-60.6],[46.9,-60.6],
[47.20,-62.60],[47.75,-64.10],[48.30,-64.55],[48.78,-64.30],[49.05,-64.75],[49.22,-65.10]];
const LAKES=[[48.60,-72.05,.34,.30]];
const HERO_CITIES=[["Montréal",45.508,-73.567],["Québec",46.813,-71.208],["Gatineau",45.477,-75.701],
["Sherbrooke",45.404,-71.888],["Trois-Rivières",46.343,-72.542],["Saguenay",48.428,-71.068],
["Rimouski",48.449,-68.523],["Gaspé",48.831,-64.487]];

function makeHeroMap(canvas, courses, opts){
  const o=Object.assign({pinColor:'#E8B558',glow:'#F2C87A',live:'#43D08E'},opts||{});
  const ctx=canvas.getContext('2d');
  let W=0,H=0,DPR=1,base=null,view={s:1,tx:0,ty:0};
  let pins=[],t0=0,raf=null,drift={x:0,y:0},target={x:0,y:0};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mx=l=>(l+180)/360;
  const my=l=>{const s=Math.sin(l*Math.PI/180);return .5-Math.log((1+s)/(1-s))/(4*Math.PI)};
  const px=(lat,lng)=>[mx(lng)*view.s+view.tx, my(lat)*view.s+view.ty];

  function fit(){
    /* Anchor on the Montréal–Québec corridor and park it in the open right
       half, so the densest part of the constellation is never under the
       headline. Scale is set from the longitude span we want visible. */
    const narrow=W<820;
    const spanDeg=narrow?9.5:7.2;
    view.s=(W*(narrow?0.92:0.62))/(spanDeg/360);
    const aLat=narrow?46.6:46.0, aLng=narrow?-72.4:-73.2;
    const ax=narrow?0.5:0.68, ay=narrow?0.46:0.54;
    view.tx=W*ax-mx(aLng)*view.s;
    view.ty=H*ay-my(aLat)*view.s;
  }
  function poly(c,pts,close){
    c.beginPath();
    pts.forEach((p,i)=>{const[x,y]=px(p[0],p[1]); i?c.lineTo(x,y):c.moveTo(x,y)});
    if(close)c.closePath();
  }
  function ribbon(c,line){
    const up=[],dn=[];
    line.forEach(p=>{up.push([p[0]+p[2],p[1]]);dn.unshift([p[0]-p[2],p[1]])});
    poly(c,up.concat(dn),true);
  }

  function paintBase(){
    base=document.createElement('canvas');
    base.width=canvas.width; base.height=canvas.height;
    const c=base.getContext('2d');
    c.setTransform(DPR,0,0,DPR,0,0);

    /* land: barely there, a shape you feel more than see */
    poly(c,QC,true);
    const lg=c.createLinearGradient(0,0,W,H);
    lg.addColorStop(0,'#122318'); lg.addColorStop(1,'#0b1712');
    c.fillStyle=lg; c.fill();
    c.save();
    c.strokeStyle='rgba(232,181,88,.26)'; c.lineWidth=1.1; c.stroke();
    c.restore();

    /* water, lit from within */
    c.save();
    c.shadowColor='rgba(42,111,138,.5)'; c.shadowBlur=Math.min(W,H)*.012;
    c.fillStyle='#0e2c3c';
    [STL,OTT,SAG].forEach(l=>{ribbon(c,l);c.fill()});
    poly(c,GULF,true); c.fill();
    LAKES.forEach(L=>{
      const[x,y]=px(L[0],L[1]); const[x2,y2]=px(L[0]-L[2],L[1]+L[3]);
      const rx=Math.abs(x2-x), ry=Math.abs(y2-y);
      /* an irregular shore reads as a lake; a perfect ellipse reads as a bug */
      c.beginPath();
      for(let i=0;i<=14;i++){
        const a=i/14*Math.PI*2, k=.82+((i*7)%5)*.055;
        const pxx=x+Math.cos(a)*rx*k, pyy=y+Math.sin(a)*ry*k;
        i?c.lineTo(pxx,pyy):c.moveTo(pxx,pyy);
      }
      c.closePath(); c.fill();
    });
    c.restore();
    /* a bright thread down the middle of the seaway */
    c.save();
    c.strokeStyle='rgba(126,206,236,.42)'; c.lineWidth=1.5;
    c.beginPath();
    STL.forEach((p,i)=>{const[x,y]=px(p[0],p[1]); i?c.lineTo(x,y):c.moveTo(x,y)});
    c.stroke(); c.restore();

    /* cities: quiet reference points, never competing with the courses */
    c.font='500 10px "IBM Plex Mono", monospace';
    c.textBaseline='top'; c.textAlign='center';
    HERO_CITIES.forEach(([name,lat,lng])=>{
      const[x,y]=px(lat,lng);
      c.beginPath(); c.arc(x,y,1.6,0,7); c.fillStyle='rgba(140,163,148,.65)'; c.fill();
      c.fillStyle='rgba(140,163,148,.5)';
      c.fillText(name.toUpperCase(),x,y+6);
    });
  }

  function layout(){
    pins=courses.map((cse,i)=>{
      const[x,y]=px(cse.lat,cse.lng);
      /* Un seul état : le parcours est au registre. Rien d'autre n'est
         connu de façon fiable, donc rien d'autre n'est encodé ici. */
      return {x,y,course:cse,
        delay:420+i*14+((i*37)%9)*40,
        tw:(i*2654435761%1000)/1000*Math.PI*2};
    });
    /* constellation links: nearest neighbour within reach, drawn once */
    pins.forEach((p,i)=>{
      let best=null,bd=1e9;
      for(let j=0;j<pins.length;j++){
        if(j===i)continue;
        const d=Math.hypot(pins[j].x-p.x,pins[j].y-p.y);
        if(d<bd&&d>2){bd=d;best=j}
      }
      p.link=(bd<Math.min(W,H)*0.085)?best:null;
      p.linkD=bd;
    });
  }

  function frame(now){
    if(!t0)t0=now;
    const el=now-t0;
    drift.x+=(target.x-drift.x)*.05;
    drift.y+=(target.y-drift.y)*.05;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(drift.x*DPR,drift.y*DPR);
    ctx.drawImage(base,0,0);
    ctx.setTransform(DPR,0,0,DPR,drift.x*DPR,drift.y*DPR);

    /* links fade in behind the pins */
    ctx.lineWidth=.7;
    pins.forEach(p=>{
      if(p.link==null)return;
      const a=Math.min(1,Math.max(0,(el-p.delay-500)/900));
      if(a<=0)return;
      const q=pins[p.link];
      ctx.strokeStyle=`rgba(232,181,88,${.13*a})`;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
    });

    pins.forEach(p=>{
      const since=el-p.delay;
      if(since<0)return;
      const ign=Math.min(1,since/460);
      const ease=1-Math.pow(1-ign,3);
      const tw=reduce?1:.82+Math.sin(el/900+p.tw)*.18;
      const col=o.pinColor;
      const rad=2.6*ease*tw;

      /* the ignition flare, then it settles */
      if(since<560){
        const f=1-since/560;
        ctx.beginPath(); ctx.arc(p.x,p.y,rad+14*f,0,7);
        ctx.fillStyle=`rgba(242,200,122,${.20*f*f})`; ctx.fill();
      }
      ctx.save();
      ctx.shadowColor=o.glow;
      ctx.shadowBlur=13*tw;
      ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,7);
      ctx.fillStyle=col; ctx.globalAlpha=ease;
      ctx.fill(); ctx.restore();
    });

    ctx.restore();
    if(el<60000||!reduce) raf=requestAnimationFrame(frame);
  }

  function resize(){
    const r=canvas.getBoundingClientRect();
    DPR=Math.min(2,window.devicePixelRatio||1);
    W=r.width; H=r.height;
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    fit(); paintBase(); layout();
  }

  canvas.addEventListener('pointermove',e=>{
    if(reduce)return;
    const r=canvas.getBoundingClientRect();
    target.x=((e.clientX-r.left)/r.width-.5)*-16;
    target.y=((e.clientY-r.top)/r.height-.5)*-10;
  });
  canvas.addEventListener('pointerleave',()=>{target.x=0;target.y=0});

  resize();
  addEventListener('resize',()=>{cancelAnimationFrame(raf);t0=0;resize();raf=requestAnimationFrame(frame)});
  raf=requestAnimationFrame(frame);
  return {replay(){t0=0}};
}
