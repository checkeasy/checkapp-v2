# ⚡ QUICKSTART - Vérification etapeID

## 🎯 Problème en 30 secondes

Les `etapeID` de l'API Bubble sont **perdus** lors de la transformation des données par le DataAdapter.

**Exemple**:
- API retourne: `etapeID: "1753358727684x171131427093090140"`
- DataAdapter génère: `task.id: "refaire-le-lit-avec-des-drap"`
- ❌ L'`etapeID` original est perdu !

---

## 🚀 Démarrage rapide (5 min)

### 1. Comprendre le problème
📖 Lire: `DOC/SCHEMA_PROBLEME_ETAPEID.md` (5 min)

### 2. Tester l'état actuel
🧪 Copier-coller dans la console:

```javascript
// Test rapide
const PARCOURS_ID = '1753358726225x784440888671076400';
const apiUrl = `https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece?parcours=${PARCOURS_ID}`;

fetch(apiUrl)
  .then(r => r.json())
  .then(data => {
    const apiEtapeId = data.piece[0].etapes[0].etapeID;
    console.log('✅ API etapeID:', apiEtapeId);
    console.log('❌ Ce ID sera perdu par le DataAdapter');
  });
```

### 3. Voir la solution
📖 Lire: `DOC/PLAN_CORRECTION_ETAPEID.md` (sections 1 et 2)

---

## 📋 Documents par ordre de lecture

1. **SCHEMA_PROBLEME_ETAPEID.md** (5 min) ⭐ Commencer ici
2. **TODO_VERIFICATION_ETAPEID.md** (15 min) - Détails du problème
3. **SCRIPTS_TEST_ETAPEID.md** (10 min) - Tests à exécuter
4. **PLAN_CORRECTION_ETAPEID.md** (20 min) - Comment corriger
5. **README_VERIFICATION_ETAPEID.md** (10 min) - Guide complet

**Total**: ~60 minutes pour tout comprendre

---

## 🔧 Solution en 3 lignes

```typescript
// AVANT
const taskId = generateTaskId(etape, index);  // ❌ Génère un slug

// APRÈS
const taskId = etape.etapeID;  // ✅ Utilise l'ID original
```

---

## ✅ Checklist rapide

- [ ] Lire SCHEMA_PROBLEME_ETAPEID.md
- [ ] Exécuter le test rapide ci-dessus
- [ ] Comprendre que le DataAdapter perd les etapeID
- [ ] Lire le plan de correction
- [ ] Implémenter les modifications
- [ ] Valider avec les scripts de test

---

## 📞 Besoin d'aide ?

**Question**: Où est le problème exactement ?  
**Réponse**: `FRONT/src/services/dataAdapter.ts` ligne 236-263 et 382-390

**Question**: Combien de temps pour corriger ?  
**Réponse**: 4-6 heures de dev + 2 heures de tests

**Question**: Quel est le risque ?  
**Réponse**: Les données en base peuvent avoir des etapeID incorrects

---

**Créé le**: 2025-09-30  
**Temps de lecture**: 5 minutes  
**Temps d'implémentation**: 6-8 heures

