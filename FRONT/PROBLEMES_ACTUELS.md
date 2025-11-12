# ⚠️ PROBLÈMES ACTUELS - Audit Détaillé

> **Date de création** : 2025-01-09  
> **Objectif** : Identifier et prioriser tous les bugs et incohérences du système actuel

---

## 🔴 PROBLÈMES CRITIQUES (P0)

### P0-1 : Multiples contextes de flow redondants et conflictuels

**Description** :
- 4 contextes gèrent le flow : `CheckoutFlowContext`, `CheckinFlowContext`, `UnifiedFlowContext`, `AppFlowContext`
- Logique dupliquée entre les contextes
- Confusion sur quel contexte utiliser dans chaque page
- Risque d'incohérence entre les états

**Impact utilisateur** :
- Bugs de progression (tâches marquées complétées dans un contexte mais pas dans l'autre)
- Navigation incorrecte
- Perte de données

**Scénario de reproduction** :
1. Compléter une tâche dans `/checkout`
2. F5 sur la page
3. La tâche peut apparaître comme non complétée si le mauvais contexte est utilisé

**Fichiers concernés** :
- `FRONT/src/contexts/CheckoutFlowContext.tsx`
- `FRONT/src/contexts/CheckinFlowContext.tsx`
- `FRONT/src/contexts/UnifiedFlowContext.tsx`
- `FRONT/src/contexts/AppFlowContext.tsx`

**Solution proposée** :
- Migrer toute la logique vers `UnifiedFlowContext`
- Supprimer les autres contextes
- Créer des wrappers de compatibilité si nécessaire

---

### P0-2 : Chargements multiples et concurrents de données

**Description** :
- Chaque page a ses propres `useEffect` pour charger les données
- Pas de coordination centralisée
- Multiples appels API pour le même parcours
- Utilisation de refs (`hasLoadedParcours`, `currentParcoursId`) pour éviter les re-runs

**Impact utilisateur** :
- Lenteur de chargement
- Consommation excessive de bande passante
- Risque de données incohérentes si plusieurs requêtes retournent des résultats différents

**Scénario de reproduction** :
1. Ouvrir `/welcome?parcours=XXX`
2. Ouvrir la console réseau
3. Observer 2-3 requêtes identiques vers `endpointPiece?parcours=XXX`

**Fichiers concernés** :
- `FRONT/src/pages/Welcome.tsx` (lignes 272-312)
- `FRONT/src/pages/CheckEasy.tsx` (lignes 419-483)
- `FRONT/src/contexts/GlobalParcoursContext.tsx` (lignes 89-146)

**Solution proposée** :
- Créer un `DataLoadingOrchestrator` qui coordonne tous les chargements
- Implémenter un système de "loading locks"
- Utiliser des hooks unifiés (`useSessionData`, `useParcoursData`)

---

### P0-3 : Navigation basée sur des heuristiques fragiles

**Description** :
- Logique de navigation dispersée dans plusieurs composants
- `RouteRestoration` avec logique complexe et tentatives multiples (max 3)
- Pas de source unique de vérité pour déterminer la route correcte
- Dépendance sur `localStorage.checkeasy_last_path` qui peut être obsolète

**Impact utilisateur** :
- Redirection vers la mauvaise page après F5
- Boucles de navigation infinies
- Perte de contexte

**Scénario de reproduction** :
1. Être sur `/checkout` avec session terminée
2. F5 sur la page
3. Devrait rediriger vers `/checkout-home` mais reste sur `/checkout`
4. User voit une page vide ou des erreurs

**Fichiers concernés** :
- `FRONT/src/components/RouteRestoration.tsx` (lignes 133-248)
- `FRONT/src/pages/Welcome.tsx` (lignes 72-269)
- `FRONT/src/utils/navigationHelpers.ts`

**Solution proposée** :
- Créer un `NavigationStateManager` avec fonction `getCorrectRouteForSession(session)`
- Simplifier `RouteRestoration` pour utiliser cette fonction
- Éliminer les tentatives multiples

---

### P0-4 : Synchronisation URL ↔ IndexedDB incohérente

**Description** :
- Paramètres URL parfois perdus lors de la navigation
- État IndexedDB pas toujours reflété dans l'URL
- Conflits possibles entre URL et état sauvegardé
- Pas de mécanisme de synchronisation bidirectionnelle

**Impact utilisateur** :
- Perte des paramètres `parcours` et `checkid` dans l'URL
- Impossible de partager un lien pour reprendre une session
- Erreurs "checkId manquant" alors que la session existe

**Scénario de reproduction** :
1. Être sur `/checkout?parcours=XXX&checkid=YYY`
2. Cliquer sur un lien interne sans `navigatePreservingParams`
3. URL devient `/checkout` (sans paramètres)
4. Page ne peut plus charger les données

**Fichiers concernés** :
- Tous les composants qui utilisent `navigate()` sans `navigatePreservingParams`
- `FRONT/src/utils/navigationHelpers.ts`

**Solution proposée** :
- Créer un hook `useUrlSync()` qui surveille et synchronise URL ↔ IndexedDB
- Wrapper `navigate()` pour toujours préserver les paramètres
- Ajouter des guards de navigation

---

### P0-5 : Pas de guards de navigation basés sur l'état de session

**Description** :
- Aucune vérification systématique de l'état de session avant d'afficher une page
- Possibilité d'accéder à `/checkout` même si la session est terminée
- Possibilité d'accéder à `/checkin` même si le checkin est déjà complété
- Pas de redirection automatique vers la bonne page

**Impact utilisateur** :
- Affichage de pages incorrectes
- Confusion (pourquoi je vois cette page ?)
- Possibilité de modifier une session terminée (corruption de données)

**Scénario de reproduction** :
1. Terminer un checkout (session `terminated`)
2. Naviguer manuellement vers `/checkout?parcours=XXX&checkid=YYY`
3. Page s'affiche alors qu'elle ne devrait pas être accessible
4. User peut potentiellement modifier des données

**Fichiers concernés** :
- Toutes les pages (aucune n'a de guard)
- `FRONT/src/components/ProtectedRoute.tsx` (vérifie uniquement l'authentification)

**Solution proposée** :
- Créer des composants `NavigationGuard`, `CheckoutGuard`, `CheckinGuard`, `CompletedSessionGuard`
- Wrapper les routes dans `App.tsx`
- Rediriger automatiquement vers la bonne page si guard échoue

---

## 🟠 PROBLÈMES MAJEURS (P1)

### P1-1 : Gestion incohérente de la transition checkin → checkout

**Description** :
- Transition checkin → checkout nécessite la création d'une nouvelle session
- Pas toujours clair dans le code
- Risque de réutiliser le même checkId
- Pas de vérification que le checkin est bien terminé avant de permettre le checkout

**Impact utilisateur** :
- Données mélangées entre checkin et checkout
- Progression incorrecte
- Rapport Bubble incomplet ou incorrect

**Scénario de reproduction** :
1. Terminer le checkin
2. Cliquer sur "Commencer le checkout"
3. Vérifier si un nouveau checkId est créé (devrait l'être)
4. Parfois le même checkId est réutilisé → problème

**Fichiers concernés** :
- `FRONT/src/pages/CheckinHome.tsx` (bouton "Commencer le checkout")
- `FRONT/src/contexts/ActiveCheckIdContext.tsx`

**Solution proposée** :
- Forcer la création d'un nouveau checkId lors de la transition
- Vérifier que la session checkin est bien `completed` avant de permettre la transition
- Documenter clairement ce comportement

---

### P1-2 : Refs de chargement dispersées et fragiles

**Description** :
- Utilisation de refs (`hasLoadedParcours`, `currentParcoursId`, `lastProcessedUrl`) pour éviter les re-runs
- Logique complexe et fragile
- Difficile à maintenir
- Risque de bugs si les refs ne sont pas correctement réinitialisées

**Impact utilisateur** :
- Parcours pas chargé alors qu'il devrait l'être
- Chargements multiples malgré les refs
- Comportement imprévisible

**Scénario de reproduction** :
1. Charger un parcours sur `/welcome`
2. Naviguer vers `/`
3. Revenir sur `/welcome` avec un autre parcours
4. Parfois le nouveau parcours n'est pas chargé car `hasLoadedParcours.current === true`

**Fichiers concernés** :
- `FRONT/src/pages/Welcome.tsx` (lignes 62-63)
- `FRONT/src/pages/CheckEasy.tsx` (lignes 413-418)

**Solution proposée** :
- Supprimer toutes les refs de chargement
- Utiliser des hooks unifiés avec gestion de cache intégrée
- Laisser React gérer les dépendances

---

### P1-3 : Logique de restauration de session complexe et fragile

**Description** :
- `RouteRestoration` a une logique très complexe avec tentatives multiples
- Timeout de 24h pour les données sauvegardées
- Validation de session asynchrone
- Risque de race conditions

**Impact utilisateur** :
- Restauration échoue parfois sans raison claire
- Redirection vers la mauvaise page
- Perte de session

**Scénario de reproduction** :
1. Fermer l'onglet sur `/checkout`
2. Rouvrir le lien après 25h
3. Données expirées → pas de restauration
4. User doit recommencer depuis le début

**Fichiers concernés** :
- `FRONT/src/components/RouteRestoration.tsx` (lignes 72-94, 133-248)

**Solution proposée** :
- Simplifier drastiquement la logique
- Utiliser `NavigationStateManager.getCorrectRouteForSession()`
- Supprimer le timeout de 24h (utiliser uniquement l'état de session)
- Une seule tentative de restauration

---

### P1-4 : Pas de gestion des sessions multiples (multiples onglets)

**Description** :
- Si user ouvre le même parcours dans 2 onglets, pas de synchronisation
- Modifications dans un onglet pas reflétées dans l'autre
- Risque de conflits et de perte de données

**Impact utilisateur** :
- Confusion (pourquoi mes modifications ne sont pas sauvegardées ?)
- Perte de données si les deux onglets modifient la même session
- Comportement imprévisible

**Scénario de reproduction** :
1. Ouvrir `/checkout?parcours=XXX&checkid=YYY` dans onglet 1
2. Compléter une tâche
3. Ouvrir le même lien dans onglet 2
4. Onglet 2 ne voit pas la tâche complétée

**Fichiers concernés** :
- Tous les contextes et services

**Solution proposée** :
- Implémenter un système de synchronisation via `BroadcastChannel` ou `storage` events
- Recharger les données quand la page devient visible (`visibilitychange`)
- Afficher un avertissement si plusieurs onglets sont détectés

---

## 🟡 PROBLÈMES MINEURS (P2)

### P2-1 : Logs de debug excessifs

**Description** :
- Trop de `console.log` dans le code
- Pollue la console
- Difficile de trouver les logs importants

**Impact utilisateur** :
- Aucun (sauf performance légère)

**Solution proposée** :
- Créer un `NavigationLogger` avec niveaux de log
- Désactiver les logs de debug en production
- Garder uniquement les logs d'erreur et warnings

---

### P2-2 : Pas de métriques de performance

**Description** :
- Aucune mesure du temps de chargement
- Pas de tracking des erreurs
- Difficile de diagnostiquer les problèmes de performance

**Impact utilisateur** :
- Aucun direct, mais empêche l'optimisation

**Solution proposée** :
- Ajouter des métriques : temps de chargement, erreurs, navigations
- Créer un panneau de debug accessible via `?debug=true`

---

### P2-3 : Pas de tests automatisés

**Description** :
- Aucun test unitaire ou d'intégration
- Risque de régression à chaque modification
- Difficile de valider les corrections

**Impact utilisateur** :
- Aucun direct, mais augmente le risque de bugs

**Solution proposée** :
- Créer des tests pour les services critiques (`NavigationStateManager`, `DataLoadingOrchestrator`)
- Tests d'intégration pour les flux complets

---

## 📊 RÉSUMÉ PAR PRIORITÉ

| Priorité | Nombre | Description |
|----------|--------|-------------|
| **P0 - Critique** | 5 | Bugs bloquants, perte de données, navigation cassée |
| **P1 - Majeur** | 4 | Bugs importants, comportement imprévisible |
| **P2 - Mineur** | 3 | Améliorations, optimisations |
| **TOTAL** | **12** | |

---

## 🎯 ORDRE DE RÉSOLUTION RECOMMANDÉ

1. **P0-2** : Chargements multiples → Créer `DataLoadingOrchestrator`
2. **P0-3** : Navigation fragile → Créer `NavigationStateManager`
3. **P0-5** : Pas de guards → Créer les composants de guard
4. **P0-1** : Contextes redondants → Unifier vers `UnifiedFlowContext`
5. **P0-4** : Synchronisation URL → Créer `useUrlSync()`
6. **P1-1** : Transition checkin/checkout → Documenter et forcer nouveau checkId
7. **P1-2** : Refs de chargement → Supprimer et utiliser hooks unifiés
8. **P1-3** : Restauration complexe → Simplifier avec `NavigationStateManager`
9. **P1-4** : Sessions multiples → Implémenter synchronisation
10. **P2-1** : Logs excessifs → Créer `NavigationLogger`
11. **P2-2** : Métriques → Ajouter tracking
12. **P2-3** : Tests → Créer suite de tests

---

**Prochaine étape** : Phase de conception (Étapes 4-6)

