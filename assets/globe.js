/* ============================================================
   L'explorateur satellite : la Terre, vue de vraies images
   satellite (textures NASA Blue Marble, servies par le CDN de
   three.js — chargées directement par le navigateur du visiteur,
   comme l'imagerie Google Maps ailleurs sur le site), qui zoome
   jusqu'au Québec puis se pilote librement. Les mêmes parcours
   que la liste, filtrés par le même état, ouverts dans la même
   fiche de détail. Chargée seulement quand la section approche
   du viewport — pas de texture téléchargée pour rien.
   ============================================================ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const wrap = document.querySelector(".globe-wrap");
const canvas = document.getElementById("globeCanvas");
const loading = document.getElementById("globeLoading");
const hint = document.getElementById("globeHint");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (wrap && canvas) {
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { io.disconnect(); initGlobe(); }
    });
  }, { rootMargin: "500px 0px" });
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

function initGlobe() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    fallback("Carte satellite indisponible sur cet appareil — la liste ci-dessus reste à jour.");
    return;
  }
  try { buildScene(renderer); }
  catch (e) {
    console.error("globe init failed:", e);
    fallback("Carte satellite indisponible sur cet appareil — la liste ci-dessus reste à jour.");
  }
}

function buildScene(renderer) {
  const COURSES = window.PQ_COURSES || [];
  const DAWN = 0xe8b558, EMBER = 0xf2c87a;
  const R = 2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0x223344, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.1);
  sun.position.set(5, 2, 4);
  scene.add(sun);

  /* ---- projection lat/lng -> point sur la sphère ---- */
  function latLngToVec3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  /* ---- la Terre : vraies images satellite (NASA, via le CDN three.js) ---- */
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = "anonymous";
  const BASE = "https://threejs.org/examples/textures/planets/";
  let loaded = 0;
  const need = 3;
  function onOneLoaded() { loaded++; if (loaded >= need) ready(); }

  const dayTex = loader.load(BASE + "earth_atmos_2048.jpg", onOneLoaded, undefined, onOneLoaded);
  const lightsTex = loader.load(BASE + "earth_lights_2048.png", onOneLoaded, undefined, onOneLoaded);
  const cloudsTex = loader.load(BASE + "earth_clouds_1024.png", onOneLoaded, undefined, onOneLoaded);
  dayTex.colorSpace = THREE.SRGBColorSpace;

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshPhongMaterial({
      map: dayTex, emissiveMap: lightsTex, emissive: 0xffffff,
      emissiveIntensity: 1.5, shininess: 4,
    })
  );
  scene.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.008, 64, 64),
    new THREE.MeshLambertMaterial({ map: cloudsTex, transparent: true, opacity: 0.35, depthWrite: false })
  );
  scene.add(clouds);

  /* lueur d'atmosphère — le contour bleu qu'on voit sur toute vraie photo depuis l'orbite */
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.06, 48, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){
        float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0);
        gl_FragColor = vec4(0.35,0.62,1.0,1.0) * i; }`,
    })
  );
  scene.add(glow);

  /* ---- étoiles ---- */
  function dotTexture() {
    const s = 32, c = document.createElement("canvas"); c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  const STAR_N = 1400;
  const starPos = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const r = 30 + Math.random() * 40;
    const u = Math.random(), v = Math.random();
    const th = u * 2 * Math.PI, ph = Math.acos(2 * v - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    starPos[i * 3 + 2] = r * Math.cos(ph);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.14, map: dotTexture(), transparent: true, depthWrite: false, color: 0xdfe8ff,
  }));
  scene.add(stars);

  /* ---- les parcours, comme des balles de lumière au-dessus de la Terre ---- */
  const count = Math.max(1, COURSES.length);
  const pinGeo = new THREE.SphereGeometry(0.02, 8, 6);
  const pinMat = new THREE.MeshBasicMaterial({ color: DAWN });
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, count);
  const dummy = new THREE.Object3D();
  const pinPos = [];
  COURSES.forEach((c, i) => {
    const p = latLngToVec3(c.lat, c.lng, R * 1.012);
    pinPos.push(p);
    dummy.position.copy(p);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    pins.setMatrixAt(i, dummy.matrix);
  });
  scene.add(pins);

  function updatePinVisibility(visibleList) {
    const visible = new Set((visibleList || COURSES).map((c) => c.id));
    COURSES.forEach((c, i) => {
      dummy.position.copy(pinPos[i]);
      dummy.scale.setScalar(visible.has(c.id) ? 1 : 0.0001);
      dummy.updateMatrix();
      pins.setMatrixAt(i, dummy.matrix);
    });
    pins.instanceMatrix.needsUpdate = true;
  }
  window.PQ_onFilterChange = (visibleList) => updatePinVisibility(visibleList);

  /* ---- caméra : vue d'ensemble, puis vol vers le Québec ---- */
  const FOCUS = latLngToVec3(47.0, -71.8, 1).normalize();
  const farPos = new THREE.Vector3(0, 1.2, 9.5);
  const nearPos = FOCUS.clone().multiplyScalar(R * 1.9);
  camera.position.copy(reduce ? nearPos : farPos);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = R * 1.35;
  controls.maxDistance = 11;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.7;
  controls.enablePan = false;
  controls.enabled = reduce;

  function resize() {
    const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  let flying = !reduce, flyT = 0, ready_ = false, started = false;
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function onFirstInteract() {
    if (hint) hint.classList.add("hide");
    canvas.removeEventListener("pointerdown", onFirstInteract);
  }
  canvas.addEventListener("pointerdown", onFirstInteract, { once: true });

  /* clic = ouvrir la fiche, glissé = tourner (OrbitControls gère déjà le glissé) */
  let downX = 0, downY = 0;
  canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    const rect = canvas.getBoundingClientRect();
    const ptr = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 0.05;
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObject(pins);
    if (hits.length && hits[0].instanceId != null) {
      const c = COURSES[hits[0].instanceId];
      if (c && window.PQ_openSheet) window.PQ_openSheet(c.slug);
    }
  });

  function ready() {
    if (ready_) return;
    ready_ = true;
    if (loading) loading.classList.add("hide");
  }
  // filet de sécurité si une texture met du temps : ne pas bloquer l'affichage indéfiniment
  setTimeout(ready, 4000);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!reduce) clouds.rotation.y += 0.0007;

    if (flying) {
      flyT = Math.min(1, flyT + 1 / 170);
      const e = easeInOutCubic(flyT);
      camera.position.lerpVectors(farPos, nearPos, e);
      camera.lookAt(0, 0, 0);
      if (flyT >= 1) { flying = false; controls.enabled = true; controls.update(); }
    } else {
      controls.update();
    }

    renderer.render(scene, camera);
    if (!started) { started = true; canvas.classList.add("ready"); }
  }
  requestAnimationFrame(frame);
}
