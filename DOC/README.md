# 📚 Documentation - Système de Parcours CheckEasy

> Analyse complète du flux de données depuis l'API Bubble jusqu'aux composants React

---

## 🎯 Vue d'ensemble

Cette documentation analyse en profondeur le système de gestion des parcours dans l'application CheckEasy. Elle couvre :

- ✅ Le flux complet des données (API → Cache → Manager → Adapter → Context → Components)
- ✅ La transformation des données (rawData → adaptedData)
- ✅ Les différences entre les modes checkin et checkout
- ✅ L'utilisation pratique dans les composants React
- ✅ Les bonnes pratiques et pièges à éviter

---

## 📖 Documents disponibles

### 🌟 Pour débuter

#### [POINTS_CLES.md](./POINTS_CLES.md) ⭐ **COMMENCEZ ICI**
L'essentiel en 5 minutes : concepts clés, pièges à éviter, quick start

#### [INDEX.md](./INDEX.md)
Guide de navigation complet avec parcours de lecture recommandés

---

### 📊 Documentation technique

#### [ANALYSE_FLUX_DONNEES.md](./ANALYSE_FLUX_DONNEES.md)
Analyse détaillée du flux de données (20 min)

#### [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md)
Vue d'ensemble de l'architecture (10 min)

---

### 💡 Guides pratiques

#### [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md)
Exemples de code prêts à l'emploi (15 min)

---

### 📖 Références

#### [GLOSSAIRE.md](./GLOSSAIRE.md)
Dictionnaire des termes techniques

#### [SCHEMA_VISUEL.md](./SCHEMA_VISUEL.md)
Schémas ASCII de l'architecture

#### [README_ANALYSE.md](./README_ANALYSE.md)
Index principal avec guide de navigation

---

## 🚀 Quick Start

### 1. Charger un parcours

```typescript
import { useParcoursActions } from '@/contexts/GlobalParcoursContext';

const { loadParcours } = useParcoursActions();

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const parcoursId = urlParams.get('parcours');
  if (parcoursId) {
    loadParcours(parcoursId);
  }
}, []);
```

### 2. Afficher les données

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

const { info, rooms, stats, isLoaded } = useParcoursData();

if (!isLoaded) return <div>Chargement...</div>;

return (
  <div>
    <h1>{info.name}</h1>
    <p>{rooms.length} pièces</p>
    <p>{stats.totalTasks} tâches</p>
  </div>
);
```

---

## 🔑 Concepts clés

### Architecture en 7 couches

```
URL → API → Cache → ParcoursManager → DataAdapter → Context → Hooks → Components
```

### Différence isTodo (LE concept clé)

```typescript
// Dans l'API, chaque étape a un champ isTodo:

isTodo: false  →  Photo de référence  →  TOUJOURS affichée
isTodo: true   →  Tâche vérification  →  SEULEMENT en mode checkout
```

### Deux modes de fonctionnement

- **CHECKIN** : Photos de référence uniquement
- **CHECKOUT** : Photos de référence + Tâches de vérification

---

## 📊 Diagrammes

Cette documentation inclut plusieurs diagrammes Mermaid interactifs :

1. Architecture du Flux de Données
2. Transformation des données
3. Différence Checkin vs Checkout
4. Vue d'ensemble complète

---

## 🎓 Parcours de lecture

### Nouveau développeur (30 min)

1. [POINTS_CLES.md](./POINTS_CLES.md) (5 min)
2. [SCHEMA_VISUEL.md](./SCHEMA_VISUEL.md) (parcourir)
3. [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md) (10 min)
4. [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) (15 min)

### Développeur pressé (5 min)

1. [POINTS_CLES.md](./POINTS_CLES.md) → Quick Start
2. [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) → Copier l'exemple

### Debugging (20 min)

1. [POINTS_CLES.md](./POINTS_CLES.md) → Debugging rapide
2. [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md) → Debugging
3. [ANALYSE_FLUX_DONNEES.md](./ANALYSE_FLUX_DONNEES.md) → Comprendre le flux

---

## 📁 Fichiers clés du code

### Services
- `FRONT/src/services/parcoursManager.ts` - Gestion centralisée
- `FRONT/src/services/dataAdapter.ts` - Transformation
- `FRONT/src/services/parcoursCache.ts` - Cache IndexedDB

### Contexts
- `FRONT/src/contexts/GlobalParcoursContext.tsx` - Provider React

### Hooks
- `FRONT/src/hooks/useOptimizedParcours.ts` - Hook optimisé

### Types
- `FRONT/src/types/room.ts` - Définitions TypeScript

---

## ⚠️ Points d'attention

### 1. Différence Étape vs Tâche
- **Étape** = Donnée brute de l'API
- **Tâche** = Donnée générée par le DataAdapter

### 2. FlowType détermine les tâches
- **checkout** → Photos + Tâches
- **checkin** → Photos uniquement

### 3. Singleton ParcoursManager
- Une seule instance pour toute l'app
- Ne jamais créer de nouvelles instances

### 4. Cache automatique
- Validité de 24h
- Transparent pour le développeur

---

## 🆘 Besoin d'aide ?

| Problème | Solution |
|----------|----------|
| Terme inconnu | [GLOSSAIRE.md](./GLOSSAIRE.md) |
| Bug | [POINTS_CLES.md](./POINTS_CLES.md) → Debugging |
| Exemple de code | [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) |
| Comprendre l'architecture | [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md) |

---

## ✅ Checklist

### Avant de coder
- [ ] J'ai lu [POINTS_CLES.md](./POINTS_CLES.md)
- [ ] Je comprends isTodo
- [ ] Je connais le flowType
- [ ] Je sais quel hook utiliser

### Pendant le développement
- [ ] J'utilise les hooks fournis
- [ ] Je vérifie isLoaded
- [ ] Je gère loading et error
- [ ] J'ajoute des logs

### Après le développement
- [ ] Testé en checkin
- [ ] Testé en checkout
- [ ] Testé avec/sans cache
- [ ] Testé avec différents parcours

---

## 📝 Métadonnées

**Créé le** : 2025-09-30  
**Version** : 1.0  
**Auteur** : Documentation CheckEasy  
**Dernière mise à jour** : 2025-09-30

---

## 🔗 Navigation rapide

- [INDEX.md](./INDEX.md) - Guide de navigation complet
- [POINTS_CLES.md](./POINTS_CLES.md) - L'essentiel en 5 minutes ⭐
- [ANALYSE_FLUX_DONNEES.md](./ANALYSE_FLUX_DONNEES.md) - Analyse détaillée
- [EXEMPLES_UTILISATION_PARCOURS.md](./EXEMPLES_UTILISATION_PARCOURS.md) - Exemples pratiques
- [RESUME_ARCHITECTURE.md](./RESUME_ARCHITECTURE.md) - Vue d'ensemble
- [GLOSSAIRE.md](./GLOSSAIRE.md) - Dictionnaire
- [SCHEMA_VISUEL.md](./SCHEMA_VISUEL.md) - Schémas ASCII

