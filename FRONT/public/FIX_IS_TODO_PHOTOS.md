# 🔧 CORRECTION: is_todo pour les photos TODO

## 📋 Problème identifié

Les photos prises sur des étapes TODO (tâches à valider) n'étaient pas correctement marquées avec `is_todo = true` dans le webhook.

**Symptôme** :
- Toutes les photos avaient `is_todo: false` dans le webhook
- Impossible de distinguer les photos de référence (checkin) des photos de validation TODO (checkout)

**Cause racine** :
Les métadonnées `isTodo` et `todoTitle` n'étaient pas propagées depuis l'API jusqu'au webhook :
1. ❌ `PhotoReference` n'avait pas de champ `isTodo`
2. ❌ `dataAdapter.ts` ne passait pas `isTodo` lors de la création des références
3. ❌ `PhotoCaptureModal.tsx` ne passait pas `isTodo` lors de l'upload
4. ❌ `database-admin.html` ne récupérait pas `todoTitle` depuis les métadonnées

---

## ✅ Solution implémentée

### 1. Ajout de `isTodo` et `todoTitle` à l'interface `PhotoReference`

**Fichier** : `FRONT/src/types/room.ts`

```typescript
export interface PhotoReference {
  tache_id: string;
  etapeID: string;
  url: string;
  expected_orientation: 'portrait' | 'paysage';
  overlay_enabled: boolean;
  isTodo?: boolean;  // ✅ AJOUTÉ - Indique si c'est une photo de validation TODO
  todoTitle?: string;  // ✅ AJOUTÉ - Titre de la tâche TODO
}
```

**Impact** : Les références photo stockent maintenant l'information `isTodo`.

---

### 2. Propagation de `isTodo` dans `dataAdapter.ts`

**Fichier** : `FRONT/src/services/dataAdapter.ts` (lignes 156-182)

```typescript
// Photos de référence (étapes avec isTodo: false)
const checkinPhotos: PhotoReference[] = photoEtapes.map((etape, index) => ({
  tache_id: etape.etapeID,
  etapeID: etape.etapeID,
  url: etape.image || '/placeholder-image.jpg',
  expected_orientation: index % 2 === 0 ? 'paysage' : 'portrait',
  overlay_enabled: true,
  isTodo: false  // ✅ AJOUTÉ: Photos de référence ne sont pas des TODO
}));

// Photos de validation des tâches (étapes avec todoImage)
const taskPhotos = todoEtapes
  .filter(etape => etape.todoImage)
  .map((etape, index) => ({
    tache_id: etape.etapeID,
    etapeID: etape.etapeID,
    url: etape.todoImage || '/placeholder-image.jpg',
    expected_orientation: 'paysage' as const,
    overlay_enabled: true,
    isTodo: true,  // ✅ AJOUTÉ: Photos de validation TODO
    todoTitle: etape.todoTitle  // ✅ AJOUTÉ: Titre de la tâche
  }));
```

**Impact** : Les `PhotoReference` créées contiennent maintenant `isTodo` et `todoTitle`.

---

### 3. Passage de `isTodo` lors de l'upload dans `PhotoCaptureModal.tsx`

**Fichier** : `FRONT/src/components/PhotoCaptureModal.tsx` (lignes 144-177)

```typescript
console.log('📸 Capture en cours...', {
  currentRefIndex,
  tache_id: currentRef.tache_id,
  etapeID: currentRef.etapeID,
  flowType: flowType || 'unknown',
  isTodo: currentRef.isTodo,  // ✅ AJOUTÉ
  todoTitle: currentRef.todoTitle  // ✅ AJOUTÉ
});

await uploadCapturedPhoto(capturedPhoto, {
  taskId: currentRef.tache_id,
  etapeId: currentRef.etapeID,
  flowType: flowType,
  checkId: currentCheckId || undefined,
  metadata: {
    isTodo: currentRef.isTodo || false,  // ✅ AJOUTÉ: Passer isTodo
    todoTitle: currentRef.todoTitle || ''  // ✅ AJOUTÉ: Passer todoTitle
  }
});
```

**Impact** : Les métadonnées `isTodo` et `todoTitle` sont maintenant passées lors de l'upload.

---

### 4. Propagation automatique dans `imageUploadService.ts`

**Fichier** : `FRONT/src/services/imageUploadService.ts` (ligne 325)

```typescript
metadata: {
  url: uploadedUrl,
  pieceId: request.pieceId,
  taskId: request.taskId,
  referencePhotoId: request.referencePhotoId,
  uploadedAt: new Date().toISOString(),
  savedImmediately: true,
  flowType: request.flowType,
  ...request.metadata  // ✅ Propage isTodo et todoTitle automatiquement
}
```

**Impact** : Les métadonnées sont automatiquement propagées dans la session CheckID.

---

### 5. Récupération de `todoTitle` dans `database-admin.html`

**Fichier** : `FRONT/public/database-admin.html` (ligne 1937)

**Avant** :
```javascript
todo_title: apiMetadata?.todo_title || '',
```

**Après** :
```javascript
todo_title: apiMetadata?.todo_title || photo.metadata?.todoTitle || '',
```

**Impact** : Le `todoTitle` est maintenant récupéré depuis les métadonnées de la photo si l'API ne le fournit pas.

---

## 📊 Résultat final

### Structure du webhook pour une photo TODO

```json
{
  "etape_id": "1758627881896x115634152878258740",
  "type": "photo_taken",
  "etape_type": "checkout",
  "status": "completed",
  "timestamp": "2025-09-30T10:15:32.123Z",
  "is_todo": true,  // ✅ CORRECT !
  "todo_title": "Vérifier l'état du canapé",  // ✅ CORRECT !
  "photo_id": "photo_1727692532123_abc123",
  "photo_url": "https://...",
  "photo_base64": null,
  "validated": false,
  "retake_count": 0
}
```

### Structure du webhook pour une photo de référence

```json
{
  "etape_id": "1758627881896x115634152878258740",
  "type": "photo_taken",
  "etape_type": "checkin",
  "status": "completed",
  "timestamp": "2025-09-30T09:05:12.456Z",
  "is_todo": false,  // ✅ CORRECT !
  "todo_title": "",
  "photo_id": "photo_1727688312456_def456",
  "photo_url": "https://...",
  "photo_base64": null,
  "validated": true,
  "retake_count": 0
}
```

---

## 🧪 Tests à effectuer

1. **Créer un parcours avec des étapes TODO** (tâches à valider avec photos)
2. **Faire un checkout** et prendre des photos sur les étapes TODO
3. **Générer le webhook unifié** dans `database-admin.html`
4. **Vérifier** que les photos TODO ont :
   - ✅ `is_todo: true`
   - ✅ `todo_title: "Titre de la tâche"`
   - ✅ `etape_type: "checkout"`
5. **Vérifier** que les photos de référence (checkin) ont :
   - ✅ `is_todo: false`
   - ✅ `etape_type: "checkin"`

---

## 📝 Fichiers modifiés

1. ✅ `FRONT/src/types/room.ts` - Ajout de `isTodo` et `todoTitle` à `PhotoReference`
2. ✅ `FRONT/src/services/dataAdapter.ts` - Propagation de `isTodo` lors de la création des références
3. ✅ `FRONT/src/components/PhotoCaptureModal.tsx` - Passage de `isTodo` lors de l'upload
4. ✅ `FRONT/public/database-admin.html` - Récupération de `todoTitle` depuis les métadonnées

---

## 🎯 Prochaines étapes

1. Tester avec des données réelles
2. Vérifier que le backend Bubble reçoit correctement `is_todo: true`
3. Documenter l'utilisation de `is_todo` dans l'API backend

