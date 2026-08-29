/* ============================================================
   Curseur golf — une petite balle qui suit la souris avec un peu
   d'inertie, et se change en anneau doré au survol d'un élément
   cliquable. Purement décoratif : jamais nécessaire à l'usage du
   site, donc désactivé sans regret quand ce n'est pas approprié —
   souris fine uniquement (pas tactile), et jamais si le visiteur
   préfère moins de mouvement.
   ============================================================ */
(() => {
  "use strict";
  if (!matchMedia("(pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cur = document.createElement("div");
  cur.className = "pq-cursor";
  cur.innerHTML = '<span class="pq-cursor-ball"></span><span class="pq-cursor-ring"></span>';
  cur.setAttribute("aria-hidden", "true");
  document.body.appendChild(cur);
  document.documentElement.classList.add("pq-cursor-on");

  const HOVER_SEL = "a, button, input, .tile, .rcard, .chip, .lang button, .leaflet-marker-icon, .leaflet-interactive";
  /* boutons dorés/pleins uniquement : ils ont déjà un translateY(-2px)
     au survol en CSS, remplacé ici par l'équivalent en JS (même valeur
     de base) pour ne pas se faire écraser par le style en ligne. */
  const MAGNETIC_SEL = ".navcta, .act.primary, #goBtn";

  let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, raf = null;
  let seen = false, magTarget = null;

  function releaseMagnet() {
    if (magTarget) { magTarget.style.transform = ""; magTarget = null; }
  }

  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (!seen) { seen = true; x = mx; y = my; cur.classList.remove("out"); }
    /* e.target n'est pas toujours un Element (ex. survole le bord de la
       page) : closest peut être absent, jamais supposer qu'il existe. */
    const t = e.target && e.target.closest ? e.target : null;

    const m = t ? t.closest(MAGNETIC_SEL) : null;
    if (m !== magTarget) { releaseMagnet(); magTarget = m; }
    if (magTarget) {
      const r = magTarget.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      magTarget.style.transform = `translate(${relX * 0.24}px, ${relY * 0.28 - 2}px)`;
    }
  }, { passive: true });

  document.addEventListener("mouseover", (e) => {
    if (e.target && e.target.closest && e.target.closest(HOVER_SEL)) cur.classList.add("hover");
  });
  document.addEventListener("mouseout", (e) => {
    const to = e.relatedTarget;
    const from = e.target && e.target.closest ? e.target : null;
    if (from && from.closest(HOVER_SEL) && !(to && to.closest && to.closest(HOVER_SEL))) cur.classList.remove("hover");
    if (magTarget && e.target === magTarget && !(to && magTarget.contains(to))) releaseMagnet();
  });
  addEventListener("mousedown", () => cur.classList.add("down"));
  addEventListener("mouseup", () => cur.classList.remove("down"));
  document.documentElement.addEventListener("mouseleave", () => { cur.classList.add("out"); releaseMagnet(); });

  function tick() {
    x += (mx - x) * 0.2;
    y += (my - y) * 0.2;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
})();
