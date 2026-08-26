/* ============================================================
   Hero: the flat constellation, lifted into a 3D diorama.
   Progressive enhancement over heromap.js — that canvas paints
   instantly with zero dependency; this one loads three.js from
   a CDN and crossfades on top once ready. If the CDN is blocked,
   WebGL is unsupported, or the visitor asked for reduced motion,
   the 2D map underneath is already there and nothing breaks.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("scene3d");
const heroEl = document.getElementById("top");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && heroEl && !reduce) {
  try { initScene3D(canvas, heroEl); } catch (e) { console.error("scene3d init failed:", e); }
}

function initScene3D(canvas, heroEl) {
  const NIGHT = 0x060d0a, PINE = 0x0c1712, DAWN = 0xe8b558, EMBER = 0xf2c87a,
        MIST = 0xe9efe6, SAGE = 0x8ca394, WATER = 0x2a6f8a;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(NIGHT, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 11.5, 7.4);
  camera.position.copy(camBase);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x2a3d30, 1.1));
  const key = new THREE.DirectionalLight(0xfbe8c2, 1.35);
  key.position.set(4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(DAWN, 0.55);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  /* ---- silhouette du Québec — mêmes points que heromap.js, dupliqués :
     un script module ne partage pas la portée des scripts classiques. ---- */
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
  const coastLine = new THREE.Line(coastGeo, coastMat);
  scene.add(coastLine);

  const shapePts = coastPts.map((p) => new THREE.Vector2(p.x, p.z));
  const floorGeo = new THREE.ShapeGeometry(new THREE.Shape(shapePts));
  floorGeo.rotateX(Math.PI / 2);
  floorGeo.translate(0, -0.02, 0);
  const floorMat = new THREE.MeshBasicMaterial({ color: PINE, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(floorGeo, floorMat));

  /* un plancher plus grand, en grille : sans lui, la carte plate se lit
     comme une silhouette flottante plutôt que comme une surface posée */
  const grid = new THREE.GridHelper(26, 26, 0x8ca394, 0x8ca394);
  grid.position.y = -0.03;
  grid.material.transparent = true;
  grid.material.opacity = 0.07;
  scene.add(grid);

  /* ---- le fleuve — le même fil lumineux que sur la carte 2D, pour ancrer
     la forme comme une carte et pas comme une simple colline ---- */
  const STL = [[45.30,-74.60],[45.36,-74.20],[45.42,-73.90],[45.48,-73.58],[45.72,-73.26],
  [46.05,-73.08],[46.24,-72.80],[46.36,-72.55],[46.60,-72.00],[46.80,-71.20],[47.05,-70.72],
  [47.35,-70.30],[47.65,-69.90],[48.05,-69.30],[48.42,-68.52],[48.82,-67.50],[49.15,-66.30],[49.45,-65.20]];
  const riverPts = STL.map(([lat, lng]) => { const [x, z] = toXZ(lat, lng); return new THREE.Vector3(x, 0.006, z); });
  const riverGeo = new THREE.BufferGeometry().setFromPoints(riverPts);
  const riverMat = new THREE.LineBasicMaterial({ color: 0x7ecece, transparent: true, opacity: 0.7 });
  scene.add(new THREE.Line(riverGeo, riverMat));

  /* ---- les parcours, comme de vraies balles posées sur la carte ---- */
  const COURSES = window.PQ_COURSES || [];
  const count = Math.max(1, Math.min(COURSES.length, 200));
  const pinGeo = new THREE.SphereGeometry(0.16, 16, 12);

  function dimpleTexture() {
    const s = 256, c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
    const rows = 10, cell = s / rows;
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < rows; rx++) {
        const x = rx * cell + (ry % 2 ? cell / 2 : 0) + cell / 2;
        const y = ry * cell + cell / 2;
        ctx.beginPath(); ctx.arc(x, y, cell * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "#3a3a3a"; ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  }
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xf7f3e8, emissive: MIST, emissiveIntensity: 0.12,
    roughness: 0.55, metalness: 0.02,
    bumpMap: dimpleTexture(), bumpScale: 0.012,
    transparent: true, opacity: 1,
  });
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, count);
  const dummy = new THREE.Object3D();
  const pinData = [];
  for (let i = 0; i < count; i++) {
    const c = COURSES[i];
    const [x, z] = toXZ(c.lat, c.lng);
    const y = 0.12 + (i % 7) * 0.01;
    pinData.push({ x, y, z, phase: i * 0.7 });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(0.9);
    dummy.updateMatrix();
    pins.setMatrixAt(i, dummy.matrix);
  }
  scene.add(pins);

  /* ---- poussière dorée, ambiance qui reste vivante en continu ---- */
  function glowTexture() {
    const s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  const DUST_N = 420;
  const dustGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(DUST_N * 3);
  const dustColors = new Float32Array(DUST_N * 3);
  const speeds = new Float32Array(DUST_N);
  const palette = [new THREE.Color(DAWN), new THREE.Color(MIST), new THREE.Color(SAGE), new THREE.Color(WATER)];
  for (let i = 0; i < DUST_N; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = Math.random() * 10 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 26;
    const c = palette[i % palette.length];
    dustColors[i * 3] = c.r; dustColors[i * 3 + 1] = c.g; dustColors[i * 3 + 2] = c.b;
    speeds[i] = 0.15 + Math.random() * 0.35;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.16, map: glowTexture(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, vertexColors: true, opacity: 0.55,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---- bloom : le doré des nœuds et de la ligne de côte respire ---- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.18);
  composer.addPass(bloom);

  function resize() {
    const w = heroEl.clientWidth || 1, h = heroEl.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  new ResizeObserver(resize).observe(heroEl);
  resize();

  const pointer = { x: 0, y: 0 }, pointerTarget = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    const r = heroEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    pointerTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointerTarget.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });

  let scrollProgress = 0;
  function updateScroll() {
    const r = heroEl.getBoundingClientRect();
    const h = heroEl.offsetHeight || 1;
    scrollProgress = Math.min(1, Math.max(0, -r.top / h));
  }
  addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  let started = false;
  function frame(now) {
    requestAnimationFrame(frame);
    pointer.x += (pointerTarget.x - pointer.x) * 0.04;
    pointer.y += (pointerTarget.y - pointer.y) * 0.04;

    const p = scrollProgress, fade = 1 - p;
    coastMat.opacity = 0.65 * fade;
    floorMat.opacity = 0.42 * fade;
    riverMat.opacity = 0.7 * fade;
    grid.material.opacity = 0.07 * fade;
    pinMat.opacity = fade;
    dustMat.opacity = 0.22 + 0.35 * fade;

    camera.position.x = camBase.x + pointer.x * 0.9;
    camera.position.y = camBase.y + p * 7 - pointer.y * 0.4;
    camera.position.z = camBase.z + p * 9;
    camera.lookAt(0, 0.4 - p * 0.2, 0);

    const t = now * 0.001;
    for (let i = 0; i < count; i++) {
      const d = pinData[i];
      const s = 0.85 + Math.sin(t * 1.6 + d.phase) * 0.18;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    }
    pins.instanceMatrix.needsUpdate = true;

    const posAttr = dustGeo.attributes.position;
    for (let i = 0; i < DUST_N; i++) {
      let y = posAttr.getY(i) + speeds[i] * 0.01;
      if (y > 9) y = -1;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
    dust.rotation.y = t * 0.015;

    composer.render();
    if (!started) { started = true; canvas.classList.add("ready"); }
  }
  requestAnimationFrame(frame);
}
