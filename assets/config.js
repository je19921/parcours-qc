/* ============================================================
   Parcours Québec — configuration
   ------------------------------------------------------------
   PHOTOS RÉELLES DES PARCOURS
   Collez ici votre clé Google Maps et chaque fiche affichera
   l'imagerie satellite réelle et récente du parcours, plus une
   vue au sol à l'entrée du club.

   Sans clé, le site retombe sur les illustrations générées —
   il continue de fonctionner, rien ne casse.

   Console Google Cloud -> activez la facturation, puis :
     · Maps Static API
     · Street View Static API
   Identifiants -> Clé API -> RESTREIGNEZ-LA :
     Restriction d'application : Référents HTTP
     Ajoutez votre domaine, ex. https://parcours.qc suivi de barre-oblique-etoile,
     plus localhost pour tester en local.
     Restriction d'API : uniquement les deux API ci-dessus.

   Cette clé est publique par nature (elle part dans le navigateur).
   C'est la restriction par référent qui la protège, pas le secret.
   Mettez une alerte de budget avant tout le reste.
   ============================================================ */
window.PQ_CONFIG = {
  googleMapsKey: "AIzaSyD-rUw5iGwISt6OiZu0ONE2pj8W6TYWosQ",   // <-- votre clé ici
  satelliteZoom: 15    // 14 = plus large, 16 = plus serré
};
