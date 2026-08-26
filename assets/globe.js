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

  /* ---- même projection, même silhouette que heromap.js/scene3d.js ---- */
  const QC = [[51.3,-79.52],[47.55,-79.52],[47.10,-79.30],[46.60,-78.70],[46.20,-77.70],[45.85,-76.90],
  [45.60,-76.20],[45.45,-75.72],[45.50,-75.05],[45.62,-74.60],[45.55,-74.42],[45.20,-74.36],[45.005,-74.34],
  [45.005,-71.51],[45.24,-70.98],[45.65,-70.72],[46.10,-70.45],[46.42,-70.28],[46.70,-70.06],[47.10,-69.55],
  [47.45,-69.24],[47.32,-68.55],[47.60,-68.15],[47.88,-67.75],[48.05,-66.95],[48.00,-66.45],[48.06,-66.10],
  [48.09,-65.60],[48.13,-65.00],[48.30,-64.45],[48.52,-64.22],[48.78,-64.16],[48.95,-64.35],[49.60,-62.10],
  [50.30,-60.6],[51.3,-60.6]];
  const mx = (lng) => (lng + 180) / 360;
  const my = (lat) => { const s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  QC.forEach(([lat, lng]) => {
    const x = mx(lng), y = my(lat);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  const SCALE = 6.6 / (maxX - minX);
  const cx0 = (minX + maxX) / 2, cy0 = (minY + maxY) / 2;
  const toXZ = (lat, lng) => [(mx(lng) - cx0) * SCALE, (my(lat) - cy0) * -SCALE];

  const coastPts = QC.map(([lat, lng]) => { const [x, z] = toXZ(lat, lng); return new THREE.Vector3(x, 0, z); });
  const coastGeo = new THREE.BufferGeometry().setFromPoints(coastPts.concat([coastPts[0]]));
  const coastMat = new THREE.LineBasicMaterial({ color: DAWN, transparent: true, opacity: 0.65 });
  scene.add(new THREE.Line(coastGeo, coastMat));

  const shapePts = coastPts.map((p) => new THREE.Vector2(p.x, p.z));
  const floorGeo = new THREE.ShapeGeometry(new THREE.Shape(shapePts));
  floorGeo.rotateX(Math.PI / 2); floorGeo.translate(0, -0.02, 0);
  const floorMat = new THREE.MeshBasicMaterial({ color: PINE, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(floorGeo, floorMat));

  const grid = new THREE.GridHelper(40, 40, 0x8ca394, 0x8ca394);
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
