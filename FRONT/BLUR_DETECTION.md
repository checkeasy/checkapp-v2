# 🔍 Système de Détection de Flou - Documentation

## Vue d'ensemble

Le système de détection de flou analyse la netteté des photos capturées en temps réel en utilisant une **convolution Laplacienne 2D**. Il permet de détecter les photos floues et d'avertir l'utilisateur avant l'upload.

## 🔧 Améliorations apportées

### 1. **Algorithme Laplacien 2D amélioré**
- ✅ Utilise un vrai kernel Laplacien 3x3 (pas juste horizontal)
- ✅ Analyse bidimensionnelle complète
- ✅ Meilleure détection des variations de netteté

### 2. **Seuil configurable et réaliste**
- ✅ Ancien seuil: 60 (trop bas, faux positifs massifs)
- ✅ Nouveau seuil: 250 (configurable via `VITE_BLUR_THRESHOLD`)
- ✅ Seuil minimum de variance: 100 (configurable via `VITE_BLUR_MIN_VARIANCE`)

### 3. **Détection de zones**
- ✅ Ignore les bords de l'image (marge configurable)
- ✅ Analyse uniquement la zone centrale pertinente
- ✅ Réduit les faux positifs dus aux bords sombres

### 4. **Statistiques détaillées**
- ✅ Score Laplacien (blurScore)
- ✅ Laplacien maximum (maxLaplacian)
- ✅ Nombre de pixels analysés
- ✅ Confiance en pourcentage (0-100%)

### 5. **Configuration flexible**
- ✅ Tous les paramètres sont configurables via variables d'environnement
- ✅ Peut être désactivé complètement
- ✅ Permet l'ajustement selon le contexte d'utilisation

## 📊 Paramètres de configuration

### `VITE_BLUR_DETECTION_ENABLED` (boolean)
- **Défaut**: `true`
- **Description**: Active/désactive la détection de flou
- **Utilité**: Permet de désactiver complètement le système si nécessaire

### `VITE_BLUR_THRESHOLD` (number)
- **Défaut**: `250`
- **Plage recommandée**: `150-400`
- **Description**: Seuil de netteté (score Laplacien)
  - **150**: Très sensible (détecte même les légers flous)
  - **250**: Équilibré ⭐ (recommandé)
  - **400**: Peu sensible (accepte les images légèrement floues)

### `VITE_BLUR_ANALYSIS_STEP` (number)
- **Défaut**: `4`
- **Plage recommandée**: `2-8`
- **Description**: Analyser 1 pixel sur N
  - **2**: Très précis (plus lent, ~2x plus de calculs)
  - **4**: Équilibré ⭐ (recommandé)
  - **8**: Rapide (moins précis, ~4x plus rapide)

### `VITE_BLUR_EDGE_MARGIN` (number)
- **Défaut**: `50`
- **Plage recommandée**: `20-100`
- **Description**: Marge des bords à ignorer (en pixels)
- **Utilité**: Évite les faux positifs dus aux bords sombres/vignettés

### `VITE_BLUR_MIN_VARIANCE` (number)
- **Défaut**: `100`
- **Plage recommandée**: `50-200`
- **Description**: Variance minimale du Laplacien
- **Utilité**: Seuil minimum de variation pour considérer l'image comme nette

## 🎯 Cas d'usage et ajustements

### Cas 1: Trop de faux positifs (photos marquées floues à tort)
```env
# Augmenter le seuil
VITE_BLUR_THRESHOLD=350

# Ou réduire la variance minimale
VITE_BLUR_MIN_VARIANCE=50
```

### Cas 2: Pas assez de détection (photos floues non détectées)
```env
# Réduire le seuil
VITE_BLUR_THRESHOLD=150

# Ou augmenter la variance minimale
VITE_BLUR_MIN_VARIANCE=150
```

### Cas 3: Performance lente
```env
# Augmenter le pas d'analyse
VITE_BLUR_ANALYSIS_STEP=8

# Ou augmenter la marge des bords
VITE_BLUR_EDGE_MARGIN=100
```

### Cas 4: Besoin de précision maximale
```env
# Réduire le pas d'analyse
VITE_BLUR_ANALYSIS_STEP=2

# Réduire la marge des bords
VITE_BLUR_EDGE_MARGIN=20
```

## 📈 Statistiques retournées

Chaque photo capturée inclut les statistiques suivantes dans `meta.blurStats`:

```typescript
{
  maxLaplacian: number;      // Valeur Laplacienne maximale
  pixelCount: number;        // Nombre de pixels analysés
  threshold: number;         // Seuil utilisé
  minVariance: number;       // Variance minimale utilisée
  confidence: number;        // Confiance en % (0-100)
}
```

## 🔬 Formule mathématique

Le système utilise le **kernel Laplacien 3x3 standard**:

```
[  0  -1   0 ]
[ -1   4  -1 ]
[  0  -1   0 ]
```

Pour chaque pixel, on calcule:
1. Convolution avec le kernel
2. Valeur absolue du résultat
3. Élévation au carré
4. Moyenne sur tous les pixels

**Score final** = √(moyenne des carrés)

Une image nette a un score Laplacien **élevé** (beaucoup de variations).
Une image floue a un score Laplacien **bas** (peu de variations).

## 🧪 Test et calibrage

Pour calibrer le système:

1. **Capturer des photos nettes** et noter les scores
2. **Capturer des photos floues** et noter les scores
3. **Ajuster le seuil** entre les deux valeurs
4. **Tester avec différentes conditions** (lumière, distance, mouvement)

Exemple de logs:
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

## 🚀 Prochaines améliorations possibles

- [ ] Détection de zones floues partielles
- [ ] Analyse multi-régions
- [ ] Machine Learning pour calibrage automatique
- [ ] Détection de mouvement
- [ ] Analyse de contraste local

