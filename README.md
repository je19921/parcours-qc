# Parcours Québec — site statique

Le dossier entier **est** le site. Aucune compilation, aucun `npm install`,
aucun serveur. Déposez-le tel quel chez n'importe quel hébergeur statique.

```
golfwebsite/
├─ index.html            la page
├─ assets/
│  ├─ styles.css         toute la mise en forme (thème unique, aube)
│  ├─ config.js          VOTRE CLÉ GOOGLE — pour les vraies photos
│  ├─ app.js             recherche, filtres, fiches, langue
│  ├─ art.js             vues aériennes et paysages générés au navigateur
│  ├─ heromap.js         la carte 2D animée de l'accueil (aucune dépendance)
│  └─ scene3d.js         rehausse 3D de la même carte, en progressive enhancement
├─ data/
│  └─ courses.js         le registre — le seul fichier à faire grandir
└─ README.md
```

Deux ressources externes : la feuille Google Fonts, et la librairie three.js
(via CDN, `<script type="importmap">` dans `index.html`) pour la couche 3D de
l'accueil. Si l'une ou l'autre est bloquée, le site continue de fonctionner —
`scene3d.js` échoue silencieusement et la carte 2D de `heromap.js` reste seule
visible. Tout le reste — images de parcours, paysages de région — est dessiné
dans le navigateur.

---

## Ce qui est vrai sur ce site, et ce qui ne l'est pas

C'est la partie importante. Une version précédente affichait des heures de
départ, des tarifs, des notes Google et des badges « Chronogolf / GolfNow /
Teesnap ». **Tout cela était inventé** — généré par une fonction aléatoire
dans le navigateur. C'est retiré.

| Donnée | État |
|---|---|
| Nom du club, ville, région | **Réel** |
| Position sur la carte | **Approximative** (± ~1 km), pas une adresse |
| Photos des parcours | **Imagerie satellite Google réelle** dès qu'une clé est configurée (`assets/config.js`). Sans clé : illustrations générées. |
| Paysages des régions | **Illustrations générées** |
| Lien de réservation | **Vérifié à la main** pour 70 des 123 parcours (GGGolf 35, Chronogolf 32, autres 3). Jamais deviné. |
| Heures de départ | **Retirées.** Aucune source réelle branchée |
| Tarifs | **Retirés** |
| Notes et nombre d'avis | **Retirés** |
| Plateforme de réservation du club | **Retirée** |
| Par, verges, type d'accès | **Retirés** |

Le bandeau en haut de page et la note de bas de page disent la même chose aux
visiteurs. **Gardez-les** tant que la donnée n'est pas réelle.

### Les liens sortants

Les trois boutons d'une fiche ouvrent des recherches Google, dans un **nouvel
onglet** (`target="_blank" rel="noopener noreferrer"`) :

- **Ouvrir dans Google Maps** — la fiche du club : adresse, téléphone, heures
- **Chercher les départs** — recherche « <club> <ville> golf réservation »
- **Itinéraire** — navigation depuis la position du visiteur

Quand `booking` existe dans `data/courses.js`, un bouton **Réserver un départ**
apparaît en premier et mène au vrai système du club. Ces 70 URL ont été
vérifiées une par une le 24 août 2026, sur le site du club ou sur une page
réellement consultée — jamais devinées à partir du nom.

Deux pièges rencontrés : plusieurs clubs gardent une fiche Chronogolf périmée
alors que leurs vraies réservations tournent sur GGGolf (toujours croire le
site du club) ; et les clubs privés renvoient une page de connexion membre à
la même forme d'URL — ceux-là sont marqués `access:"private"`, sans bouton.

---

## Les photos des parcours

Ouvrez `assets/config.js`, collez votre clé Google Maps, et chaque fiche
affiche l'imagerie **satellite réelle et à jour** du parcours, plus une **vue
au sol** Street View à l'entrée du club. Sans clé, le site retombe sur les
illustrations générées et continue de fonctionner.

Console Google Cloud : activez la facturation, puis **Maps Static API** et
**Street View Static API**. Créez une clé API et **restreignez-la** par
référent HTTP à votre domaine, et par API à ces deux-là seulement. Cette clé
part dans le navigateur : c'est la restriction qui la protège, pas le secret.
Mettez une alerte de budget. Compter environ 2 $ par 1000 images.

**Pourquoi pas les photos du site du club ou de Google Images ?** Parce
qu'elles appartiennent aux clubs et aux photographes. Les recopier et les
ré-héberger sur un site commercial est une contrefaçon. L'imagerie satellite
de Google, elle, est licenciée pour cet usage précis — et le navigateur du
visiteur la demande directement à Google, rien n'est copié chez nous.

Pour de vraies photos au sol des parcours, deux voies légitimes : demander
aux clubs leurs images (la plupart disent oui, ça leur amène des joueurs), ou
passer par **Places Photos** côté serveur — voir le dépôt Next.js.

**Limite à connaître :** l'image est centrée sur nos coordonnées, qui sont
approximatives. Pour huit fiches dont la ville a été corrigée, la coordonnée
est au niveau de la municipalité : l'image satellite montrera le village, pas
le parcours. Vérifier ces coordonnées est la prochaine tâche utile.

---

## Mettre en ligne

**Le plus rapide (2 minutes, gratuit)** — glissez le dossier `golfwebsite`
entier sur [app.netlify.com/drop](https://app.netlify.com/drop). URL HTTPS
immédiate. Même principe sur [Cloudflare Pages](https://pages.cloudflare.com)
→ Create → Upload assets.

**Avec Git (redéploie à chaque `push`)**

```bash
cd golfwebsite
git init && git add . && git commit -m "Parcours Québec"
gh repo create parcours-qc --public --push --source .
```

Puis branchez le dépôt sur Cloudflare Pages, Netlify ou Vercel.
Préréglage : **None / Other**. Commande de build : **vide**. Dossier de
sortie : **`.`**

**Nom de domaine** — achetez-le (Cloudflare Registrar, Porkbun), ajoutez-le
dans le tableau de bord de l'hébergeur, créez l'enregistrement DNS qu'il vous
indique. Le certificat TLS est automatique.

Vérifiez qu'un nom comme `parcours.golf` n'entre pas en conflit avec Golf
Québec, la fédération provinciale, avant d'imprimer quoi que ce soit.

---

## Modifier le site

**Ajouter ou corriger un parcours** — `data/courses.js`, un objet par ligne :

```js
{"id":97,"slug":"golf-du-lac-saint-joseph","name":"Golf du Lac-Saint-Joseph",
 "city":"Fossambault-sur-le-Lac","region":"Capitale-Nationale",
 "lat":46.8901,"lng":-71.6234}
```

`id` doit être unique (il détermine l'illustration générée). `slug` sert de
clé d'URL. `region` doit correspondre exactement à une région existante,
sinon elle crée un nouveau filtre.

**Changer un texte** — `assets/app.js`, objet `T`. Chaque clé existe en `fr`
et en `en`. Le HTML porte des attributs `data-i` qui pointent vers ces clés.

**Changer les couleurs** — `assets/styles.css`, bloc `:root` en haut.
`--dawn` est l'or, `--night` le fond, `--mist` le texte.

**Avant la mise en ligne** — remplacez `bonjour@example.com` dans
`assets/app.js` (bouton « Nous écrire ») et ajoutez une vraie image
`og.jpg` (1200×630) référencée dans `index.html`. Les aperçus de liens
n'exécutent pas de JavaScript : cette image-là ne peut pas être générée.

---

## Pour de vraies heures de départ

C'est le vrai produit, et ça ne se fait pas dans un fichier statique — il faut
un serveur qui interroge les systèmes de réservation et met en cache le
résultat. Le dépôt Next.js livré séparément (`parcours-qc-google-maps.zip`)
contient déjà la base : schéma PostGIS, recherche géographique, intégration
Google Maps satellite, et l'interface d'adaptateur par plateforme.

L'ordre qui gaspille le moins d'effort :

1. **Compléter le registre** — recouper OpenStreetMap (`leisure=golf_course`
   dans la zone administrative du Québec), Google Places et les répertoires de
   Golf Québec et de l'ACGQ. Vérifier chaque fiche à la main une fois.
2. **Identifier la plateforme de chaque club** et noter son identifiant réel.
   C'est le champ le plus précieux du registre, et personne d'autre ne l'a.
3. **Demander l'accès partenaire** à la plateforme la plus répandue au Québec
   avant d'écrire une seule ligne de code d'extraction — l'approbation prend
   des semaines que vous pouvez passer à construire.
4. **N'afficher une disponibilité que datée.** Si un flux échoue depuis six
   heures, la fiche doit dire « vérifiez sur le site du club », jamais montrer
   une heure périmée. Un seul départ fantôme et le visiteur ne revient pas.
