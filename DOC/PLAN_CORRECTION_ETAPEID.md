# 🔧 PLAN DE CORRECTION - PRÉSERVATION ETAPEID

## 🎯 Objectif
Modifier le code pour garantir que les `etapeID` de l'API sont préservés exactement tels quels jusqu'au stockage en base de données.

---

## 📋 ÉTAPE 1: Modifier les interfaces TypeScript

### 1.1 Ajouter etapeID à l'interface RealEtape

**Fichier**: `FRONT/src/services/dataAdapter.ts`

**Modification**:
```typescript
// AVANT (ligne 24-32)
interface RealEtape {
  pieceID: string;
  image?: string;
  isTodo: boolean;
  todoParam?: string;
  todoTitle?: string;
  todoOrder?: string;
  todoImage?: string;
}

// APRÈS
interface RealEtape {
  etapeID: string;  // ✅ AJOUTÉ
  pieceID: string;
  image?: string;
  isTodo: boolean;
  todoParam?: string;
  todoTitle?: string;
  todoOrder?: string;
  todoImage?: string;
}
```

---

### 1.2 Ajouter etapeID à l'interface Task

**Fichier**: `FRONT/src/types/room.ts`

**Modification**:
```typescript
// AVANT (ligne 8-23)
export interface Task {
  id: string;
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | 'photo_optional' | 'photo_multiple' | 'reference_photos';
  label: string;
  description?: string;
  completed: boolean;
  // ... autres champs
}

// APRÈS
export interface Task {
  id: string;
  etapeID: string;  // ✅ AJOUTÉ - ID original de l'API
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | 'photo_optional' | 'photo_multiple' | 'reference_photos';
  label: string;
  description?: string;
  completed: boolean;
  // ... autres champs
}
```

---

### 1.3 Ajouter etapeID à l'interface PhotoReference

**Fichier**: `FRONT/src/types/room.ts`

**Modification**:
```typescript
// AVANT (ligne 25-31)
export interface PhotoReference {
  tache_id: string;
  url: string;
  expected_orientation: 'portrait' | 'paysage';
  overlay_enabled: boolean;
}

// APRÈS
export interface PhotoReference {
  tache_id: string;
  etapeID: string;  // ✅ AJOUTÉ - ID original de l'étape photo
  url: string;
  expected_orientation: 'portrait' | 'paysage';
  overlay_enabled: boolean;
}
```

---

## 📋 ÉTAPE 2: Modifier le DataAdapter

### 2.1 Préserver etapeID dans createTaskFromEtape

**Fichier**: `FRONT/src/services/dataAdapter.ts`

**Modification**:
```typescript
// AVANT (ligne 236-263)
private static createTaskFromEtape(
  etape: RealEtape, 
  pieceId: string, 
  index: number
): Task | null {
  const title = etape.todoTitle || etape.todoOrder;
  if (!title) return null;

  const taskId = this.generateTaskId(etape, index);  // ❌ Génère un slug
  
  return {
    id: taskId,  // ❌ Utilise le slug
    piece_id: pieceId,
    ordre: index + 1,
    type: etape.todoImage ? 'photo_required' : 'checkbox',
    label: title.trim(),
    description: etape.todoOrder?.trim(),
    completed: false,
    // ...
  };
}

// APRÈS
private static createTaskFromEtape(
  etape: RealEtape, 
  pieceId: string, 
  index: number
): Task | null {
  const title = etape.todoTitle || etape.todoOrder;
  if (!title) return null;

  // ✅ Utiliser directement l'etapeID de l'API
  const taskId = etape.etapeID;
  
  return {
    id: taskId,           // ✅ Utilise l'etapeID original
    etapeID: etape.etapeID,  // ✅ Stocke aussi dans un champ dédié
    piece_id: pieceId,
    ordre: index + 1,
    type: etape.todoImage ? 'photo_required' : 'checkbox',
    label: title.trim(),
    description: etape.todoOrder?.trim(),
    completed: false,
    // ...
  };
}
```

---

### 2.2 Préserver etapeID dans createReferencePhotoTask

**Fichier**: `FRONT/src/services/dataAdapter.ts`

**Modification**:
```typescript
// AVANT (ligne 333-377)
private static createReferencePhotoTask(
  photoEtapes: RealEtape[],
  pieceId: string,
  ordre: number
): Task {
  const photoReferences: PhotoReference[] = photoEtapes.map((etape, index) => ({
    tache_id: `${pieceId}_photo_${index}`,  // ❌ Génère un ID
    url: etape.image.startsWith('//') ? 'https:' + etape.image : etape.image,
    expected_orientation: 'paysage',
    overlay_enabled: true
  }));

  const photoTask = {
    id: `photos-${pieceId}`,  // ❌ Génère un ID
    piece_id: pieceId,
    // ...
  };
  
  return photoTask;
}

// APRÈS
private static createReferencePhotoTask(
  photoEtapes: RealEtape[],
  pieceId: string,
  ordre: number
): Task {
  // ✅ Utiliser le premier etapeID pour la tâche photo
  const firstPhotoEtapeId = photoEtapes[0]?.etapeID || `photos-${pieceId}`;
  
  const photoReferences: PhotoReference[] = photoEtapes.map((etape, index) => ({
    tache_id: etape.etapeID,  // ✅ Utilise l'etapeID original
    etapeID: etape.etapeID,   // ✅ Stocke aussi dans un champ dédié
    url: etape.image.startsWith('//') ? 'https:' + etape.image : etape.image,
    expected_orientation: 'paysage',
    overlay_enabled: true
  }));

  const photoTask = {
    id: firstPhotoEtapeId,    // ✅ Utilise l'etapeID de la première photo
    etapeID: firstPhotoEtapeId,  // ✅ Stocke aussi dans un champ dédié
    piece_id: pieceId,
    // ...
    photo_references: photoReferences
  };
  
  return photoTask;
}
```

---

### 2.3 Supprimer la fonction generateTaskId (optionnel)

**Fichier**: `FRONT/src/services/dataAdapter.ts`

**Modification**:
```typescript
// AVANT (ligne 382-390)
private static generateTaskId(etape: RealEtape, index: number): string {
  const title = etape.todoTitle || etape.todoOrder || `task-${index}`;
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
    .replace(/-+$/, '') || `task-${index}`;
}

// APRÈS
// ❌ SUPPRIMER cette fonction - elle n'est plus nécessaire
// Les etapeID de l'API sont utilisés directement
```

---

## 📋 ÉTAPE 3: Mettre à jour les composants

### 3.1 Utiliser task.etapeID dans les interactions

**Fichiers à vérifier**:
- `FRONT/src/pages/CheckEasy.tsx`
- `FRONT/src/components/TaskCard.tsx`
- Tous les composants qui enregistrent des interactions

**Modification type**:
```typescript
// AVANT
const handleTaskComplete = (taskId: string) => {
  // Enregistrer l'interaction avec taskId
  saveInteraction({
    taskId: taskId,  // ❌ Utilise le taskId (peut être un slug)
    pieceId: currentPieceId,
    // ...
  });
};

// APRÈS
const handleTaskComplete = (task: Task) => {
  // Enregistrer l'interaction avec etapeID
  saveInteraction({
    taskId: task.id,
    etapeId: task.etapeID,  // ✅ Utilise l'etapeID original
    pieceId: currentPieceId,
    // ...
  });
};
```

---

### 3.2 Mettre à jour le stockage des interactions

**Fichier**: `FRONT/src/contexts/GlobalParcoursContext.tsx` (ou service d'interactions)

**Modification**:
```typescript
// AVANT
interface ButtonClick {
  taskId: string;
  pieceId: string;
  actionType: string;
  timestamp: string;
  // ...
}

// APRÈS
interface ButtonClick {
  taskId: string;
  etapeId: string;  // ✅ AJOUTÉ
  pieceId: string;
  actionType: string;
  timestamp: string;
  // ...
}
```

---

## 📋 ÉTAPE 4: Mettre à jour database-admin.html

### 4.1 Simplifier extractRealEtapes

**Fichier**: `FRONT/public/database-admin.html`

**Modification**:
```javascript
// AVANT (ligne 1417-1744)
function extractRealEtapes(sessionData, pieceId, type) {
  // ... code complexe avec mapping API ...
  
  const rawEtapeId = click.etapeId || click.metadata?.mappedEtapeId;
  const apiEtapeId = findRealEtapeIdFromAPI(sessionData, pieceId, taskContext);
  
  let realEtapeId;
  if (apiEtapeId) {
    realEtapeId = apiEtapeId;
  } else if (rawEtapeId === pieceId) {
    realEtapeId = ensureUniqueEtapeId(rawEtapeId, pieceId, index);
  } else {
    realEtapeId = rawEtapeId;
  }
  // ...
}

// APRÈS
function extractRealEtapes(sessionData, pieceId, type) {
  // ✅ SIMPLIFIÉ - Les etapeId sont déjà corrects
  
  const etapeId = click.etapeId;  // ✅ Déjà le bon ID depuis l'API
  
  const etapeData = {
    etape_id: etapeId,  // ✅ Utilisation directe
    status: "completed",
    type: "button_click",
    // ...
  };
  
  etapes.push(etapeData);
  // ...
}
```

---

### 4.2 Supprimer les fonctions de mapping (optionnel)

**Fichier**: `FRONT/public/database-admin.html`

**Fonctions à supprimer ou simplifier**:
- `findRealEtapeIdFromAPI()` (ligne 1814-1865) - Plus nécessaire
- `ensureUniqueEtapeId()` (ligne 1868-1888) - Plus nécessaire
- `cleanEtapeId()` (ligne 1747-1755) - Peut être conservée pour validation

---

## 📋 ÉTAPE 5: Supprimer etapeIdMapper (optionnel)

### 5.1 Évaluer la nécessité du service

**Fichier**: `FRONT/src/services/etapeIdMapper.ts`

**Question**: Ce service est-il encore nécessaire ?

**Réponse**: NON, si les modifications ci-dessus sont appliquées
- Les `task.id` sont directement les `etapeID`
- Pas besoin de mapping `taskId` → `etapeID`
- Le service peut être supprimé ou conservé pour compatibilité

---

## 📋 ÉTAPE 6: Tests de validation

### 6.1 Exécuter les scripts de test

**Fichier**: `DOC/SCRIPTS_TEST_ETAPEID.md`

**Procédure**:
1. Exécuter le Script 1 (API) - Doit réussir
2. Exécuter le Script 2 (DataAdapter) - Doit maintenant réussir à 100%
3. Exécuter le Script 4 (Webhook) - Doit maintenant réussir à 100%
4. Exécuter le Script 5 (Complet) - Tous les tests doivent réussir

---

### 6.2 Vérifier manuellement

**Procédure**:
1. Charger le parcours `1753358726225x784440888671076400`
2. Compléter quelques tâches
3. Prendre quelques photos
4. Générer le payload webhook
5. Vérifier que tous les `etape_id` correspondent aux `etapeID` de l'API

**Vérification**:
```javascript
// Dans la console
const payload = /* payload généré */;
const apiData = /* données API */;

// Comparer
payload.pieces.forEach(piece => {
  const apiPiece = apiData.piece.find(p => p.pieceID === piece.piece_id);
  
  piece.etapes.forEach(etape => {
    const apiEtape = apiPiece.etapes.find(e => e.etapeID === etape.etape_id);
    
    if (apiEtape) {
      console.log(`✅ ${etape.etape_id} correspond à l'API`);
    } else {
      console.log(`❌ ${etape.etape_id} NE correspond PAS à l'API`);
    }
  });
});
```

---

## 📊 CHECKLIST DE VALIDATION

### Avant de commencer
- [ ] Créer une branche Git pour les modifications
- [ ] Sauvegarder les fichiers originaux
- [ ] Documenter l'état actuel avec les scripts de test

### Modifications du code
- [ ] ✅ Ajouter `etapeID` à `RealEtape`
- [ ] ✅ Ajouter `etapeID` à `Task`
- [ ] ✅ Ajouter `etapeID` à `PhotoReference`
- [ ] ✅ Modifier `createTaskFromEtape()` pour utiliser `etapeID`
- [ ] ✅ Modifier `createReferencePhotoTask()` pour utiliser `etapeID`
- [ ] ✅ Mettre à jour les composants pour utiliser `task.etapeID`
- [ ] ✅ Mettre à jour le stockage des interactions
- [ ] ✅ Simplifier `extractRealEtapes()` dans database-admin.html

### Tests
- [ ] ✅ Script 1 (API) réussit
- [ ] ✅ Script 2 (DataAdapter) réussit à 100%
- [ ] ✅ Script 4 (Webhook) réussit à 100%
- [ ] ✅ Script 5 (Complet) réussit
- [ ] ✅ Test manuel checkin réussit
- [ ] ✅ Test manuel checkout réussit

### Validation finale
- [ ] ✅ Tous les `etapeID` sont préservés de l'API au webhook
- [ ] ✅ Aucun `etapeID` n'est égal à un `pieceID`
- [ ] ✅ Aucun `etapeID` n'est généré ou transformé
- [ ] ✅ Le taux de correspondance est de 100%

---

## 🎯 RÉSULTAT ATTENDU

Après ces modifications:

1. **API → DataAdapter**:
   - ✅ Les `etapeID` sont préservés exactement
   - ✅ `task.id` = `etapeID` de l'API
   - ✅ `task.etapeID` = `etapeID` de l'API

2. **DataAdapter → Composants**:
   - ✅ Les composants utilisent `task.etapeID`
   - ✅ Les interactions stockent le bon `etapeID`

3. **Composants → Webhook**:
   - ✅ Le payload contient les vrais `etapeID`
   - ✅ Taux de correspondance: 100%

4. **Webhook → Base de données**:
   - ✅ Les `etapeID` stockés sont identiques à ceux de l'API
   - ✅ Aucune perte ou transformation

---

**Créé le**: 2025-09-30  
**Parcours de test**: `1753358726225x784440888671076400`  
**Estimation**: 4-6 heures de développement + 2 heures de tests

