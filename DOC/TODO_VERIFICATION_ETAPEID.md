# ✅ TODO LIST - VÉRIFICATION INTÉGRITÉ ETAPEID

## 🎯 Objectif
Garantir à 100% que les `etapeId` sont préservés exactement tels quels depuis l'API jusqu'au stockage en base de données, sans aucune transformation ou perte.

## 📊 Parcours de test
**ID**: `1753358726225x784440888671076400`  
**Données**: Disponibles dans `DOC/Data.json`

---

## 🔍 PHASE 1: RÉCEPTION DES DONNÉES API

### ✅ 1.1 Vérifier l'appel API GET
**Fichier**: `FRONT/src/services/parcoursManager.ts` (ligne 92)

**Test à effectuer**:
```javascript
// Dans la console du navigateur
const parcoursId = '1753358726225x784440888671076400';
const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece?parcours=${parcoursId}`;
const response = await fetch(apiUrl);
const rawData = await response.json();

// Vérifier la structure
console.log('📊 Structure rawData:', {
  parcourID: rawData.parcourID,
  totalPieces: rawData.piece.length,
  firstPiece: rawData.piece[0]
});

// Vérifier les etapeID de la première pièce
console.log('📋 Étapes de la première pièce:');
rawData.piece[0].etapes.forEach((etape, index) => {
  console.log(`  ${index + 1}. etapeID: "${etape.etapeID}" | isTodo: ${etape.isTodo} | title: "${etape.todoTitle || 'Photo'}"`);
});
```

**Résultat attendu**:
- ✅ Chaque étape a un champ `etapeID` unique
- ✅ Format: `1234567890123x456789012345678900` (timestamp x random)
- ✅ Les `etapeID` sont différents des `pieceID`
- ✅ Pas de `etapeID` manquant ou `null`

**Exemple attendu** (depuis Data.json):
```json
{
  "etapeID": "1753358727684x171131427093090140",
  "pieceID": "1753358727481x453383598298510400",
  "isTodo": true,
  "todoTitle": "🛏️ Refaire le lit..."
}
```

---

### ✅ 1.2 Vérifier le stockage dans ParcoursManager
**Fichier**: `FRONT/src/services/parcoursManager.ts` (ligne 122-127)

**Test à effectuer**:
```javascript
import { parcoursManager } from '@/services/parcoursManager';

// Après chargement du parcours
const currentParcours = parcoursManager.getCurrentParcours();

console.log('📦 ParcoursData stocké:', {
  id: currentParcours.id,
  hasRawData: !!currentParcours.rawData,
  rawDataStructure: {
    parcourID: currentParcours.rawData.parcourID,
    firstPieceEtapes: currentParcours.rawData.piece[0].etapes.map(e => e.etapeID)
  }
});
```

**Résultat attendu**:
- ✅ `rawData` contient les données brutes exactes de l'API
- ✅ Les `etapeID` sont identiques à ceux reçus de l'API
- ✅ Aucune transformation appliquée sur `rawData`

---

## 🔄 PHASE 2: TRANSFORMATION DES DONNÉES (DataAdapter)

### ✅ 2.1 Vérifier que DataAdapter NE transforme PAS les etapeID
**Fichier**: `FRONT/src/services/dataAdapter.ts`

**⚠️ PROBLÈME IDENTIFIÉ**: Le DataAdapter ne préserve PAS les etapeID !

**Analyse du code**:
```typescript
// Ligne 236-263: createTaskFromEtape()
private static createTaskFromEtape(etape: RealEtape, pieceId: string, index: number): Task | null {
  const taskId = this.generateTaskId(etape, index);  // ❌ GÉNÈRE UN NOUVEAU ID
  
  return {
    id: taskId,  // ❌ Utilise le taskId généré, PAS l'etapeID
    piece_id: pieceId,
    // ... pas de champ etapeID !
  };
}

// Ligne 382-390: generateTaskId()
private static generateTaskId(etape: RealEtape, index: number): string {
  const title = etape.todoTitle || etape.todoOrder || `task-${index}`;
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30)
    .replace(/-+$/, '') || `task-${index}`;
  // ❌ GÉNÈRE UN SLUG DEPUIS LE TITRE, IGNORE L'ETAPEID !
}
```

**🚨 PROBLÈME CRITIQUE**:
- ❌ L'`etapeID` de l'API n'est JAMAIS utilisé
- ❌ Un nouveau `taskId` est généré depuis le titre
- ❌ Aucun mapping `taskId` → `etapeID` n'est créé
- ❌ L'`etapeID` original est perdu

**Test à effectuer**:
```javascript
import { DataAdapter } from '@/services/dataAdapter';

// Charger les données brutes
const rawData = currentParcours.rawData;

// Adapter les données
const adaptedData = DataAdapter.adaptCompleteData(rawData);

// Comparer les IDs
const firstPiece = rawData.piece[0];
const firstAdaptedRoom = Object.values(adaptedData.roomsData)[0];

console.log('🔍 Comparaison IDs:');
console.log('API etapeID:', firstPiece.etapes[0].etapeID);
console.log('Adapted taskId:', firstAdaptedRoom.tasks[0]?.id);
console.log('❌ MATCH:', firstPiece.etapes[0].etapeID === firstAdaptedRoom.tasks[0]?.id);
```

**Résultat attendu** (ACTUELLEMENT FAUX):
- ❌ Les `taskId` générés ne correspondent PAS aux `etapeID` de l'API
- ❌ Exemple: 
  - API: `"1753358727684x171131427093090140"`
  - Adapted: `"refaire-le-lit-avec-des-drap"` (slug du titre)

---

### ✅ 2.2 Vérifier l'interface RealEtape
**Fichier**: `FRONT/src/services/dataAdapter.ts` (ligne 24-32)

**Analyse**:
```typescript
interface RealEtape {
  pieceID: string;
  image?: string;
  isTodo: boolean;
  todoParam?: string;
  todoTitle?: string;
  todoOrder?: string;
  todoImage?: string;
  // ❌ PAS DE CHAMP etapeID !
}
```

**🚨 PROBLÈME**: L'interface TypeScript ne définit même pas le champ `etapeID` !

**Test à effectuer**:
```javascript
// Vérifier si l'etapeID existe dans les données brutes
const firstEtape = rawData.piece[0].etapes[0];
console.log('🔍 Champs disponibles dans l\'étape:', Object.keys(firstEtape));
console.log('✅ A un etapeID:', 'etapeID' in firstEtape);
console.log('📊 Valeur etapeID:', firstEtape.etapeID);
```

**Résultat attendu**:
- ✅ Le champ `etapeID` existe dans les données brutes
- ❌ Mais il n'est PAS défini dans l'interface TypeScript
- ❌ Donc il n'est PAS utilisé par le DataAdapter

---

### ✅ 2.3 Vérifier l'interface Task
**Fichier**: `FRONT/src/types/room.ts` (ligne 8-23)

**Analyse**:
```typescript
export interface Task {
  id: string;  // ❌ C'est le taskId généré, PAS l'etapeID
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | ...;
  label: string;
  description?: string;
  // ... autres champs
  // ❌ PAS DE CHAMP etapeID !
}
```

**🚨 PROBLÈME**: L'interface Task ne stocke PAS l'etapeID original !

---

## 🔧 PHASE 3: SERVICE ETAPEIDMAPPER (Solution partielle)

### ✅ 3.1 Vérifier le service etapeIdMapper
**Fichier**: `FRONT/src/services/etapeIdMapper.ts`

**Analyse**:
```typescript
// Ce service EXISTE et fait le mapping
class EtapeIdMapper {
  private etapesMap: Map<string, EtapeApiData> = new Map();
  private taskToEtapeMap: Map<string, string> = new Map(); // taskId -> etapeId
  
  // Charge les données API et crée les mappings
  async loadParcoursData(parcoursId: string): Promise<boolean>
  
  // Récupère l'etapeId pour un taskId donné
  getEtapeIdForTask(taskId: string, pieceId?: string): string | undefined
}
```

**✅ BONNE NOUVELLE**: Un service de mapping existe !

**Test à effectuer**:
```javascript
import { etapeIdMapper } from '@/services/etapeIdMapper';

// Charger les données
await etapeIdMapper.loadParcoursData('1753358726225x784440888671076400');

// Tester le mapping
const taskId = 'refaire-le-lit-avec-des-drap'; // taskId généré
const etapeId = etapeIdMapper.getEtapeIdForTask(taskId);

console.log('🗺️ Mapping:', {
  taskId,
  etapeId,
  success: !!etapeId
});
```

**Résultat attendu**:
- ✅ Le mapper charge les données API
- ✅ Il crée un mapping `taskId` → `etapeID`
- ⚠️ Mais le mapping est basé sur des patterns, pas sur une correspondance exacte

---

## 📤 PHASE 4: WEBHOOKS CHECKIN/CHECKOUT

### ✅ 4.1 Vérifier la fonction extractRealEtapes
**Fichier**: `FRONT/public/database-admin.html` (ligne 1417-1744)

**Analyse**:
```javascript
function extractRealEtapes(sessionData, pieceId, type) {
  // 🚨 PROBLÈME: Utilise click.etapeId qui peut être le pieceId !
  const rawEtapeId = click.etapeId || click.metadata?.mappedEtapeId;
  
  // 🔍 Essaie de trouver le vrai etapeID depuis l'API
  const apiEtapeId = findRealEtapeIdFromAPI(sessionData, pieceId, taskContext);
  
  // Si trouvé, utilise l'API, sinon génère un ID unique
  let realEtapeId;
  if (apiEtapeId) {
    realEtapeId = apiEtapeId;
  } else if (rawEtapeId === pieceId) {
    realEtapeId = ensureUniqueEtapeId(rawEtapeId, pieceId, index);
  } else {
    realEtapeId = rawEtapeId;
  }
}
```

**Test à effectuer**:
```javascript
// Dans database-admin.html, après avoir cliqué sur des boutons
const sessionData = JSON.parse(localStorage.getItem('checkSessionData') || '{}');
const activeCheckId = localStorage.getItem('activeCheckId');
const checkSession = sessionData[activeCheckId];

// Extraire les étapes pour une pièce
const pieceId = '1753358727481x453383598298510400';
const etapes = extractRealEtapes(checkSession, pieceId, 'checkout');

console.log('📋 Étapes extraites:', etapes.map(e => ({
  etape_id: e.etape_id,
  type: e.type,
  description: e.description
})));
```

**Résultat attendu**:
- ⚠️ Les `etape_id` peuvent être:
  - Les vrais `etapeID` de l'API (si mapping réussi)
  - Des IDs générés (si mapping échoué)
  - Le `pieceID` (si aucun mapping)

---

### ✅ 4.2 Vérifier la fonction findRealEtapeIdFromAPI
**Fichier**: `FRONT/public/database-admin.html` (ligne 1814-1865)

**Test à effectuer**:
```javascript
// Tester le mapping API
const taskContext = {
  actionType: 'task_complete',
  taskType: 'checkbox',
  todoTitle: '🛏️ Refaire le lit avec des draps propres...',
  isTodo: true
};

const apiEtapeId = findRealEtapeIdFromAPI(checkSession, pieceId, taskContext);

console.log('🎯 Mapping API:', {
  pieceId,
  taskContext,
  foundEtapeId: apiEtapeId,
  success: !!apiEtapeId
});
```

**Résultat attendu**:
- ✅ Si le titre correspond, retourne le bon `etapeID`
- ⚠️ Si pas de correspondance, retourne la première étape (fallback)
- ❌ Pas de garantie de mapping exact

---

### ✅ 4.3 Vérifier le payload webhook
**Fichier**: `FRONT/public/database-admin.html` (fonction `sendWebhook`)

**Test à effectuer**:
```javascript
// Avant d'envoyer le webhook, inspecter le payload
function sendWebhook(type) {
  // ... code existant ...
  
  // Juste avant l'envoi, logger le payload
  console.log('📤 PAYLOAD WEBHOOK:', JSON.stringify(payload, null, 2));
  
  // Vérifier les etapeId dans les pièces
  payload.pieces.forEach(piece => {
    console.log(`📋 Pièce ${piece.nom}:`);
    piece.etapes.forEach(etape => {
      console.log(`  - etape_id: "${etape.etape_id}" | type: ${etape.type}`);
    });
  });
}
```

**Résultat attendu**:
- ✅ Chaque étape a un `etape_id`
- ⚠️ Les `etape_id` peuvent être:
  - Les vrais `etapeID` de l'API (IDÉAL)
  - Des IDs générés (PROBLÈME)
  - Le `pieceID` (GROS PROBLÈME)

---

## 🎯 PHASE 5: TESTS DE BOUT EN BOUT

### ✅ 5.1 Test complet Checkin
**Page**: `database-admin.html`

**Procédure**:
1. Ouvrir `database-admin.html`
2. Charger le parcours `1753358726225x784440888671076400`
3. Simuler des interactions checkin
4. Cliquer sur "🚀 Envoyer CheckIn"
5. Inspecter le payload

**Vérifications**:
```javascript
// Comparer les etapeID API vs Payload
const apiEtapeIds = rawData.piece[0].etapes.map(e => e.etapeID);
const payloadEtapeIds = payload.pieces[0].etapes.map(e => e.etape_id);

console.log('🔍 Comparaison Checkin:');
console.log('API:', apiEtapeIds);
console.log('Payload:', payloadEtapeIds);
console.log('✅ Match:', JSON.stringify(apiEtapeIds) === JSON.stringify(payloadEtapeIds));
```

---

### ✅ 5.2 Test complet Checkout
**Page**: `database-admin.html`

**Procédure**:
1. Ouvrir `database-admin.html`
2. Charger le parcours `1753358726225x784440888671076400`
3. Simuler des interactions checkout (tâches + photos)
4. Cliquer sur "🚀 Envoyer CheckOut"
5. Inspecter le payload

**Vérifications**:
```javascript
// Comparer les etapeID API vs Payload
const apiTodoEtapeIds = rawData.piece[0].etapes
  .filter(e => e.isTodo)
  .map(e => e.etapeID);
const payloadTodoEtapeIds = payload.pieces[0].etapes
  .filter(e => e.type === 'button_click')
  .map(e => e.etape_id);

console.log('🔍 Comparaison Checkout (todos):');
console.log('API:', apiTodoEtapeIds);
console.log('Payload:', payloadTodoEtapeIds);
console.log('✅ Match:', JSON.stringify(apiTodoEtapeIds) === JSON.stringify(payloadTodoEtapeIds));
```

---

## 🚨 PROBLÈMES IDENTIFIÉS

### ❌ Problème 1: DataAdapter ne préserve pas les etapeID
**Fichier**: `FRONT/src/services/dataAdapter.ts`

**Impact**: Les `etapeID` de l'API sont perdus lors de la transformation

**Solution requise**:
1. Ajouter `etapeID` à l'interface `RealEtape`
2. Ajouter `etapeID` à l'interface `Task`
3. Préserver l'`etapeID` dans `createTaskFromEtape()`
4. Utiliser l'`etapeID` comme `task.id` au lieu de générer un slug

---

### ❌ Problème 2: Mapping taskId → etapeID non fiable
**Fichier**: `FRONT/src/services/etapeIdMapper.ts`

**Impact**: Le mapping est basé sur des patterns, pas sur une correspondance exacte

**Solution requise**:
1. Utiliser directement l'`etapeID` comme `task.id`
2. Supprimer le besoin de mapping

---

### ❌ Problème 3: Interactions stockent le pieceID au lieu de l'etapeID
**Fichier**: Composants qui enregistrent les interactions

**Impact**: Les interactions utilisent le `pieceID` comme `etapeId`

**Solution requise**:
1. Identifier où les interactions sont enregistrées
2. S'assurer qu'elles utilisent le vrai `etapeID`

---

## 📊 CHECKLIST FINALE

### Avant correction
- [ ] API retourne bien les `etapeID`
- [ ] `rawData` contient les `etapeID`
- [ ] DataAdapter PERD les `etapeID` ❌
- [ ] Tasks n'ont PAS de champ `etapeID` ❌
- [ ] Mapping `taskId` → `etapeID` existe mais non fiable ⚠️
- [ ] Webhooks tentent de récupérer les `etapeID` ⚠️
- [ ] Payload final peut contenir des IDs incorrects ❌

### Après correction (objectif)
- [ ] API retourne bien les `etapeID` ✅
- [ ] `rawData` contient les `etapeID` ✅
- [ ] DataAdapter PRÉSERVE les `etapeID` ✅
- [ ] Tasks ont un champ `etapeID` ✅
- [ ] `task.id` = `etapeID` (pas de mapping nécessaire) ✅
- [ ] Interactions utilisent l'`etapeID` ✅
- [ ] Payload final contient les vrais `etapeID` ✅

---

**Créé le**: 2025-09-30  
**Parcours de test**: `1753358726225x784440888671076400`  
**Données**: `DOC/Data.json`

