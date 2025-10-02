# 📊 AUDIT - FLUX DE NAVIGATION DÉTAILLÉS - CHECKEASY

**Complément au rapport d'audit principal**  
**Date**: 2025-10-02

---

## 📋 TABLE DES MATIÈRES

1. [Diagrammes de Flux](#1-diagrammes-de-flux)
2. [Analyse Détaillée des Contextes](#2-analyse-détaillée-des-contextes)
3. [Traçabilité des Données](#3-traçabilité-des-données)
4. [Plan de Correction](#4-plan-de-correction)

---

## 1. DIAGRAMMES DE FLUX

### 1.1 Flux de Données Global

```mermaid
graph TD
    A[URL avec ?parcours=ID] --> B[Welcome Page]
    B --> C{Utilisateur<br/>existant?}
    C -->|Oui| D[Vérifier Sessions]
    C -->|Non| E[Créer Profil]
    D --> F{Sessions<br/>existantes?}
    F -->|Oui| G[Dialog Sélection]
    F -->|Non| H[Créer CheckID]
    E --> H
    G -->|Reprendre| I[Activer CheckID]
    G -->|Nouveau| H
    H --> J[GlobalParcoursContext]
    I --> J
    J --> K[CheckEasy Home]
    K --> L{Type<br/>Utilisateur?}
    L -->|CLIENT| M[/checkin]
    L -->|AGENT| N[/checkout]
    M --> O[CheckinFlowContext]
    N --> P[CheckoutFlowManager]
    O --> Q[IndexedDB CheckSession]
    P --> Q
    Q --> R[API Bubble Upload]
```

### 1.2 Flux CheckIn Détaillé

```
┌─────────────────────────────────────────────────────────────┐
│  ENTRÉE: /checkin?parcours={id}&checkid={checkId}          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Chargement Composant CheckIn                            │
│     - useParcoursData() → globalRooms                       │
│     - useCheckinFlow() → flowState                          │
│     - useUser() → user                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Initialisation Flow (useEffect)                         │
│     - initializeFromParcours(globalRooms)                   │
│     - Conversion Room → PieceStatus                         │
│     - Calcul flowSequence                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Affichage Pièce Courante                                │
│     - currentPiece = pieces[flowState.currentStep.pieceId]  │
│     - currentTask = piece.tasks[flowState.currentStep.taskIndex] │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Interaction Utilisateur                                 │
│     ┌─────────────────┬─────────────────┬─────────────────┐│
│     │ Prendre Photo   │ Valider Pièce   │ Signaler Pb     ││
│     └─────────────────┴─────────────────┴─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Sauvegarde Données                                      │
│     - setCapturedPhotosData(Map)                            │
│     - addTakenPhotos(taskId, photos)                        │
│     - completeStep(taskId)                                  │
│     ⚠️ PAS de sauvegarde CheckID automatique                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Navigation Suivante                                     │
│     - nextStep() → flowState.currentStep++                  │
│     - checkAutoAdvancement(pieces)                          │
│     - Si complété → navigate('/checkin-home')               │
│     ⚠️ Perte paramètres URL                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Flux CheckOut Détaillé

```
┌─────────────────────────────────────────────────────────────┐
│  ENTRÉE: /checkout?parcours={id}&checkid={checkId}         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Chargement Composant CheckOut                           │
│     - useParcoursData() → globalRooms                       │
│     - useCheckoutFlowManager() → checkoutFlow               │
│     - useActiveCheckId() → currentCheckId                   │
│     - useAutoSaveCheckId() → saveButtonClick, etc.          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Fallback CheckID depuis URL                             │
│     - const fallbackCheckId = useMemo(() => {               │
│         const urlParams = new URLSearchParams(location.search); │
│         return urlParams.get('checkid');                    │
│       })                                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Restauration État depuis CheckID                        │
│     - loadStateFromCheckId()                                │
│     - Restaurer photos depuis localStorage                  │
│     - Restaurer tâches complétées                           │
│     - Restaurer position dans le flux                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Affichage Pièce Courante                                │
│     - currentPiece = checkoutFlow.getCurrentPiece()         │
│     - currentTask = checkoutFlow.getCurrentTask()           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Interaction Utilisateur                                 │
│     ┌─────────────────┬─────────────────┬─────────────────┐│
│     │ Prendre Photo   │ Valider Pièce   │ Signaler Pb     ││
│     └─────────────────┴─────────────────┴─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Sauvegarde Automatique                                  │
│     - saveButtonClick('action', data)                       │
│     - savePhotoTaken(photoId, pieceId, taskIndex, data)     │
│     - uploadCapturedPhoto(photo, options)                   │
│     ✅ Sauvegarde CheckID automatique                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Navigation Suivante                                     │
│     - checkoutFlow.nextPiece()                              │
│     - Si complété → navigate('/exit-questions')             │
│     ✅ Préservation paramètres URL (via helper)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ANALYSE DÉTAILLÉE DES CONTEXTES

### 2.1 Hiérarchie des Contextes

```
App.tsx
├── QueryClientProvider (TanStack Query)
├── UserProvider
│   └── GlobalParcoursProvider
│       └── BrowserRouter
│           └── ActiveCheckIdProvider
│               └── AppFlowProvider
│                   └── UnifiedFlowProvider
│                       ├── CheckoutFlowProvider (legacy)
│                       ├── CheckinFlowProvider (legacy)
│                       ├── SignalementsProvider
│                       └── ReportProblemProvider
```

### 2.2 Responsabilités des Contextes

#### UserContext
**Rôle**: Authentification et profil utilisateur  
**État**:
```typescript
{
  user: {
    firstName: string;
    lastName: string;
    phone: string;
    connectedAt: string;
    type: 'AGENT' | 'CLIENT' | 'GESTIONNAIRE';
  } | null;
  isAuthenticated: boolean;
}
```
**Actions**:
- `login(userInfo)` - Connecte l'utilisateur
- `logout()` - Déconnecte l'utilisateur
- `updateUser(updates)` - Met à jour le profil

**Storage**: LocalStorage (`userInfo`)  
**Status**: ✅ Stable

#### GlobalParcoursContext
**Rôle**: Gestion centralisée des parcours  
**État**:
```typescript
{
  currentParcours: ParcoursData | null;
  loading: boolean;
  error: string | null;
  parcoursInfo: ParcoursInfo | null;
  rooms: (Room & { tasks: Task[] })[];
  stats: ParcoursStats;
}
```
**Actions**:
- `loadParcours(parcoursId, forceFlowType?)` - Charge un parcours
- `clearParcours()` - Efface le parcours actuel
- `refreshParcours()` - Recharge le parcours
- `forceCheckoutMode()` - Force le mode checkout
- `forceCheckinMode()` - Force le mode checkin

**Storage**: Singleton ParcoursManager + IndexedDB Cache  
**Status**: ✅ Stable

#### ActiveCheckIdContext
**Rôle**: Gestion de la session CheckID active  
**État**:
```typescript
{
  currentCheckId: string | null;
  isCheckIdActive: boolean;
}
```
**Actions**:
- `createNewCheckId(userInfo, parcoursInfo, flowType)` - Crée un CheckID
- `setActiveCheckId(checkId)` - Active un CheckID
- `getCheckSession(checkId)` - Récupère une session
- `completeCheckId()` - Marque comme complété
- `clearCheckId()` - Efface le CheckID actif

**Storage**: IndexedDB (`checkSessions`) + LocalStorage (`activeCheckId`)  
**Status**: ✅ Stable

#### CheckinFlowContext
**Rôle**: Gestion du flux check-in  
**État**:
```typescript
{
  flowState: {
    currentStep: FlowStep;
    completedTasks: { [taskId: string]: boolean };
    takenPhotos: { [taskId: string]: PhotoReference[] };
    isCompleted: boolean;
    flowSequence: FlowStep[];
  };
}
```
**Actions**:
- `nextStep()` - Avance à l'étape suivante
- `completeStep(taskId)` - Marque une tâche comme complétée
- `jumpToPiece(pieceId, taskIndex)` - Saute à une pièce
- `isPieceCompleted(pieceId, tasks)` - Vérifie si pièce complétée
- `checkAutoAdvancement(pieces)` - Vérifie avancement auto
- `addTakenPhotos(taskId, photos)` - Ajoute des photos
- `getTakenPhotos(taskId)` - Récupère les photos

**Storage**: State React (non persisté)  
**Status**: ⚠️ Legacy (à migrer vers UnifiedFlow)

#### CheckoutFlowContext
**Rôle**: Gestion du flux check-out  
**État**: Similaire à CheckinFlowContext  
**Storage**: State React (non persisté)  
**Status**: ⚠️ Legacy (remplacé par useCheckoutFlowManager)

#### UnifiedFlowContext
**Rôle**: Flux unifié checkin/checkout (futur)  
**État**:
```typescript
{
  flowState: {
    flowType: 'checkin' | 'checkout';
    currentStep: UnifiedFlowStep;
    isCompleted: boolean;
    completedSteps: string[];
    completedTasks: { [taskId: string]: boolean };
    takenPhotos: { [taskId: string]: PhotoReference[] };
  };
}
```
**Status**: 🚧 En cours de migration

### 2.3 Problème: Duplication de Logique

**Observation**: 3 systèmes de gestion de flux coexistent:
1. `CheckinFlowContext` (legacy)
2. `CheckoutFlowContext` (legacy)
3. `UnifiedFlowContext` (nouveau)
4. `useCheckoutFlowManager` (hook spécialisé)

**Impact**:
- Complexité accrue
- Risque de désynchronisation
- Maintenance difficile

**Recommandation**: Finaliser la migration vers `UnifiedFlowContext`

---

## 3. TRAÇABILITÉ DES DONNÉES

### 3.1 Cycle de Vie d'une Photo

```
1. CAPTURE
   ├─ PhotoCaptureModal.tsx
   │  └─ usePhotoCapture.capturePhoto(videoRef, referenceId)
   │     └─ Blob + DataURL créés
   │        └─ CapturedPhoto { id, pieceId, referencePhotoId, blob, dataUrl, takenAt, meta }
   
2. STOCKAGE LOCAL
   ├─ setCapturedPhotosData(Map<taskKey, CapturedPhoto[]>)
   │  └─ State React local
   └─ addTakenPhotos(taskId, photos)
      └─ CheckinFlowContext / CheckoutFlowManager
   
3. UPLOAD API
   ├─ uploadCapturedPhoto(photo, options)
   │  └─ imageUploadService.queueUpload(request)
   │     ├─ Conversion base64
   │     ├─ POST /api/1.1/wf/upload-image
   │     └─ Réponse: { uploadedUrl }
   
4. SAUVEGARDE URL
   ├─ localStorage.setItem(`uploaded_image_${photoId}`, JSON.stringify({
   │    id, pieceId, taskId, uploadedUrl, metadata
   │  }))
   └─ checkSessionManager.updateSessionProgress(checkId, {
        interactions: {
          photosTaken: {
            [compositeKey]: [{ photoId, url, timestamp, metadata }]
          }
        }
      })
   
5. AFFICHAGE
   └─ getDisplayUrl(photoId, fallbackDataUrl)
      ├─ Cherche dans localStorage (`uploaded_image_${photoId}`)
      ├─ Si trouvé → uploadedUrl
      └─ Sinon → fallbackDataUrl (local)
```

### 3.2 Cycle de Vie d'une Tâche

```
1. DÉFINITION
   └─ DataAdapter.generateTasksFromRealData(realPiece, flowType)
      └─ Task { id, etapeID, piece_id, ordre, type, label, description, completed, photo_reference }
   
2. AFFICHAGE
   └─ TaskCard / RoomTaskCard
      └─ Affiche task.label, task.description
      └─ Bouton selon task.type (photo_required, checkbox)
   
3. COMPLÉTION
   ├─ handleTaskComplete(taskId, completed)
   │  └─ completeStep(taskId)
   │     └─ flowState.completedTasks[taskId] = true
   └─ saveButtonClick('task_complete', { taskId, completed })  // CheckOut seulement
      └─ checkSessionManager.updateSessionProgress(checkId, {
           interactions: {
             buttonClicks: {
               [compositeKey]: [{ action, data, timestamp }]
             }
           }
         })
   
4. NAVIGATION
   └─ nextStep()
      ├─ flowState.currentStep.stepNumber++
      ├─ Calcul nouvelle pièce/tâche
      └─ checkAutoAdvancement(pieces)
         └─ Si pièce complétée → jumpToPiece(nextPieceId, 0)
```

### 3.3 Traçabilité des IDs

**Problème**: Multiples systèmes d'identification

| Type d'ID | Format | Exemple | Usage |
|-----------|--------|---------|-------|
| `parcoursId` | `{timestamp}x{random}` | `1758627882436x357466098713589800` | Identifie un parcours |
| `checkId` | `check_{timestamp}_{random}` | `check_1704123456789_abc123def` | Identifie une session |
| `pieceId` | `{timestamp}x{random}` | `1758613142823x123` | Identifie une pièce |
| `etapeID` | `{timestamp}x{random}` | `1758613142823x456` | Identifie une étape (tâche) |
| `taskId` | Généré ou `etapeID` | `1758613142823x456` | Identifie une tâche |
| `userId` | `phone` | `612345678` | Identifie un utilisateur |

**Recommandation**: Documenter clairement la correspondance entre ces IDs

---

## 4. PLAN DE CORRECTION

### 4.1 Correction Prioritaire 1: Navigation avec Paramètres

#### Problème
Navigation sans préservation des paramètres URL (`parcours`, `checkid`)

#### Solution
Créer un helper de navigation centralisé (déjà existant mais pas utilisé partout)

**Fichier**: `utils/navigationHelpers.ts`
```typescript
export const navigatePreservingParams = (
  navigate: NavigateFunction,
  path: string,
  additionalParams?: Record<string, string>
) => {
  const urlParams = new URLSearchParams(window.location.search);
  const parcoursId = urlParams.get('parcours');
  const checkId = urlParams.get('checkid');
  
  const params = new URLSearchParams();
  if (parcoursId) params.set('parcours', parcoursId);
  if (checkId) params.set('checkid', checkId);
  
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }
  
  const separator = path.includes('?') ? '&' : '?';
  const fullPath = params.toString() 
    ? `${path}${separator}${params.toString()}`
    : path;
  
  navigate(fullPath);
};
```

#### Fichiers à Modifier
1. **CheckIn.tsx**
   - Ligne 174: `navigate('/checkin-home')` → `navigatePreservingParams(navigate, '/checkin-home')`
   - Ligne 258: `navigate('/checkin-home')` → `navigatePreservingParams(navigate, '/checkin-home')`

2. **CheckOut.tsx**
   - Vérifier toutes les navigations (déjà bien fait en majorité)

3. **CheckEasy.tsx**
   - Fonction `navigateWithParcours` déjà implémentée ✅

#### Estimation
- **Temps**: 1-2 heures
- **Complexité**: Faible
- **Risque**: Faible

### 4.2 Correction Prioritaire 2: Auto-Save CheckID dans CheckIn

#### Problème
CheckIn ne sauvegarde pas automatiquement les interactions dans IndexedDB

#### Solution
Implémenter `useAutoSaveCheckId` comme dans CheckOut

**Fichier**: `CheckIn.tsx`

**Modifications**:
```typescript
// 1. Importer le hook
import { useAutoSaveCheckId } from "@/hooks/useAutoSaveCheckId";
import { useActiveCheckId } from "@/contexts/ActiveCheckIdContext";

// 2. Utiliser le hook
const { currentCheckId } = useActiveCheckId();
const {
  saveButtonClick,
  savePhotoTaken,
  saveCheckboxChange
} = useAutoSaveCheckId();

// 3. Modifier handleTaskComplete
const handleTaskComplete = async (taskId: string, completed: boolean) => {
  console.log(`Task ${taskId} completed: ${completed}`);
  
  // Sauvegarder dans CheckID
  if (currentCheckId) {
    await saveButtonClick('task_complete', {
      taskId,
      completed,
      pieceId: currentPiece?.id,
      taskIndex: actualCurrentTaskIndex,
      timestamp: new Date().toISOString()
    });
  }
  
  if (completed) {
    completeStep(taskId);
    // ... reste du code
  }
};

// 4. Modifier handlePhotosCaptured
const handlePhotosCaptured = async (capturedPhotos: CapturedPhoto[]) => {
  console.log('✅ Photos capturées par le voyageur:', capturedPhotos);
  
  if (syncedCurrentTask && capturedPhotos.length > 0) {
    const taskKey = `${currentPiece?.id}_${syncedCurrentTask.id}`;
    
    // Sauvegarder dans CheckID
    if (currentCheckId) {
      for (const photo of capturedPhotos) {
        await savePhotoTaken(
          photo.id,
          currentPiece?.id || '',
          actualCurrentTaskIndex,
          {
            url: photo.dataUrl,
            metadata: photo.meta,
            timestamp: photo.takenAt,
            page: 'checkin',
            taskId: taskKey,
            pieceId: currentPiece?.id,
            etapeId: syncedCurrentTask.etapeID,
            pieceName: currentPiece?.nom || ''
          }
        );
      }
    }
    
    // ... reste du code
  }
};

// 5. Ajouter restauration d'état
useEffect(() => {
  const loadStateFromCheckId = async () => {
    if (!currentCheckId) return;
    
    try {
      const session = await checkSessionManager.getCheckSession(currentCheckId);
      
      if (!session?.progress?.interactions) return;

      const { buttonClicks, photosTaken } = session.progress.interactions;
      
      // Restaurer les tâches complétées
      const completedTaskIds = new Set<string>();
      Object.entries(buttonClicks || {}).forEach(([compositeKey, clickDataArray]) => {
        // Parser et restaurer
        // ...
      });
      
      // Restaurer les photos
      // ...
      
      console.log('✅ CheckIn: État restauré depuis CheckID');
    } catch (error) {
      console.error('❌ CheckIn: Erreur restauration état:', error);
    }
  };
  
  loadStateFromCheckId();
}, [currentCheckId]);
```

#### Estimation
- **Temps**: 3-4 heures
- **Complexité**: Moyenne
- **Risque**: Moyen (nécessite tests approfondis)

### 4.3 Amélioration: Migration vers UnifiedFlowContext

#### Objectif
Remplacer CheckinFlowContext et CheckoutFlowContext par UnifiedFlowContext

#### Étapes
1. **Phase 1**: Compléter UnifiedFlowContext
   - Ajouter toutes les fonctionnalités manquantes
   - Tests unitaires

2. **Phase 2**: Migrer CheckIn
   - Remplacer `useCheckinFlow()` par `useUnifiedFlow()`
   - Adapter les handlers
   - Tests d'intégration

3. **Phase 3**: Migrer CheckOut
   - Remplacer `useCheckoutFlowManager()` par `useUnifiedFlow()`
   - Adapter les handlers
   - Tests d'intégration

4. **Phase 4**: Cleanup
   - Supprimer CheckinFlowContext
   - Supprimer CheckoutFlowContext
   - Supprimer useCheckoutFlowManager

#### Estimation
- **Temps**: 2-3 jours
- **Complexité**: Élevée
- **Risque**: Élevé (refactoring majeur)

### 4.4 Amélioration: Réduction des Logs

#### Objectif
Réduire les logs de debug en production

#### Solution
Utiliser `environment.DEBUG_MODE` systématiquement

**Pattern à appliquer**:
```typescript
// Au lieu de:
console.log('Debug info:', data);

// Utiliser:
if (environment.DEBUG_MODE) {
  console.log('Debug info:', data);
}

// Ou utiliser le logger:
import { logger } from '@/config/environment';
logger.debug('Debug info:', data);
```

#### Fichiers à Modifier
- Tous les fichiers avec `console.log` (environ 50+ occurrences)

#### Estimation
- **Temps**: 4-6 heures
- **Complexité**: Faible
- **Risque**: Très faible

---

## CONCLUSION

### Priorités d'Action

| Priorité | Action | Temps Estimé | Impact |
|----------|--------|--------------|--------|
| 🔴 P1 | Corriger navigation paramètres URL | 1-2h | Critique |
| 🔴 P2 | Auto-save CheckID dans CheckIn | 3-4h | Critique |
| 🟡 P3 | Réduire logs debug | 4-6h | Moyen |
| 🟡 P4 | Migrer vers UnifiedFlowContext | 2-3j | Moyen |
| 💡 P5 | Ajouter tests automatisés | 1-2j | Élevé (long terme) |

### Roadmap Suggérée

**Sprint 1 (1 semaine)**
- ✅ Corriger navigation paramètres URL
- ✅ Auto-save CheckID dans CheckIn
- ✅ Tests manuels complets

**Sprint 2 (1 semaine)**
- ✅ Réduire logs debug
- ✅ Documentation technique
- ✅ Tests d'intégration

**Sprint 3 (2 semaines)**
- ✅ Migration vers UnifiedFlowContext
- ✅ Tests automatisés
- ✅ Monitoring production

---

**Fin du document complémentaire**

