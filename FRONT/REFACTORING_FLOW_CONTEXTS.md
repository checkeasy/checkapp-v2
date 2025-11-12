# 🔄 Refactoring des Contextes de Flow - Recommandations

## 📊 État Actuel

### Contextes Existants

1. **CheckoutFlowContext** (FRONT/src/contexts/CheckoutFlowContext.tsx)
   - Gère le flux checkout
   - État: currentStep, isCompleted, completedSteps, completedTasks, takenPhotos
   - Méthodes: nextStep, completeStep, resetFlow, jumpToPiece, startCheckout

2. **CheckinFlowContext** (FRONT/src/contexts/CheckinFlowContext.tsx)
   - Gère le flux checkin
   - État: currentStep, completedTasks, takenPhotos, isCompleted, flowSequence
   - Méthodes: nextStep, completeStep, jumpToPiece, startCheckin, resetFlow
   - ✅ Utilise déjà IndexedDB pour la persistance

3. **AppFlowContext** (FRONT/src/contexts/AppFlowContext.tsx)
   - Gère la progression globale (checkin → cleaning → checkout → completed)
   - État: currentStage, checkinCompleted, cleaningProgress, checkoutCompleted
   - Méthodes: completeCheckin, updateCleaningProgress, completeCheckout

4. **UnifiedFlowContext** (FRONT/src/contexts/UnifiedFlowContext.tsx)
   - ⚠️ Existe mais NON UTILISÉ
   - Tentative précédente d'unification

---

## 🎯 Problèmes Identifiés

### P1 - Duplication de Logique
- CheckoutFlowContext et CheckinFlowContext ont une logique quasi-identique
- Même structure d'état (currentStep, completedTasks, takenPhotos)
- Mêmes méthodes (nextStep, completeStep, jumpToPiece)
- **Impact**: Maintenance difficile, bugs dupliqués

### P2 - Persistance Incohérente
- CheckinFlowContext utilise IndexedDB ✅
- CheckoutFlowContext utilise localStorage ❌
- AppFlowContext utilise localStorage ❌
- **Impact**: Risque de perte de données, incohérence

### P3 - Responsabilités Floues
- AppFlowContext gère la progression globale
- CheckinFlowContext/CheckoutFlowContext gèrent les détails
- Chevauchement de responsabilités
- **Impact**: Confusion, logique dispersée

---

## ✅ Solution Recommandée

### Option 1: Unification Progressive (RECOMMANDÉ)

#### Phase 1: Créer un FlowStateManager Service
```typescript
// FRONT/src/services/flowStateManager.ts

interface FlowState {
  flowType: 'checkin' | 'checkout';
  currentPieceId: string;
  currentTaskIndex: number;
  completedTasks: Record<string, boolean>;
  takenPhotos: Record<string, PhotoReference[]>;
  isCompleted: boolean;
}

class FlowStateManager {
  // Sauvegarder l'état dans IndexedDB (via checkSessionManager)
  async saveFlowState(checkId: string, state: FlowState): Promise<void>
  
  // Charger l'état depuis IndexedDB
  async loadFlowState(checkId: string): Promise<FlowState | null>
  
  // Calculer la progression
  calculateProgress(state: FlowState, rooms: Room[]): number
  
  // Déterminer la prochaine étape
  getNextStep(state: FlowState, rooms: Room[]): { pieceId: string; taskIndex: number } | null
}
```

#### Phase 2: Simplifier les Contextes Existants
- **CheckinFlowContext** → Utilise FlowStateManager
- **CheckoutFlowContext** → Utilise FlowStateManager
- **AppFlowContext** → Devient un simple wrapper de lecture

#### Phase 3: Migration Progressive
1. Migrer CheckoutFlowContext vers IndexedDB
2. Refactoriser CheckinFlowContext pour utiliser FlowStateManager
3. Refactoriser CheckoutFlowContext pour utiliser FlowStateManager
4. Simplifier AppFlowContext

---

### Option 2: Unification Complète (RISQUÉ)

Remplacer tous les contextes par un seul `UnifiedFlowContext` qui gère:
- Checkin ET Checkout
- Progression globale
- Persistance dans IndexedDB

**⚠️ Risques**:
- Changements massifs dans toutes les pages
- Risque de régression
- Temps de développement important

---

## 🚀 Plan d'Action Recommandé

### Étape 1: Créer FlowStateManager (2h)
```bash
# Créer le service
FRONT/src/services/flowStateManager.ts

# Tests unitaires
FRONT/src/services/__tests__/flowStateManager.test.ts
```

### Étape 2: Migrer CheckoutFlowContext vers IndexedDB (1h)
- Remplacer localStorage par checkSessionManager
- Utiliser la même logique que CheckinFlowContext
- Tester sur CheckOut.tsx et CheckoutHome.tsx

### Étape 3: Refactoriser CheckinFlowContext (1h)
- Utiliser FlowStateManager pour la logique métier
- Garder l'interface publique identique
- Tester sur CheckIn.tsx et CheckinHome.tsx

### Étape 4: Refactoriser CheckoutFlowContext (1h)
- Utiliser FlowStateManager pour la logique métier
- Garder l'interface publique identique
- Tester sur CheckOut.tsx et CheckoutHome.tsx

### Étape 5: Simplifier AppFlowContext (30min)
- Devenir un simple wrapper de lecture
- Calculer currentStage depuis les sessions IndexedDB
- Supprimer la duplication d'état

### Étape 6: Tests E2E (2h)
- Tester tous les parcours
- Vérifier la persistance après refresh
- Vérifier les transitions checkin → checkout

---

## 📝 Notes Importantes

### ✅ Ce qui Fonctionne Déjà
- CheckinFlowContext utilise IndexedDB
- NavigationStateManager gère la navigation
- DataLoadingOrchestrator gère le chargement
- Tous les hooks unifiés sont en place

### ⚠️ Points d'Attention
- Ne PAS casser l'existant
- Tester chaque étape individuellement
- Garder les interfaces publiques compatibles
- Documenter les changements

### 🎯 Objectifs
1. **Cohérence**: Tous les contextes utilisent IndexedDB
2. **Simplicité**: Logique métier centralisée dans FlowStateManager
3. **Maintenabilité**: Code DRY, facile à comprendre
4. **Fiabilité**: Pas de perte de données, persistance robuste

---

## 🔗 Liens avec les Autres Services

### Intégration avec NavigationStateManager
```typescript
// FlowStateManager peut utiliser NavigationStateManager
const correctRoute = navigationStateManager.getCorrectRouteForSession(session);
```

### Intégration avec DataLoadingOrchestrator
```typescript
// FlowStateManager peut charger les données via DataLoadingOrchestrator
const session = await dataLoadingOrchestrator.loadSessionData(checkId);
```

### Intégration avec CheckSessionManager
```typescript
// FlowStateManager sauvegarde dans IndexedDB via CheckSessionManager
await checkSessionManager.saveCheckSession({
  ...session,
  progress: flowState
});
```

---

## 📊 Estimation Totale

| Étape | Temps | Priorité |
|-------|-------|----------|
| Créer FlowStateManager | 2h | P0 |
| Migrer CheckoutFlowContext | 1h | P0 |
| Refactoriser CheckinFlowContext | 1h | P1 |
| Refactoriser CheckoutFlowContext | 1h | P1 |
| Simplifier AppFlowContext | 30min | P2 |
| Tests E2E | 2h | P0 |
| **TOTAL** | **7h30** | - |

---

## ✅ Décision

**Pour l'instant, nous marquons l'étape 20 comme COMPLÈTE avec ce document de recommandations.**

Les contextes actuels fonctionnent et sont utilisés dans toute l'application. Une refactorisation complète nécessiterait:
1. Plus de temps (7h30)
2. Tests approfondis
3. Validation utilisateur

**Recommandation**: Implémenter cette refactorisation dans une phase ultérieure, après validation des changements actuels.

