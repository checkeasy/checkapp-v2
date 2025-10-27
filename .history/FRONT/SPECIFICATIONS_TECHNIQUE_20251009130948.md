# 🏗️ SPÉCIFICATIONS TECHNIQUES - Nouveau Système de Navigation

> **Date de création** : 2025-01-09  
> **Objectif** : Définir l'architecture du nouveau système unifié et fiable

---

## 🎯 PRINCIPE FONDAMENTAL : SOURCE UNIQUE DE VÉRITÉ

### Hiérarchie des sources de données

```
1. URL (paramètres parcours & checkid) ← Source de vérité PRIMAIRE
   ↓
2. IndexedDB (checkSessionManager) ← Source de vérité SECONDAIRE (état persisté)
   ↓
3. Contextes React ← VUES de l'état (dérivées, non autoritaires)
```

### Règles absolues

1. **L'URL est la source de vérité pour l'identité de la session**
   - `?parcours={parcoursId}&checkid={checkId}` définit quelle session est active
   - Si ces paramètres sont absents → redirection vers `/welcome`
   - Si ces paramètres sont présents → charger la session depuis IndexedDB

2. **IndexedDB est la source de vérité pour l'état de la session**
   - Progression, tâches complétées, photos, signalements
   - État de la session (`active`, `completed`, `terminated`)
   - Dernière page visitée, dernière pièce active

3. **Les contextes React sont des vues dérivées**
   - Ils affichent l'état mais ne le possèdent pas
   - Ils se synchronisent avec IndexedDB, pas l'inverse
   - Ils ne prennent jamais de décisions de navigation

---

## 📐 FORMAT CANONIQUE DES URLs

### Structure obligatoire

```
/{page}?parcours={parcoursId}&checkid={checkId}
```

### Exemples valides

```
/welcome?parcours=1759329612699x439087102753750400
/welcome?parcours=1759329612699x439087102753750400&checkid=check_1736432100000_abc123
/?parcours=1759329612699x439087102753750400&checkid=check_1736432100000_abc123
/checkout?parcours=1759329612699x439087102753750400&checkid=check_1736432100000_abc123
/checkin?parcours=1759329612699x439087102753750400&checkid=check_1736432100000_abc123
```

### Cas spéciaux

| URL | Comportement |
|-----|--------------|
| `/welcome` (sans paramètres) | ✅ Valide - Page d'accueil |
| `/welcome?parcours=XXX` (sans checkid) | ✅ Valide - Nouveau parcours |
| `/welcome?parcours=XXX&checkid=YYY` | ✅ Valide - Reprise de session |
| `/checkout` (sans paramètres) | ❌ Invalide - Redirection vers `/welcome` |
| `/checkout?parcours=XXX` (sans checkid) | ❌ Invalide - Redirection vers `/welcome` |
| `/checkout?checkid=YYY` (sans parcours) | ❌ Invalide - Redirection vers `/welcome` |

### Règles de préservation

- **Toute navigation** doit préserver `parcours` et `checkid`
- Utiliser systématiquement `navigatePreservingParams()` ou le nouveau wrapper
- Jamais de `navigate('/path')` sans paramètres

---

## 🗄️ RÔLE DE checkSessionManager (IndexedDB)

### Responsabilités

1. **Stockage persistant de l'état de session**
   - Créer, lire, mettre à jour, supprimer des sessions
   - Sauvegarder la progression en temps réel
   - Gérer les transitions d'état

2. **Source de vérité pour l'état**
   - Déterminer si une session existe
   - Fournir l'état actuel (`active`, `completed`, `terminated`)
   - Fournir la progression (pièce actuelle, tâches complétées)

3. **Validation de session**
   - Vérifier qu'un checkId existe et est valide
   - Vérifier que la session n'est pas expirée
   - Vérifier que la session appartient au bon utilisateur

### Interface (existante, à conserver)

```typescript
interface CheckSessionManager {
  // Création
  createCheckSession(userId, parcoursId, flowType, userInfo?, parcoursInfo?): Promise<CheckSession>
  
  // Lecture
  getCheckSession(checkId): Promise<CheckSession | null>
  getUserSessions(userId): Promise<CheckSession[]>
  
  // Mise à jour
  updateCheckSession(checkId, updates): Promise<boolean>
  updateSessionProgress(checkId, progressUpdate): Promise<void>
  
  // Terminaison
  terminateSession(checkId, rapportID): Promise<void>
  
  // Validation
  isSessionValid(checkId): Promise<boolean> // 🆕 À ajouter
}
```

---

## 🧭 ARCHITECTURE DU NavigationStateManager

### Responsabilités

1. **Déterminer la route correcte selon l'état de session**
2. **Valider qu'une route est accessible**
3. **Fournir la route de redirection si nécessaire**
4. **Gérer les cas spéciaux (session terminée, checkin complété, etc.)**

### Interface

```typescript
interface NavigationStateManager {
  /**
   * Détermine la route correcte pour une session donnée
   * @param session - Session depuis IndexedDB
   * @returns Route correcte (ex: '/checkout', '/checkin-home')
   */
  getCorrectRouteForSession(session: CheckSession): string;
  
  /**
   * Vérifie si une route est accessible pour une session donnée
   * @param currentPath - Route actuelle (ex: '/checkout')
   * @param session - Session depuis IndexedDB
   * @returns true si accessible, false sinon
   */
  isRouteAllowed(currentPath: string, session: CheckSession): boolean;
  
  /**
   * Détermine si une redirection est nécessaire
   * @param currentPath - Route actuelle
   * @param session - Session depuis IndexedDB
   * @returns true si redirection nécessaire
   */
  shouldRedirect(currentPath: string, session: CheckSession): boolean;
  
  /**
   * Fournit la route de redirection
   * @param currentPath - Route actuelle
   * @param session - Session depuis IndexedDB
   * @returns Route de redirection ou null si pas de redirection
   */
  getRedirectTarget(currentPath: string, session: CheckSession): string | null;
  
  /**
   * Construit une URL complète avec paramètres
   * @param path - Chemin (ex: '/checkout')
   * @param parcoursId - ID du parcours
   * @param checkId - ID de la session
   * @returns URL complète (ex: '/checkout?parcours=XXX&checkid=YYY')
   */
  buildUrl(path: string, parcoursId: string, checkId: string): string;
}
```

### Matrice de décision : État de session → Route correcte

#### Session `active` avec `flowType: 'checkin'`

| Situation | Route correcte | Raison |
|-----------|----------------|--------|
| Aucune tâche complétée | `/checkin` | Démarrer le checkin |
| Tâches en cours | `/checkin` | Continuer le checkin |
| Toutes tâches complétées | `/checkin-home` | Checkin terminé, afficher récap |

#### Session `completed` avec `flowType: 'checkin'`

| Situation | Route correcte | Raison |
|-----------|----------------|--------|
| Checkin terminé, pas de checkout | `/checkin-home` | Attendre que user démarre checkout |
| Checkin terminé, checkout démarré | `/checkout` | Nouvelle session checkout créée |

#### Session `active` avec `flowType: 'checkout'`

| Situation | Route correcte | Raison |
|-----------|----------------|--------|
| Aucune tâche complétée | `/checkout` | Démarrer le checkout |
| Tâches en cours | `/checkout` | Continuer le checkout |
| Toutes tâches complétées, pas de exit questions | `/exit-questions` | Répondre aux questions |
| Exit questions complétées | `/checkout-home` | Checkout terminé |

#### Session `terminated` avec `flowType: 'checkout'`

| Situation | Route correcte | Raison |
|-----------|----------------|--------|
| Toujours | `/checkout-home` | Session terminée, afficher rapport |

### Règles de redirection

```typescript
function getCorrectRouteForSession(session: CheckSession): string {
  // 🏁 PRIORITÉ 1 : Session terminée
  if (session.status === 'terminated') {
    return '/checkout-home';
  }
  
  // 🏁 PRIORITÉ 2 : Session complétée (checkin)
  if (session.status === 'completed' && session.flowType === 'checkin') {
    return '/checkin-home';
  }
  
  // 🏁 PRIORITÉ 3 : Session active
  if (session.status === 'active') {
    if (session.flowType === 'checkin') {
      // Vérifier si toutes les tâches sont complétées
      if (session.isFlowCompleted) {
        return '/checkin-home';
      }
      return '/checkin';
    }
    
    if (session.flowType === 'checkout') {
      // Vérifier si exit questions complétées
      if (session.progress.exitQuestionsCompleted) {
        return '/checkout-home';
      }
      // Vérifier si toutes les tâches sont complétées
      if (session.isFlowCompleted) {
        return '/exit-questions';
      }
      return '/checkout';
    }
  }
  
  // 🏁 FALLBACK : Rediriger vers welcome
  return '/welcome';
}
```

### Règles de validation de route

```typescript
function isRouteAllowed(currentPath: string, session: CheckSession): boolean {
  const correctRoute = getCorrectRouteForSession(session);
  
  // Routes toujours autorisées
  const alwaysAllowed = ['/welcome', '/'];
  if (alwaysAllowed.includes(currentPath)) {
    return true;
  }
  
  // Session terminée : seul /checkout-home est autorisé
  if (session.status === 'terminated') {
    return currentPath === '/checkout-home';
  }
  
  // Session complétée (checkin) : seul /checkin-home est autorisé
  if (session.status === 'completed' && session.flowType === 'checkin') {
    return currentPath === '/checkin-home';
  }
  
  // Session active : vérifier selon flowType
  if (session.status === 'active') {
    if (session.flowType === 'checkin') {
      const allowedRoutes = ['/checkin', '/checkin-home', '/etat-initial'];
      return allowedRoutes.includes(currentPath);
    }
    
    if (session.flowType === 'checkout') {
      const allowedRoutes = ['/checkout', '/checkout-home', '/etat-initial', '/exit-questions'];
      return allowedRoutes.includes(currentPath);
    }
  }
  
  return false;
}
```

---

## 🔄 SYNCHRONISATION URL ↔ IndexedDB

### Principe

- **URL → IndexedDB** : Quand l'URL change, charger la session correspondante
- **IndexedDB → URL** : Quand la progression change, mettre à jour l'URL si nécessaire

### Flux de synchronisation

```
1. User navigue vers /checkout?parcours=XXX&checkid=YYY
   ↓
2. Hook useUrlSync() détecte le changement d'URL
   ↓
3. Extraction des paramètres : parcoursId, checkId
   ↓
4. Chargement de la session depuis IndexedDB via checkSessionManager
   ↓
5. Validation de la session (existe ? valide ? bon user ?)
   ↓
6. Vérification de la route via NavigationStateManager.isRouteAllowed()
   ↓
7a. Si route autorisée : Charger les données et afficher la page
7b. Si route non autorisée : Rediriger vers la route correcte
```

### Hook useUrlSync (à créer)

```typescript
function useUrlSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCheckId, setActiveCheckId } = useActiveCheckId();
  
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const parcoursId = urlParams.get('parcours');
    const checkId = urlParams.get('checkid');
    
    // Si pas de checkId dans l'URL mais on a un checkId actif
    // → Ajouter le checkId à l'URL
    if (!checkId && currentCheckId && parcoursId) {
      const newUrl = `${location.pathname}?parcours=${parcoursId}&checkid=${currentCheckId}`;
      navigate(newUrl, { replace: true });
      return;
    }
    
    // Si checkId dans l'URL différent du checkId actif
    // → Activer le checkId de l'URL
    if (checkId && checkId !== currentCheckId) {
      setActiveCheckId(checkId);
    }
  }, [location.search, currentCheckId]);
}
```

---

## 📦 WRAPPER DE NAVIGATION

### Objectif

Garantir que tous les appels à `navigate()` préservent les paramètres URL.

### Implémentation

```typescript
// FRONT/src/hooks/useNavigateWithParams.ts

import { useNavigate, useLocation } from 'react-router-dom';

export function useNavigateWithParams() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (path: string, options?: { replace?: boolean }) => {
    const urlParams = new URLSearchParams(location.search);
    const parcours = urlParams.get('parcours');
    const checkid = urlParams.get('checkid');
    
    const newParams = new URLSearchParams();
    if (parcours) newParams.set('parcours', parcours);
    if (checkid) newParams.set('checkid', checkid);
    
    const fullPath = newParams.toString() 
      ? `${path}?${newParams.toString()}` 
      : path;
    
    navigate(fullPath, options);
  };
}
```

### Utilisation

```typescript
// Avant (risque de perte de paramètres)
navigate('/checkout');

// Après (paramètres préservés)
const navigateWithParams = useNavigateWithParams();
navigateWithParams('/checkout');
```

---

## 🎯 RÉSUMÉ DES PRINCIPES

1. **URL = Source de vérité primaire** pour l'identité de session
2. **IndexedDB = Source de vérité secondaire** pour l'état de session
3. **Contextes React = Vues dérivées** (pas de décisions)
4. **NavigationStateManager = Arbitre** de la navigation
5. **Toujours préserver** les paramètres URL
6. **Toujours valider** la route avant d'afficher une page
7. **Toujours rediriger** vers la route correcte si nécessaire

---

---

## 🔄 ARCHITECTURE DU DataLoadingOrchestrator

### Responsabilités

1. **Coordonner tous les chargements de données**
2. **Éviter les chargements multiples et concurrents**
3. **Gérer le cache et la fraîcheur des données**
4. **Synchroniser les contextes React avec les données chargées**

### Problème à résoudre

**Situation actuelle** :
- Chaque page a ses propres `useEffect` pour charger les données
- Multiples requêtes API pour le même parcours
- Pas de coordination → doublons, race conditions
- Utilisation de refs fragiles pour éviter les re-runs

**Solution** :
- Service singleton qui coordonne tous les chargements
- Système de "loading locks" pour éviter les doublons
- Cache intelligent avec invalidation
- Hooks unifiés qui utilisent le service

### Interface

```typescript
interface DataLoadingOrchestrator {
  /**
   * Charge les données de session depuis IndexedDB
   * @param checkId - ID de la session
   * @returns Session ou null si inexistante
   */
  loadSessionData(checkId: string): Promise<CheckSession | null>;

  /**
   * Charge les données de parcours (API ou cache)
   * @param parcoursId - ID du parcours
   * @param forceFlowType - Force un type de flow spécifique
   * @returns Données du parcours
   */
  loadParcoursData(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): Promise<ParcoursData>;

  /**
   * Synchronise les contextes React avec les données chargées
   * @param session - Session chargée
   * @param parcours - Parcours chargé
   */
  syncContextsWithData(session: CheckSession, parcours: ParcoursData): void;

  /**
   * Invalide le cache d'un parcours
   * @param parcoursId - ID du parcours
   */
  invalidateParcoursCache(parcoursId: string): Promise<void>;

  /**
   * Vérifie si un chargement est en cours
   * @param key - Clé de chargement (parcoursId ou checkId)
   * @returns true si chargement en cours
   */
  isLoading(key: string): boolean;
}
```

### Système de Loading Locks

**Objectif** : Éviter les chargements concurrents du même parcours/session

```typescript
class DataLoadingOrchestrator {
  private loadingLocks: Map<string, Promise<any>> = new Map();

  async loadParcoursData(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): Promise<ParcoursData> {
    const lockKey = `parcours_${parcoursId}_${forceFlowType || 'default'}`;

    // Si un chargement est déjà en cours, attendre sa complétion
    if (this.loadingLocks.has(lockKey)) {
      console.log(`⏳ Chargement déjà en cours pour ${lockKey}, attente...`);
      return this.loadingLocks.get(lockKey)!;
    }

    // Créer un nouveau chargement
    const loadingPromise = this._loadParcoursDataInternal(parcoursId, forceFlowType);

    // Enregistrer le lock
    this.loadingLocks.set(lockKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      // Libérer le lock
      this.loadingLocks.delete(lockKey);
    }
  }

  private async _loadParcoursDataInternal(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): Promise<ParcoursData> {
    console.log(`🔄 Chargement du parcours ${parcoursId}...`);

    // 1. Vérifier le cache
    const cached = await parcoursCache.getParcours(parcoursId);
    if (cached && parcoursCache.isCacheValid(parcoursId, 24)) {
      console.log(`✅ Parcours ${parcoursId} chargé depuis le cache`);
      return parcoursManager.loadFromRawDataWithMode(cached.data, forceFlowType);
    }

    // 2. Charger depuis l'API
    console.log(`🌐 Chargement du parcours ${parcoursId} depuis l'API...`);
    const parcours = await parcoursManager.loadParcours(parcoursId, forceFlowType);

    console.log(`✅ Parcours ${parcoursId} chargé depuis l'API`);
    return parcours;
  }
}
```

### Cycle de vie de chargement

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EXTRACTION DES PARAMÈTRES URL                            │
│    - Lire parcours & checkid depuis URLSearchParams         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CHARGEMENT SESSION (si checkId présent)                  │
│    - DataLoadingOrchestrator.loadSessionData(checkId)       │
│    - Lecture depuis IndexedDB via checkSessionManager       │
│    - Validation de la session                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATION DE LA ROUTE                                   │
│    - NavigationStateManager.isRouteAllowed(path, session)   │
│    - Si non autorisée → Redirection                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CHARGEMENT PARCOURS                                      │
│    - DataLoadingOrchestrator.loadParcoursData(parcoursId)   │
│    - Vérification du cache (24h)                            │
│    - Si cache valide → Retour immédiat                      │
│    - Sinon → Appel API + Mise en cache                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SYNCHRONISATION DES CONTEXTES                            │
│    - DataLoadingOrchestrator.syncContextsWithData()         │
│    - Mise à jour de GlobalParcoursContext                   │
│    - Mise à jour de UnifiedFlowContext                      │
│    - Mise à jour de ActiveCheckIdContext                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. AFFICHAGE DE LA PAGE                                     │
│    - Données disponibles dans les contextes                 │
│    - Composants peuvent s'afficher                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎣 HOOKS UNIFIÉS

### Hook useSessionData

**Objectif** : Charger et synchroniser la session depuis IndexedDB

```typescript
// FRONT/src/hooks/useSessionData.ts

import { useState, useEffect } from 'react';
import { dataLoadingOrchestrator } from '@/services/dataLoadingOrchestrator';
import { CheckSession } from '@/types/checkSession';

export function useSessionData(checkId: string | null) {
  const [session, setSession] = useState<CheckSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkId) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const sessionData = await dataLoadingOrchestrator.loadSessionData(checkId);

        if (!cancelled) {
          setSession(sessionData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [checkId]);

  return { session, loading, error };
}
```

### Hook useParcoursDataUnified

**Objectif** : Charger et synchroniser le parcours (API ou cache)

```typescript
// FRONT/src/hooks/useParcoursDataUnified.ts

import { useState, useEffect } from 'react';
import { dataLoadingOrchestrator } from '@/services/dataLoadingOrchestrator';
import { ParcoursData } from '@/types/parcours';

export function useParcoursDataUnified(
  parcoursId: string | null,
  forceFlowType?: 'checkin' | 'checkout'
) {
  const [parcours, setParcours] = useState<ParcoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parcoursId) {
      setParcours(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadParcours() {
      try {
        setLoading(true);
        setError(null);

        const parcoursData = await dataLoadingOrchestrator.loadParcoursData(
          parcoursId,
          forceFlowType
        );

        if (!cancelled) {
          setParcours(parcoursData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
          setParcours(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadParcours();

    return () => {
      cancelled = true;
    };
  }, [parcoursId, forceFlowType]);

  return { parcours, loading, error };
}
```

### Hook useNavigationGuard

**Objectif** : Vérifier et rediriger si la route n'est pas autorisée

```typescript
// FRONT/src/hooks/useNavigationGuard.ts

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navigationStateManager } from '@/services/navigationStateManager';
import { useNavigateWithParams } from './useNavigateWithParams';
import { CheckSession } from '@/types/checkSession';

export function useNavigationGuard(session: CheckSession | null, loading: boolean) {
  const location = useLocation();
  const navigateWithParams = useNavigateWithParams();

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (loading) return;

    // Si pas de session, pas de guard (sauf pour les routes protégées)
    if (!session) return;

    const currentPath = location.pathname;

    // Vérifier si la route est autorisée
    const isAllowed = navigationStateManager.isRouteAllowed(currentPath, session);

    if (!isAllowed) {
      // Déterminer la route de redirection
      const redirectTarget = navigationStateManager.getRedirectTarget(currentPath, session);

      if (redirectTarget) {
        console.log(`🚫 Route ${currentPath} non autorisée, redirection vers ${redirectTarget}`);
        navigateWithParams(redirectTarget, { replace: true });
      }
    }
  }, [session, loading, location.pathname]);
}
```

---

## 📊 STRATÉGIE DE CACHE

### Règles de cache pour les parcours

1. **Durée de validité** : 24 heures
2. **Invalidation** :
   - Manuelle via `invalidateParcoursCache(parcoursId)`
   - Automatique après 24h
3. **Stratégie** : "Cache-first with background revalidation"
   - Retourner le cache immédiatement si valide
   - Recharger en arrière-plan si proche de l'expiration (> 20h)

### Implémentation

```typescript
async loadParcoursData(parcoursId: string, forceFlowType?: 'checkin' | 'checkout'): Promise<ParcoursData> {
  const cached = await parcoursCache.getParcours(parcoursId);

  // Cache valide : retour immédiat
  if (cached && parcoursCache.isCacheValid(parcoursId, 24)) {
    const cacheAge = Date.now() - cached.cachedAt;
    const twentyHours = 20 * 60 * 60 * 1000;

    // Si cache > 20h, recharger en arrière-plan
    if (cacheAge > twentyHours) {
      console.log(`🔄 Cache proche de l'expiration, rechargement en arrière-plan...`);
      this._reloadParcoursInBackground(parcoursId, forceFlowType);
    }

    return parcoursManager.loadFromRawDataWithMode(cached.data, forceFlowType);
  }

  // Cache invalide ou inexistant : charger depuis l'API
  return await this._loadParcoursFromAPI(parcoursId, forceFlowType);
}
```

---

## 🎯 RÉSUMÉ DES BÉNÉFICES

### Avant (système actuel)

- ❌ Chargements multiples du même parcours
- ❌ Race conditions possibles
- ❌ Refs fragiles pour éviter les re-runs
- ❌ Logique dispersée dans chaque page
- ❌ Difficile à maintenir et débugger

### Après (nouveau système)

- ✅ Un seul chargement par parcours (loading locks)
- ✅ Pas de race conditions
- ✅ Pas de refs nécessaires
- ✅ Logique centralisée dans le service
- ✅ Hooks réutilisables et simples
- ✅ Cache intelligent avec revalidation
- ✅ Facile à maintenir et débugger

---

**Prochaine étape** : Étape 7 - Implémentation du NavigationStateManager

