# 📊 ARCHITECTURE ACTUELLE - Système de Navigation et Persistance

> **Date de création** : 2025-01-09  
> **Objectif** : Documenter l'état actuel du système avant refactoring complet

---

## 🗺️ CARTOGRAPHIE DES ROUTES

### Routes principales de l'application

| Route | Composant | Protection | Description |
|-------|-----------|------------|-------------|
| `/` | `CheckEasy.tsx` | ✅ ProtectedRoute | Page d'accueil / sélection de parcours |
| `/welcome` | `Welcome.tsx` | ❌ Public | Page de connexion et démarrage de parcours |
| `/checkin` | `CheckIn.tsx` | ✅ ProtectedRoute | Flux d'état des lieux d'entrée |
| `/checkin-home` | `CheckinHome.tsx` | ✅ ProtectedRoute | Page récapitulative après checkin |
| `/checkout` | `CheckOut.tsx` | ✅ ProtectedRoute | Flux d'état des lieux de sortie |
| `/checkout-home` | `CheckoutHome.tsx` | ✅ ProtectedRoute | Page récapitulative après checkout |
| `/etat-initial` | `EtatInitial.tsx` | ✅ ProtectedRoute | Inspection état initial avant ménage |
| `/exit-questions` | `ExitQuestionsPageWrapper.tsx` | ✅ ProtectedRoute | Questions de sortie |
| `/signalements-a-traiter` | `SignalementsATraiter.tsx` | ✅ ProtectedRoute | Liste des signalements à traiter |
| `/signalements-historique` | `SignalementsHistorique.tsx` | ✅ ProtectedRoute | Historique des signalements |

### Format des URLs

**Format attendu** : `/{page}?parcours={parcoursId}&checkid={checkId}`

**Exemples** :
- Nouveau parcours : `/welcome?parcours=1759329612699x439087102753750400`
- Reprise de session : `/checkout?parcours=1759329612699x439087102753750400&checkid=check_1736432100000_abc123`

---

## 🎯 CONTEXTES REACT - État Global

### 1. **ActiveCheckIdContext** (`contexts/ActiveCheckIdContext.tsx`)
**Rôle** : Gestion du checkId actif (session en cours)

**État géré** :
- `currentCheckId: string | null` - ID de la session active
- `isCheckIdActive: boolean` - Indicateur d'activation

**Fonctions principales** :
- `createCheckId()` - Crée une nouvelle session
- `setActiveCheckId()` - Active une session existante
- `clearCheckId()` - Nettoie la session active
- `getCheckSession()` - Récupère les données de session depuis IndexedDB

**Stockage** :
- `localStorage.activeCheckId` - CheckId actif
- IndexedDB via `checkSessionManager`

---

### 2. **GlobalParcoursContext** (`contexts/GlobalParcoursContext.tsx`)
**Rôle** : Gestion des données de parcours (pièces, tâches, signalements)

**État géré** :
- `currentParcours: ParcoursData | null` - Données du parcours actuel
- `loading: boolean` - État de chargement
- `error: string | null` - Erreurs de chargement

**Données dérivées** :
- `parcoursInfo` - Métadonnées du parcours (nom, type, logement)
- `rooms` - Liste des pièces avec leurs tâches
- `stats` - Statistiques (nombre de pièces, tâches, photos)
- `apiSignalements` - Signalements provenant de l'API

**Fonctions principales** :
- `loadParcours(parcoursId, forceFlowType?)` - Charge un parcours depuis API ou cache
- `clearParcours()` - Réinitialise le parcours
- `refreshParcours()` - Recharge le parcours actuel
- `forceCheckoutMode()` / `forceCheckinMode()` - Force le mode de flow

**Stockage** :
- IndexedDB via `parcoursCache` (cache 24h)
- Abonnement au `parcoursManager` (singleton)

---

### 3. **CheckoutFlowContext** (`contexts/CheckoutFlowContext.tsx`)
**Rôle** : Gestion du flux de checkout (progression, tâches complétées)

**État géré** :
- `currentStep: FlowStep` - Étape actuelle (pieceId, taskIndex)
- `isCompleted: boolean` - Flux terminé
- `completedSteps: string[]` - Liste des étapes complétées
- `completedTasks: { [taskId]: boolean }` - Map des tâches complétées
- `takenPhotos: { [taskId]: PhotoReference[] }` - Photos prises par tâche
- `flowSequence: FlowStep[]` - Séquence complète du flow

**Fonctions principales** :
- `nextStep()` - Avance à l'étape suivante
- `jumpToPiece(pieceId, taskIndex)` - Saute à une pièce spécifique
- `completeStep(stepId)` - Marque une étape comme complétée
- `isPieceCompleted(pieceId)` - Vérifie si une pièce est terminée
- `checkAutoAdvancement()` - Vérifie et avance automatiquement si nécessaire

**Initialisation** :
- Construit dynamiquement `flowSequence` depuis les rooms du parcours
- S'initialise au montage avec les pièces de `GlobalParcoursContext`

---

### 4. **CheckinFlowContext** (`contexts/CheckinFlowContext.tsx`)
**Rôle** : Gestion du flux de checkin (similaire à CheckoutFlowContext)

**État géré** : Identique à `CheckoutFlowContext`

**⚠️ PROBLÈME IDENTIFIÉ** : Duplication de logique avec `CheckoutFlowContext`

---

### 5. **UnifiedFlowContext** (`contexts/UnifiedFlowContext.tsx`)
**Rôle** : Tentative d'unification des flows checkin/checkout

**État géré** :
- `flowType: 'checkin' | 'checkout'` - Type de flow actuel
- Même structure que CheckoutFlowContext

**⚠️ PROBLÈME IDENTIFIÉ** : 
- Coexiste avec CheckoutFlowContext et CheckinFlowContext
- Pas utilisé partout dans l'application
- Confusion sur quel contexte utiliser

---

### 6. **AppFlowContext** (`contexts/AppFlowContext.tsx`)
**Rôle** : Gestion de l'état global de l'application (ménage, checkout)

**État géré** :
- `currentStage: 'idle' | 'cleaning' | 'checkout' | 'completed'`
- `cleaningProgress: number` - Pourcentage de progression du ménage
- `completedTasks: number` - Nombre de tâches complétées
- `totalTasks: number` - Nombre total de tâches
- `checkoutCompleted: boolean` - Checkout terminé

**⚠️ PROBLÈME IDENTIFIÉ** : Redondance avec les autres contextes de flow

---

### 7. **UserContext** (`contexts/UserContext.tsx`)
**Rôle** : Gestion de l'authentification et des infos utilisateur

**État géré** :
- `user: User | null` - Informations utilisateur
- `isAuthenticated: boolean` - État d'authentification

**Stockage** :
- `localStorage.userInfo` - Données utilisateur persistées

---

### 8. **SignalementsContext** (`contexts/SignalementsContext.tsx`)
**Rôle** : Gestion des signalements (problèmes rapportés)

**État géré** :
- `signalements: Signalement[]` - Liste des signalements

**Fonctions principales** :
- `addSignalement()` - Ajoute un signalement et l'envoie à Bubble
- `getSignalementsByRoom()` - Récupère les signalements d'une pièce
- `getPendingSignalements()` - Récupère les signalements en attente

**Stockage** :
- IndexedDB via `interactionTracker`
- Envoi automatique à Bubble API

---

### 9. **ReportProblemContext** (`contexts/ReportProblemContext.tsx`)
**Rôle** : Gestion de l'ouverture/fermeture du modal de signalement

**État géré** :
- `isOpen: boolean` - Modal ouvert/fermé
- `preSelectedRoom: string | null` - Pièce pré-sélectionnée

---

## 🗄️ SERVICES DE PERSISTANCE

### 1. **checkSessionManager** (`services/checkSessionManager.ts`)
**Rôle** : Gestion des sessions de check dans IndexedDB

**Base de données** :
- Nom : `CheckEasyDB` (configurable via environment)
- Version : 3
- Store : `checkSessions`
- Clé primaire : `checkId`

**Structure CheckSession** :
```typescript
{
  checkId: string;
  userId: string;
  parcoursId: string;
  flowType: 'checkin' | 'checkout';
  status: 'active' | 'completed' | 'cancelled' | 'terminated';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  terminatedAt?: string;
  rapportID?: string; // ID du rapport Bubble
  userInfo?: { firstName, lastName, phone, type };
  parcoursInfo?: { name, type };
  progress: {
    currentPieceId: string;
    currentTaskIndex: number;
    interactions: {
      buttonClicks?: Record<string, any[]>;
      photosTaken?: Record<string, any[]>;
      checkboxStates?: Record<string, any>;
      signalements?: Record<string, any>;
      pieceStates?: Record<string, any>;
      navigation?: any;
      exitQuestions?: Record<string, any>;
    };
    exitQuestionsCompleted?: boolean;
    exitQuestionsCompletedAt?: string;
  };
  metadata?: Record<string, any>;
}
```

**Fonctions principales** :
- `createCheckSession()` - Crée une nouvelle session
- `getCheckSession(checkId)` - Récupère une session
- `updateCheckSession(checkId, updates)` - Met à jour une session
- `updateSessionProgress()` - Met à jour la progression
- `getUserSessions(userId)` - Liste les sessions d'un utilisateur
- `terminateSession(checkId, rapportID)` - Termine une session

---

### 2. **parcoursCache** (`services/parcoursCache.ts`)
**Rôle** : Cache des données de parcours dans IndexedDB

**Base de données** :
- Nom : `CheckEasyCache`
- Version : 2
- Store : `parcours`
- Clé primaire : `id` (parcoursId)

**Structure CachedParcours** :
```typescript
{
  id: string; // parcoursId
  data: any; // JSON brut de l'API
  cachedAt: number; // timestamp
  metadata?: {
    name?: string;
    type?: string;
    roomsCount?: number;
  };
}
```

**Fonctions principales** :
- `saveParcours(parcoursId, data, metadata)` - Sauvegarde dans le cache
- `getParcours(parcoursId)` - Récupère depuis le cache
- `isCacheValid(parcoursId, maxAgeHours)` - Vérifie la validité du cache (défaut 24h)
- `clearCache(parcoursId)` - Supprime du cache

---

### 3. **interactionTracker** (`services/interactionTracker.ts`)
**Rôle** : Enregistrement de toutes les interactions utilisateur dans IndexedDB

**Fonctions principales** :
- `trackButtonClick()` - Enregistre un clic de bouton
- `trackPhotoTaken()` - Enregistre une photo prise
- `trackCheckboxChange()` - Enregistre un changement de checkbox
- `trackSignalement()` - Enregistre un signalement
- `trackNavigation()` - Enregistre une navigation entre pièces
- `trackPagePath()` - Enregistre le chemin de la page actuelle

**Stockage** :
- Utilise `checkSessionManager` pour sauvegarder dans `progress.interactions`

---

### 4. **parcoursManager** (`services/parcoursManager.ts`)
**Rôle** : Singleton qui gère le chargement et l'adaptation des données de parcours

**Fonctions principales** :
- `loadParcours(parcoursId, forceFlowType?)` - Charge depuis l'API
- `loadFromRawDataWithMode(rawData, forceFlowType?)` - Charge depuis données brutes
- `getCurrentParcours()` - Récupère le parcours actuel
- `subscribe(listener)` - S'abonne aux changements
- `notify()` - Notifie les listeners

**Flux de données** :
1. Appel API : `${API_BASE_URL}/${BUBBLE_ENV}/api/1.1/wf/endpointPiece?parcours={parcoursId}`
2. Adaptation des données via `dataAdapter`
3. Notification des listeners (notamment `GlobalParcoursContext`)

---

## 📦 STOCKAGE LOCAL

### localStorage

| Clé | Contenu | Utilisé par |
|-----|---------|-------------|
| `activeCheckId` | CheckId actif | ActiveCheckIdContext |
| `userInfo` | Infos utilisateur (JSON) | UserContext |
| `lastUserPhone` | Dernier numéro de téléphone | Welcome |
| `checkeasy_last_path` | Dernier chemin visité | RouteRestoration |
| `checkeasy_url_params` | Derniers paramètres URL (JSON) | RouteRestoration |

### IndexedDB

| Base | Store | Contenu |
|------|-------|---------|
| `CheckEasyDB` | `checkSessions` | Sessions de check |
| `CheckEasyCache` | `parcours` | Cache des parcours |

---

## 🔄 FLUX DE NAVIGATION ACTUELS

### Flux 1 : Nouveau parcours
```
1. User clique sur lien : /welcome?parcours=XXX
2. Welcome.tsx charge le parcours via GlobalParcoursContext
3. User remplit formulaire (nom, prénom, téléphone)
4. Welcome.tsx crée un checkId via ActiveCheckIdContext
5. Navigation vers / avec ?parcours=XXX&checkid=YYY
6. CheckEasy.tsx affiche la sélection de parcours
```

### Flux 2 : Reprise de session
```
1. User clique sur lien : /welcome?parcours=XXX&checkid=YYY
2. Welcome.tsx détecte le checkId dans l'URL
3. Welcome.tsx charge la session depuis IndexedDB
4. Welcome.tsx restaure les infos utilisateur
5. Welcome.tsx détermine la dernière page visitée
6. Navigation vers la dernière page avec paramètres
```

### Flux 3 : Rechargement de page (F5)
```
1. User appuie sur F5 sur /checkout?parcours=XXX&checkid=YYY
2. RouteRestoration.tsx s'exécute
3. Vérifie si on est sur /welcome avec checkid
4. Si oui, restaure vers la dernière page sauvegardée
5. Sinon, reste sur la page actuelle
6. CheckOut.tsx charge l'état depuis IndexedDB
```

---

## ⚠️ PROBLÈMES IDENTIFIÉS

### 1. **Multiples contextes de flow redondants**
- `CheckoutFlowContext`, `CheckinFlowContext`, `UnifiedFlowContext`, `AppFlowContext`
- Logique dupliquée
- Confusion sur quel contexte utiliser
- Risque d'incohérence

### 2. **Chargements multiples de données**
- Chaque page a ses propres `useEffect` pour charger les données
- Pas de coordination centralisée
- Risque de doublons de requêtes API
- Utilisation de refs (`hasLoadedParcours`, `currentParcoursId`) pour éviter les re-runs

### 3. **Navigation complexe et fragile**
- Logique de navigation dispersée dans plusieurs composants
- `RouteRestoration` avec logique complexe et tentatives multiples
- Pas de source unique de vérité pour déterminer la route correcte

### 4. **Synchronisation URL ↔ IndexedDB incohérente**
- Paramètres URL parfois perdus
- État IndexedDB pas toujours reflété dans l'URL
- Conflits possibles entre URL et état sauvegardé

### 5. **Gestion d'état de session incomplète**
- Pas de vérification systématique de l'état de session avant d'afficher une page
- Possibilité d'accéder à `/checkout` même si la session est terminée
- Pas de guards de navigation

---

## 📈 STATISTIQUES

- **Nombre de routes** : 10
- **Nombre de contextes** : 9
- **Nombre de services de persistance** : 4
- **Nombre de bases IndexedDB** : 2
- **Nombre de clés localStorage** : 5

---

**Suite du document** : Voir `FLUX_PARCOURS.md` et `PROBLEMES_ACTUELS.md`

