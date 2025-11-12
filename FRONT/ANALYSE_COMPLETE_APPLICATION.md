# 📋 ANALYSE COMPLÈTE DE L'APPLICATION CHECKEASY

## 🎯 Vue d'ensemble

CheckEasy est une application web Progressive (PWA) de gestion d'états de lieux (check-in/checkout) pour des logements. L'application permet aux agents de ménage et aux voyageurs de documenter l'état des pièces avec photos, tâches et signalements, le tout synchronisé avec une API backend Bubble.

---

## 📁 ARCHITECTURE GLOBALE

```
src/
├── main.tsx                 # Point d'entrée React
├── App.tsx                  # Configuration routage & providers
├── config/                  # Configuration environnement
├── types/                   # Définitions TypeScript
├── contexts/                # React Contexts (états globaux)
├── hooks/                   # Custom React Hooks
├── services/                # Logique métier & API
├── utils/                   # Utilitaires & helpers
├── data/                    # Données statiques
├── lib/                     # Bibliothèques tierces
├── pages/                   # Composants pages (routes)
└── components/              # Composants UI réutilisables
```

---

## 🔧 FICHIERS PRINCIPAUX

### **main.tsx**
Point d'entrée de l'application React. Initialise le rendu React, lance la migration automatique des sessions CheckID depuis localStorage vers IndexedDB au démarrage. Garantit la persistance des données utilisateur.

### **App.tsx**  
Configure toute l'arborescence de providers React (UserProvider, contextes de flux, signalements) et le routage React Router. Initialise les polyfills caméra dès le chargement. Protège les routes avec ProtectedRoute. Gère la restauration des paramètres URL et de la route après rechargement.

### **vite-env.d.ts**
Fichier de déclaration TypeScript pour Vite. Permet à TypeScript de reconnaître les types spécifiques à Vite (import.meta, etc.).

---

## ⚙️ CONFIGURATION & DONNÉES

### **config/environment.ts**
Centralise TOUTES les variables d'environnement : URLs API Bubble, configuration upload d'images, paramètres caméra, IndexedDB, session timeout. Exporte un logger adaptatif selon le niveau de debug. Configuration robuste pour développement et production.

### **lib/utils.ts**
Utilitaire Tailwind CSS pour fusionner les classes CSS dynamiquement avec `clsx` et `tailwind-merge`. Fonction `cn()` utilisée partout dans l'UI pour gérer les classes conditionnelles proprement.

### **data/roomsData.ts**
Données statiques de référence des pièces (chambre, salon, cuisine) avec photos de référence, tâches par type de flux (checkin/checkout). Génère dynamiquement les tâches selon le flowType. **Note : Partiellement remplacé par l'API mais conservé pour compatibilité.**

---

## 📊 TYPES TYPESCRIPT

### **types/room.ts**
Types fondamentaux pour les pièces et tâches : `Room`, `Task`, `PhotoReference`, `PieceStatus`, `FlowType`. Gère les types de tâches (checkbox, photo_required, photo_multiple, etc.). Inclut les nouveaux champs API : `etapeID` (ID unique étape), `isTodo` (tâche de ménage).

### **types/signalement.ts**
Structure des signalements (problèmes rapportés) : ID unique, localisation (roomId, etapeId), contenu (titre, commentaire), images (URL + Base64), métadonnées (flowType, origine CLIENT/AGENT, status, priorité). Timestamps de création/modification.

### **types/exitQuestions.ts**
Types pour les questions de sortie posées uniquement lors du checkout après validation de toutes les pièces. Types de questions : boolean, image, text. Réponses sauvegardées dans localStorage puis synchronisées vers l'API. État complet géré par `ExitQuestionsState`.

### **types/photoCapture.ts**
Types pour la capture photo avancée : `CapturedPhoto` (blob, dataUrl, métadonnées), `CameraSettings`, états du modal de capture, résultats des hooks `useCamera` et `usePhotoCapture`. Compatible cross-browser avec gestion orientation et fallbacks iOS.

---

## 🗄️ CONTEXTS (États Globaux)

### **contexts/UserContext.tsx**
Gère l'authentification utilisateur : login/logout, types d'utilisateurs (AGENT/GESTIONNAIRE/CLIENT), persistance dans localStorage. Fournit `isAuthenticated` pour les routes protégées. Permet de mettre à jour les infos utilisateur dynamiquement.

### **contexts/ActiveCheckIdContext.tsx**  
**Contexte critique**. Gère le CheckID actif (identifiant unique de session check-in/checkout). Migré vers IndexedDB via checkSessionManager. Crée/active/complète/nettoie les CheckID. Restaure depuis URL (priorité absolue) puis localStorage. Évite contamination entre parcours différents.

### **contexts/GlobalParcoursContext.tsx**
Provider central des données de parcours : chargement depuis API ou cache (IndexedDB), transformation via DataAdapter, état de chargement, statistiques (nombre de pièces/tâches/photos). Permet de forcer le mode checkin/checkout. Fournit les signalements API par pièce.

### **contexts/AppFlowContext.tsx**
Gère la progression globale du workflow application : étapes (checkin → cleaning → checkout → completed), pourcentage de complétion, compteurs photos/tâches. Calcule automatiquement l'étape actuelle. Fournit configuration UI pour chaque étape (titre, CTA, etc.).

### **contexts/CheckinFlowContext.tsx**
Gère le flux checkin : séquence d'étapes par pièce, tâches complétées, photos prises. Sauvegarde/restaure la progression depuis CheckID (IndexedDB). Implémente lazy initialization (ne s'active que sur routes checkin). Gère navigation auto entre pièces.

### **contexts/CheckoutFlowContext.tsx**  
Similaire à CheckinFlowContext mais pour le checkout. Gère les tâches de ménage avec checkboxes. Calcule progression par pièce. Auto-avancement quand pièce complétée. Séquence différente du checkin (plusieurs tâches par pièce).

### **contexts/UnifiedFlowContext.tsx**
**Contexte unifié** destiné à remplacer progressivement CheckinFlowContext et CheckoutFlowContext. Gère les deux flux avec une API commune. Séquences hardcodées pour checkin (3 étapes) et checkout (5 étapes). État centralisé pour tâches complétées et photos prises.

### **contexts/ReportProblemContext.tsx**
Modal global de signalement de problèmes. Gère l'ouverture/fermeture du modal, pré-sélection optionnelle d'une pièce. Permet de rapporter un problème depuis n'importe où dans l'app avec contexte préservé.

### **contexts/SignalementsContext.tsx**
Gère l'état global des signalements : ajout/résolution/filtrage. Charge automatiquement les signalements depuis CheckID au montage. Sauvegarde via interactionTracker. Synchronise avec IndexedDB. Fournit getSignalementsByRoom, getPendingSignalements.

---

## 🪝 HOOKS PERSONNALISÉS

### **hooks/use-mobile.tsx**
Détecte si l'appareil est mobile (breakpoint < 768px). Écoute les changements de taille de fenêtre. Utilisé pour adapter l'UI mobile/desktop.

### **hooks/use-toast.ts**
Système de notifications toast avec reducer pattern. Limite à 1 toast visible. Délai d'auto-suppression configurable. Actions : ADD, UPDATE, DISMISS, REMOVE. État géré en mémoire avec listeners.

### **hooks/useAutoSaveCheckId.ts**
**Hook essentiel**. Auto-sauvegarde toutes les interactions dans le CheckID actif : clics boutons (`saveButtonClick`), photos (`savePhotoTaken`), checkboxes (`saveCheckboxChange`), signalements (`saveSignalement`), navigation (`saveNavigation`), états pièces (`savePieceStatusChange`). Synchronise automatiquement avec IndexedDB via interactionTracker.

### **hooks/useCamera.ts**
**Hook complexe** de gestion caméra avec 536 lignes. Gère permissions, détection/sélection caméras, démarrage/arrêt stream, diagnostics détaillés. Compatible cross-browser (iOS Safari, Chrome, Android). Polyfills et fallbacks multiples. Détecte si mauvaise caméra démarrée (avant au lieu d'arrière). Logs diagnostic visibles pour debug sur iPhone.

### **hooks/useCheckoutFlowManager.ts**
Hook de gestion du flux checkout avec synchronisation CheckID. Restaure progression et tâches complétées depuis IndexedDB. Sauvegarde position utilisateur (currentPieceId, currentTaskIndex). Gère navigation entre pièces/tâches. Calcule progression totale. Valide parcoursId pour éviter contamination entre parcours.

### **hooks/useImageUpload.ts**
Interface React pour le service d'upload images. Déclenche uploads asynchrones, suit le statut (pending/uploading/success/error), gère les retry. Retourne URL uploadée ou URL locale (dataURL) en fallback. Synchronise état avec imageUploadService via listeners.

### **hooks/useInteractionTracking.ts**
Interface React pour interactionTracker. Fournit méthodes de tracking (`trackButtonClick`, `trackPhotoTaken`, `trackCheckboxChange`, `trackSignalement`, `trackNavigation`). Charge/rafraîchit états visuels des pièces (`PieceVisualState`, `TaskVisualState`). Cache les états en mémoire pour performance.

### **hooks/useOrientation.ts**
Détecte et gère orientation appareil (portrait/landscape). Multiple méthodes pour compatibilité : Screen Orientation API, window.orientation (iOS), dimensions fenêtre. Permet de verrouiller/déverrouiller l'orientation (mobile uniquement). Hook `useImageOrientation` pour détecter orientation d'une image.

### **hooks/usePhotoCapture.ts**
Capture photos depuis stream vidéo avec optimisations mémoire. Gère rotation appareil, compression, conversion Blob→DataURL. Stocke photos capturées par référenceId. Fix rotation pour iOS/Android. Qualité adaptée au navigateur (80% iOS, 85% autres). Limite 5MB par photo.

### **hooks/useRoomsData.ts**
Hook legacy pour générer pièces et tâches depuis roomsData.ts statique. **Partiellement obsolète** car remplacé par GlobalParcoursContext qui charge depuis l'API. Conservé pour compatibilité.

---

## 🔌 SERVICES (Logique Métier)

### **services/checkSessionManager.ts**
**Service IndexedDB critique**. Gère cycle de vie complet des sessions CheckID : création, sauvegarde, récupération, mise à jour, suppression. Store `checkSessions` avec index sur userId, parcoursId, status. Gère migrations si store manquant. Méthodes async pour toutes les opérations. Fonction de reset DB en cas de corruption.

**Méthodes clés:**
- `createCheckSession()` : Crée une nouvelle session avec userInfo et parcoursInfo
- `saveCheckSession()` : Sauvegarde avec auto-retry si store manquant
- `getCheckSession()` : Récupère par checkId
- `updateSessionProgress()` : Deep merge des interactions pour préserver données
- `completeCheckSession()` : Marque comme complétée
- `checkExistingSessions()` : Vérifie si session active/complétée existe
- `getUserSessions()` : Toutes les sessions d'un utilisateur

### **services/dataAdapter.ts**
**Adapteur critique**. Transforme le Data.json de l'API Bubble vers le format TypeScript de l'app. Gère les 2 modes (checkin/checkout) avec des règles différentes. Extrait etapeID de chaque étape. Filtre étapes par mode (photos entrée vs tâches ménage). Génère tasks avec photo_references correctes. Préserve travelerNote/cleanerNote/infoEntrance. **Contient la logique complexe de mapping API→UI (571 lignes).**

**Fonctions principales:**
- `adaptRealDataToExistingFormat()` : Point d'entrée principal
- `adaptPieceToRoom()` : Convertit une pièce API vers Room
- `adaptEtapeToTask()` : Convertit une étape API vers Task
- `adaptApiSignalementsToFormat()` : Transforme signalements API

### **services/debugService.ts**
Service de debug pour développement. [Contenu non lu pour économiser tokens mais présent.]

### **services/imageUploadService.ts**
**Service d'upload asynchrone vers API Bubble**. Queue d'upload avec retry (3 tentatives max). Convertit blob→base64, crée payload JSON, envoie en POST. Sauvegarde URL uploadée dans localStorage (clé: `uploaded_image_{imageId}`). Gère timeout (30s), listeners de progression. Compatible avec checkId pour traçabilité. **Version base64 pour compatibilité Bubble.**

**Workflow:**
1. `queueUpload()` : Ajoute à la queue
2. `processUpload()` : Traite l'upload avec retry
3. `uploadToAPI()` : POST vers endpoint Bubble
4. Sauvegarde URL dans localStorage
5. Notifie tous les listeners du statut

### **services/interactionTracker.ts**
**Service de tracking granulaire ultra-complet**. Capture TOUTES les interactions utilisateur et les synchronise avec CheckID (IndexedDB). Types d'interactions : ButtonClick, Photo, Checkbox, Signalement, PieceState, Navigation, ExitQuestion. Génère IDs uniques pour photos/signalements. Fournit méthodes de récupération d'état (`getPieceInteractionState`, `getCheckboxStates`, `getPhotoStates`).

**Stockage:**
```typescript
progress: {
  interactions: {
    buttonClicks: Record<string, ButtonClickInteraction[]>
    photosTaken: Record<string, PhotoInteraction[]>
    checkboxStates: Record<string, CheckboxInteraction>
    signalements: Record<string, SignalementInteraction>
    pieceStates: Record<string, PieceStateInteraction>
    navigation: NavigationInteraction[]
    exitQuestions: Record<string, ExitQuestionInteraction>
  }
}
```

### **services/parcoursManager.ts**
Manager central pour les données de parcours. Charge depuis API, notifie les subscribers, gère le parcours actuel. Permet de charger avec mode forcé (forceFlowType). Calcule statistiques (totalRooms, totalTasks, totalPhotos). Pattern Observable avec subscribe/notify.

### **services/parcoursCache.ts**
Cache IndexedDB pour les parcours. Store `parcoursCache` avec TTL (24h par défaut). Évite de recharger l'API à chaque visite. Méthodes : `saveParcours()`, `getParcours()`, `isCacheValid()`, `clearCache()`. Métadonnées (nom, type, roomsCount) pour affichage sans parsing.

### **services/migrateCheckSessions.ts**  
Service de migration localStorage→IndexedDB. Lancé automatiquement au démarrage (main.tsx). Migre les anciennes sessions du format localStorage vers checkSessionManager. Marque les sessions migrées. Nettoie localStorage après migration.

### **services/urlPersistenceService.ts**  
Sauvegarde/restaure les paramètres URL dans sessionStorage. Clés: `checkid`, `parcours`, `mode`, `piece`. Permet de préserver le contexte après F5. Utilisé par UrlParamRestoration component.

### **services/webhookDataGenerator.ts**
Génère le payload JSON pour l'envoi final vers l'API Bubble. Collecte toutes les données du CheckID : infos utilisateur, parcours, photos uploadées, signalements, questions de sortie. Format optimisé pour l'endpoint Bubble `/checkendpoint`. Gère les deux modes (checkin/checkout).

---

## 🧰 UTILITAIRES

### **utils/cameraPolyfills.ts**
Polyfills pour compatibilité caméra cross-browser. Détecte type de navigateur (iOS, Android, desktop), version. Fonctions : `initializeCameraPolyfills()`, `detectBrowser()`, `isSecureContext()`, `getDeviceOrientation()`, `resizeImage()`. Gère les APIs manquantes ou non-standard.

### **utils/cameraCompatibilityTest.ts**
Tests automatiques de compatibilité caméra au démarrage (DEV uniquement). Vérifie : API disponible, contexte HTTPS, permissions, détection caméras. Génère rapport détaillé avec tests critiques et warnings. Affiché dans console pour diagnostic.

### **utils/homeNavigationDebug.ts**  
Outils de debug pour navigation. [Contenu non lu mais présent.]

### **utils/navigationDiagnostic.ts**
Diagnostics avancés pour problèmes de navigation/routing. [Contenu non lu mais présent.]

### **utils/navigationHelpers.ts**
Helpers pour gérer la navigation programmatique avec preservation du contexte (checkId, parcoursId). Fonctions sécurisées pour naviguer sans perdre l'état.

### **utils/navigationTestSuite.ts**
Suite de tests automatiques pour valider la navigation. [Contenu non lu mais présent.]

### **utils/propertyDataHelpers.ts**
Helpers pour manipuler les données de propriétés/logements. Formatage, validation, extraction de métadonnées.

---

## 📄 PAGES (Routes)

### **pages/Welcome.tsx** (1214 lignes)
**Page d'entrée ultra-complexe**. Formulaire de connexion avec sélection utilisateur/parcours. Gère création/reprise de CheckID. Initialise la caméra (demande permissions). Valide données avant de commencer. Gère reprise de sessions existantes. Charge le parcours via GlobalParcoursContext. **Point d'entrée critique de l'app.**

### **pages/CheckEasy.tsx**
Dashboard principal après connexion. Affiche résumé du parcours, progression, boutons d'action. Navigue vers checkin/checkout selon le contexte.

### **pages/CheckIn.tsx**
Page principale du flux checkin. Affiche les pièces, gère la navigation entre pièces, capture des photos d'état d'entrée. Intègre PhotoCaptureModal, RoomReference, TaskManager. Sauvegarde automatique dans CheckID.

### **pages/CheckinHome.tsx**
Écran d'accueil du checkin avec instructions. Bouton CTA pour démarrer. Affiche infos parcours et utilisateur.

### **pages/CheckOut.tsx**
Page principale du flux checkout. Similaire à CheckIn mais pour les tâches de ménage. Gère checkboxes, photos de validation, navigation auto entre tâches.

### **pages/CheckoutHome.tsx** (341 lignes)
Écran d'accueil du checkout avec résumé des pièces, progression, boutons d'action. Gère navigation vers pièces spécifiques. Affiche états (VALIDEE/INCOMPLETE/VIDE).

### **pages/EtatInitial.tsx**
Page de visualisation de l'état initial (photos de checkin). Affichage read-only des photos capturées lors de l'entrée.

### **pages/ExitQuestionsPage.tsx**
Page des questions de sortie (checkout uniquement). Affiche questions dynamiques de l'API. Types : boolean (checkboxes), image (capture photo), text (input). Sauvegarde réponses dans localStorage puis synchronise vers CheckID.

### **pages/ExitQuestionsPageWrapper.tsx**
Wrapper pour ExitQuestionsPage qui charge les questions depuis l'API et gère les états de chargement/erreur. Point d'entrée depuis la route `/exit-questions`.

### **pages/Index.tsx**
Page d'accueil/landing ou dashboard. Redirige probablement vers Welcome si non authentifié.

### **pages/NotFound.tsx**
Page 404 pour routes inexistantes. Affiche message d'erreur et lien retour.

### **pages/SignalementsATraiter.tsx**
Liste des signalements en attente de traitement (status: A_TRAITER). Filtrable par pièce. Permet de marquer comme résolu. Synchronise avec SignalementsContext.

### **pages/SignalementsHistorique.tsx**
Historique complet de tous les signalements (résolus et en attente). Affichage chronologique avec filtres.

---

## 🧩 COMPOSANTS PRINCIPAUX

### **components/PhotoCaptureModal.tsx** (1490 lignes)
**Composant le plus complexe de l'app**. Modal full-screen de capture photo avec preview vidéo, overlay semi-transparent de la photo de référence, ghost image alignée. Gère stream caméra, capture, validation, retake. Carousel pour photos multiples. Détection orientation (portrait/landscape). Upload automatique après validation. Compatible iOS/Android avec fallbacks.

**Features:**
- Preview vidéo + overlay ghost ajustable (opacité)
- Capture avec rotation device correcte
- Validation/retake illimité
- Upload asynchrone automatique
- Carrousel navigation entre références
- Diagnostic caméra intégré
- Gestion orientation lock/unlock

### **components/TaskManager.tsx** (310 lignes)
Gère l'affichage et l'interaction avec les tâches d'une pièce. Types de tâches : checkbox, photo_required, photo_multiple, reference_photos. Intègre PhotoCaptureModal. Marque tâches comme complétées. Synchronise avec CheckID via useAutoSaveCheckId.

### **components/RoomTaskCard.tsx**
Carte d'affichage d'une tâche individuelle. Affiche icône, titre, description, statut complétion. Boutons d'action selon le type (prendre photo, cocher checkbox).

### **components/TaskCard.tsx**
Variante de RoomTaskCard avec style/layout différent. Utilisé dans différents contextes UI.

### **components/PieceSelector.tsx**
Sélecteur de pièces avec dropdown/liste. Affiche progression par pièce (nombre tâches complétées/total). Permet de sauter à une pièce spécifique. Intégré dans CheckOut/CheckIn.

### **components/PhotoCarousel.tsx**
Carousel pour naviguer entre plusieurs photos (reference ou capturées). Swipe, boutons prev/next, indicateurs. Utilisé dans PhotoCaptureModal et pour affichage photos capturées.

### **components/ReportProblemModal.tsx**
Modal de création de signalement. Sélection pièce, saisie titre/commentaire, priorité, capture photo optionnelle. Sauvegarde dans SignalementsContext qui synchronise vers CheckID.

### **components/SignalementsCard.tsx**  
Carte d'affichage d'un signalement avec photo, titre, commentaire, métadonnées. Bouton pour résoudre. Utilisée dans SignalementsATraiter/Historique.

### **components/ProtectedRoute.tsx**
HOC pour protéger les routes. Vérifie `isAuthenticated` du UserContext. Redirige vers `/welcome` si non connecté. Préserve la route de destination pour redirection après login.

### **components/RouteRestoration.tsx**
Empêche les redirections non voulues après F5. Restaure la route depuis sessionStorage si disponible.

### **components/UrlParamRestoration.tsx**  
Restaure les paramètres URL (`checkid`, `parcours`, etc.) depuis sessionStorage après rechargement. Travaille avec urlPersistenceService.

### **components/ProfileSheet.tsx**
Sheet/drawer affichant le profil utilisateur : nom, prénom, type, téléphone. Bouton déconnexion.

### **components/ProgressTracker.tsx**
Barre de progression visuelle avec pourcentage. Affiche avancement global du parcours.

### **components/PropertyInfo.tsx**
Affiche infos du logement/propriété : nom, adresse, type. Utilisé dans headers de pages.

### **components/RoomReference.tsx**
Affiche la/les photo(s) de référence pour une pièce avec instructions. Utilisé avant la capture pour montrer ce qui est attendu.

### **components/RoomsModal.tsx**
Modal avec liste complète des pièces du parcours. Permet navigation rapide. Affiche statuts et progression.

### **components/CleaningInstructionsModal.tsx**
Modal affichant instructions de nettoyage spécifiques à une pièce. Texte provenant du `cleanerNote` de l'API.

### **components/HelpSheet.tsx**
Drawer d'aide contextuelle. FAQ, tutoriel, contact support.

### **components/DebugModal.tsx**
Modal de debug (DEV uniquement) affichant état de l'app, CheckID, parcours, interactions. Boutons d'actions debug (reset DB, clear cache, etc.).

### **components/WebhookTestModal.tsx**
Modal de test webhook (DEV). Permet de tester l'envoi du payload vers l'API sans compléter tout le parcours.

### **components/DataSourceToggle.tsx**
Toggle DEV pour basculer entre données API et données mock. Permet de tester sans backend.

### **components/CameraTest.tsx**
Page/modal de test caméra standalone. Tests de permissions, détection caméras, capture test, diagnostic complet. Accessible via `/camera-test`.

### **components/ParcoursManager.tsx**
Composant de gestion de parcours (admin). Liste des parcours, création, édition, suppression. [Probablement admin-only.]

### **components/UserAvatar.tsx**
Avatar utilisateur avec initiales ou photo. Utilisé dans header.

### **components/UserSessionsListDialog.tsx**
Dialog listant toutes les sessions d'un utilisateur. Permet de reprendre ou supprimer. Utilisé pour gestion multi-sessions.

### **components/OrientationPrompt.tsx**
Overlay demandant à l'utilisateur de tourner son appareil si mauvaise orientation. Affiché quand orientation attendue ≠ orientation actuelle.

### **components/LockOrientation.tsx**
Composant qui verrouille l'orientation de l'écran (portrait ou landscape) quand monté. Déverrouille au démontage.

### **components/InteractiveButton.tsx**
Bouton avec feedback tactile amélioré et tracking automatique des clics. Utilise useAutoSaveCheckId en interne.

### **components/ExitQuestionItem.tsx**
Composant pour un item de question de sortie. Gère les 3 types (boolean, image, text). Capture photo si imageRequired. Sauvegarde réponse au changement.

### **components/AIReport.tsx**
[Non exploré - Probablement génération de rapport AI/ML.]

### **components/CleaningTasks.tsx**
[Non exploré - Liste de tâches de nettoyage.]

### **components/EditUserFieldModal.tsx**
[Non exploré - Édition champs utilisateur.]

### **components/PieceStepsOverview.tsx**
[Non exploré - Vue d'ensemble des étapes d'une pièce.]

### **components/SignalementsWarningModal.tsx**
[Non exploré - Modal de warning pour signalements.]

### **components/TaskNavigationAccordion.tsx**
[Non exploré - Accordion de navigation entre tâches.]

### **components/PhotoZoomModal.tsx**
Modal de zoom sur une photo capturée. Pinch-to-zoom, pan. Affichage plein écran.

---

## 🎨 COMPOSANTS UI (components/ui/)

La bibliothèque UI complète basée sur shadcn/ui (Radix UI + Tailwind) :

**Layout & Navigation:**
- `sidebar.tsx`, `navigation-menu.tsx`, `breadcrumb.tsx`, `menubar.tsx`, `tabs.tsx`, `pagination.tsx`

**Overlays:**
- `dialog.tsx`, `sheet.tsx`, `drawer.tsx`, `alert-dialog.tsx`, `popover.tsx`, `tooltip.tsx`, `hover-card.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `command.tsx`

**Forms:**
- `form.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `slider.tsx`, `calendar.tsx`, `input-otp.tsx`

**Display:**
- `card.tsx`, `alert.tsx`, `badge.tsx`, `avatar.tsx`, `skeleton.tsx`, `separator.tsx`, `table.tsx`, `typography.tsx`, `chart.tsx`, `carousel.tsx`, `aspect-ratio.tsx`

**Feedback:**
- `toast.tsx`, `toaster.tsx`, `sonner.tsx`, `progress.tsx`

**Interaction:**
- `button.tsx`, `toggle.tsx`, `toggle-group.tsx`, `collapsible.tsx`, `accordion.tsx`, `resizable.tsx`, `scroll-area.tsx`

**Custom:**
- `cta-section.tsx` : Section CTA personnalisée avec style CheckEasy
- `use-toast.ts` : Hook toast (doublon avec hooks/)

---

## 🔗 LIENS ET DÉPENDANCES ENTRE FICHIERS

### 🌊 Flux de Données Principal

```
API Bubble (Data.json)
    ↓
parcoursManager.ts (charge + cache)
    ↓
dataAdapter.ts (transforme API → TypeScript)
    ↓
GlobalParcoursContext.tsx (state React global)
    ↓
Pages (CheckIn/CheckOut/etc.)
    ↓
Components (TaskManager, PhotoCaptureModal, etc.)
    ↓
Hooks (useAutoSaveCheckId, useInteractionTracking)
    ↓
Services (interactionTracker, checkSessionManager)
    ↓
IndexedDB (persistence locale)
    ↓
webhookDataGenerator.ts (génère payload final)
    ↓
API Bubble (envoi final /checkendpoint)
```

### 🔄 Cycle de Vie d'une Session

1. **Démarrage** (`Welcome.tsx`)
   - Utilisateur se connecte → `UserContext`
   - Sélectionne parcours → `GlobalParcoursContext.loadParcours()`
   - Crée CheckID → `ActiveCheckIdContext.createNewCheckId()`
   - Stocke dans IndexedDB → `checkSessionManager.createCheckSession()`

2. **Parcours** (`CheckIn.tsx` ou `CheckOut.tsx`)
   - Affiche pièces depuis `GlobalParcoursContext.rooms`
   - Capture photos → `PhotoCaptureModal` + `usePhotoCapture`
   - Upload asynchrone → `imageUploadService`
   - Coche tâches → `TaskManager` + `useAutoSaveCheckId`
   - Signale problèmes → `ReportProblemModal` + `SignalementsContext`
   - **TOUT est sauvegardé en temps réel** → `interactionTracker` → `checkSessionManager` → IndexedDB

3. **Questions de Sortie** (`ExitQuestionsPage.tsx`, checkout uniquement)
   - Charge questions depuis API
   - Répond aux questions (boolean/image/text)
   - Sauvegarde dans localStorage puis CheckID

4. **Finalisation**
   - Marque CheckID comme complété → `checkSessionManager.completeCheckSession()`
   - Génère payload webhook → `webhookDataGenerator`
   - Envoie vers API → POST `/checkendpoint` ou `/checkinendpoint/initialize`

### 🔌 Dépendances des Contexts

```
UserProvider (racine)
├─ GlobalParcoursProvider
│  ├─ BrowserRouter
│  │  ├─ ActiveCheckIdProvider
│  │  │  ├─ AppFlowProvider
│  │  │  │  ├─ UnifiedFlowProvider
│  │  │  │  │  ├─ CheckoutFlowProvider
│  │  │  │  │  │  ├─ CheckinFlowProvider
│  │  │  │  │  │  │  ├─ SignalementsProvider
│  │  │  │  │  │  │  │  ├─ ReportProblemProvider
│  │  │  │  │  │  │  │  │  ├─ TooltipProvider
│  │  │  │  │  │  │  │  │  │  ├─ Toaster + Sonner
│  │  │  │  │  │  │  │  │  │  └─ Routes (pages)
```

**Note:** L'ordre d'imbrication est crucial car certains providers dépendent des autres (ex: SignalementsProvider a besoin de ActiveCheckIdContext).

### 🧩 Dépendances des Hooks

- **useAutoSaveCheckId** ← `useActiveCheckId()`, `interactionTracker`
- **useInteractionTracking** ← `useUser()`, `useParcoursData()`, `checkSessionManager`, `interactionTracker`
- **useCheckoutFlowManager** ← `useActiveCheckId()`, `checkSessionManager`
- **useCamera** ← `environment`, polyfills/cameraPolyfills
- **useImageUpload** ← `imageUploadService`
- **usePhotoCapture** ← polyfills/cameraPolyfills

### 📦 Dépendances des Services

- **checkSessionManager** ← `environment` (IndexedDB name/version)
- **dataAdapter** ← `types/room`, `types/signalement`
- **parcoursManager** ← `dataAdapter`, pattern Observable
- **parcoursCache** ← `environment` (IndexedDB)
- **interactionTracker** ← `checkSessionManager`, tous les types d'interactions
- **imageUploadService** ← `environment` (API URL, timeout), `interactionTracker`
- **webhookDataGenerator** ← tous les types, `checkSessionManager`, `imageUploadService`
- **migrateCheckSessions** ← `checkSessionManager`
- **urlPersistenceService** ← sessionStorage

### 🎯 Composants ↔ Hooks ↔ Services

```
PhotoCaptureModal
├─ useCamera (stream, permissions, diagnostics)
├─ usePhotoCapture (capture, storage)
├─ useImageUpload (upload asynchrone)
└─ useAutoSaveCheckId (sauvegarde dans CheckID)
    └─ interactionTracker (tracking granulaire)
        └─ checkSessionManager (persistence IndexedDB)
```

```
TaskManager
├─ useAutoSaveCheckId
├─ Context (CheckinFlow ou CheckoutFlow)
└─ PhotoCaptureModal (si tâche photo)
```

```
ReportProblemModal
├─ SignalementsContext (ajout signalement)
│  └─ interactionTracker
│      └─ checkSessionManager
└─ useImageUpload (si photo jointe)
```

---

## 📊 PATTERNS ET ARCHITECTURES

### 🏗️ Architecture en Couches

```
┌─────────────────────────────┐
│   UI Layer (Components)     │
│   - Pages, Components, UI   │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   State Layer (Contexts)    │
│   - Global state, Providers │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Logic Layer (Hooks)       │
│   - Business logic, Effects │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Service Layer             │
│   - API, Storage, Utils     │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Storage Layer             │
│   - IndexedDB, localStorage │
└─────────────────────────────┘
```

### 🔄 Pattern Observable (parcoursManager)

```typescript
// Publisher
class ParcoursManager {
  private subscribers: Set<Listener> = new Set();
  
  subscribe(listener: Listener) { /* ... */ }
  notify(data: ParcoursData) { /* ... */ }
}

// Subscriber (GlobalParcoursContext)
useEffect(() => {
  const unsubscribe = parcoursManager.subscribe((data) => {
    setCurrentParcours(data);
  });
  return unsubscribe;
}, []);
```

### 💾 Pattern Repository (checkSessionManager)

Encapsule la logique d'accès aux données IndexedDB derrière une API claire :
- `createCheckSession()` : Create
- `getCheckSession()` : Read
- `updateCheckSession()` : Update (partiel)
- `saveCheckSession()` : Update (complet)
- `deleteCheckSession()` : Delete
- Méthodes de query : `getUserSessions()`, `checkExistingSessions()`

### 🎣 Pattern Custom Hooks

Extraction de logique réutilisable dans des hooks :
- **Data fetching** : `useRoomsData`
- **Side effects** : `useAutoSaveCheckId`, `useInteractionTracking`
- **Device APIs** : `useCamera`, `useOrientation`
- **UI state** : `usePhotoCapture`, `useImageUpload`

### 🌐 Pattern Context + Provider

Chaque context suit le même pattern :
```typescript
// 1. Interface du context
interface XContextType { /* ... */ }

// 2. Création du context
const XContext = createContext<XContextType | undefined>(undefined);

// 3. Provider component
export const XProvider: React.FC<{ children }> = ({ children }) => {
  const [state, setState] = useState(/* ... */);
  // ... logique ...
  return <XContext.Provider value={{}}>{children}</XContext.Provider>;
};

// 4. Hook custom pour consommer
export const useX = (): XContextType => {
  const context = useContext(XContext);
  if (!context) throw new Error('useX must be used within XProvider');
  return context;
};
```

### 🔁 Pattern Adapter (dataAdapter)

Transforme les données d'une API externe vers le format interne de l'app :
```
API Format (Bubble) → Adapter → App Format (TypeScript)
```
Permet de changer l'API sans toucher à l'UI.

### ⚡ Pattern Auto-Save

Toutes les interactions sont auto-sauvegardées immédiatement :
```
User Action → Component → useAutoSaveCheckId → interactionTracker → checkSessionManager → IndexedDB
```
Aucun bouton "Sauvegarder" nécessaire. Garantit la persistance même en cas de crash/fermeture.

### 📤 Pattern Queue + Retry (imageUploadService)

```typescript
class ImageUploadService {
  private uploadQueue: Map<string, UploadRequest>;
  private async processUpload(id: string) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.uploadToAPI(request);
        if (result.success) break;
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;
        await sleep(RETRY_DELAY * attempt); // Exponential backoff
      }
    }
  }
}
```

### 🎭 Pattern Polyfill + Fallback (camera)

Gère les différences entre navigateurs avec plusieurs niveaux de fallback :
```typescript
// Tentative 1 : API moderne avec contraintes optimales
try {
  stream = await getUserMedia({ video: { facingMode: { exact: 'environment' } } });
} catch (error) {
  // Tentative 2 : API moderne avec contraintes relâchées
  try {
    stream = await getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
  } catch (error) {
    // Tentative 3 : N'importe quelle caméra
    stream = await getUserMedia({ video: true });
  }
}
```

---

## 🚀 FONCTIONNALITÉS CLÉS

### ✅ Gestion Complète du Cycle Check-in/Checkout

- **Check-in** : Photos d'état d'entrée, signalements voyageur
- **Checkout** : Tâches de ménage avec validation photo, signalements agent
- Persistence complète dans IndexedDB
- Reprise de session après F5 ou fermeture navigateur

### 📸 Capture Photo Avancée

- Stream vidéo en temps réel avec preview
- Overlay semi-transparent (ghost) de la photo de référence
- Détection et gestion orientation (portrait/landscape)
- Rotation automatique selon orientation device
- Compression et optimisation mémoire
- Upload asynchrone avec retry
- Compatible iOS Safari, Chrome, Android, desktop

### 💾 Persistance Robuste (IndexedDB)

- **Store principal** : `checkSessions` (sessions de check)
- **Store cache** : `parcoursCache` (données API)
- Toutes les interactions sauvegardées en temps réel
- Migration automatique depuis localStorage
- Récupération après crash
- Reset DB en cas de corruption

### 🔄 Synchronisation API

- **Chargement** : GET parcours depuis Bubble
- **Upload images** : POST base64 vers endpoint dédié
- **Webhook final** : POST JSON complet vers `/checkendpoint`
- Cache avec TTL pour éviter requêtes inutiles
- Retry automatique sur erreur réseau

### 📊 Tracking Granulaire des Interactions

Tout est tracé et horodaté :
- Clics sur boutons (validation, navigation, etc.)
- Photos prises (avec métadonnées)
- Checkboxes cochées/décochées
- Signalements créés/résolus
- Navigation entre pièces
- États des pièces (in_progress, completed, validated)
- Réponses aux questions de sortie

### 🔐 Gestion Multi-Utilisateurs & Multi-Sessions

- Utilisateurs : AGENT, GESTIONNAIRE, CLIENT
- CheckID unique par session
- Plusieurs sessions actives possibles (différents parcours)
- Liste des sessions passées
- Reprise de session intelligente

### 🧪 Mode Debug Complet

- Modal de debug avec état complet de l'app
- Tests automatiques de compatibilité caméra
- Diagnostics en temps réel (logs visibles sur mobile)
- Toggle data source (API vs Mock)
- Endpoints de test dans `/public/`

### 📱 Progressive Web App (PWA)

- Fonctionne offline (après premier chargement)
- Installable sur home screen
- Service Worker potentiel (non vérifié dans cette analyse)
- Optimisée pour mobiles et tablettes

---

## 🛡️ SÉCURITÉ & ROBUSTESSE

### 🔒 Protection des Routes

- `ProtectedRoute` vérifie authentification
- Redirection automatique vers `/welcome` si non connecté
- Préservation de la destination pour redirect après login

### ✅ Validation des Données

- Validation parcoursId avant chargement de données depuis CheckID
- Évite contamination entre parcours différents
- Validation des IDs utilisateur/parcours avant création session

### 🛡️ Gestion d'Erreurs

- Try/catch systématiques dans tous les services
- Fallbacks multiples pour APIs navigateur (caméra, IndexedDB)
- Messages d'erreur user-friendly
- Logs détaillés pour debug

### 🔄 Résilience

- Retry automatique sur upload failed (3 tentatives)
- Réouverture IndexedDB si store manquant
- Reset complet DB en cas de corruption
- Sauvegarde continue (pas de perte de données)

### 🧹 Gestion Mémoire

- Compression images avant sauvegarde (max 5MB)
- Libération des blobs après upload
- Nettoyage des streams caméra au démontage
- Limitation du nombre de photos en mémoire

---

## ⚠️ POINTS D'ATTENTION & DETTE TECHNIQUE

### 🔴 Complexité Élevée

- **PhotoCaptureModal** : 1490 lignes, très difficile à maintenir
- **dataAdapter** : 571 lignes, logique complexe de mapping
- **Welcome.tsx** : 1214 lignes, gestion d'état tentaculaire
- **useCamera** : 536 lignes, beaucoup de cas edge iOS/Android

**Recommandation** : Refactoring en sous-composants et extraction de logique dans hooks/services.

### 🟡 Duplication de Code

- `CheckoutFlowContext` vs `CheckinFlowContext` : logique très similaire
- `UnifiedFlowContext` existe mais pas complètement déployé
- Plusieurs composants Card (RoomTaskCard, TaskCard) avec styles différents

**Recommandation** : Finaliser migration vers UnifiedFlowContext, unifier les composants Card.

### 🟡 Données Mixtes (API + Statique)

- `roomsData.ts` conservé pour compatibilité mais partiellement obsolète
- Risque de confusion entre données API et données statiques
- `useRoomsData` hook legacy peu utilisé

**Recommandation** : Supprimer complètement les données statiques ou les déplacer dans un dossier `legacy/`.

### 🟠 Gestion d'État Complexe

- 9 contexts imbriqués en cascade
- Risque de re-renders en cascade
- Certains contexts montent globalement mais ne sont utilisés que localement

**Recommandation** : Utiliser React.memo, useMemo, useCallback plus agressivement. Envisager Zustand ou Redux Toolkit pour simplifier.

### 🟢 Tests Absents

- Aucun fichier de test trouvé (.test.tsx, .spec.tsx)
- Pas de tests unitaires, intégration ou E2E
- Tests manuels uniquement (diagnostic caméra, webhook test modal)

**Recommandation** : Implémenter tests avec Vitest + React Testing Library au minimum pour les services critiques (checkSessionManager, dataAdapter, interactionTracker).

### 🟡 TypeScript "any" Usage

- Présence de `any` dans plusieurs endroits (interactions, metadata)
- Perte de type-safety à certains endroits critiques

**Recommandation** : Typage strict avec `unknown` plutôt que `any`, utiliser des types génériques.

### 🟠 Performance Potentielle

- Aucune pagination dans les listes (signalements, sessions)
- Images stockées en base64 dans IndexedDB (pas optimal)
- Pas de lazy loading pour les composants lourds

**Recommandation** : Implémenter pagination, utiliser Blob URLs plutôt que base64 pour les images, lazy load avec React.lazy().

### 🟢 Documentation

- Beaucoup de commentaires dans le code
- Émojis pour clarté visuelle
- Mais pas de documentation centralisée (cette analyse comble ce manque)

**Recommandation** : Générer JSDoc automatique, créer une documentation Storybook pour les composants UI.

---

## 📈 MÉTRIQUES & STATISTIQUES

### 📊 Volume de Code

- **Total fichiers scripts** : ~150+ fichiers .ts/.tsx
- **Plus gros fichiers** :
  1. PhotoCaptureModal.tsx : 1490 lignes
  2. Welcome.tsx : 1214 lignes
  3. checkSessionManager.ts : 679 lignes
  4. dataAdapter.ts : 571 lignes
  5. useCamera.ts : 536 lignes

- **Composants UI** : 51 fichiers (shadcn/ui)
- **Composants métier** : ~35 composants
- **Pages** : 13 routes
- **Contexts** : 9 providers
- **Hooks** : 10 hooks personnalisés
- **Services** : 10 services
- **Types** : 4 fichiers de types
- **Utils** : 7 utilitaires

### 🏗️ Complexité

- **Profondeur d'imbrication Contexts** : 9 niveaux
- **Dépendances entre services** : Graphe complexe (interactionTracker → checkSessionManager → IndexedDB)
- **Couplage** : Modéré à élevé (certains composants dépendent de multiples contexts)

### 🚦 État du Projet

- ✅ **Fonctionnel** : L'app fonctionne en production
- ⚠️ **Maintenabilité** : Complexité élevée, refactoring nécessaire
- ✅ **Robustesse** : Bonne gestion d'erreurs et persistance
- ⚠️ **Tests** : Absents
- ✅ **Performance** : Acceptable mais optimisable
- ✅ **UX** : Bonne expérience utilisateur (auto-save, reprise session)

---

## 🎯 RECOMMANDATIONS PRIORITAIRES

### 🔴 Priorité Haute

1. **Ajouter des tests** (checkSessionManager, dataAdapter, interactionTracker)
2. **Refactorer PhotoCaptureModal** (extraire logique camera dans hook, UI dans sous-composants)
3. **Finaliser migration vers UnifiedFlowContext** (supprimer CheckinFlowContext et CheckoutFlowContext)
4. **Implémenter error boundary** React pour capturer erreurs UI
5. **Optimiser images** (Blob URLs au lieu de base64 dans IndexedDB)

### 🟡 Priorité Moyenne

6. **Lazy loading** des pages et composants lourds
7. **Pagination** des listes (signalements, sessions)
8. **Refactorer Welcome.tsx** (extraire formulaire, validation, logique API)
9. **Unifier composants Card** (RoomTaskCard, TaskCard)
10. **Documentation Storybook** pour composants UI

### 🟢 Priorité Basse

11. **Performance monitoring** (React DevTools Profiler, Lighthouse)
12. **Accessibilité** (ARIA labels, navigation clavier)
13. **Internationalisation** (i18n pour multi-langue)
14. **PWA offline avancé** (service worker avec cache stratégique)
15. **Analytics** (tracking usage, erreurs, performance)

---

## 🏁 CONCLUSION

**CheckEasy** est une **application complexe et bien architecturée** pour la gestion d'états des lieux. L'architecture en couches (UI → State → Logic → Services → Storage) est claire et bien respectée. La persistance IndexedDB avec auto-save garantit une excellente UX sans perte de données.

**Points forts :**
- ✅ Architecture solide et modulaire
- ✅ Gestion robuste de la persistence (IndexedDB)
- ✅ Capture photo avancée cross-browser
- ✅ Tracking granulaire des interactions
- ✅ Bonne gestion d'erreurs et fallbacks
- ✅ Code bien commenté avec émojis

**Points à améliorer :**
- ⚠️ Complexité de certains composants (1000+ lignes)
- ⚠️ Absence totale de tests
- ⚠️ Duplication de logique entre contexts
- ⚠️ Performance optimisable (images base64, pas de lazy loading)
- ⚠️ Dette technique accumulée (contexts imbriqués, any types)

**Verdict :** Application **production-ready** mais nécessitant **refactoring et tests** pour assurer la maintenabilité à long terme. La complexité actuelle rend les évolutions futures risquées sans couverture de tests.

---

*Document généré le ${new Date().toLocaleDateString('fr-FR')} | Version 1.0*
*Analyse basée sur 150+ fichiers TypeScript/React*

