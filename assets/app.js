/* ============================================================
   Parcours Québec — logique de la page
   ------------------------------------------------------------
   Règle de ce fichier : on n'affiche que ce qu'on peut prouver.
   Pas de tarifs, pas de notes, pas d'heures de départ inventées.
   Les seuls liens sortants sont des recherches Google, qui
   fonctionnent toujours, et s'ouvrent dans un nouvel onglet.
   ============================================================ */
"use strict";

const COURSES = window.PQ_COURSES || [];
const $ = (id) => document.getElementById(id);
const PLATFORM = { gggolf: "GGGolf", chronogolf: "Chronogolf",
  golfnow: "GolfNow", teeon: "Tee-On", teesnap: "Teesnap", foreup: "foreUP", vtgolf: "VT Golf", custom: null };
/* ---------------- photos réelles (Google) ----------------
   Construites côté navigateur : c'est le navigateur du visiteur qui
   les demande à Google, jamais notre serveur. Rien n'est re-hébergé,
   donc rien n'est copié — c'est ce qui rend l'usage licite.        */
const CFG = window.PQ_CONFIG || {};
const hasPhotos = () => !!(CFG.googleMapsKey || "").trim();
function satUrl(c, w, h) {
  const p = new URLSearchParams({
    center: c.lat.toFixed(6) + "," + c.lng.toFixed(6),
    zoom: String(CFG.satelliteZoom || 15),
    size: w + "x" + h, scale: "2", maptype: "satellite", format: "jpg",
    key: CFG.googleMapsKey
  });
  return "https://maps.googleapis.com/maps/api/staticmap?" + p;
}
function streetUrl(c, w, h) {
  const p = new URLSearchParams({
    location: `${c.name}, ${c.city}, Québec`,
    size: w + "x" + h, fov: "80", pitch: "0", source: "outdoor",
    return_error_code: "true", key: CFG.googleMapsKey
  });
  return "https://maps.googleapis.com/maps/api/streetview?" + p;
}
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ---------------------------- textes ---------------------------- */
const T = {
  fr: {
    nav1: "Parcours", nav2: "Régions", nav3: "Comment ça marche",
    cta: "Voir les parcours", cta2: "Nous écrire",
    notice: "<b>Registre en construction.</b> 99 des 120 parcours ont un lien de réservation vérifié à la main. Aucun tarif, aucune note et aucune heure de départ n'est affiché : ces données ne sont pas encore branchées à une vraie source.",
    eyebrow: "120 parcours · 99 réservables en ligne",
    h1a: "Chaque parcours", h1b: "du Québec.", h1c: "Sur une seule carte.",
    lede: "Où ils sont, dans quelle région, et comment joindre le club. <b>Les départs en direct viendront quand les systèmes de réservation seront branchés — pas avant.</b>",
    go: "Chercher", ph: "Code postal, ville ou parcours",
    m1: "Réservation en ligne vérifiée", m2: "Lien vers le club", cue: "Faites défiler",
    heroFeature: (c) => `Parcours à l'honneur : <b>${c.name}</b> · ${c.city}`,
    s1: "parcours dans le registre", s2: "régions couvertes",
    s3: "avec réservation en ligne vérifiée", s4: "parcours au Québec — l'objectif",
    eb2: "Le répertoire", h2a: "Trouvez le parcours, <em>joignez le club.</em>",
    l2: "Cherchez par code postal, ville, région ou nom. Quand le club réserve en ligne, le bouton mène directement à son vrai système — GGGolf ou Chronogolf — dans un nouvel onglet.",
    more: "Voir plus de parcours",
    ebG: "Vue satellite", h2g: "De l'espace <em>jusqu'au vert.</em>",
    lg: "La Terre, vue de vraies images satellite — puis le Québec. Glissez pour tourner, molette ou pincez pour zoomer. Chaque point est un parcours du registre, et suit le même filtre que la liste.",
    ghint: "Glissez pour tourner · molette pour zoomer",
    eb3: "Par région", h2b: "Du Vieux-Montréal <em>jusqu'à la Gaspésie.</em>",
    l3: "Le golf québécois ne s'arrête pas à la couronne nord. Choisissez une région pour filtrer le répertoire.",
    eb4: "Ce que le site fait aujourd'hui", h2c: "Trois choses. <em>Elles fonctionnent.</em>",
    eb5: "Ce qui s'en vient", h2e: "Et ce qui <em>n'est pas encore là.</em>",
    l5: "Écrit noir sur blanc pour que personne ne se fasse d'idées — y compris nous.",
    eb6: "Vous gérez un club ?", h2d: "Il manque votre parcours. <em>Dites-le-nous.</em>",
    l6: "Le registre en compte 120 sur environ 350. Une correction, un ajout, un retrait : c'est traité dans la semaine.",
    foot: "Le répertoire des terrains de golf du Québec. Indépendant, sans lien avec Golf Québec ni avec aucun club.",
    note: "Noms, villes et régions : réels. Positions : approximatives — vérifiez toujours l'adresse auprès du club. Les liens de réservation ont été vérifiés un par un le 24 août 2026; un club peut changer de plateforme sans préavis. Les vues aériennes sont des illustrations générées, pas des photos des parcours. Aucun tarif, aucune note et aucune heure de départ n'est affiché : ces données n'existeront ici que branchées à une vraie source.",
    all: "Toutes les régions", count: (n) => `${n} parcours`, none: "Aucun parcours ne correspond.",
    illus: "illustration", sat: "satellite · Google", ground: "Vue au sol",
    steps: [
      ["Chercher", "Code postal (J4B), ville, région ou nom du club. Les résultats se classent par distance réelle depuis le point cherché."],
      ["Situer", "La carte montre où se trouve chaque parcours au Québec. Position approximative : bonne pour se repérer, à confirmer auprès du club."],
      ["Réserver", "Pour 99 des 120 parcours, un clic ouvre le vrai système de réservation du club — GGGolf ou Chronogolf — dans un nouvel onglet. Pour les autres, la fiche Google du club."]
    ],
    roadmap: [
      ["Compléter le registre", "120 parcours sur environ 350. La suite : recouper OpenStreetMap, Google Places et les répertoires de Golf Québec et de l'ACGQ, puis vérifier chaque fiche à la main."],
      ["Voir les heures ici", "GGGolf (44 parcours) et Chronogolf (46) se partagent le Québec. Se brancher à GGGolf en premier — c'est une entreprise québécoise. Rien ne s'affichera avant que la donnée soit réelle et fraîche."],
      ["Réserver en un clic", "Une fois les disponibilités connues, le lien mènera directement au bon créneau sur le système du club. Le paiement restera toujours chez le club."]
    ],
    sheetLoc: "Où c'est", sheetActs: "Joindre le club",
    aMaps: "Ouvrir dans Google Maps", aMapsSub: "Adresse, téléphone, avis, heures",
    aBook: "Réserver un départ", aBookSub: (p) => p ? `Système de réservation du club · ${p}` : "Système de réservation du club",
    aSearch: "Chercher les départs", aSearchSub: "Recherche Google : réservation en ligne du club",
    aCall: "Appeler le club", aCallSub: "Ligne directe",
    aDir: "Itinéraire", aDirSub: "Depuis votre position",
    pendingT: "Réservation en ligne : non trouvée",
    pendingP: "Nous n'avons pas pu confirmer de système de réservation en ligne pour ce club. Passez par sa fiche Google — téléphone et site officiel s'y trouvent.",
    privT: "Club privé", privP: "Jeu réservé aux membres et à leurs invités. Aucune réservation publique.",
    online: "Réservable en ligne",
    approx: "Position approximative", newTab: "s'ouvre dans un nouvel onglet"
  },
  en: {
    nav1: "Courses", nav2: "Regions", nav3: "How it works",
    cta: "Browse courses", cta2: "Get in touch",
    notice: "<b>Registry under construction.</b> 99 of 120 courses have a hand-verified booking link. No prices, ratings or tee times are shown: that data isn't wired to a real source yet.",
    eyebrow: "120 courses · 99 bookable online",
    h1a: "Every course", h1b: "in Québec.", h1c: "On one map.",
    lede: "Where they are, which region, and how to reach the club. <b>Live tee times will arrive when the booking systems are connected — not before.</b>",
    go: "Search", ph: "Postal code, town or course",
    m1: "Verified online booking", m2: "Link to the club", cue: "Scroll",
    heroFeature: (c) => `Featured course: <b>${c.name}</b> · ${c.city}`,
    s1: "courses in the registry", s2: "regions covered",
    s3: "with verified online booking", s4: "courses in Québec — the target",
    eb2: "The directory", h2a: "Find the course, <em>reach the club.</em>",
    l2: "Search by postal code, town, region or name. Where the club books online, the button goes straight to its real system — GGGolf or Chronogolf — in a new tab.",
    more: "Show more courses",
    ebG: "Satellite view", h2g: "From orbit <em>to the fairway.</em>",
    lg: "The Earth, in real satellite imagery — then Québec. Drag to rotate, scroll or pinch to zoom. Every point is a course in the registry, following the same filter as the list.",
    ghint: "Drag to rotate · scroll to zoom",
    eb3: "By region", h2b: "From Old Montréal <em>to the Gaspé.</em>",
    l3: "Québec golf doesn't stop at the north shore. Pick a region to filter the directory.",
    eb4: "What the site does today", h2c: "Three things. <em>They work.</em>",
    eb5: "What's coming", h2e: "And what <em>isn't here yet.</em>",
    l5: "Written down plainly so nobody gets the wrong idea — us included.",
    eb6: "Run a club?", h2d: "Your course is missing. <em>Tell us.</em>",
    l6: "The registry holds 120 of roughly 350. A correction, an addition, a removal: handled within the week.",
    foot: "The directory of Québec golf courses. Independent, unaffiliated with Golf Québec or any club.",
    note: "Names, towns and regions: real. Positions: approximate — always confirm the address with the club. Booking links were verified one by one on 24 August 2026; a club can switch platform without notice. Aerial views are generated illustrations, not photographs of the courses. No prices, ratings or tee times are shown: that data will only appear here wired to a real source.",
    all: "All regions", count: (n) => `${n} courses`, none: "No courses match.",
    illus: "illustration", sat: "satellite · Google", ground: "Street View",
    steps: [
      ["Search", "Postal code (J4B), town, region or club name. Results rank by real distance from the point you searched."],
      ["Locate", "The map shows where each course sits in Québec. Approximate position: good for orientation, confirm with the club."],
      ["Book", "For 99 of 120 courses, one click opens the club's real booking system — GGGolf or Chronogolf — in a new tab. For the rest, the club's Google listing."]
    ],
    roadmap: [
      ["Finish the registry", "120 courses of roughly 350. Next: reconcile OpenStreetMap, Google Places and the Golf Québec / ACGQ directories, then verify every entry by hand."],
      ["Show the times here", "GGGolf (44 courses) and Chronogolf (46) split Québec between them. Wire up GGGolf first — it's a Québec company. Nothing shows until the data is real and fresh."],
      ["One-click booking", "Once availability is known, the link will land on the right slot in the club's own system. Payment always stays with the club."]
    ],
    sheetLoc: "Where it is", sheetActs: "Reach the club",
    aMaps: "Open in Google Maps", aMapsSub: "Address, phone, reviews, hours",
    aBook: "Book a tee time", aBookSub: (p) => p ? `The club's own booking system · ${p}` : "The club's own booking system",
    aCall: "Call the club", aCallSub: "Direct line",
    aSearch: "Search for tee times", aSearchSub: "Google search: the club's online booking",
    aDir: "Directions", aDirSub: "From your location",
    pendingT: "Online booking: not found",
    pendingP: "We could not confirm an online booking system for this club. Use its Google listing — phone and official site are there.",
    privT: "Private club", privP: "Play is reserved for members and their guests. No public booking.",
    online: "Books online",
    approx: "Approximate position", newTab: "opens in a new tab"
  }
};
let LANG = "fr";
const t = () => T[LANG];

/* ------------------------- géo & recherche ------------------------- */
/* Centroïdes approximatifs des RTA (3 premiers caractères du code postal).
   À remplacer par le fichier des limites de RTA de Statistique Canada. */
const FSA = {
  H1:[45.60,-73.55],H2:[45.55,-73.62],H3:[45.50,-73.58],H4:[45.48,-73.66],H7:[45.58,-73.75],
  H8:[45.44,-73.75],H9:[45.45,-73.83],J0:[45.35,-73.60],J1:[45.40,-71.90],J2:[45.50,-72.85],
  J3:[45.35,-73.20],J4:[45.47,-73.45],J5:[45.75,-73.45],J6:[45.90,-73.55],J7:[45.68,-73.90],
  J8:[45.48,-75.70],J9:[48.15,-78.10],G0:[47.20,-70.40],G1:[46.82,-71.23],G2:[46.85,-71.35],
  G3:[46.90,-71.30],G4:[49.40,-67.50],G5:[48.20,-68.80],G6:[46.55,-70.90],G7:[48.42,-71.07],
  G8:[48.55,-71.65],G9:[46.42,-72.60]
};
const TOWNS = {
  "montreal":[45.508,-73.567],"quebec":[46.813,-71.208],"gatineau":[45.477,-75.701],
  "sherbrooke":[45.404,-71.888],"trois-rivieres":[46.343,-72.542],"saguenay":[48.428,-71.068],
  "laval":[45.606,-73.712],"longueuil":[45.531,-73.518],"granby":[45.400,-72.733],
  "magog":[45.267,-72.145],"mont-tremblant":[46.118,-74.596],"rimouski":[48.449,-68.523],
  "gaspe":[48.831,-64.487],"levis":[46.803,-71.177],"drummondville":[45.883,-72.484],
  "saint-jerome":[45.780,-74.003],"victoriaville":[46.056,-71.960],"alma":[48.550,-71.649]
};

function haversine(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const dl = (c - a) * r, dg = (d - b) * r;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/* ------------------------------ état ------------------------------ */
const S = { q: "", origin: null, originLabel: "", radiusKm: 150, region: null, shown: 9, sel: null };

function list() {
  let l = COURSES.map((c) => ({
    ...c,
    d: S.origin ? haversine(S.origin[0], S.origin[1], c.lat, c.lng) : null
  }));
  const q = norm(S.q).trim();
  if (q && !S.origin) {
    l = l.filter((c) => norm(c.name).includes(q) || norm(c.city).includes(q) || norm(c.region).includes(q));
  }
  if (S.origin) l = l.filter((c) => c.d <= S.radiusKm);
  if (S.region) l = l.filter((c) => c.region === S.region);
  l.sort((a, b) => (S.origin ? a.d - b.d : a.name.localeCompare(b.name, "fr")));
  return l;
}

/* --------------------- liens sortants (réels) --------------------- */
/* Ces trois URL fonctionnent pour n'importe quel club, sans base de
   données et sans deviner de slug. C'est précisément pourquoi on les
   utilise : un lien qui marche vaut mieux qu'un lien inventé. */
const gQuery = (c) => encodeURIComponent(`${c.name} ${c.city} Québec golf`);
const mapsUrl = (c) => `https://www.google.com/maps/search/?api=1&query=${gQuery(c)}`;
const searchUrl = (c) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${c.name} ${c.city} golf réservation départ en ligne`)}`;
const dirUrl = (c) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${c.city}, Québec`)}`;

/** Ouvre dans un nouvel onglet. Jamais de redirection de l'onglet courant. */
function openTab(url) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) toast(LANG === "fr"
    ? "Votre navigateur a bloqué la fenêtre. Autorisez les fenêtres surgissantes pour ce site."
    : "Your browser blocked the popup. Allow pop-ups for this site.");
}

/* ------------------------------ rendu ------------------------------ */
const REGIONS = [...new Set(COURSES.map((c) => c.region))].sort((a, b) => a.localeCompare(b, "fr"));

function chips() {
  const L = t();
  const items = [`<button class="chip" data-r="" aria-pressed="${!S.region}">${L.all}</button>`]
    .concat(REGIONS.map((r) =>
      `<button class="chip" data-r="${r}" aria-pressed="${S.region === r}">${r}</button>`));
  $("tools").innerHTML = items.join("") +
    `<span class="toolspace"></span><span class="rescount" id="rescount"></span>`;
  /* même bouton, même état — la carte 3D lit S.region exactement comme la liste */
  const gt = $("globeTools");
  if (gt) gt.innerHTML = items.join("");
}

function card(c, i) {
  const L = t();
  const km = c.d != null ? `${c.d < 10 ? c.d.toFixed(1) : Math.round(c.d)} km` : "";
  return `<button class="tile" data-slug="${c.slug}" style="animation-delay:${Math.min(i, 9) * 55}ms">
    <span class="shot">
      <img ${hasPhotos()
        ? `src="${satUrl(c, 480, 300)}" data-fallback="${c.id}" data-w="480" data-h="300"`
        : `data-art="${c.id}" data-w="480" data-h="300"`} alt="" loading="lazy" decoding="async">
      <span class="tag">${c.booking ? `<span class="ok">${L.online}</span>` : ""}<span>${c.region}</span>${km ? `<span>${km}</span>` : ""}</span>
      <span class="shotnote icon" title="${hasPhotos() ? L.sat : L.illus}" aria-label="${hasPhotos() ? L.sat : L.illus}">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg>
      </span>
      <span class="cap"><h3>${c.name}</h3><span class="sub">${c.city}</span></span>
    </span>
    <span class="foot">
      <span class="loc">
        <span>${c.city}, QC</span>
        <span class="coord">${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}</span>
      </span>
      <span class="arrow" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </span>
    </span>
  </button>`;
}

function renderGrid() {
  const L = t(), all = list(), slice = all.slice(0, S.shown);
  $("grid").innerHTML = slice.length ? slice.map(card).join("") : `<p class="empty">${L.none}</p>`;
  const rc = $("rescount");
  if (rc) rc.textContent = L.count(all.length) + (S.originLabel ? " · " + S.originLabel : "");
  $("moreBtn").style.display = all.length > S.shown ? "" : "none";
  hydrate($("grid"));
  /* la carte 3D (assets/globe.js) écoute ce hook pour rester en phase
     avec le même filtre — un seul état, deux vues */
  if (window.PQ_onFilterChange) window.PQ_onFilterChange(all, S.region);
}

const artObs = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    artObs.unobserve(el);
    if (el.dataset.region != null) { el.src = region(+el.dataset.region, +el.dataset.w, +el.dataset.h); return; }
    const c = COURSES.find((x) => x.id === +el.dataset.art);
    if (c) el.src = aerial(c, +el.dataset.w, +el.dataset.h);
  });
}, { rootMargin: "500px 0px" });

/* Si Google refuse une image (clé absente, quota, restriction),
   on repasse à l'illustration au lieu d'afficher un cadre cassé. */
document.addEventListener("error", (e) => {
  const el = e.target;
  if (el.tagName !== "IMG" || !el.dataset.fallback || el.dataset.failed) return;
  el.dataset.failed = "1";
  const c = COURSES.find((x) => x.id === +el.dataset.fallback);
  if (c) el.src = aerial(c, +el.dataset.w, +el.dataset.h);
  const note = el.parentElement && el.parentElement.querySelector(".shotnote");
  if (note && note.classList.contains("icon")) { note.title = t().illus; note.setAttribute("aria-label", t().illus); }
  else if (note) note.textContent = t().illus;
}, true);

function hydrate(scope) {
  scope.querySelectorAll("img[data-art],img[data-region]").forEach((el) => { if (!el.src) artObs.observe(el); });
}

function renderRegions() {
  const counts = {};
  COURSES.forEach((c) => { counts[c.region] = (counts[c.region] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const word = LANG === "fr" ? "parcours" : "courses";
  $("regionGrid").innerHTML = top.map(([name, n], i) =>
    `<button class="rcard" data-region-name="${name}">
       <img data-region="${i + 3}" data-w="330" data-h="412" alt="" loading="lazy">
       <span class="rlab"><b>${name}</b><span>${n} ${word}</span></span>
     </button>`).join("");
  hydrate($("regionGrid"));
}

function renderSteps() {
  const row = ([h, p]) => `<div class="step"><h3>${h}</h3><p>${p}</p></div>`;
  $("steps").innerHTML = t().steps.map(row).join("");
  $("roadmap").innerHTML = t().roadmap.map(row).join("");
}

/* ------------------------- panneau de fiche ------------------------- */
function openSheet(slug) {
  const c = COURSES.find((x) => x.slug === slug);
  if (!c) return;
  S.sel = slug;
  const L = t();
  const d = S.origin ? haversine(S.origin[0], S.origin[1], c.lat, c.lng) : null;
  const act = (url, label, sub, primary) =>
    `<a class="act${primary ? " primary" : ""}" href="${url}" target="_blank" rel="noopener noreferrer" data-ext>
       <span><span>${label}</span><span class="sub">${sub} · ${L.newTab}</span></span>
       <svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>
     </a>`;
  const actTel = (phone, primary) =>
    `<a class="act${primary ? " primary" : ""}" href="tel:${phone.replace(/[^0-9+]/g, "")}">
       <span><span>${L.aCall}</span><span class="sub">${phone}</span></span>
       <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
     </a>`;

  const plat = c.platform ? PLATFORM[c.platform] : null;
  const foot = c.booking
    ? ""
    : c.access === "private"
      ? `<div class="pending"><b>${L.privT}</b><p>${L.privP}</p></div>`
      : `<div class="pending"><b>${L.pendingT}</b><p>${L.pendingP}</p></div>`;
  $("sheet").innerHTML = `
    <div class="shero">
      <img ${hasPhotos()
        ? `src="${satUrl(c, 560, 315)}" data-fallback="${c.id}" data-w="560" data-h="315"`
        : `src="${aerial(c, 560, 315)}"`} alt="">
      <span class="shotnote">${hasPhotos() ? L.sat : L.illus}</span>
      <button class="xbtn" id="closeSheet" aria-label="Fermer">
        <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </button>
      <span class="scap">
        <h3>${c.name}</h3>
        <p class="ssub">${c.city} · ${c.region}${d != null ? ` · ${Math.round(d)} km` : ""}</p>
      </span>
    </div>
    <div class="sbody">
      <p class="slabel">${L.sheetLoc}</p>
      <p class="ssub mono" style="font-size:12.5px">${c.lat.toFixed(4)}, ${c.lng.toFixed(4)} <span style="color:var(--sage-dim)">· ${L.approx}</span></p>

      ${hasPhotos() ? `<p class="slabel">${L.ground}</p>
      <img class="sv" src="${streetUrl(c, 560, 260)}" alt="" loading="lazy"
           onerror="this.style.display='none';this.previousElementSibling.style.display='none'">` : ""}
      <p class="slabel">${L.sheetActs}</p>
      <div class="acts">
        ${c.booking ? act(c.booking, L.aBook, L.aBookSub(plat), true) : ""}
        ${c.phone ? actTel(c.phone, !c.booking) : ""}
        ${act(mapsUrl(c), L.aMaps, L.aMapsSub)}
        ${c.booking ? "" : act(searchUrl(c), L.aSearch, L.aSearchSub)}
        ${act(dirUrl(c), L.aDir, L.aDirSub)}
      </div>
      ${foot}
    </div>`;
  $("sheet").classList.add("on");
  $("sheet").setAttribute("aria-hidden", "false");
  $("scrim").classList.add("on");
  document.body.style.overflow = "hidden";
}

function closeSheet() {
  S.sel = null;
  $("sheet").classList.remove("on");
  $("sheet").setAttribute("aria-hidden", "true");
  $("scrim").classList.remove("on");
  document.body.style.overflow = "";
}

let toastT;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove("on"), 4600);
}

/* ---------------------------- événements ---------------------------- */
$("grid").addEventListener("click", (e) => {
  const b = e.target.closest(".tile");
  if (b) openSheet(b.dataset.slug);
});

$("regionGrid").addEventListener("click", (e) => {
  const b = e.target.closest(".rcard");
  if (!b) return;
  S.region = b.dataset.regionName;
  S.q = ""; S.origin = null; S.originLabel = ""; S.shown = 9;
  $("q").value = "";
  chips(); renderGrid();
  $("parcours").scrollIntoView({ behavior: "smooth" });
});

function onRegionChipClick(e) {
  const b = e.target.closest("button[data-r]");
  if (!b) return;
  S.region = b.dataset.r || null;
  S.shown = 9;
  chips(); renderGrid();
}
$("tools").addEventListener("click", onRegionChipClick);
$("globeTools").addEventListener("click", onRegionChipClick);

$("moreBtn").addEventListener("click", () => { S.shown += 9; renderGrid(); });
$("scrim").addEventListener("click", closeSheet);
addEventListener("keydown", (e) => { if (e.key === "Escape" && S.sel) closeSheet(); });

$("sheet").addEventListener("click", (e) => {
  if (e.target.closest("#closeSheet")) { closeSheet(); return; }
  // Les <a data-ext> gèrent eux-mêmes l'ouverture : target="_blank" natif,
  // ce qui préserve le clic-milieu et le Ctrl+clic. Rien à intercepter.
});

let qT;
function runSearch() {
  const raw = $("q").value.trim();
  S.q = raw; S.shown = 9;
  const fsa = raw.toUpperCase().replace(/\s/g, "").slice(0, 3);
  const key = /^[GHJ]\d[A-Z]?$/.test(fsa) ? fsa.slice(0, 2) : null;
  if (key && FSA[key]) { S.origin = FSA[key]; S.q = ""; S.originLabel = fsa; S.region = null; }
  else if (TOWNS[norm(raw)]) { S.origin = TOWNS[norm(raw)]; S.q = ""; S.originLabel = raw; S.region = null; }
  else { S.origin = null; S.originLabel = ""; }
  chips(); renderGrid();
}
$("q").addEventListener("input", () => { clearTimeout(qT); qT = setTimeout(runSearch, 240); });
$("goBtn").addEventListener("click", () => {
  runSearch();
  $("parcours").scrollIntoView({ behavior: "smooth" });
});

$("contactBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Remplacez par votre vraie adresse avant la mise en ligne.
  location.href = "mailto:bonjour@example.com?subject=" +
    encodeURIComponent(LANG === "fr" ? "Correction au registre Parcours Québec" : "Parcours Québec registry correction");
});

/* ------------------------------ langue ------------------------------ */
function setLang(l) {
  LANG = l;
  const L = t();
  document.documentElement.lang = l === "fr" ? "fr" : "en";
  $("bfr").setAttribute("aria-pressed", String(l === "fr"));
  $("ben").setAttribute("aria-pressed", String(l === "en"));
  document.querySelectorAll("[data-i]").forEach((el) => {
    const v = L[el.dataset.i];
    if (v != null) el.innerHTML = v;
  });
  $("q").placeholder = L.ph;
  chips(); renderGrid(); renderRegions(); renderSteps();
  if (S.sel) openSheet(S.sel);
  if (window.PQ_featuredCourse) $("heroFeature").innerHTML = L.heroFeature(window.PQ_featuredCourse);
  measureNotice();
}
$("bfr").onclick = () => setLang("fr");
$("ben").onclick = () => setLang("en");

/* ------------------- révélations, compteurs, nav ------------------- */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let landT;
function railLand() {
  const ball = $("railBall");
  if (!ball) return;
  ball.classList.remove("land");
  void ball.offsetWidth; // relance l'animation même si elle vient de jouer
  ball.classList.add("land");
  clearTimeout(landT);
  landT = setTimeout(() => ball.classList.remove("land"), 600);
}
const revObs = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revObs.unobserve(e.target);
      if (!reduce) railLand();
    }
  });
}, { rootMargin: "0px 0px -12% 0px" });
document.querySelectorAll(".reveal").forEach((el) => revObs.observe(el));

/* la balle qui descend le rail, et le texte d'accueil qui s'efface avec
   la scène 3D au lieu de simplement défiler à plat — un seul écouteur,
   throttlé par rAF, pour les deux effets liés au défilement */
if (!reduce) {
  const rail = $("scrollRail");
  const heroCopy = document.querySelector(".hero-copy");
  const heroEl = $("top");
  let ticking = false;
  function updateScrollFx() {
    ticking = false;
    const track = Math.max(1, innerHeight - 80 - 18);
    const doc = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const frac = Math.min(1, Math.max(0, scrollY / doc));
    rail.style.setProperty("--sy", (frac * track) + "px");
    rail.style.setProperty("--sr", (scrollY * 0.6) + "deg");

    if (heroCopy && heroEl) {
      const heroP = Math.min(1, Math.max(0, scrollY / (heroEl.offsetHeight || 1)));
      heroCopy.style.setProperty("--hpy", (heroP * -60) + "px");
      heroCopy.style.setProperty("--hop", String(1 - heroP * 1.4));
    }
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScrollFx); }
  }, { passive: true });
  addEventListener("resize", updateScrollFx);
  updateScrollFx();
}

const numObs = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (!e.isIntersecting) return;
    numObs.unobserve(e.target);
    const el = e.target, to = +el.dataset.count;
    const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (reduce || to === 0) { el.textContent = pre + to + suf; return; }
    const t0 = performance.now(), dur = 1100;
    (function step(n) {
      const p = Math.min(1, (n - t0) / dur), e2 = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(to * e2) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
}, { rootMargin: "0px 0px -20% 0px" });
document.querySelectorAll("[data-count]").forEach((el) => numObs.observe(el));

/* Le bandeau d'avertissement pousse la barre de navigation vers le bas. */
function measureNotice() {
  const h = $("notice") ? $("notice").offsetHeight : 0;
  document.documentElement.style.setProperty("--notice-h", h + "px");
}
addEventListener("resize", measureNotice);

addEventListener("scroll", () => {
  $("nav").classList.toggle("stuck", scrollY > 40);
}, { passive: true });

/* --------------------- bascule 3D des fiches --------------------- */
/* Délégué sur le conteneur stable (la grille est reconstruite à chaque
   filtrage, les cartes elles-mêmes ne le sont pas). */
function tiltOn(container, selector) {
  container.addEventListener("pointermove", (e) => {
    const el = e.target.closest(selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", ((0.5 - py) * 10).toFixed(2) + "deg");
    el.style.setProperty("--ry", ((px - 0.5) * 12).toFixed(2) + "deg");
    el.style.setProperty("--ty", "-5px");
    el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
  });
  container.addEventListener("pointerout", (e) => {
    const from = e.target.closest(selector);
    if (!from || from.contains(e.relatedTarget)) return;
    ["--rx", "--ry", "--ty", "--mx", "--my"].forEach((p) => from.style.removeProperty(p));
  });
}
if (!reduce) { tiltOn($("grid"), ".tile"); tiltOn($("regionGrid"), ".rcard"); }

/* -------------------------- lueur du curseur -------------------------- */
if (!reduce && matchMedia("(pointer:fine)").matches) {
  const glow = $("cursorGlow");
  addEventListener("pointermove", (e) => {
    glow.style.setProperty("--cx", e.clientX + "px");
    glow.style.setProperty("--cy", e.clientY + "px");
    glow.classList.add("on");
  }, { passive: true });
  addEventListener("pointerout", (e) => { if (!e.relatedTarget) glow.classList.remove("on"); });
}

/* ------------------------------ départ ------------------------------ */
measureNotice();
chips();
renderGrid();
renderRegions();
renderSteps();
/* « .ready » déclenche l'entrée du titre — normalement posé par
   assets/herodrive.js (module) une fois la balle posée, ou tout de
   suite en répétition de session / mouvement réduit. Ce filet de
   sécurité l'ajoute quand même si le module échoue à charger, pour
   que le titre ne reste jamais caché (le vol dure ~3.4 s au premier
   passage — la marge évite toute course avec le déroulement normal). */
setTimeout(() => document.documentElement.classList.add("ready"), 6000);

/* la carte 3D (assets/globe.js, module chargé séparément) ouvre la
   même fiche que la liste — un seul point d'entrée, pas de doublon */
window.PQ_openSheet = openSheet;
/* assets/herodrive.js pose le parcours à l'honneur ; on lui fournit
   le texte traduit pour qu'un changement de langue le mette à jour */
window.PQ_heroFeatureText = (c) => t().heroFeature(c);
/* assets/globe.js peut s'initialiser avant ou après un premier clic de
   filtre — il lit l'état courant directement plutôt que d'attendre le
   prochain appel de window.PQ_onFilterChange */
window.PQ_currentFilter = () => ({ list: list(), region: S.region });
window.PQ_REGIONS = REGIONS;
