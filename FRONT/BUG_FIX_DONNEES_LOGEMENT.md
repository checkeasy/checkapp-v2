# 🐛 BUG FIX - Perte des données du logement après rechargement

## 📋 Symptômes

- Quand on recharge la page `/checkout`, les données du logement (nom, adresse, informations de la propriété) disparaissent
- Les données affichées sur la page CheckOut ne persistent pas après un refresh
- Erreur dans la console : `rawData est null ou undefined`

## 🔍 Diagnostic

### Cause Racine

Le problème vient de **deux sources de données concurrentes** dans CheckOut.tsx :

1. **Ancien système** : `useParcoursData()` de `GlobalParcoursContext`
2. **Nouveau système** : `useParcoursDataUnified()` avec `DataLoadingOrchestrator`

La page CheckOut utilisait `globalRooms` de l'ancien contexte au lieu d'utiliser `parcoursUnified` du nouveau hook.

### Problème dans DataLoadingOrchestrator

Dans `dataLoadingOrchestrator.ts` ligne 151 :
```typescript
const parcours = parcoursManager.loadFromRawDataWithMode(cached!.data, forceFlowType);
```

Le code supposait que `cached` était un objet `CachedParcours` avec une propriété `data`, mais `parcoursCache.getParcours()` retourne directement les données (pas l'objet wrapper).

## ✅ Corrections Appliquées

### 1. CheckOut.tsx - Utiliser parcoursUnified

**Avant** (ligne 179) :
```typescript
const sortedGlobalRooms = [...globalRooms].sort((a, b) => a.ordre - b.ordre);
```

**Après** (lignes 178-183) :
```typescript
// 🆕 REFACTORISÉ: Utiliser les données de parcoursUnified au lieu de globalRooms
// Cela garantit que les données sont chargées via DataLoadingOrchestrator avec cache
const roomsToUse = parcoursUnified?.adaptedData?.roomsData 
  ? Object.values(parcoursUnified.adaptedData.roomsData) 
  : globalRooms;

const sortedGlobalRooms = [...roomsToUse].sort((a, b) => a.ordre - b.ordre);
```

**Bénéfice** : Les données sont maintenant chargées via le nouveau système unifié avec cache.

### 2. DataLoadingOrchestrator.ts - Corriger l'utilisation du cache

**Avant** (lignes 133-153) :
```typescript
const cached = await parcoursCache.getParcours(parcoursId);
const cacheValid = cached && parcoursCache.isCacheValid(parcoursId, 24);

if (cacheValid) {
  const cacheAge = Date.now() - cached!.cachedAt; // ❌ ERREUR: cached n'a pas cachedAt
  const parcours = parcoursManager.loadFromRawDataWithMode(cached!.data, forceFlowType); // ❌ ERREUR: cached n'a pas data
  return parcours;
}
```

**Après** (lignes 132-155) :
```typescript
// 1. Vérifier le cache
console.log(`🔍 [DataLoadingOrchestrator] Vérification cache pour parcours ${parcoursId}...`);
const cachedData = await parcoursCache.getParcours(parcoursId);
console.log(`🔍 [DataLoadingOrchestrator] Données cache:`, {
  hasCachedData: !!cachedData,
  cachedDataType: typeof cachedData,
  cachedDataKeys: cachedData ? Object.keys(cachedData).slice(0, 5) : []
});

const cacheValid = cachedData && await parcoursCache.isCacheValid(parcoursId, 24);
console.log(`🔍 [DataLoadingOrchestrator] Cache valide:`, cacheValid);

if (cacheValid && cachedData) {
  console.log(`✅ [DataLoadingOrchestrator] Parcours ${parcoursId} chargé depuis le cache`);
  
  // Charger depuis le cache
  const parcours = parcoursManager.loadFromRawDataWithMode(cachedData, forceFlowType);
  
  // Recharger en arrière-plan pour rafraîchir le cache (fire-and-forget)
  this._reloadParcoursInBackground(parcoursId, forceFlowType);
  
  return parcours;
}
```

**Bénéfices** :
- ✅ Utilise directement `cachedData` au lieu de `cached.data`
- ✅ Ajoute des logs détaillés pour le debugging
- ✅ Recharge le cache en arrière-plan pour le garder frais

## 🧪 Tests à Effectuer

### Test 1: Chargement Initial
1. Aller sur `/checkout?parcours=XXX&checkid=YYY`
2. Vérifier que les données du logement s'affichent
3. Vérifier dans la console : `✅ [DataLoadingOrchestrator] Parcours XXX chargé depuis l'API`

### Test 2: Rechargement de Page
1. Sur `/checkout?parcours=XXX&checkid=YYY`, recharger la page (F5)
2. Vérifier que les données du logement persistent
3. Vérifier dans la console : `✅ [DataLoadingOrchestrator] Parcours XXX chargé depuis le cache`

### Test 3: Navigation
1. Aller sur `/checkout-home?parcours=XXX&checkid=YYY`
2. Cliquer sur "Commencer le ménage" → `/checkout`
3. Vérifier que les données s'affichent
4. Retour arrière → `/checkout-home`
5. Vérifier que les données persistent

### Test 4: Autres Pages
Répéter les tests sur :
- `/checkin?parcours=XXX&checkid=YYY`
- `/checkin-home?parcours=XXX&checkid=YYY`
- `/checkout-home?parcours=XXX&checkid=YYY`

## 📊 Impact

### Pages Affectées
- ✅ CheckOut.tsx (corrigé)
- ⚠️ CheckIn.tsx (à vérifier)
- ⚠️ CheckoutHome.tsx (à vérifier)
- ⚠️ CheckinHome.tsx (à vérifier)
- ⚠️ EtatInitial.tsx (à vérifier)

### Services Modifiés
- ✅ dataLoadingOrchestrator.ts (corrigé)
- ✅ CheckOut.tsx (corrigé)

## 🔄 Prochaines Étapes

1. **Tester la correction** sur CheckOut.tsx
2. **Vérifier les autres pages** pour le même problème
3. **Appliquer la même correction** si nécessaire
4. **Supprimer l'ancien système** (GlobalParcoursContext) une fois que tout fonctionne

## 📝 Notes Techniques

### Structure du Cache

`parcoursCache.getParcours()` retourne :
```typescript
// Retourne directement les données (rawData de l'API)
{
  "parcourID": "...",
  "pieces": [...],
  "signalements": [...]
}
```

**PAS** :
```typescript
// ❌ NE retourne PAS un objet CachedParcours
{
  "id": "...",
  "data": { ... },
  "cachedAt": 123456789
}
```

### Structure de ParcoursData

`parcoursUnified` a la structure :
```typescript
{
  id: string;
  rawData: any;
  adaptedData: {
    roomsData: Record<string, Room & { tasks: Task[] }>;
    flowType: FlowType;
    parcoursInfo: { ... };
    apiSignalements: Signalement[];
  };
}
```

Pour obtenir les rooms :
```typescript
const rooms = Object.values(parcoursUnified.adaptedData.roomsData);
```

## ✅ Validation

- [x] Correction appliquée dans CheckOut.tsx
- [x] Correction appliquée dans dataLoadingOrchestrator.ts
- [x] Logs de debugging ajoutés
- [ ] Tests effectués sur CheckOut
- [ ] Tests effectués sur CheckIn
- [ ] Tests effectués sur CheckoutHome
- [ ] Tests effectués sur CheckinHome
- [ ] Validation finale

