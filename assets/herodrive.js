/* ============================================================
   L'envolée : une balle frappée hors-champ traverse un paysage
   procédural en parallaxe et se pose sur un vert au moment où le
   titre du site apparaît. Ne joue en entier qu'une fois par
   session (sessionStorage) — les visites suivantes et le mouvement
   réduit affichent directement l'état posé, sans le vol.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("heroDrive");
const heroEl = document.getElementById("top");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const SEEN_KEY = "pq_drive_seen";

function hasSeen() { try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; } }
function markSeen() { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* mode privé : tant pis, on rejoue */ } }

const skipFlight = reduce || hasSeen();

if (canvas && heroEl) {
  try { initDrive(canvas, heroEl); }
  catch (e) {
    console.error("herodrive init failed:", e);
    document.documentElement.classList.add("ready");
    announceFeature();
  }
} else {
  document.documentElement.classList.add("ready");
}

function announceFeature() {
  const COURSES = window.PQ_COURSES || [];
  if (!COURSES.length) return;
  const c = COURSES[Math.floor(Math.random() * COURSES.length)];
  window.PQ_featuredCourse = c;
  const el = document.getElementById("heroFeature");
  if (el) el.innerHTML = window.PQ_heroFeatureText ? window.PQ_heroFeatureText(c) : `${c.name} · ${c.city}`;
}

function initDrive(canvas, heroEl) {
  const NIGHT = 0x060d0a, DAWN = 0xe8b558, EMBER = 0xf2c87a, MIST = 0xe9efe6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(NIGHT, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0x2a3d30, 1.0));
  const key = new THREE.DirectionalLight(0xffdca0, 1.6);
  key.position.set(-3, 5, 6);
  scene.add(key);

  /* ---- lueur du soleil levant, à l'horizon près du point de chute ---- */
  function glowTexture() {
    const s = 128, c = document.createElement("canvas"); c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,230,180,.7)"); g.addColorStop(1, "rgba(255,230,180,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  const sunTex = glowTexture();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, color: EMBER, transparent: true, depthWrite: false, opacity: 0.85 }));
  sun.position.set(2.6, 0.55, -9);
  sun.scale.set(4.2, 4.2, 1);
  scene.add(sun);

  /* ---- collines en silhouette, trois plans pour la profondeur ---- */
  function ridge(seed, ampl, baseY, z, color, opacity) {
    const pts = [];
    const width = 46, seg = 64;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = (t - 0.42) * width;
      const y = baseY
        + Math.sin(t * 2.6 + seed) * ampl * 0.55
        + Math.sin(t * 5.1 + seed * 2.3) * ampl * 0.25
        + Math.sin(t * 1.1 + seed * 0.6) * ampl * 0.3;
      pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2(width * 0.58, -6), new THREE.Vector2(-width * 0.42, -6));
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
    mesh.position.z = z;
    scene.add(mesh);
    return mesh;
  }
  ridge(1.7, 1.1, 0.9, -14, 0x0b1712, 0.9);
  ridge(4.2, 1.5, 0.35, -8, 0x0f1e17, 0.95);
  const nearRidge = ridge(7.1, 1.0, -0.35, -3, 0x14231c, 1);

  /* ---- le vert et le fanion, au point de chute ---- */
  const LAND = new THREE.Vector3(3.6, -0.42, -1.2);
  const greenGeo = new THREE.CircleGeometry(1.15, 32);
  const green = new THREE.Mesh(greenGeo, new THREE.MeshBasicMaterial({ color: 0x1c3324, transparent: true, opacity: 0.85 }));
  green.position.copy(LAND); green.position.y += 0.01; green.rotation.x = -Math.PI / 2.35;
  scene.add(green);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6),
    new THREE.MeshBasicMaterial({ color: 0xd8d2c2 }));
  pole.position.set(LAND.x, LAND.y + 0.45, LAND.z);
  scene.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16),
    new THREE.MeshBasicMaterial({ color: DAWN, side: THREE.DoubleSide }));
  flag.position.set(LAND.x + 0.14, LAND.y + 0.8, LAND.z);
  scene.add(flag);

  /* ---- la balle, mêmes dimples que sur les cartes ---- */
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
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf7f3e8, emissive: MIST, emissiveIntensity: 0.2, roughness: 0.5, bumpMap: dimpleTexture(), bumpScale: 0.01 })
  );
  scene.add(ball);

  /* ---- poussière au moment du rebond ---- */
  const DUST_N = 90;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_N * 3);
  const dustVel = new Float32Array(DUST_N * 3);
  let dustLife = new Float32Array(DUST_N);
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.05, color: 0xd8cba6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);
  function burst(pos) {
    dust.material.opacity = 0.8;
    for (let i = 0; i < DUST_N; i++) {
      dustPos[i * 3] = pos.x; dustPos[i * 3 + 1] = pos.y; dustPos[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, sp = 0.01 + Math.random() * 0.03;
      dustVel[i * 3] = Math.cos(a) * sp; dustVel[i * 3 + 1] = 0.02 + Math.random() * 0.03; dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      dustLife[i] = 1;
    }
  }

  /* ---- vol : lancer -> arc -> deux petits rebonds -> repos ---- */
  const START = new THREE.Vector3(-8.5, -0.9, 0.4);
  const APEX = new THREE.Vector3(-1.5, 3.1, -0.6);
  const BOUNCE1 = LAND.clone().add(new THREE.Vector3(1.3, 0, 0.3));
  const BOUNCE1_APEX = BOUNCE1.clone().add(new THREE.Vector3(-0.5, 0.55, 0.1));
  const REST = LAND.clone().add(new THREE.Vector3(0, 0.09, 0));

  function bezier(a, b, c, t) { const u = 1 - t; return a.clone().multiplyScalar(u * u).add(b.clone().multiplyScalar(2 * u * t)).add(c.clone().multiplyScalar(t * t)); }

  const camBase = new THREE.Vector3(0, 1.0, 4.6);
  const camLandOffset = new THREE.Vector3(0.6, 0.15, 1.6);

  let t0 = 0, phase = skipFlight ? "done" : "flight";
  const T_FLIGHT = 2500, T_BOUNCE = 550;
  const pointer = { x: 0, y: 0 }, pointerTarget = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    const r = heroEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    pointerTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointerTarget.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }, { passive: true });

  if (skipFlight) {
    ball.position.copy(REST);
    camera.position.copy(camBase).add(camLandOffset);
    camera.lookAt(LAND);
    markSeen();
    announceFeature();
    document.documentElement.classList.add("ready");
  } else {
    ball.position.copy(START);
    camera.position.copy(camBase);
    camera.lookAt(new THREE.Vector3(-3, 0.5, 0));
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.6, 0.22);
  composer.addPass(bloom);

  function resize() {
    const w = heroEl.clientWidth || 1, h = heroEl.clientHeight || 1;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const pr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setSize(w, h); bloom.setSize(w, h);
  }
  new ResizeObserver(resize).observe(heroEl);
  resize();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  let started = false, landed = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!t0) t0 = now;
    const el = now - t0;

    pointer.x += (pointerTarget.x - pointer.x) * 0.04;
    pointer.y += (pointerTarget.y - pointer.y) * 0.04;

    if (phase === "flight") {
      const e = easeOutCubic(Math.min(1, el / T_FLIGHT));
      ball.position.copy(bezier(START, APEX, LAND, e));
      ball.rotation.z -= 0.09;
      camera.position.copy(camBase).lerp(camBase.clone().add(camLandOffset), e * 0.7);
      camera.position.x += pointer.x * 0.12;
      camera.lookAt(ball.position.clone().lerp(LAND, e * 0.6));
      if (el >= T_FLIGHT) { phase = "bounce1"; t0 = now; burst(LAND); }
    } else if (phase === "bounce1") {
      const e = Math.min(1, el / T_BOUNCE);
      ball.position.copy(bezier(LAND, BOUNCE1_APEX, BOUNCE1, e));
      camera.lookAt(LAND);
      if (el >= T_BOUNCE) { phase = "settle"; t0 = now; burst(BOUNCE1); }
    } else if (phase === "settle") {
      const e = easeInOutCubic(Math.min(1, el / 420));
      ball.position.lerpVectors(BOUNCE1, REST, e);
      if (el >= 420 && !landed) {
        landed = true;
        markSeen();
        announceFeature();
        document.documentElement.classList.add("ready");
      }
      if (el >= 420) phase = "done";
    } else {
      const px = reduce ? 0 : pointer.x, py = reduce ? 0 : pointer.y;
      camera.position.set(camBase.x + px * 0.15, camBase.y + camLandOffset.y - py * 0.08, camBase.z + camLandOffset.z);
      camera.lookAt(LAND);
      if (!reduce) ball.rotation.y += 0.004;
    }

    // poussière : intégration simple, dissipation
    if (dust.material.opacity > 0.001) {
      let alive = false;
      for (let i = 0; i < DUST_N; i++) {
        if (dustLife[i] <= 0) continue;
        alive = true;
        dustPos[i * 3] += dustVel[i * 3]; dustPos[i * 3 + 1] += dustVel[i * 3 + 1]; dustPos[i * 3 + 2] += dustVel[i * 3 + 2];
        dustVel[i * 3 + 1] -= 0.0016;
        dustLife[i] -= 0.02;
      }
      dust.geometry.attributes.position.needsUpdate = true;
      dust.material.opacity = Math.max(0, dust.material.opacity - 0.012);
      if (!alive) dust.material.opacity = 0;
    }

    if (!reduce) {
      sun.material.rotation += 0.0006;
      nearRidge.position.x = pointer.x * -0.05;
    }

    composer.render();
    if (!started) { started = true; canvas.classList.add("ready"); }
  }
  requestAnimationFrame(frame);
}
