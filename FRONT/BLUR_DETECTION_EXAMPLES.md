# 📋 Exemples de Configuration - Détection de Flou

## 🎯 Profils de configuration

### 1️⃣ Configuration par défaut (Recommandée)
```env
VITE_BLUR_DETECTION_ENABLED=true
VITE_BLUR_THRESHOLD=250
VITE_BLUR_ANALYSIS_STEP=4
VITE_BLUR_EDGE_MARGIN=50
VITE_BLUR_MIN_VARIANCE=100
```
**Utilité**: Équilibre optimal entre précision et performance
**Cas d'usage**: Production générale

---

### 2️⃣ Configuration stricte (Très sensible)
```env
VITE_BLUR_DETECTION_ENABLED=true
VITE_BLUR_THRESHOLD=150
VITE_BLUR_ANALYSIS_STEP=2
VITE_BLUR_EDGE_MARGIN=30
VITE_BLUR_MIN_VARIANCE=50
```
**Utilité**: Détecte même les légers flous
**Cas d'usage**: Contrôle qualité strict, documents importants
**Inconvénient**: Plus de faux positifs

---

### 3️⃣ Configuration permissive (Peu sensible)
```env
VITE_BLUR_DETECTION_ENABLED=true
VITE_BLUR_THRESHOLD=400
VITE_BLUR_ANALYSIS_STEP=8
VITE_BLUR_EDGE_MARGIN=100
VITE_BLUR_MIN_VARIANCE=150
```
**Utilité**: Accepte les images légèrement floues
**Cas d'usage**: Environnements difficiles, faible luminosité
**Inconvénient**: Moins de détection des vrais flous

---

### 4️⃣ Configuration performance (Rapide)
```env
VITE_BLUR_DETECTION_ENABLED=true
VITE_BLUR_THRESHOLD=250
VITE_BLUR_ANALYSIS_STEP=8
VITE_BLUR_EDGE_MARGIN=50
VITE_BLUR_MIN_VARIANCE=100
```
**Utilité**: Analyse rapide, moins de calculs
**Cas d'usage**: Appareils lents, connexion lente
**Inconvénient**: Moins précis

---

### 5️⃣ Configuration précision (Lent mais précis)
```env
VITE_BLUR_DETECTION_ENABLED=true
VITE_BLUR_THRESHOLD=250
VITE_BLUR_ANALYSIS_STEP=2
VITE_BLUR_EDGE_MARGIN=20
VITE_BLUR_MIN_VARIANCE=100
```
**Utilité**: Analyse très précise
**Cas d'usage**: Appareils puissants, qualité maximale
**Inconvénient**: Plus lent

---

### 6️⃣ Configuration désactivée
```env
VITE_BLUR_DETECTION_ENABLED=false
```
**Utilité**: Désactive complètement la détection
**Cas d'usage**: Dépannage, tests
**Inconvénient**: Aucun avertissement de flou

---

## 🔄 Scénarios et solutions

### Scénario 1: Beaucoup de faux positifs
**Symptôme**: Presque toutes les photos sont marquées comme floues

**Solution 1** (Recommandée):
```env
VITE_BLUR_THRESHOLD=350
```

**Solution 2** (Alternative):
```env
VITE_BLUR_MIN_VARIANCE=50
```

**Solution 3** (Combinée):
```env
VITE_BLUR_THRESHOLD=300
VITE_BLUR_MIN_VARIANCE=75
```

---

### Scénario 2: Pas assez de détection
**Symptôme**: Des photos clairement floues ne sont pas détectées

**Solution 1** (Recommandée):
```env
VITE_BLUR_THRESHOLD=150
```

**Solution 2** (Alternative):
```env
VITE_BLUR_MIN_VARIANCE=150
```

**Solution 3** (Combinée):
```env
VITE_BLUR_THRESHOLD=200
VITE_BLUR_MIN_VARIANCE=125
```

---

### Scénario 3: Performance lente
**Symptôme**: L'analyse de flou prend trop de temps

**Solution 1** (Rapide):
```env
VITE_BLUR_ANALYSIS_STEP=8
```

**Solution 2** (Très rapide):
```env
VITE_BLUR_ANALYSIS_STEP=8
VITE_BLUR_EDGE_MARGIN=100
```

**Solution 3** (Désactiver):
```env
VITE_BLUR_DETECTION_ENABLED=false
```

---

### Scénario 4: Environnement sombre
**Symptôme**: Beaucoup de faux positifs en faible luminosité

**Solution**:
```env
VITE_BLUR_THRESHOLD=300
VITE_BLUR_EDGE_MARGIN=100
VITE_BLUR_MIN_VARIANCE=75
```

---

### Scénario 5: Environnement très lumineux
**Symptôme**: Beaucoup de faux positifs en forte luminosité

**Solution**:
```env
VITE_BLUR_THRESHOLD=200
VITE_BLUR_EDGE_MARGIN=30
VITE_BLUR_MIN_VARIANCE=125
```

---

## 📊 Tableau de décision

| Problème | Paramètre | Action |
|----------|-----------|--------|
| Trop de faux positifs | `VITE_BLUR_THRESHOLD` | ⬆️ Augmenter |
| Pas assez de détection | `VITE_BLUR_THRESHOLD` | ⬇️ Réduire |
| Trop lent | `VITE_BLUR_ANALYSIS_STEP` | ⬆️ Augmenter |
| Pas assez précis | `VITE_BLUR_ANALYSIS_STEP` | ⬇️ Réduire |
| Bords problématiques | `VITE_BLUR_EDGE_MARGIN` | ⬆️ Augmenter |
| Variance trop basse | `VITE_BLUR_MIN_VARIANCE` | ⬇️ Réduire |

---

## 🧪 Processus de calibrage

### Étape 1: Collecter les données
```javascript
// Capturer 10 photos nettes et 10 photos floues
// Noter les scores pour chaque
```

### Étape 2: Analyser les résultats
```
Photos nettes: 250-350
Photos floues: 50-150
```

### Étape 3: Calculer le seuil optimal
```
Seuil = (moyenne_nettes + moyenne_floues) / 2
Seuil = (300 + 100) / 2 = 200
```

### Étape 4: Appliquer et tester
```env
VITE_BLUR_THRESHOLD=200
```

### Étape 5: Valider
```javascript
// Tester avec les mêmes photos
// Vérifier que les résultats sont corrects
```

---

## 💡 Conseils d'optimisation

1. **Commencer par défaut**: Les valeurs par défaut sont optimisées
2. **Tester progressivement**: Changer un paramètre à la fois
3. **Collecter des données**: Monitorer les scores réels
4. **Ajuster graduellement**: Petits changements plutôt que grands
5. **Documenter**: Noter les changements et les résultats

---

## 🔗 Voir aussi

- `FRONT/BLUR_DETECTION.md` - Documentation complète
- `FRONT/BLUR_DETECTION_QUICK_START.md` - Guide rapide
- `FRONT/.env.example` - Exemple de configuration

