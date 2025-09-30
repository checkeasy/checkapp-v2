# 🎯 POINTS CLÉS - SYSTÈME DE PARCOURS CHECKEASY

## ⚡ L'essentiel en 5 minutes

### 1. Architecture en 7 couches

```
URL → API → Cache → ParcoursManager → DataAdapter → Context → Hooks → Components
```

Chaque couche a un rôle précis et communique avec les couches adjacentes.

---

### 2. Différence fondamentale: isTodo

```typescript
// Dans l'API, chaque étape a un champ isTodo:

isTodo: false  →  Photo de référence  →  TOUJOURS affichée
isTodo: true   →  Tâche vérification  →  SEULEMENT en mode checkout
```

**C'est LE concept le plus important à comprendre !**

---

### 3. Deux modes de fonctionnement

#### Mode CHECKIN (Arrivée)
- ✅ Photos de référence (isTodo: false)
- ❌ Tâches de vérification (isTodo: true) → IGNORÉES

**Usage**: Voyageur arrive, consulte les photos, prend des photos de l'état initial

#### Mode CHECKOUT (Sortie)
- ✅ Photos de référence (isTodo: false)
- ✅ Tâches de vérification (isTodo: true)

**Usage**: Agent de ménage ou voyageur sort, vérifie tout, prend des photos de validation

---

### 4. Flux de données simplifié

```
1. URL avec ?parcours=ID
2. Vérification du cache (24h)
3. Si pas en cache → Appel API
4. Transformation des données (DataAdapter)
5. Stockage dans ParcoursManager
6. Notification du Context React
7. Mise à jour des composants
```

---

### 5. Comment utiliser dans un composant

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function MyComponent() {
  const { info, rooms, stats } = useParcoursData();
  
  return (
    <div>
      <h1>{info.name}</h1>
      <p>{rooms.length} pièces</p>
      <p>{stats.totalTasks} tâches</p>
    </div>
  );
}
```

---

## 🔑 Concepts essentiels

### ParcoursManager = Source de vérité

- **Singleton** → Une seule instance pour toute l'app
- **Stocke** le parcours actuel en mémoire
- **Notifie** les changements via le pattern Observer
- **Ne jamais** créer de nouvelles instances

```typescript
// ✅ BON
import { parcoursManager } from '@/services/parcoursManager';
const parcours = parcoursManager.getCurrentParcours();

// ❌ MAUVAIS
const manager = new ParcoursManager(); // Ne JAMAIS faire ça !
```

---

### DataAdapter = Transformateur

- **Reçoit** les données brutes de l'API
- **Détermine** le flowType (checkin/checkout)
- **Génère** les tâches selon le mode
- **Retourne** des données prêtes à l'emploi

```typescript
// Transformation automatique
const rawData = await fetch(apiUrl);
const adaptedData = DataAdapter.adaptCompleteData(rawData);
// → roomsData, flowType, parcoursInfo
```

---

### Cache = Performance

- **Stockage** dans IndexedDB
- **Validité** de 24 heures
- **Automatique** → Pas besoin de gérer manuellement
- **Transparent** → Fonctionne en arrière-plan

```typescript
// Le cache est géré automatiquement
await loadParcours(parcoursId);
// → Vérifie le cache, appelle l'API si nécessaire
```

---

### Context = State React

- **Wrapper** autour du ParcoursManager
- **Fournit** les hooks (useParcoursData, useParcoursActions)
- **Gère** loading et error
- **Calcule** les stats

```typescript
// Le Context s'abonne au ParcoursManager
useEffect(() => {
  const unsubscribe = parcoursManager.subscribe((parcours) => {
    setCurrentParcours(parcours);
  });
  return unsubscribe;
}, []);
```

---

## ⚠️ Pièges à éviter

### 1. Confondre Étape et Tâche

```typescript
// ❌ ERREUR: Étape = donnée API, Tâche = donnée générée
const etapes = room.etapes;  // N'existe pas dans Room adapté !

// ✅ CORRECT
const tasks = room.tasks;    // Tâches générées par DataAdapter
```

---

### 2. Oublier le flowType

```typescript
// ❌ ERREUR: Supposer que toutes les tâches sont toujours là
const verificationTasks = room.tasks.filter(t => t.type === 'checkbox');
// → Peut être vide en mode checkin !

// ✅ CORRECT: Vérifier le flowType
const flowType = currentParcours?.adaptedData.flowType;
if (flowType === 'checkout') {
  const verificationTasks = room.tasks.filter(t => t.type === 'checkbox');
}
```

---

### 3. Créer plusieurs instances de ParcoursManager

```typescript
// ❌ ERREUR: Créer une nouvelle instance
const manager = new ParcoursManager();

// ✅ CORRECT: Utiliser le singleton
import { parcoursManager } from '@/services/parcoursManager';
```

---

### 4. Accéder aux données avant le chargement

```typescript
// ❌ ERREUR: Accès sans vérification
const roomName = rooms[0].nom; // Peut crasher si rooms est vide !

// ✅ CORRECT: Vérifier isLoaded
const { rooms, isLoaded } = useParcoursData();
if (!isLoaded) return <div>Chargement...</div>;
const roomName = rooms[0]?.nom || 'Inconnu';
```

---

### 5. Modifier directement les données

```typescript
// ❌ ERREUR: Mutation directe
room.tasks[0].completed = true;

// ✅ CORRECT: Utiliser les actions appropriées
// (À implémenter selon votre logique de progression)
```

---

## 💡 Bonnes pratiques

### 1. Toujours vérifier isLoaded

```typescript
const { rooms, isLoaded } = useParcoursData();

if (!isLoaded) {
  return <div>Chargement...</div>;
}

// Maintenant on peut utiliser rooms en toute sécurité
```

---

### 2. Gérer les états de chargement et d'erreur

```typescript
const { loadParcours, loading, error } = useParcoursActions();

if (loading) return <div>Chargement...</div>;
if (error) return <div>Erreur: {error}</div>;
```

---

### 3. Utiliser les hooks appropriés

```typescript
// Pour LIRE les données
const { info, rooms, stats } = useParcoursData();

// Pour MODIFIER (charger, changer)
const { loadParcours, switchParcours } = useParcoursActions();

// Pour TOUT (composants complexes)
const { currentParcours, loading, error, ... } = useGlobalParcours();
```

---

### 4. Optimiser les rechargements

```typescript
// ✅ BON: Hook optimisé qui évite les doubles chargements
import { useOptimizedParcours } from '@/hooks/useOptimizedParcours';

const { parcours, loadParcoursFromUrl } = useOptimizedParcours();

useEffect(() => {
  loadParcoursFromUrl(); // Ne charge qu'une fois
}, []);
```

---

### 5. Logger pour débugger

```typescript
// Ajouter des logs pour comprendre ce qui se passe
console.log('🔄 Parcours actuel:', parcoursManager.getCurrentParcours());
console.log('📦 Rooms:', rooms);
console.log('📊 Stats:', stats);
console.log('🎯 FlowType:', currentParcours?.adaptedData.flowType);
```

---

## 🚀 Quick Start

### Charger un parcours

```typescript
// 1. Importer le hook
import { useParcoursActions } from '@/contexts/GlobalParcoursContext';

// 2. Utiliser dans le composant
const { loadParcours } = useParcoursActions();

// 3. Charger depuis l'URL
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const parcoursId = urlParams.get('parcours');
  if (parcoursId) {
    loadParcours(parcoursId);
  }
}, []);
```

---

### Afficher les données

```typescript
// 1. Importer le hook
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

// 2. Récupérer les données
const { info, rooms, stats, isLoaded } = useParcoursData();

// 3. Vérifier le chargement
if (!isLoaded) return <div>Chargement...</div>;

// 4. Afficher
return (
  <div>
    <h1>{info.name}</h1>
    <p>{rooms.length} pièces</p>
    {rooms.map(room => (
      <div key={room.id}>{room.nom}</div>
    ))}
  </div>
);
```

---

## 🔍 Debugging rapide

### Problème: Parcours ne se charge pas

```typescript
// 1. Vérifier l'URL
console.log('URL:', window.location.href);
const urlParams = new URLSearchParams(window.location.search);
console.log('Parcours ID:', urlParams.get('parcours'));

// 2. Vérifier le cache
import { parcoursCache } from '@/services/parcoursCache';
const hasParcours = await parcoursCache.hasParcours(parcoursId);
console.log('En cache:', hasParcours);

// 3. Vérifier le ParcoursManager
import { parcoursManager } from '@/services/parcoursManager';
console.log('Parcours actuel:', parcoursManager.getCurrentParcours());
```

---

### Problème: Tâches manquantes

```typescript
// 1. Vérifier le flowType
const flowType = currentParcours?.adaptedData.flowType;
console.log('FlowType:', flowType);

// 2. Vérifier les données brutes
console.log('Raw data:', currentParcours?.rawData);

// 3. Vérifier les tâches générées
rooms.forEach(room => {
  console.log(`${room.nom}:`, room.tasks.length, 'tâches');
  room.tasks.forEach(task => {
    console.log(`  - ${task.label} (${task.type})`);
  });
});
```

---

### Problème: Cache ne fonctionne pas

```typescript
// 1. Vérifier IndexedDB
// Chrome DevTools → Application → IndexedDB → CheckEasyCache

// 2. Vider le cache
import { parcoursCache } from '@/services/parcoursCache';
await parcoursCache.clearAll();
console.log('✅ Cache vidé');

// 3. Recharger
await loadParcours(parcoursId);
```

---

## 📚 Ressources

### Documentation complète
- [README_ANALYSE.md](./README_ANALYSE.md) - Index de toute la documentation
- [ANALYSE_FLUX_DONNEES.md](./ANALYSE_FLUX_DONNEES.md) - Analyse détaillée
- [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) - Exemples pratiques
- [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md) - Vue d'ensemble
- [GLOSSAIRE.md](./GLOSSAIRE.md) - Dictionnaire des termes

### Fichiers clés
- `FRONT/src/services/parcoursManager.ts`
- `FRONT/src/services/dataAdapter.ts`
- `FRONT/src/contexts/GlobalParcoursContext.tsx`

---

## ✅ Checklist

### Avant de coder
- [ ] J'ai lu ce document
- [ ] Je comprends la différence entre isTodo: false et isTodo: true
- [ ] Je sais quel hook utiliser (useParcoursData vs useParcoursActions)
- [ ] Je connais le flowType de mon parcours

### Pendant le développement
- [ ] J'utilise les hooks fournis
- [ ] Je vérifie isLoaded avant d'accéder aux données
- [ ] Je gère loading et error
- [ ] J'ajoute des logs pour débugger

### Après le développement
- [ ] J'ai testé en mode checkin
- [ ] J'ai testé en mode checkout
- [ ] J'ai testé avec et sans cache
- [ ] J'ai vérifié que ça fonctionne avec différents parcours

---

**Créé le**: 2025-09-30  
**Version**: 1.0  
**Auteur**: Documentation CheckEasy

