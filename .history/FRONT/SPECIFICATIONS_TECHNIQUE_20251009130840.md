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

**Prochaine étape** : Étape 5 - Concevoir le système de navigation basé sur l'état

