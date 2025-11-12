# 🚀 Guide Rapide - Détection de Flou

## ⚡ TL;DR

Le système de détection de flou a été **complètement refondu**:
- ✅ Algorithme 2D amélioré (au lieu de 1D)
- ✅ Seuil réaliste (250 au lieu de 60)
- ✅ Zones ignorées (bords)
- ✅ Configurable via variables d'environnement

**Résultat**: Beaucoup moins de faux positifs! 🎉

## 🎯 Utilisation

### Aucune action requise!
Les valeurs par défaut sont optimisées et devraient fonctionner correctement.

### Si vous avez des problèmes

#### ❌ Trop de photos marquées comme floues?
```env
# Augmenter le seuil (moins sensible)
VITE_BLUR_THRESHOLD=350
```

#### ❌ Des photos floues ne sont pas détectées?
```env
# Réduire le seuil (plus sensible)
VITE_BLUR_THRESHOLD=150
```

#### ❌ Ça va trop lentement?
```env
# Analyser moins de pixels
VITE_BLUR_ANALYSIS_STEP=8
```

## 📊 Paramètres disponibles

| Paramètre | Défaut | Plage | Description |
|-----------|--------|-------|-------------|
| `VITE_BLUR_DETECTION_ENABLED` | `true` | - | Activer/désactiver |
| `VITE_BLUR_THRESHOLD` | `250` | 150-400 | Seuil de netteté |
| `VITE_BLUR_ANALYSIS_STEP` | `4` | 2-8 | Pas d'analyse |
| `VITE_BLUR_EDGE_MARGIN` | `50` | 20-100 | Marge des bords |
| `VITE_BLUR_MIN_VARIANCE` | `100` | 50-200 | Variance min |

## 🧪 Tester le système

Dans la console du navigateur:
```javascript
// Importer et lancer les tests
import { runBlurDetectionTests } from '@/utils/blurDetectionTest';
await runBlurDetectionTests();
```

Cela affichera les scores pour 3 images de test.

## 📈 Logs détaillés

Chaque photo capturée affiche maintenant:
```
🔍 Analyse de flou améliorée: {
  blurScore: 285.42,           // Score Laplacien
  maxLaplacian: 45.23,         // Variation maximale
  pixelCount: 1024,            // Pixels analysés
  threshold: 250,              // Seuil utilisé
  minVariance: 100,            // Variance minimale
  isBlurry: false,             // Résultat final
  confidence: 114.17           // Confiance en %
}
```

## 🔍 Comprendre les scores

- **blurScore**: Plus haut = plus net
  - < 250: Probablement flou
  - > 250: Probablement net

- **maxLaplacian**: Variation maximale
  - < 100: Très peu de variations (flou)
  - > 100: Beaucoup de variations (net)

- **confidence**: Confiance en pourcentage
  - 0-50%: Peu confiant
  - 50-100%: Confiant
  - > 100%: Très confiant

## 📚 Documentation complète

Voir `FRONT/BLUR_DETECTION.md` pour la documentation détaillée.

## ✅ Checklist de déploiement

- [ ] Tester avec les valeurs par défaut
- [ ] Vérifier les logs dans la console
- [ ] Capturer quelques photos nettes et floues
- [ ] Vérifier que les avertissements s'affichent correctement
- [ ] Ajuster les paramètres si nécessaire
- [ ] Monitorer les scores en production

## 🆘 Besoin d'aide?

1. Vérifier les logs dans la console (F12)
2. Lire `FRONT/BLUR_DETECTION.md`
3. Essayer les tests: `await runBlurDetectionTests()`
4. Ajuster les paramètres progressivement

