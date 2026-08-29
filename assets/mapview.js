/* ============================================================
   Parcours Québec — carte interactive (Leaflet + OpenStreetMap)
   ------------------------------------------------------------
   Remplace l'ancien explorateur 3D procédural : une vraie carte,
   avec de vraies routes et de vraies villes, plutôt qu'une scène
   stylisée. Tuiles CARTO « Dark Matter » (données OpenStreetMap,
   thème sombre gratuit, attribution requise — voir plus bas) pour
   rester dans l'esthétique du site sans sacrifier la précision.

   Se dégrade silencieusement : si le CDN Leaflet est bloqué ou que
   `L` n'existe pas, la section reste vide plutôt que de casser le
   reste de la page.
   ============================================================ */
(() => {
  "use strict";
  if (typeof L === "undefined") return;
  const mapEl = document.getElementById("leafletMap");
  if (!mapEl) return;

  const COURSES = window.PQ_COURSES || [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init() {
    if (mapEl.dataset.inited) return;
    mapEl.dataset.inited = "1";

    const map = L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      minZoom: 5,
      maxZoom: 16,
      worldCopyJump: false,
    });

    /* la clé CARTO (assets/config.js) retire le filigrane « API key
       required » des tuiles ; sans clé, la carte reste utilisable —
       juste avec ce filigrane. */
    const cartoKey = (window.PQ_CONFIG && window.PQ_CONFIG.cartoKey) || "";
    const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      + (cartoKey ? "?key=" + encodeURIComponent(cartoKey) : "");
    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    /* limite le panoramique aux environs du Québec, pour ne pas se
       perdre dans l'océan ou l'Ontario en glissant trop loin */
    const QC_BOUNDS = L.latLngBounds([44.7, -80.5], [62.6, -55.5]);
    map.setMaxBounds(QC_BOUNDS.pad(0.1));

    /* ---- une petite pastille dorée plutôt que l'épingle bleue par
       défaut de Leaflet — le même motif que le reste du site ---- */
    const icon = L.divIcon({
      className: "pq-pin",
      html: "<span></span>",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10],
    });

    const markers = new Map(); // id -> L.Marker
    const layer = L.layerGroup().addTo(map);

    COURSES.forEach((c) => {
      const m = L.marker([c.lat, c.lng], { icon, keyboard: false, riseOnHover: true });
      m.bindTooltip(`<b>${escapeHtml(c.name)}</b><br>${escapeHtml(c.city)}`, {
        direction: "top", offset: [0, -10], className: "pq-tooltip", sticky: false,
      });
      m.on("click", () => { if (window.PQ_openSheet) window.PQ_openSheet(c.slug); });
      markers.set(c.id, m);
    });

    function applyVisibility(list) {
      layer.clearLayers();
      (list && list.length ? list : COURSES).forEach((c) => {
        const m = markers.get(c.id);
        if (m) layer.addLayer(m);
      });
    }

    function boundsFor(list) {
      const src = list && list.length ? list : COURSES;
      return L.latLngBounds(src.map((c) => [c.lat, c.lng]));
    }

    const initialFilter = window.PQ_currentFilter ? window.PQ_currentFilter() : { list: COURSES, region: null };
    applyVisibility(initialFilter.list);
    if (initialFilter.region && initialFilter.list.length) {
      map.fitBounds(boundsFor(initialFilter.list), { padding: [36, 36], maxZoom: 12 });
    } else {
      map.fitBounds(boundsFor(COURSES), { padding: [20, 20] });
    }

    /* ---- le filtre pilote la carte : un clic = un vol vers la région,
       un « toutes régions » = retour au plan large. Même hook que
       l'ancien explorateur 3D — app.js n'a rien à savoir du changement. */
    window.PQ_onFilterChange = (visibleList, region) => {
      applyVisibility(visibleList);
      const target = region ? boundsFor(visibleList) : boundsFor(COURSES);
      map.flyToBounds(target, {
        padding: [36, 36],
        maxZoom: region ? 12 : undefined,
        duration: reduce ? 0 : 1.1,
      });
    };

    /* le clic/glissement du visiteur fait disparaître l'indice une
       bonne fois pour toutes, comme sur l'ancien explorateur */
    const hint = document.getElementById("mapHint");
    if (hint) map.once("dragstart zoomstart", () => hint.classList.add("hide"));

    /* Leaflet mesure son conteneur à l'initialisation ; si la section
       est encore en cours de révélation (opacité/transform) à ce
       moment-là, la grille de tuiles peut se tromper de taille. Un
       recalcul différé règle ça sans dépendre de l'ordre exact des
       animations CSS. */
    setTimeout(() => map.invalidateSize(), 250);
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => map.invalidateSize()).observe(mapEl);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* initialisation paresseuse : seulement quand la section approche
     de l'écran, pour ne pas télécharger de tuiles inutilement */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { init(); io.disconnect(); } });
    }, { rootMargin: "400px 0px" });
    io.observe(mapEl);
  } else {
    init();
  }
})();
