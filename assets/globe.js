/* ============================================================
   L'explorateur : le même diorama que l'accueil (procédural,
   donc net à n'importe quel zoom — une vraie texture satellite
   ne l'était plus passé un certain point), vu de très loin comme
   une constellation dans le noir, qui plonge jusqu'au Québec puis
   jusqu'à la région choisie. Chaque clic sur un filtre relance un
   vol caméra automatique ; entre deux, on peut tourner et zoomer
   à la main. Un clic sur un point ouvre la même fiche que la liste.
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const wrap = document.querySelector(".globe-wrap");
const canvas = document.getElementById("globeCanvas");
const loading = document.getElementById("globeLoading");
const hint = document.getElementById("globeHint");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (wrap && canvas) {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); initExplorer(); } });
  }, { rootMargin: "400px 0px" });
  io.observe(wrap);
}

function fallback(msg) {
  if (loading) loading.classList.add("hide");
  if (wrap) {
    const p = document.createElement("p");
    p.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
      "text-align:center;padding:24px;color:var(--sage);font-size:13px;max-width:44ch;margin:0 auto";
    p.textContent = msg;
    wrap.appendChild(p);
  }
}

function initExplorer() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    fallback("Carte interactive indisponible sur cet appareil — la liste ci-dessus reste à jour.");
    return;
  }
  try { buildScene(renderer); }
  catch (e) {
    console.error("globe explorer init failed:", e);
    fallback("Carte interactive indisponible sur cet appareil — la liste ci-dessus reste à jour.");
  }
}

function buildScene(renderer) {
  const NIGHT = 0x060d0a, PINE = 0x0c1712, DAWN = 0xe8b558, EMBER = 0xf2c87a,
        MIST = 0xe9efe6, SAGE = 0x8ca394, WATER = 0x2a6f8a;
  const COURSES = window.PQ_COURSES || [];

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
  scene.add(new THREE.AmbientLight(0x2a3d30, 1.1));
  const key = new THREE.DirectionalLight(0xfbe8c2, 1.35);
  key.position.set(4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(DAWN, 0.55);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  /* ---- vraie silhouette du Québec — continent, Gaspésie et Anticosti,
     simplifiés (Douglas-Peucker, topologie préservée) depuis une
     couche administrative Canada réelle. Même projection que
     heromap.js/scene3d.js. ---- */
  const MAINLAND = [[55.281,-77.794],[56.168,-76.612],[57.344,-76.602],[58.02,-77.232],[58.63,-78.544],[58.706,-78.37],[58.908,-78.52],[58.889,-78.33],[59.407,-77.655],[59.418,-77.951],[59.547,-77.739],[59.734,-77.784],[59.58,-77.292],[59.734,-77.507],[59.809,-77.279],[60.037,-77.349],[60.118,-77.003],[60.075,-77.621],[60.178,-77.527],[60.416,-77.698],[60.537,-77.547],[60.599,-77.792],[60.836,-77.568],[60.839,-78.176],[61.102,-77.786],[61.458,-77.771],[61.589,-77.474],[61.748,-77.944],[62.297,-78.123],[62.633,-77.484],[62.346,-75.542],[62.197,-75.788],[62.347,-75.259],[62.154,-74.528],[62.301,-74.65],[62.473,-73.578],[62.161,-72.633],[62.036,-72.555],[61.869,-72.707],[61.904,-72.21],[61.751,-72.002],[61.612,-72.177],[61.676,-71.601],[61.458,-71.792],[61.419,-71.58],[61.367,-71.724],[61.27,-71.612],[61.124,-70.155],[60.855,-69.915],[61.133,-69.59],[60.937,-69.329],[60.536,-69.784],[60.257,-69.605],[60.055,-69.827],[60.104,-71.178],[59.937,-69.776],[59.615,-69.515],[59.354,-69.66],[59.311,-69.16],[59.194,-69.441],[59.091,-69.287],[58.833,-69.503],[59.046,-69.806],[58.856,-69.758],[58.717,-70.297],[58.754,-69.873],[58.602,-69.763],[58.913,-69.027],[58.841,-68.412],[58.543,-68.197],[58.108,-68.386],[57.89,-69.076],[58.088,-68.327],[58.559,-68.045],[58.513,-67.892],[58.155,-68.075],[58.457,-67.748],[57.966,-67.65],[58.236,-67.564],[58.534,-66.686],[58.869,-66.368],[58.65,-65.962],[58.384,-66.126],[58.289,-65.951],[58.372,-66.041],[58.649,-65.858],[58.832,-66.045],[58.877,-65.77],[58.926,-65.95],[59.073,-65.648],[58.976,-65.401],[59.08,-65.479],[59.134,-65.308],[59.263,-65.694],[59.224,-65.465],[59.402,-65.472],[59.323,-65.246],[59.495,-65.423],[59.532,-65.284],[59.815,-65.376],[59.838,-65.04],[60.223,-64.83],[60.135,-64.601],[60.066,-64.909],[59.941,-64.666],[59.837,-64.871],[59.562,-64.878],[59.523,-64.394],[59.397,-64.568],[59.175,-64.555],[59.026,-64.305],[59.073,-64.824],[58.926,-64.859],[58.767,-63.474],[58.693,-64.042],[58.562,-64.111],[58.474,-63.82],[58.097,-64.44],[57.764,-64.062],[57.744,-63.604],[57.27,-63.889],[57.238,-63.744],[56.88,-63.853],[56.698,-64.147],[56.447,-63.882],[56.433,-64.194],[56.222,-63.873],[56.084,-64.031],[56.028,-63.458],[55.924,-63.861],[55.789,-63.661],[55.465,-63.789],[55.386,-63.325],[55.281,-63.669],[55.245,-63.42],[54.917,-63.597],[54.945,-63.817],[54.773,-63.926],[54.632,-63.73],[54.731,-64.77],[54.953,-65.089],[54.707,-65.694],[55.335,-66.771],[54.723,-66.664],[55.073,-67.413],[54.69,-67.063],[54.493,-67.249],[54.442,-67.749],[54.21,-67.611],[54.024,-67.805],[53.838,-67.484],[53.757,-67.592],[53.419,-66.884],[53.085,-66.986],[53.127,-67.383],[52.98,-67.223],[52.893,-67.329],[52.679,-66.785],[52.943,-66.641],[52.988,-66.345],[52.617,-66.293],[52.637,-66.458],[52.371,-66.351],[52.339,-66.506],[52.17,-66.389],[52.317,-66.263],[52.054,-65.991],[52.11,-65.485],[51.838,-65.345],[51.762,-64.699],[51.582,-64.554],[51.738,-64.296],[51.993,-64.367],[52.124,-64.182],[52.731,-64.132],[52.872,-63.618],[52.659,-63.379],[52.466,-64.09],[52.316,-63.739],[52.047,-63.648],[52.001,-63.796],[52.001,-57.127],[51.446,-57.113],[51.285,-58.45],[51.046,-58.892],[50.763,-59.009],[50.229,-60.121],[50.095,-61.703],[50.288,-62.959],[50.237,-66.469],[49.923,-66.96],[49.4,-67.301],[49.037,-68.608],[48.134,-69.681],[48.353,-70.296],[48.426,-70.965],[48.051,-69.762],[47.654,-70.022],[46.83,-71.128],[46.171,-73.047],[45.437,-73.649],[45.216,-74.358],[45.306,-74.469],[45.562,-74.381],[45.639,-74.642],[45.374,-75.83],[45.524,-76.107],[45.454,-76.345],[45.555,-76.655],[45.878,-76.804],[45.782,-76.99],[46.191,-77.653],[46.326,-78.725],[47.424,-79.588],[51.424,-79.512],[51.625,-79.213],[51.161,-78.811],[51.383,-78.867],[51.51,-78.716],[51.782,-78.948],[52.272,-78.393],[53.098,-78.934],[53.29,-78.825],[53.495,-79.0],[53.552,-78.841],[53.714,-79.008],[53.991,-78.948],[54.672,-79.618],[54.891,-78.659],[55.281,-77.794]];
  const GASPE = [[47.994,-66.877],[47.946,-66.962],[47.89,-66.953],[47.933,-67.048],[47.872,-67.196],[47.89,-67.347],[47.853,-67.368],[47.913,-67.495],[47.92,-67.578],[47.946,-67.602],[48.003,-67.587],[48.004,-68.122],[47.926,-68.126],[47.924,-68.382],[47.555,-68.384],[47.425,-68.577],[47.304,-69.044],[47.27,-69.043],[47.362,-69.055],[47.418,-69.042],[47.452,-69.23],[46.666,-69.992],[46.426,-70.047],[46.335,-70.192],[46.19,-70.284],[46.137,-70.23],[46.067,-70.305],[46.053,-70.281],[45.97,-70.311],[45.945,-70.248],[45.899,-70.254],[45.79,-70.417],[45.738,-70.389],[45.717,-70.404],[45.659,-70.56],[45.566,-70.688],[45.481,-70.722],[45.392,-70.635],[45.382,-70.683],[45.425,-70.797],[45.391,-70.83],[45.355,-70.813],[45.228,-70.862],[45.23,-70.891],[45.339,-70.96],[45.343,-71.01],[45.238,-71.154],[45.293,-71.298],[45.235,-71.387],[45.236,-71.447],[45.203,-71.403],[45.117,-71.431],[45.06,-71.503],[45.013,-71.506],[44.984,-74.313],[45.004,-74.676],[45.077,-74.485],[45.138,-74.429],[45.283,-74.125],[45.427,-73.591],[45.532,-73.494],[45.761,-73.386],[46.051,-73.111],[46.182,-72.679],[46.283,-72.559],[46.571,-71.915],[46.638,-71.562],[47.0,-70.515],[47.257,-70.234],[47.332,-70.109],[47.451,-69.999],[47.521,-69.875],[47.66,-69.719],[47.817,-69.554],[47.935,-69.506],[48.129,-69.271],[48.276,-69.063],[48.664,-68.184],[48.941,-67.382],[49.211,-66.375],[49.277,-65.735],[49.276,-65.069],[49.119,-64.434],[49.036,-64.31],[48.978,-64.269],[48.924,-64.166],[48.813,-64.105],[48.776,-64.112],[48.766,-64.148],[48.836,-64.355],[48.818,-64.403],[48.637,-64.113],[48.592,-64.185],[48.565,-64.194],[48.528,-64.163],[48.405,-64.289],[48.327,-64.597],[48.237,-64.701],[48.126,-64.936],[48.074,-64.981],[47.998,-65.201],[47.999,-65.37],[48.077,-65.556],[48.146,-65.894],[48.07,-66.105],[48.07,-66.311],[48.101,-66.448],[48.066,-66.592],[48.035,-66.612],[47.994,-66.877]];
  const ANTICOSTI = [[49.184,-62.797],[49.396,-63.538],[49.448,-63.612],[49.593,-63.728],[49.739,-64.168],[49.78,-64.235],[49.779,-64.313],[49.821,-64.449],[49.845,-64.465],[49.899,-64.37],[49.913,-64.229],[49.846,-63.792],[49.821,-63.436],[49.738,-63.125],[49.668,-62.736],[49.595,-62.451],[49.504,-62.325],[49.444,-62.132],[49.38,-62.02],[49.352,-61.86],[49.147,-61.619],[49.123,-61.658],[49.092,-61.849],[49.09,-61.989],[49.131,-62.478],[49.184,-62.797]];
  const LANDMASSES = [MAINLAND, GASPE, ANTICOSTI];

  const mx = (lng) => (lng + 180) / 360;
  const my = (lat) => { const s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  LANDMASSES.forEach((ring) => ring.forEach(([lat, lng]) => {
    const x = mx(lng), y = my(lat);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }));
  const SCALE = 6.6 / (maxX - minX);
  const cx0 = (minX + maxX) / 2, cy0 = (minY + maxY) / 2;
  const toXZ = (lat, lng) => [(mx(lng) - cx0) * SCALE, (my(lat) - cy0) * -SCALE];

  const coastMat = new THREE.LineBasicMaterial({ color: DAWN, transparent: true, opacity: 0.65 });
  const landShapes = LANDMASSES.map((ring) => {
    const pts = ring.map(([lat, lng]) => { const [x, z] = toXZ(lat, lng); return new THREE.Vector3(x, 0, z); });
    const geo = new THREE.BufferGeometry().setFromPoints(pts.concat([pts[0]]));
    scene.add(new THREE.Line(geo, coastMat));
    return new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.z)));
  });

  const floorGeo = new THREE.ShapeGeometry(landShapes);
  floorGeo.rotateX(Math.PI / 2); floorGeo.translate(0, -0.02, 0);
  const floorMat = new THREE.MeshBasicMaterial({ color: PINE, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(floorGeo, floorMat));

  const grid = new THREE.GridHelper(60, 60, 0x8ca394, 0x8ca394);
  grid.position.y = -0.03; grid.material.transparent = true; grid.material.opacity = 0.06;
  scene.add(grid);

  const STL = [[45.30,-74.60],[45.36,-74.20],[45.42,-73.90],[45.48,-73.58],[45.72,-73.26],
  [46.05,-73.08],[46.24,-72.80],[46.36,-72.55],[46.60,-72.00],[46.80,-71.20],[47.05,-70.72],
  [47.35,-70.30],[47.65,-69.90],[48.05,-69.30],[48.42,-68.52],[48.82,-67.50],[49.15,-66.30],[49.45,-65.20]];
  const riverPts = STL.map(([lat, lng]) => { const [x, z] = toXZ(lat, lng); return new THREE.Vector3(x, 0.006, z); });
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(riverPts),
    new THREE.LineBasicMaterial({ color: 0x7ecece, transparent: true, opacity: 0.7 })));

  /* ---- les parcours : mêmes balles dorées qu'à l'accueil, cliquables ---- */
  function dimpleTexture() {
    const s = 256, c = document.createElement("canvas"); c.width = c.height = s;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
    const rows = 10, cell = s / rows;
    for (let ry = 0; ry < rows; ry++) for (let rx = 0; rx < rows; rx++) {
      const x = rx * cell + (ry % 2 ? cell / 2 : 0) + cell / 2, y = ry * cell + cell / 2;
      ctx.beginPath(); ctx.arc(x, y, cell * 0.3, 0, Math.PI * 2); ctx.fillStyle = "#3a3a3a"; ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 2);
    return tex;
  }
  const pinGeo = new THREE.SphereGeometry(0.09, 14, 10);
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xf7f3e8, emissive: MIST, emissiveIntensity: 0.15, roughness: 0.55, metalness: 0.02,
    bumpMap: dimpleTexture(), bumpScale: 0.01,
  });
  const count = Math.max(1, COURSES.length);
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, count);
  const dummy = new THREE.Object3D();
  const pinXZ = [];
  COURSES.forEach((c, i) => {
    const [x, z] = toXZ(c.lat, c.lng);
    pinXZ.push({ x, z, phase: i * 0.7 });
    dummy.position.set(x, 0.08, z); dummy.scale.setScalar(1); dummy.updateMatrix();
    pins.setMatrixAt(i, dummy.matrix);
  });
  scene.add(pins);
  const pinScale = new Float32Array(count).fill(1);

  function applyVisibility(visibleList) {
    const visible = new Set((visibleList || COURSES).map((c) => c.id));
    COURSES.forEach((c, i) => {
      const on = visible.has(c.id);
      pinScale[i] = on ? 1 : 0.0001;
    });
  }
  applyVisibility(COURSES);

  /* ---- poussière — même technique qu'à l'accueil ---- */
  function glowTexture() {
    const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  const DUST_N = 500;
  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(DUST_N * 3), dustColors = new Float32Array(DUST_N * 3), speeds = new Float32Array(DUST_N);
  const palette = [new THREE.Color(DAWN), new THREE.Color(MIST), new THREE.Color(SAGE), new THREE.Color(WATER)];
  for (let i = 0; i < DUST_N; i++) {
    const r = 8 + Math.random() * 55;
    const u = Math.random(), v = Math.random(), th = u * 2 * Math.PI, ph = Math.acos(2 * v - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.3;
    positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = palette[i % palette.length];
    dustColors[i * 3] = c.r; dustColors[i * 3 + 1] = c.g; dustColors[i * 3 + 2] = c.b;
    speeds[i] = 0.15 + Math.random() * 0.35;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.22, map: glowTexture(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true, opacity: 0.5,
  }));
  scene.add(dust);

  /* ---- étoiles lointaines : le décor de l'ouverture « constellation » ---- */
  const STAR_N = 900;
  const starPos = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const r = 60 + Math.random() * 90;
    const u = Math.random(), v = Math.random(), th = u * 2 * Math.PI, ph = Math.acos(2 * v - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph);
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.16, map: glowTexture(), transparent: true, depthWrite: false, color: 0xdfe8ff, opacity: 0.75,
  })));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.55, 0.2);
  composer.addPass(bloom);

  function resize() {
    const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setSize(w, h); bloom.setSize(w, h);
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  /* ---- cadrage : toujours le même angle de vue, la distance et la
     cible changent selon la région choisie — jamais l'orientation,
     pour que le vol reste lisible. ---- */
  const VIEW_DIR = new THREE.Vector3(0, 11.5, 7.4).normalize();
  const FOV_HALF = (46 / 2) * Math.PI / 180;

  function boundsFor(list) {
    if (!list.length) return { cx: 0, cz: 0, half: 1.2 };
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    list.forEach((c) => {
      const [x, z] = toXZ(c.lat, c.lng);
      minx = Math.min(minx, x); maxx = Math.max(maxx, x);
      minz = Math.min(minz, z); maxz = Math.max(maxz, z);
    });
    const cx = (minx + maxx) / 2, cz = (minz + maxz) / 2;
    const half = Math.max(0.55, Math.hypot(maxx - minx, maxz - minz) / 2);
    return { cx, cz, half };
  }
  function frameFor(list) {
    const b = boundsFor(list);
    const dist = Math.min(52, Math.max(1.9, (b.half / Math.tan(FOV_HALF)) * 1.55));
    return { target: new THREE.Vector3(b.cx, 0.25, b.cz), dist };
  }

  const allFrame = frameFor(COURSES);
  const spaceFrame = { target: new THREE.Vector3(0, 0.25, 0), dist: 46 };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 1.4; controls.maxDistance = 55;
  controls.rotateSpeed = 0.45; controls.zoomSpeed = 0.7; controls.enablePan = false;
  controls.enabled = false;
  controls.target.copy(spaceFrame.target);
  camera.position.copy(spaceFrame.target.clone().add(VIEW_DIR.clone().multiplyScalar(spaceFrame.dist)));
  camera.lookAt(spaceFrame.target);

  let flight = null; // {fromPos, fromTarget, toPos, toTarget, t0, dur}
  function flyTo(frame, dur) {
    const toPos = frame.target.clone().add(VIEW_DIR.clone().multiplyScalar(frame.dist));
    flight = {
      fromPos: camera.position.clone(), fromTarget: controls.target.clone(),
      toPos, toTarget: frame.target.clone(),
      t0: performance.now(), dur: dur || 2200,
    };
    controls.enabled = false;
  }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // vol d'ouverture : de l'espace jusqu'au Québec entier — ou jusqu'au
  // filtre déjà actif, si le visiteur avait déjà choisi une région
  // avant même d'atteindre cette section.
  let opened = false, lastVisible = COURSES, lastRegion = null;
  function openIntro() {
    if (opened) return;
    opened = true;
    const frame = lastRegion ? frameFor(lastVisible.length ? lastVisible : COURSES) : allFrame;
    flyTo(frame, reduce ? 1 : 3200);
  }

  const io2 = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { io2.disconnect(); openIntro(); } });
  }, { threshold: 0.35 });
  io2.observe(wrap);

  /* ---- le filtre pilote la caméra : un clic = un vol, un « toutes régions » = retour au plan large ---- */
  window.PQ_onFilterChange = (visibleList, region) => {
    applyVisibility(visibleList);
    lastVisible = visibleList; lastRegion = region;
    if (!opened) return; // laisse le vol d'ouverture faire son travail d'abord
    const frame = region ? frameFor(visibleList.length ? visibleList : COURSES) : allFrame;
    flyTo(frame, reduce ? 1 : 1900);
  };

  function onFirstInteract() {
    if (hint) hint.classList.add("hide");
    canvas.removeEventListener("pointerdown", onFirstInteract);
  }
  canvas.addEventListener("pointerdown", onFirstInteract, { once: true });

  let downX = 0, downY = 0;
  canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const rect = canvas.getBoundingClientRect();
    const ptr = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObject(pins);
    if (hits.length && hits[0].instanceId != null) {
      const c = COURSES[hits[0].instanceId];
      if (c && pinScale[hits[0].instanceId] > 0.5 && window.PQ_openSheet) window.PQ_openSheet(c.slug);
    }
  });

  let started = false;
  function frame(now) {
    requestAnimationFrame(frame);

    if (flight) {
      const t = Math.min(1, (now - flight.t0) / flight.dur);
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      camera.lookAt(controls.target);
      if (t >= 1) { flight = null; controls.enabled = true; controls.update(); }
    } else {
      controls.update();
    }

    const t = now * 0.001;
    for (let i = 0; i < count; i++) {
      const d = pinXZ[i];
      const tw = reduce ? 1 : 0.88 + Math.sin(t * 1.6 + d.phase) * 0.12;
      dummy.position.set(d.x, 0.08, d.z);
      dummy.scale.setScalar(pinScale[i] * tw);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    }
    pins.instanceMatrix.needsUpdate = true;

    if (!reduce) {
      const posAttr = dustGeo.attributes.position;
      for (let i = 0; i < DUST_N; i++) {
        let y = posAttr.getY(i) + speeds[i] * 0.006;
        if (y > 20) y = 0;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
      dust.rotation.y = t * 0.008;
    }

    composer.render();
    if (!started) { started = true; canvas.classList.add("ready"); if (loading) loading.classList.add("hide"); }
  }
  requestAnimationFrame(frame);
}
