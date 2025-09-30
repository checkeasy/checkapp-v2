# 📊 ANALYSE COMPLÈTE DU FLUX DE DONNÉES - CHECKEASY FRONT-END

## 🎯 Vue d'ensemble

L'application CheckEasy utilise une architecture en couches pour gérer les données de parcours depuis l'API Bubble jusqu'aux composants React. Voici le flux complet.

---

## 🔄 FLUX COMPLET DE DONNÉES

### 1️⃣ APPEL API INITIAL

#### Endpoint
```
GET https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece?parcours={parcoursId}
```

#### Localisation dans le code
- **Fichier**: `FRONT/src/services/parcoursManager.ts` (ligne 92)
- **Méthode**: `ParcoursManager.loadParcours(parcoursId: string)`

#### Exemple d'appel
```typescript
const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece?parcours=${parcoursId}`;
const response = await fetch(apiUrl);
const rawData = JSON.parse(await response.text());
```

#### Structure de la réponse API (rawData)
```json
{
  "parcourID": "1758613142823x462099088965380700",
  "parcoursName": "Ménage Appartement Centre",
  "parcoursType": "Ménage" | "Voyageur",
  "logementID": "...",
  "logementName": "Appartement 3 pièces",
  "takePicture": "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly",
  "piece": [
    {
      "pieceID": "1758613142823x123456789",
      "nom": "🛏️ Chambre 1",
      "travelerNote": "Note pour le voyageur",
      "cleanerNote": "Instructions de nettoyage",
      "infoEntrance": "Informations d'accès",
      "etapes": [
        {
          "pieceID": "1758613142823x123456789",
          "image": "//s3.amazonaws.com/...",
          "isTodo": false,  // Photo de référence
          "todoParam": null,
          "todoTitle": null,
          "todoOrder": null,
          "todoImage": null
        },
        {
          "pieceID": "1758613142823x123456789",
          "image": null,
          "isTodo": true,  // Tâche à faire
          "todoParam": "checkbox",
          "todoTitle": "Vérifier la propreté du lit",
          "todoOrder": "1",
          "todoImage": "//s3.amazonaws.com/..."
        }
      ]
    }
  ]
}
```

---

### 2️⃣ CACHE LAYER (IndexedDB)

#### Fichier
`FRONT/src/services/parcoursCache.ts`

#### Fonctionnement
1. **Vérification du cache** avant l'appel API
2. **Validité**: 24 heures par défaut
3. **Stockage**: IndexedDB avec 3 stores
   - `parcours`: Données complètes
   - `metadata`: Métadonnées (nom, type, taille)
   - `progress`: Progression des flows (checkin/checkout)

#### Méthodes principales
```typescript
// Sauvegarder un parcours
await parcoursCache.saveParcours(parcoursId, rawData);

// Récupérer un parcours
const cachedData = await parcoursCache.getParcours(parcoursId);

// Vérifier la validité
const isValid = await parcoursCache.isCacheValid(parcoursId, 24);
```

#### Logique de cache dans ParcoursManager
```typescript
// 1. Vérifier le cache d'abord
const cachedData = await parcoursCache.getParcours(parcoursId);

if (cachedData && await parcoursCache.isCacheValid(parcoursId, 24)) {
  console.log('✅ Données trouvées dans le cache');
  rawData = cachedData;
} else {
  console.log('🌐 Chargement depuis l\'API...');
  // Appel API...
  await parcoursCache.saveParcours(parcoursId, rawData);
}
```

---

### 3️⃣ PARCOURS MANAGER (Singleton)

#### Fichier
`FRONT/src/services/parcoursManager.ts`

#### Rôle
- **Singleton** qui centralise la gestion des parcours
- **Gère le parcours actuel** en mémoire
- **Notifie les listeners** lors des changements
- **Coordonne** le cache et l'adaptation des données

#### Structure ParcoursData
```typescript
interface ParcoursData {
  id: string;                    // ID du parcours
  rawData: any;                  // Données brutes de l'API
  adaptedData: {
    roomsData: Record<string, Room & { tasks: Task[] }>;
    flowType: FlowType;          // 'checkin' | 'checkout'
    parcoursInfo: {
      name: string;
      type: string;
      logement: string;
      takePicture: string;
    };
  };
  loadedAt: number;              // Timestamp de chargement
}
```

#### Méthodes clés
```typescript
class ParcoursManager {
  private currentParcours: ParcoursData | null = null;
  private listeners: Set<(parcours: ParcoursData | null) => void> = new Set();

  // Charger un parcours
  async loadParcours(parcoursId: string): Promise<ParcoursData>
  
  // Obtenir le parcours actuel
  getCurrentParcours(): ParcoursData | null
  
  // Obtenir les pièces
  getCurrentRooms(): (Room & { tasks: Task[] })[]
  
  // S'abonner aux changements
  subscribe(listener: (parcours: ParcoursData | null) => void): () => void
  
  // Forcer un mode (checkin/checkout)
  loadFromRawDataWithMode(rawData: any, forceFlowType: FlowType): void
}
```

---

### 4️⃣ DATA ADAPTER (Transformation)

#### Fichier
`FRONT/src/services/dataAdapter.ts`

#### Rôle
Transforme les données brutes de l'API en format utilisable par l'application

#### Processus de transformation

##### Étape 1: Déterminer le FlowType
```typescript
const flowType: FlowType = forceFlowType || 
  (realData.parcoursType === 'Ménage' ? 'checkout' : 'checkin');
```

##### Étape 2: Adapter chaque pièce
```typescript
static adaptPieceToRoom(realPiece: RealPiece, ordre: number): Room {
  return {
    id: realPiece.pieceID,  // Utilise directement le pieceID de l'API
    nom: cleanRoomName(realPiece.nom),
    ordre,
    roomInfo: realPiece.infoEntrance || realPiece.travelerNote,
    cleaningInfo: realPiece.cleanerNote,
    photoReferences: createPhotoReferences(...)
  };
}
```

##### Étape 3: Générer les tâches selon le flowType
```typescript
static generateTasksFromRealData(realPiece: RealPiece, flowType: FlowType): Task[] {
  const tasks: Task[] = [];
  const todoEtapes = realPiece.etapes.filter(e => e.isTodo);
  const photoEtapes = realPiece.etapes.filter(e => !e.isTodo);

  // 1. TOUJOURS créer une tâche pour les photos de référence (isTodo=false)
  if (photoEtapes.length > 0) {
    tasks.push(createReferencePhotoTask(photoEtapes, ...));
  }

  // 2. SEULEMENT en mode checkout: ajouter les tâches de vérification (isTodo=true)
  if (flowType === 'checkout') {
    todoEtapes.forEach(etape => {
      tasks.push(createTaskFromEtape(etape, ...));
    });
  }

  return tasks;
}
```

#### Types de tâches créées

##### 1. Tâche "Photos de référence" (toujours créée)
```typescript
{
  id: `reference-photos-${pieceId}`,
  type: 'reference_photos',
  label: `📸 Photos de référence (${photoEtapes.length})`,
  total_photos_required: 0,  // Juste à consulter, pas à prendre
  photo_references: [
    {
      tache_id: `reference-${pieceId}-0`,
      url: "https://s3.amazonaws.com/...",
      expected_orientation: 'paysage',
      overlay_enabled: true
    }
  ]
}
```

##### 2. Tâches de vérification (seulement en checkout)
```typescript
{
  id: "verifier-la-proprete-du-lit",
  type: 'photo_required' | 'checkbox',
  label: "Vérifier la propreté du lit",
  description: "1",
  photo_reference: {  // Si todoImage existe
    tache_id: "verifier-la-proprete-du-lit",
    url: "https://s3.amazonaws.com/...",
    expected_orientation: 'paysage',
    overlay_enabled: true
  }
}
```

---

### 5️⃣ DONNÉES ADAPTÉES (Structure finale)

#### Structure complète
```typescript
{
  roomsData: {
    "1758613142823x123456789": {
      id: "1758613142823x123456789",
      nom: "Chambre 1",
      ordre: 1,
      roomInfo: "Informations pour la chambre",
      cleaningInfo: "Instructions de nettoyage",
      photoReferences: { ... },
      tasks: [
        {
          id: "reference-photos-1758613142823x123456789",
          type: "reference_photos",
          label: "📸 Photos de référence (3)",
          // ...
        },
        // En mode checkout uniquement:
        {
          id: "verifier-lit",
          type: "photo_required",
          label: "Vérifier la propreté du lit",
          // ...
        }
      ]
    }
  },
  flowType: "checkout",
  parcoursInfo: {
    name: "Ménage Appartement Centre",
    type: "Ménage",
    logement: "Appartement 3 pièces",
    takePicture: "checkOutOnly"
  }
}
```

---

### 6️⃣ CONTEXT PROVIDER (React Context)

#### Fichier
`FRONT/src/contexts/GlobalParcoursContext.tsx`

#### Rôle
- **Wrapper React** autour du ParcoursManager
- **Fournit les données** à tous les composants
- **Gère le state React** (loading, error)
- **S'abonne** aux changements du ParcoursManager

#### Implémentation
```typescript
export function GlobalParcoursProvider({ children }: GlobalParcoursProviderProps) {
  const [currentParcours, setCurrentParcours] = useState<ParcoursData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // S'abonner aux changements de parcours
  useEffect(() => {
    const unsubscribe = parcoursManager.subscribe((parcours) => {
      setCurrentParcours(parcours);
      setError(null);
    });
    return unsubscribe;
  }, []);

  // Calculer les données dérivées
  const parcoursInfo = currentParcours?.adaptedData.parcoursInfo || null;
  const rooms = currentParcours ? Object.values(currentParcours.adaptedData.roomsData) : [];
  const stats = parcoursManager.getCurrentStats();

  return (
    <GlobalParcoursContext.Provider value={{
      currentParcours,
      loading,
      error,
      parcoursInfo,
      rooms,
      stats,
      loadParcours,
      // ...
    }}>
      {children}
    </GlobalParcoursContext.Provider>
  );
}
```

---

### 7️⃣ HOOKS & COMPONENTS (Utilisation)

#### Hooks disponibles

##### 1. useParcoursData (lecture seule)
```typescript
const { parcours, info, rooms, stats, isLoaded } = useParcoursData();

// Exemple d'utilisation
console.log(info.name);        // "Ménage Appartement Centre"
console.log(info.takePicture); // "checkOutOnly"
console.log(rooms.length);     // 5
console.log(stats.totalTasks); // 23
```

##### 2. useParcoursActions (actions)
```typescript
const { loadParcours, switchParcours, clearParcours, loading, error } = useParcoursActions();

// Charger un parcours
await loadParcours('1758613142823x462099088965380700');
```

##### 3. useGlobalParcours (complet)
```typescript
const {
  currentParcours,
  loading,
  error,
  parcoursInfo,
  rooms,
  getRoomById,
  stats,
  loadParcours,
  forceCheckoutMode
} = useGlobalParcours();
```

#### Exemple dans un composant
```typescript
// FRONT/src/pages/CheckEasy.tsx
function CheckEasy() {
  const { parcoursInfo, rooms, stats } = useParcoursData();
  const { loadParcours } = useParcoursActions();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursId = urlParams.get('parcours');
    
    if (parcoursId) {
      loadParcours(parcoursId);
    }
  }, []);

  return (
    <div>
      <h1>{parcoursInfo?.name}</h1>
      <p>Type: {parcoursInfo?.takePicture}</p>
      <p>Pièces: {rooms.length}</p>
      <p>Tâches: {stats.totalTasks}</p>
      
      {rooms.map(room => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
```

---

## 🔍 POINTS CLÉS À RETENIR

### 1. Séparation des données selon isTodo
- **`isTodo: false`** → Photos de référence (toujours affichées)
- **`isTodo: true`** → Tâches de vérification (seulement en mode checkout)

### 2. FlowType détermine les tâches
- **`checkout`**: Photos de référence + Tâches de vérification
- **`checkin`**: Photos de référence uniquement

### 3. Cache intelligent
- Validité de 24h
- Évite les appels API redondants
- Stockage local avec IndexedDB

### 4. Architecture en couches
```
API → Cache → ParcoursManager → DataAdapter → Context → Hooks → Components
```

### 5. Pattern Observer
- ParcoursManager notifie les listeners
- GlobalParcoursContext s'abonne et met à jour React
- Composants réagissent automatiquement

---

## 📝 FICHIERS CLÉS

| Fichier | Rôle |
|---------|------|
| `services/parcoursManager.ts` | Gestion centralisée des parcours |
| `services/dataAdapter.ts` | Transformation des données API |
| `services/parcoursCache.ts` | Cache IndexedDB |
| `contexts/GlobalParcoursContext.tsx` | Provider React |
| `types/room.ts` | Définitions TypeScript |
| `hooks/useOptimizedParcours.ts` | Hook optimisé |

---

## 🎯 EXEMPLE COMPLET DE FLUX

```typescript
// 1. Utilisateur arrive sur la page avec ?parcours=123
const parcoursId = '1758613142823x462099088965380700';

// 2. Composant appelle le hook
const { loadParcours } = useParcoursActions();
await loadParcours(parcoursId);

// 3. ParcoursManager vérifie le cache
const cached = await parcoursCache.getParcours(parcoursId);
if (!cached) {
  // 4. Appel API
  const response = await fetch(`...endpointPiece?parcours=${parcoursId}`);
  rawData = await response.json();
  
  // 5. Sauvegarde en cache
  await parcoursCache.saveParcours(parcoursId, rawData);
}

// 6. Adaptation des données
const adaptedData = DataAdapter.adaptCompleteData(rawData);

// 7. Création de ParcoursData
const parcoursData = {
  id: parcoursId,
  rawData,
  adaptedData,
  loadedAt: Date.now()
};

// 8. Notification des listeners
parcoursManager.setCurrentParcours(parcoursData);

// 9. GlobalParcoursContext met à jour le state
setCurrentParcours(parcoursData);

// 10. Composants re-render avec les nouvelles données
// Les hooks retournent les données fraîches
```

---

**Créé le**: 2025-09-30  
**Auteur**: Analyse automatique du codebase CheckEasy

