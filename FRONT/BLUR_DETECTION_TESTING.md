# 🧪 Guide de Test - Détection de Flou

## 🚀 Tests automatisés

### Lancer les tests
```javascript
// Dans la console du navigateur (F12)
import { runBlurDetectionTests } from '@/utils/blurDetectionTest';
await runBlurDetectionTests();
```

### Résultat attendu
```
🧪 Démarrage des tests de détection de flou...

📊 Test 1: Image nette
Résultat: { isBlurry: false, blurScore: 285.42, ... }
✅ Attendu: isBlurry = false

📊 Test 2: Image floue
Résultat: { isBlurry: true, blurScore: 145.32, ... }
✅ Attendu: isBlurry = true

📊 Test 3: Dégradé (très flou)
Résultat: { isBlurry: true, blurScore: 45.23, ... }
✅ Attendu: isBlurry = true

📈 Résumé des tests:
Configuration actuelle:
  - BLUR_THRESHOLD: 250
  - BLUR_MIN_VARIANCE: 100
  - BLUR_ANALYSIS_STEP: 4
  - BLUR_EDGE_MARGIN: 50

Scores obtenus:
  - Image nette: 285.42
  - Image floue: 145.32
  - Dégradé: 45.23
```

---

## 📱 Tests manuels

### Test 1: Photo nette en bonne lumière
1. Ouvrir l'application
2. Accéder au module de capture photo
3. Prendre une photo nette d'un objet bien éclairé
4. **Résultat attendu**: Aucun avertissement ✅

### Test 2: Photo floue intentionnelle
1. Ouvrir l'application
2. Accéder au module de capture photo
3. Prendre une photo floue (bouger pendant la capture)
4. **Résultat attendu**: Avertissement "Photo potentiellement floue" ⚠️

### Test 3: Photo en faible lumière
1. Ouvrir l'application
2. Accéder au module de capture photo
3. Prendre une photo dans un environnement sombre
4. **Résultat attendu**: Aucun avertissement (si nette) ✅

### Test 4: Photo en forte lumière
1. Ouvrir l'application
2. Accéder au module de capture photo
3. Prendre une photo en plein soleil
4. **Résultat attendu**: Aucun avertissement (si nette) ✅

### Test 5: Photo avec mouvement
1. Ouvrir l'application
2. Accéder au module de capture photo
3. Prendre une photo en bougeant l'appareil
4. **Résultat attendu**: Avertissement "Photo potentiellement floue" ⚠️

---

## 🔍 Vérifier les logs

### Ouvrir la console
- **Chrome/Firefox**: F12 → Console
- **Safari**: Cmd+Option+I → Console
- **Edge**: F12 → Console

### Chercher les logs de flou
```
Filtrer par: "Analyse de flou"
```

### Exemple de log
```
🔍 Analyse de flou améliorée: {
  blurScore: 285.42,
  maxLaplacian: 45.23,
  pixelCount: 1024,
  threshold: 250,
  minVariance: 100,
  isBlurry: false,
  confidence: 114.17
}
```

---

## 📊 Collecter des données

### Créer un fichier de test
```javascript
// Dans la console
const testResults = [];

// Capturer 10 photos nettes
// Pour chaque photo, copier le log et l'ajouter à testResults

// Capturer 10 photos floues
// Pour chaque photo, copier le log et l'ajouter à testResults

// Exporter les résultats
console.table(testResults);
```

### Analyser les résultats
```javascript
// Calculer les moyennes
const sharpPhotos = testResults.filter(r => !r.isBlurry);
const blurryPhotos = testResults.filter(r => r.isBlurry);

const avgSharpScore = sharpPhotos.reduce((a, b) => a + b.blurScore, 0) / sharpPhotos.length;
const avgBlurryScore = blurryPhotos.reduce((a, b) => a + b.blurScore, 0) / blurryPhotos.length;

console.log(`Moyenne photos nettes: ${avgSharpScore.toFixed(2)}`);
console.log(`Moyenne photos floues: ${avgBlurryScore.toFixed(2)}`);
console.log(`Seuil recommandé: ${((avgSharpScore + avgBlurryScore) / 2).toFixed(0)}`);
```

---

## 🎯 Calibrage

### Étape 1: Collecter les données
- Capturer 20 photos nettes
- Capturer 20 photos floues
- Noter les scores

### Étape 2: Analyser
```javascript
// Voir section "Analyser les résultats" ci-dessus
```

### Étape 3: Calculer le seuil optimal
```
Seuil = (moyenne_nettes + moyenne_floues) / 2
```

### Étape 4: Appliquer
```env
VITE_BLUR_THRESHOLD=<votre_seuil>
```

### Étape 5: Valider
- Tester avec les mêmes photos
- Vérifier que les résultats sont corrects
- Ajuster si nécessaire

---

## 🐛 Dépannage

### Les logs ne s'affichent pas
1. Vérifier que `VITE_DEBUG_MODE=true` ou `VITE_LOG_LEVEL=debug`
2. Vérifier que `VITE_BLUR_DETECTION_ENABLED=true`
3. Recharger la page (Ctrl+Shift+R)

### Les scores sont très bas
1. Vérifier la luminosité
2. Vérifier que l'appareil photo fonctionne
3. Essayer avec une image plus contrastée

### Les scores sont très hauts
1. Vérifier que l'image n'est pas trop contrastée
2. Essayer avec une image plus simple
3. Vérifier les paramètres de configuration

### Trop de faux positifs
1. Augmenter `VITE_BLUR_THRESHOLD`
2. Réduire `VITE_BLUR_MIN_VARIANCE`
3. Augmenter `VITE_BLUR_EDGE_MARGIN`

### Pas assez de détection
1. Réduire `VITE_BLUR_THRESHOLD`
2. Augmenter `VITE_BLUR_MIN_VARIANCE`
3. Réduire `VITE_BLUR_EDGE_MARGIN`

---

## 📈 Métriques à suivre

### En production
- Nombre de photos marquées comme floues
- Nombre de photos acceptées
- Taux de satisfaction utilisateur
- Scores moyens par condition

### Logs à monitorer
```
🔍 Analyse de flou améliorée: {
  blurScore: X,           // À suivre
  maxLaplacian: Y,        // À suivre
  confidence: Z,          // À suivre
  isBlurry: true/false    // À suivre
}
```

---

## ✅ Checklist de test

- [ ] Tests automatisés passent
- [ ] Photo nette: Aucun avertissement
- [ ] Photo floue: Avertissement affiché
- [ ] Logs affichés correctement
- [ ] Scores cohérents
- [ ] Performance acceptable
- [ ] Pas d'erreurs console
- [ ] Configuration par défaut OK

---

## 🚀 Prêt pour la production?

Si tous les tests passent:
- ✅ Déployer avec les valeurs par défaut
- ✅ Monitorer en production
- ✅ Collecter des données
- ✅ Ajuster si nécessaire

Voir: [`BLUR_DETECTION_QUICK_START.md`](./BLUR_DETECTION_QUICK_START.md)

