# 📊 ANALYSE DES DONNÉES CRÉÉES AU CHARGEMENT DU JSON SUR LA PAGE WELCOME

## 🎯 Vue d'ensemble

Cette analyse détaille **toutes les structures de données** créées et stockées lorsque le JSON du parcours est chargé depuis la page `Welcome.tsx`, depuis la réception de l'API jusqu'au stockage final dans IndexedDB.

---

## 🌊 FLUX COMPLET DE TRANSFORMATION DES DONNÉES

```
API Bubble (Data.json)
    ↓
[1] Chargement Welcome.tsx
    ↓
[2] GlobalParcoursContext.loadParcours()
    ↓
[3] parcoursManager.loadParcours()
    ↓
[4] DataAdapter.adaptCompleteData()
    ↓
[5] Création CheckSession (IndexedDB)
    ↓
[6] Navigation vers parcours
```

---

## 📦 [1] DONNÉES BRUTES DE L'API (Data.json)

### Structure reçue de l'API Bubble

```typescript
interface RealParcours {
  parcourID: string;              // Ex: "1733148030890x123456789"
  parcoursName: string;           // Ex: "Ménage Appartement Centre-ville"
  parcoursType: "Ménage" | "Voyageur";
  logementID: string;             // Ex: "1733148030890x987654321"
  logementName: string;           // Ex: "Appartement Centre-ville"
  takePicture: "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly";
  piece: RealPiece[];             // Tableau des pièces
  signalements?: RealSignalement[];  // Signalements existants (optionnel)
}

interface RealPiece {
  logementID: string;
  pieceID: string;                // Ex: "1733148030890x111111111"
  nom: string;                    // Ex: "🛏️ Chambre 1"
  travelerNote?: string;          // Instructions voyageur (souvent utilisé pour ménage)
  cleanerNote?: string;           // Instructions agent (souvent vide)
  infoEntrance?: string;          // Informations d'entrée
  etapes: RealEtape[];            // Tableau des étapes
}

interface RealEtape {
  etapeID: string;                // ✅ ID UNIQUE - Ex: "1733148030890x222222222"
  pieceID: string;
  image?: string;                 // URL photo de référence (si isTodo=false)
  isTodo: boolean;                // true=tâche ménage, false=photo référence
  todoParam?: string;             // Instructions détaillées de la tâche
  todoTitle?: string;             // Titre court de la tâche
  todoOrder?: string;             // Ordre d'affichage (ex: "1", "2")
  todoImage?: string;             // Photo de validation (si tâche avec photo)
}

interface RealSignalement {
  signalementID: string;          // Ex: "1733148030890x333333333"
  pieceID: string;
  photo?: string;                 // URL de la photo
  commentaire: string;
  commentaireTraitement?: string; // Si rempli = résolu
}
```

### Exemple concret de données API

```json
{
  "parcourID": "1733148030890x123456789",
  "parcoursName": "Ménage Appartement Centre-ville",
  "parcoursType": "Ménage",
  "logementName": "Appartement Centre-ville",
  "takePicture": "checkInAndCheckOut",
  "piece": [
    {
      "pieceID": "1733148030890x111111111",
      "nom": "🛏️ Chambre 1",
      "travelerNote": "Nettoyer les vitres, changer les draps",
      "etapes": [
        {
          "etapeID": "1733148030890x222222222",
          "pieceID": "1733148030890x111111111",
          "image": "//uploads.bubble.io/photo-chambre-vue-generale.jpg",
          "isTodo": false
        },
        {
          "etapeID": "1733148030890x333333333",
          "pieceID": "1733148030890x111111111",
          "isTodo": true,
          "todoTitle": "Nettoyer les vitres",
          "todoParam": "Utiliser un chiffon microfibre et du produit vitres",
          "todoOrder": "1",
          "todoImage": "//uploads.bubble.io/photo-vitre-propre.jpg"
        }
      ]
    }
  ],
  "signalements": [
    {
      "signalementID": "1733148030890x444444444",
      "pieceID": "1733148030890x111111111",
      "commentaire": "Tache sur le mur près de la fenêtre",
      "photo": "//uploads.bubble.io/signalement-tache.jpg"
    }
  ]
}
```

---

## 🔄 [2] TRANSFORMATION PAR DataAdapter

Le `DataAdapter` transforme les données brutes API vers le format TypeScript utilisé par l'application.

### Appel principal

```typescript
const adapted = DataAdapter.adaptCompleteData(realData, forceFlowType);
```

### Structure créée

```typescript
{
  roomsData: Record<string, Room & { tasks: Task[] }>,
  flowType: FlowType,  // 'checkin' ou 'checkout'
  parcoursInfo: {
    name: string,
    type: string,
    logement: string,
    takePicture: string
  },
  apiSignalements: Signalement[]
}
```

---

## 🏠 [3] STRUCTURE Room (Pièce adaptée)

Chaque pièce du JSON API est transformée en objet `Room` :

```typescript
interface Room {
  id: string;                    // ✅ pieceID de l'API (préservé)
  nom: string;                   // Nom nettoyé (sans emojis)
  ordre: number;                 // Position dans la séquence (1, 2, 3...)
  roomInfo: string;              // Infos générales (infoEntrance ou cleanerNote)
  cleaningInfo: string;          // Instructions ménage (travelerNote)
  
  // ✅ Champs originaux API préservés
  travelerNote?: string;
  cleanerNote?: string;
  infoEntrance?: string;
  
  photoReferences: {
    checkin?: PhotoReference[];   // Photos pour checkin
    checkout?: PhotoReference[];  // Photos pour checkout
  };
  
  // Ajouté par DataAdapter
  tasks: Task[];                 // Tâches générées
}
```

### Exemple concret

```typescript
{
  id: "1733148030890x111111111",
  nom: "Chambre 1",
  ordre: 1,
  roomInfo: "Chambre principale avec lit double",
  cleaningInfo: "Nettoyer les vitres, changer les draps",
  travelerNote: "Nettoyer les vitres, changer les draps",
  infoEntrance: "Chambre principale avec lit double",
  photoReferences: {
    checkin: [
      {
        tache_id: "1733148030890x222222222",
        etapeID: "1733148030890x222222222",
        url: "https://uploads.bubble.io/photo-chambre-vue-generale.jpg",
        expected_orientation: "paysage",
        overlay_enabled: true,
        isTodo: false
      }
    ],
    checkout: [ /* mêmes photos */ ]
  },
  tasks: [ /* voir section suivante */ ]
}
```

---

## ✅ [4] STRUCTURE Task (Tâches générées)

Pour chaque pièce, le DataAdapter génère des tâches selon le flowType.

### Types de tâches créées

#### A. Tâche "Photos de référence" (créée TOUJOURS en premier)

```typescript
{
  id: "1733148030890x222222222",        // Premier etapeID photo
  etapeID: "1733148030890x222222222",   // ✅ Stocké aussi en dédié
  piece_id: "1733148030890x111111111",
  ordre: 1,                              // TOUJOURS en premier
  type: "reference_photos",
  label: "📸 Photos de référence (2)",
  description: "Consultez les 2 photos de référence pour cette pièce",
  completed: false,
  total_photos_required: 0,              // Pas de photos à prendre
  photos_done: 0,
  photo_references: [
    {
      tache_id: "1733148030890x222222222",
      etapeID: "1733148030890x222222222",
      url: "https://uploads.bubble.io/photo-chambre-vue-generale.jpg",
      expected_orientation: "paysage",
      overlay_enabled: true
    },
    // ... autres photos de référence
  ]
}
```

#### B. Tâche Checkbox (isTodo=true, sans todoImage)

```typescript
{
  id: "1733148030890x555555555",        // etapeID de l'API
  etapeID: "1733148030890x555555555",
  piece_id: "1733148030890x111111111",
  ordre: 2,
  type: "checkbox",
  label: "Passer l'aspirateur",
  description: "Aspirer sous le lit et derrière les meubles",
  completed: false,
  isTodo: true                           // ✅ Marqueur tâche ménage
}
```

#### C. Tâche Photo Required (isTodo=true, avec todoImage)

```typescript
{
  id: "1733148030890x333333333",
  etapeID: "1733148030890x333333333",
  piece_id: "1733148030890x111111111",
  ordre: 3,
  type: "photo_required",
  label: "Nettoyer les vitres",
  description: "Utiliser un chiffon microfibre et du produit vitres",
  completed: false,
  isTodo: true,
  photo_reference: {
    tache_id: "1733148030890x333333333",
    etapeID: "1733148030890x333333333",
    url: "https://uploads.bubble.io/photo-vitre-propre.jpg",
    expected_orientation: "paysage",
    overlay_enabled: true
  }
}
```

### 🎯 RÈGLES DE GÉNÉRATION

1. **Ordre des tâches** :
   - 1️⃣ TOUJOURS : Tâche "Photos de référence" (type=reference_photos)
   - 2️⃣ ENSUITE : Tâches TODO dans l'ordre de `todoOrder`

2. **Type déterminé par** :
   - `reference_photos` : Étapes avec isTodo=false (photos de référence)
   - `checkbox` : Étapes avec isTodo=true et SANS todoImage
   - `photo_required` : Étapes avec isTodo=true et AVEC todoImage

3. **IDs préservés** :
   - ✅ `task.id` = `etapeID` de l'API (pas de génération de slug)
   - ✅ `task.etapeID` = Duplication pour clarté
   - ✅ `photo_reference.tache_id` = `etapeID` de l'API

---

## 🚨 [5] STRUCTURE Signalement (adaptée depuis API)

Les signalements existants dans l'API sont adaptés :

```typescript
interface Signalement {
  id: string;                    // signalementID de l'API
  roomId: string;                // pieceID
  piece: string;                 // Nom de la pièce (trouvé par lookup)
  etapeId: undefined;            // Pas d'étape associée (signalements généraux)
  titre: string;                 // Commentaire tronqué (max 50 chars)
  commentaire: string;           // Commentaire complet
  imgUrl?: string;               // URL de la photo
  imgBase64: undefined;          // Pas de base64 pour signalements API
  flowType: FlowType;            // Hérité du parcours
  origine: 'HISTORIQUE';         // ✅ Marqueur signalements API
  status: 'A_TRAITER' | 'RESOLU';// Basé sur commentaireTraitement
  priorite: boolean;             // false par défaut
  created_at: string;            // Timestamp extrait de signalementID
  updated_at: string;
}
```

### Exemple concret

```typescript
{
  id: "1733148030890x444444444",
  roomId: "1733148030890x111111111",
  piece: "Chambre 1",
  etapeId: undefined,
  titre: "Tache sur le mur près de la fenêtre",
  commentaire: "Tache sur le mur près de la fenêtre",
  imgUrl: "https://uploads.bubble.io/signalement-tache.jpg",
  flowType: "checkout",
  origine: "HISTORIQUE",
  status: "A_TRAITER",
  priorite: false,
  created_at: "2024-12-02T15:27:10.890Z",
  updated_at: "2024-12-02T15:27:10.890Z"
}
```

---

## 💾 [6] STOCKAGE DANS IndexedDB (CheckSession)

Lors de la création de la session (après sélection utilisateur), une `CheckSession` est créée dans IndexedDB.

### Structure CheckSession

```typescript
interface CheckSession {
  checkId: string;               // Ex: "check_1733150000000_abc123def"
  userId: string;                // Téléphone de l'utilisateur
  parcoursId: string;            // ID du parcours chargé
  flowType: 'checkin' | 'checkout';
  status: 'active' | 'completed' | 'cancelled' | 'terminated';
  isFlowCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  rapportID?: string;            // ID du rapport Bubble (après envoi final)
  
  // ✅ Infos utilisateur pour reprise
  userInfo?: {
    firstName: string;           // Ex: "Jean"
    lastName: string;            // Ex: "Dupont"
    phone: string;               // Ex: "612345678"
    type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
  };
  
  // ✅ Infos parcours pour affichage
  parcoursInfo?: {
    name: string;                // Ex: "Ménage Appartement Centre-ville"
    type: string;                // Ex: "Ménage"
  };
  
  // 🎯 PROGRESSION ET INTERACTIONS
  progress: {
    currentPieceId: string;      // Pièce actuelle
    currentTaskIndex: number;    // Index de la tâche actuelle
    
    interactions: {
      // Clics sur boutons (validation, navigation, etc.)
      buttonClicks?: Record<string, ButtonClickInteraction[]>;
      
      // Photos prises avec métadonnées complètes
      photosTaken?: Record<string, PhotoInteraction[]>;
      
      // États des checkboxes
      checkboxStates?: Record<string, CheckboxInteraction>;
      
      // Signalements créés par l'utilisateur
      signalements?: Record<string, SignalementInteraction>;
      
      // États des pièces (in_progress, completed, validated)
      pieceStates?: Record<string, PieceStateInteraction>;
      
      // Historique de navigation
      navigation?: NavigationInteraction;
      
      // Réponses aux questions de sortie
      exitQuestions?: Record<string, ExitQuestionInteraction>;
    };
    
    exitQuestionsCompleted?: boolean;
    exitQuestionsCompletedAt?: string;
  };
  
  metadata?: Record<string, any>;
}
```

### Exemple CheckSession créée

```typescript
{
  checkId: "check_1733150000000_abc123def",
  userId: "612345678",
  parcoursId: "1733148030890x123456789",
  flowType: "checkout",
  status: "active",
  isFlowCompleted: false,
  createdAt: "2024-12-02T16:00:00.000Z",
  lastActiveAt: "2024-12-02T16:00:00.000Z",
  
  userInfo: {
    firstName: "Jean",
    lastName: "Dupont",
    phone: "612345678",
    type: "AGENT"
  },
  
  parcoursInfo: {
    name: "Ménage Appartement Centre-ville",
    type: "Ménage"
  },
  
  progress: {
    currentPieceId: "",
    currentTaskIndex: 0,
    interactions: {}
  }
}
```

---

## 📊 [7] DONNÉES STOCKÉES DANS GlobalParcoursContext

Le contexte React stocke les données adaptées en mémoire :

```typescript
interface GlobalParcoursContextType {
  currentParcours: ParcoursData | null;
  loading: boolean;
  error: string | null;
  
  // ✅ Données dérivées calculées
  parcoursInfo: {
    id: string;
    name: string;
    type: string;
    logement: string;
    takePicture: string;
  };
  
  rooms: (Room & { tasks: Task[] })[];  // Triées par ordre croissant
  
  stats: {
    totalRooms: number;
    totalTasks: number;
    totalPhotos: number;
    flowType: FlowType;
  };
  
  apiSignalements: Signalement[];       // Signalements de l'API
}
```

### Exemple de données en mémoire

```typescript
{
  parcoursInfo: {
    id: "1733148030890x123456789",
    name: "Ménage Appartement Centre-ville",
    type: "Ménage",
    logement: "Appartement Centre-ville",
    takePicture: "checkInAndCheckOut"
  },
  
  rooms: [
    {
      id: "1733148030890x111111111",
      nom: "Chambre 1",
      ordre: 1,
      tasks: [
        { type: "reference_photos", ... },
        { type: "photo_required", ... },
        { type: "checkbox", ... }
      ]
    },
    // ... autres pièces triées par ordre
  ],
  
  stats: {
    totalRooms: 5,
    totalTasks: 23,
    totalPhotos: 15,
    flowType: "checkout"
  },
  
  apiSignalements: [
    {
      id: "1733148030890x444444444",
      roomId: "1733148030890x111111111",
      origine: "HISTORIQUE",
      status: "A_TRAITER",
      ...
    }
  ]
}
```

---

## 🗄️ [8] STOCKAGE DANS parcoursCache (IndexedDB)

Les données brutes de l'API sont mises en cache pour éviter de recharger :

### Structure du cache

```typescript
{
  parcoursId: string;              // Clé primaire
  data: RealParcours;              // Données brutes complètes
  metadata: {
    name: string;
    type: string;
    roomsCount: number;
  };
  cachedAt: string;
  expiresAt: string;               // TTL 24h par défaut
}
```

### Store IndexedDB : `parcoursCache`

- **Clé** : `parcoursId`
- **TTL** : 24 heures
- **Contenu** : JSON complet de l'API
- **But** : Éviter rechargements inutiles

---

## 🔄 [9] RÉSUMÉ DU FLUX DE DONNÉES

### Étape par étape

1. **Welcome.tsx** : Utilisateur arrive avec `?parcours=ID` dans l'URL
2. **loadParcours()** : Déclenche le chargement
3. **Cache check** : Vérifie si données en cache (IndexedDB `parcoursCache`)
4. **API fetch** : Si pas de cache valide, GET vers Bubble
5. **DataAdapter** : Transforme JSON API → structures TypeScript
   - `RealParcours` → `Room[]` avec `tasks`
   - Génération des tâches selon `isTodo` et `todoImage`
   - Adaptation des signalements API
6. **GlobalParcoursContext** : Stocke en mémoire React
7. **parcoursCache** : Sauvegarde dans IndexedDB (cache 24h)
8. **Formulaire utilisateur** : Utilisateur entre nom/prénom/téléphone
9. **createCheckSession()** : Crée session dans IndexedDB `checkSessions`
10. **Navigation** : Redirige vers `/checkin` ou `/checkout` avec `?checkid=...&parcours=...`

### Données persistantes

| Localisation | Données | Durée | But |
|---|---|---|---|
| **IndexedDB `parcoursCache`** | JSON brut API | 24h | Cache API |
| **IndexedDB `checkSessions`** | CheckSession complète | Permanent | Progression utilisateur |
| **GlobalParcoursContext** | Données adaptées | Session | State React |
| **localStorage** | userInfo, lastUserPhone | Permanent | Auto-remplissage |

---

## 🎯 POINTS CLÉS

### ✅ IDs préservés de l'API

- **pieceID** → `room.id`
- **etapeID** → `task.id` et `task.etapeID`
- **signalementID** → `signalement.id`

### ✅ Ordre garanti

- Les pièces sont triées par `ordre` croissant (1, 2, 3...)
- Les tâches sont ordonnées : photos de référence PUIS tâches TODO

### ✅ Types de tâches

- `reference_photos` : Photos à consulter (isTodo=false)
- `checkbox` : Tâches simples sans photo (isTodo=true, pas todoImage)
- `photo_required` : Tâches avec validation photo (isTodo=true, avec todoImage)

### ✅ Signalements API

- Marqués `origine: "HISTORIQUE"`
- Status déterminé par `commentaireTraitement`
- Timestamp extrait du `signalementID`

### ✅ FlowType

- Déterminé par `parcoursType` : "Ménage" → `checkout`, "Voyageur" → `checkin`
- Peut être forcé via paramètre `forceFlowType`

---

## 🚀 ÉVOLUTION DES DONNÉES PENDANT LE PARCOURS

### Interactions sauvegardées automatiquement

Toutes les actions de l'utilisateur sont capturées dans `progress.interactions` :

```typescript
// Exemple après quelques interactions
progress: {
  currentPieceId: "1733148030890x111111111",
  currentTaskIndex: 2,
  
  interactions: {
    buttonClicks: {
      "1733148030890x222222222": [
        { timestamp: "2024-12-02T16:05:00Z", label: "Valider" }
      ]
    },
    
    photosTaken: {
      "1733148030890x333333333": [
        {
          photoId: "photo_1733150100000_xyz",
          timestamp: "2024-12-02T16:05:00Z",
          dataUrl: "data:image/jpeg;base64,/9j/4AAQ...",
          uploadedUrl: "https://uploads.bubble.io/uploaded-photo.jpg",
          metadata: { width: 1920, height: 1080, size: 234567 }
        }
      ]
    },
    
    checkboxStates: {
      "1733148030890x555555555": {
        checked: true,
        timestamp: "2024-12-02T16:06:00Z"
      }
    },
    
    signalements: {
      "signalement_1733150200000_abc": {
        roomId: "1733148030890x111111111",
        titre: "Vitre cassée",
        commentaire: "Coin en bas à droite fissuré",
        timestamp: "2024-12-02T16:10:00Z"
      }
    },
    
    pieceStates: {
      "1733148030890x111111111": {
        status: "completed",
        timestamp: "2024-12-02T16:15:00Z"
      }
    },
    
    navigation: {
      lastPath: "/checkout",
      history: ["/welcome", "/checkout"]
    }
  }
}
```

---

## 📈 MÉTRIQUES DE DONNÉES

### Volume typique

Pour un appartement 3 pièces avec ménage complet :

- **Données brutes API** : ~50-100 KB JSON
- **Données adaptées** : ~30-50 KB (en mémoire)
- **CheckSession vide** : ~2 KB
- **CheckSession complète** (avec photos base64) : ~5-20 MB
- **Cache parcours** : ~50-100 KB (IndexedDB)

### Nombre d'objets créés

- **1 ParcoursInfo**
- **5-10 Rooms** (selon logement)
- **20-50 Tasks** (selon complexité)
- **0-10 Signalements API**
- **1 CheckSession** (par utilisateur/parcours)

---

## ✨ CONCLUSION

L'architecture de données de CheckEasy suit un **pipeline de transformation robuste** :

1. **API Bubble** fournit des données brutes avec IDs uniques
2. **DataAdapter** transforme vers TypeScript avec préservation des IDs
3. **GlobalParcoursContext** stocke en mémoire pour React
4. **IndexedDB** persiste pour reprise et cache
5. **Interactions** sont capturées en temps réel dans la CheckSession

Cette architecture garantit :
- ✅ **Traçabilité** : Chaque donnée garde son ID API
- ✅ **Performance** : Cache 24h évite requêtes inutiles
- ✅ **Résilience** : IndexedDB survit aux rechargements
- ✅ **Granularité** : Toutes les interactions sont tracées
- ✅ **Synchronisation** : Webhook final envoie tout à l'API

---

*Document généré le ${new Date().toLocaleDateString('fr-FR')} | CheckEasy v1.0*

