# 🏗️ RÉSUMÉ DE L'ARCHITECTURE - CHECKEASY FRONT-END

## 📊 Vue d'ensemble en un coup d'œil

### Architecture en 7 couches

```
┌─────────────────────────────────────────────────────────────┐
│  7️⃣  REACT COMPONENTS                                       │
│  ├─ CheckEasy.tsx                                           │
│  ├─ CheckOut.tsx                                            │
│  └─ CheckIn.tsx                                             │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ useParcoursData()
                            │ useParcoursActions()
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6️⃣  REACT CONTEXT (GlobalParcoursContext)                  │
│  ├─ State: currentParcours, loading, error                  │
│  ├─ Computed: parcoursInfo, rooms, stats                    │
│  └─ Actions: loadParcours, switchParcours                   │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ subscribe()
                            │ getCurrentParcours()
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5️⃣  PARCOURS MANAGER (Singleton)                           │
│  ├─ currentParcours: ParcoursData                           │
│  ├─ listeners: Set<Function>                                │
│  └─ Methods: loadParcours(), subscribe()                    │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ adaptCompleteData()
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4️⃣  DATA ADAPTER                                           │
│  ├─ adaptRealDataToExistingFormat()                         │
│  ├─ generateTasksFromRealData()                             │
│  └─ createReferencePhotoTask()                              │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ rawData (JSON)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3️⃣  CACHE LAYER (IndexedDB)                                │
│  ├─ Store: parcours (données complètes)                     │
│  ├─ Store: metadata (infos parcours)                        │
│  └─ Store: progress (progression flows)                     │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ fetch() si cache invalide
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2️⃣  API BUBBLE                                             │
│  GET /api/1.1/wf/endpointPiece?parcours={id}                │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ Paramètre URL
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1️⃣  URL PARAMETERS                                         │
│  ?parcours=1758613142823x462099088965380700                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de données détaillé

### Étape par étape

```
1. URL avec paramètre parcours
   ↓
2. useEffect() détecte le paramètre
   ↓
3. Appel loadParcours(parcoursId)
   ↓
4. ParcoursManager vérifie le cache
   ├─ Cache valide → Utilise les données en cache
   └─ Cache invalide → Appel API
   ↓
5. Réception rawData (JSON de l'API)
   ↓
6. DataAdapter transforme les données
   ├─ Détermine flowType (checkin/checkout)
   ├─ Adapte chaque pièce
   └─ Génère les tâches selon le flowType
   ↓
7. Création de ParcoursData
   {
     id: string,
     rawData: any,
     adaptedData: {
       roomsData: Record<string, Room & { tasks: Task[] }>,
       flowType: FlowType,
       parcoursInfo: {...}
     },
     loadedAt: number
   }
   ↓
8. ParcoursManager notifie les listeners
   ↓
9. GlobalParcoursContext met à jour le state React
   ↓
10. Composants re-render avec les nouvelles données
```

---

## 📦 Structure des données

### 1. Données brutes de l'API (rawData)

```json
{
  "parcourID": "1758613142823x462099088965380700",
  "parcoursName": "Ménage Appartement",
  "parcoursType": "Ménage",
  "logementName": "Appartement 3 pièces",
  "takePicture": "checkOutOnly",
  "piece": [
    {
      "pieceID": "1758613142823x123",
      "nom": "🛏️ Chambre 1",
      "etapes": [
        {
          "isTodo": false,  // Photo de référence
          "image": "https://..."
        },
        {
          "isTodo": true,   // Tâche de vérification
          "todoTitle": "Vérifier le lit",
          "todoImage": "https://..."
        }
      ]
    }
  ]
}
```

### 2. Données adaptées (adaptedData)

```typescript
{
  roomsData: {
    "1758613142823x123": {
      id: "1758613142823x123",
      nom: "Chambre 1",
      ordre: 1,
      roomInfo: "...",
      cleaningInfo: "...",
      photoReferences: {...},
      tasks: [
        {
          id: "reference-photos-1758613142823x123",
          type: "reference_photos",
          label: "📸 Photos de référence (3)",
          photo_references: [...]
        },
        {
          id: "verifier-le-lit",
          type: "photo_required",
          label: "Vérifier le lit",
          photo_reference: {...}
        }
      ]
    }
  },
  flowType: "checkout",
  parcoursInfo: {
    name: "Ménage Appartement",
    type: "Ménage",
    logement: "Appartement 3 pièces",
    takePicture: "checkOutOnly"
  }
}
```

---

## 🎯 Différences checkin vs checkout

### Mode CHECKIN

```
Données API (etapes):
├─ isTodo: false → Photo de référence ✅ AFFICHÉE
└─ isTodo: true  → Tâche de vérification ❌ IGNORÉE

Tâches générées:
└─ reference_photos (consultation uniquement)

Utilisation:
- Voyageur arrive
- Consulte les photos de référence
- Prend des photos de l'état initial
```

### Mode CHECKOUT

```
Données API (etapes):
├─ isTodo: false → Photo de référence ✅ AFFICHÉE
└─ isTodo: true  → Tâche de vérification ✅ AFFICHÉE

Tâches générées:
├─ reference_photos (consultation)
├─ checkbox (vérifications simples)
└─ photo_required (vérifications avec photo)

Utilisation:
- Agent de ménage ou voyageur sort
- Consulte les photos de référence
- Effectue les vérifications
- Prend des photos de validation
```

---

## 🔑 Concepts clés

### 1. Pattern Singleton (ParcoursManager)

```typescript
// Une seule instance pour toute l'application
const parcoursManager = new ParcoursManager();

// Accessible partout
import { parcoursManager } from '@/services/parcoursManager';
```

### 2. Pattern Observer (Listeners)

```typescript
// S'abonner aux changements
const unsubscribe = parcoursManager.subscribe((parcours) => {
  console.log('Nouveau parcours:', parcours);
});

// Se désabonner
unsubscribe();
```

### 3. Pattern Adapter (DataAdapter)

```typescript
// Transforme les données API en format application
const adaptedData = DataAdapter.adaptCompleteData(rawData);
```

### 4. Cache Strategy (Cache-First)

```typescript
// 1. Vérifier le cache
const cached = await parcoursCache.getParcours(id);

// 2. Si valide, utiliser le cache
if (cached && await parcoursCache.isCacheValid(id, 24)) {
  return cached;
}

// 3. Sinon, appeler l'API
const fresh = await fetch(apiUrl);
await parcoursCache.saveParcours(id, fresh);
```

---

## 📁 Fichiers principaux

### Services (Logique métier)

| Fichier | Rôle | Lignes clés |
|---------|------|-------------|
| `parcoursManager.ts` | Gestion centralisée | 77-144 (loadParcours) |
| `dataAdapter.ts` | Transformation données | 395-437 (adaptCompleteData) |
| `parcoursCache.ts` | Cache IndexedDB | 157-259 (save/get) |

### Contexts (State React)

| Fichier | Rôle | Lignes clés |
|---------|------|-------------|
| `GlobalParcoursContext.tsx` | Provider principal | 51-147 (Provider) |

### Hooks (Utilisation)

| Fichier | Rôle | Lignes clés |
|---------|------|-------------|
| `useOptimizedParcours.ts` | Hook optimisé | 25-71 (loadFromUrl) |

### Types (Définitions)

| Fichier | Rôle | Lignes clés |
|---------|------|-------------|
| `room.ts` | Interfaces Room/Task | 1-69 (types) |

---

## 🚀 Quick Start

### 1. Charger un parcours

```typescript
import { useParcoursActions } from '@/contexts/GlobalParcoursContext';

const { loadParcours } = useParcoursActions();
await loadParcours('1758613142823x462099088965380700');
```

### 2. Accéder aux données

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

const { info, rooms, stats } = useParcoursData();
```

### 3. Afficher les pièces

```typescript
{rooms.map(room => (
  <div key={room.id}>
    <h3>{room.nom}</h3>
    <p>{room.tasks.length} tâches</p>
  </div>
))}
```

---

## 🔍 Points d'attention

### ⚠️ Différence isTodo

```typescript
// isTodo: false → TOUJOURS affiché (photos de référence)
// isTodo: true  → SEULEMENT en mode checkout (tâches)
```

### ⚠️ FlowType détermine les tâches

```typescript
// checkout → Photos de référence + Tâches de vérification
// checkin  → Photos de référence uniquement
```

### ⚠️ Cache automatique

```typescript
// Le cache est automatique, validité 24h
// Pas besoin de gérer manuellement
```

### ⚠️ Singleton ParcoursManager

```typescript
// Une seule instance partagée
// Pas besoin de créer plusieurs instances
```

---

## 📊 Métriques

### Performance

- **Cache hit**: ~50ms (IndexedDB)
- **Cache miss**: ~500-1000ms (API + parsing)
- **Adaptation**: ~10-50ms (selon taille)

### Stockage

- **Parcours moyen**: ~50-200 KB
- **Cache total**: ~1-5 MB (plusieurs parcours)
- **Limite IndexedDB**: ~50 MB (navigateur)

---

## 🎓 Concepts avancés

### 1. Reactive Data Flow

```
ParcoursManager (source de vérité)
    ↓ notify
GlobalParcoursContext (React state)
    ↓ hooks
Components (UI)
```

### 2. Separation of Concerns

```
API Layer      → parcoursManager.ts
Cache Layer    → parcoursCache.ts
Transform      → dataAdapter.ts
State          → GlobalParcoursContext.tsx
Presentation   → Components
```

### 3. Type Safety

```typescript
// Tout est typé avec TypeScript
interface ParcoursData { ... }
interface Room { ... }
interface Task { ... }
```

---

## 🛠️ Debugging

### Logs utiles

```typescript
// Activer les logs détaillés
console.log('🔄 ParcoursManager:', parcoursManager.getCurrentParcours());
console.log('📦 Cache:', await parcoursCache.getAllMetadata());
console.log('🎯 Adapted:', currentParcours?.adaptedData);
```

### Vérifier le state

```typescript
// Dans React DevTools
GlobalParcoursContext → currentParcours
```

### Inspecter IndexedDB

```
Chrome DevTools → Application → IndexedDB → CheckEasyCache
```

---

## 📚 Ressources

### Documentation

- [ANALYSE_FLUX_DONNEES.md](./ANALYSE_FLUX_DONNEES.md) - Analyse détaillée
- [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) - Exemples pratiques

### Fichiers clés

- `FRONT/src/services/parcoursManager.ts`
- `FRONT/src/services/dataAdapter.ts`
- `FRONT/src/contexts/GlobalParcoursContext.tsx`

---

**Créé le**: 2025-09-30  
**Version**: 1.0  
**Auteur**: Documentation CheckEasy

