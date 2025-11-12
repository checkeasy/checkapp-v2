# 🔬 Guide Avancé - Détection de Flou

## 🎯 Cas d'usage avancés

### 1. Détection multi-niveaux
Utiliser différents seuils selon le contexte:

```typescript
// Configuration pour documents importants (strict)
const STRICT_THRESHOLD = 150;

// Configuration pour photos générales (équilibré)
const BALANCED_THRESHOLD = 250;

// Configuration pour environnements difficiles (permissif)
const PERMISSIVE_THRESHOLD = 400;

// Sélectionner selon le contexte
const threshold = isImportantDocument ? STRICT_THRESHOLD : BALANCED_THRESHOLD;
```

### 2. Détection adaptative
Ajuster le seuil selon les conditions:

```typescript
// Détecter la luminosité
const avgBrightness = calculateAverageBrightness(canvas);

// Ajuster le seuil
let threshold = 250;
if (avgBrightness < 80) {
  threshold = 300; // Moins sensible en faible lumière
} else if (avgBrightness > 200) {
  threshold = 200; // Plus sensible en forte lumière
}
```

### 3. Détection par zones
Analyser différentes zones de l'image:

```typescript
// Analyser la zone centrale
const centralScore = analyzeZone(canvas, 0.25, 0.25, 0.75, 0.75);

// Analyser les bords
const edgeScore = analyzeZone(canvas, 0, 0, 1, 0.2);

// Combiner les scores
const finalScore = (centralScore * 0.8) + (edgeScore * 0.2);
```

### 4. Détection avec historique
Comparer avec les photos précédentes:

```typescript
// Stocker les scores précédents
const previousScores = [285, 290, 288];

// Calculer la moyenne
const avgPreviousScore = previousScores.reduce((a, b) => a + b) / previousScores.length;

// Comparer
if (currentScore < avgPreviousScore * 0.8) {
  // Photo significativement plus floue
  console.warn('Photo plus floue que la moyenne');
}
```

### 5. Détection avec feedback utilisateur
Apprendre du feedback:

```typescript
// Stocker les décisions utilisateur
const userFeedback = {
  accepted: [],
  rejected: []
};

// Calculer les seuils optimaux
const acceptedScores = userFeedback.accepted.map(p => p.blurScore);
const rejectedScores = userFeedback.rejected.map(p => p.blurScore);

const optimalThreshold = (
  Math.max(...acceptedScores) + Math.min(...rejectedScores)
) / 2;
```

---

## 🔧 Optimisations de performance

### 1. Analyse progressive
```typescript
// Analyser d'abord une petite région
const quickScore = analyzeRegion(canvas, 0.25, 0.25, 0.75, 0.75);

// Si le score est clair, ne pas analyser plus
if (quickScore > 300 || quickScore < 100) {
  return { isBlurry: quickScore < 250, blurScore: quickScore };
}

// Sinon, analyser complètement
const fullScore = analyzeFullImage(canvas);
return { isBlurry: fullScore < 250, blurScore: fullScore };
```

### 2. Cache des résultats
```typescript
// Mettre en cache les résultats
const blurCache = new Map<string, number>();

function detectBlurWithCache(canvas: HTMLCanvasElement): number {
  const key = canvas.toDataURL();
  
  if (blurCache.has(key)) {
    return blurCache.get(key)!;
  }
  
  const score = detectBlur(canvas).blurScore;
  blurCache.set(key, score);
  return score;
}
```

### 3. Web Worker
```typescript
// Analyser dans un worker pour ne pas bloquer l'UI
const worker = new Worker('blur-detection-worker.js');

worker.postMessage({ imageData: canvas.toDataURL() });
worker.onmessage = (event) => {
  const { blurScore, isBlurry } = event.data;
  console.log('Résultat:', { blurScore, isBlurry });
};
```

---

## 📊 Analyse statistique avancée

### 1. Distribution des scores
```typescript
// Collecter les scores
const scores = [];

// Calculer les statistiques
const mean = scores.reduce((a, b) => a + b) / scores.length;
const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2)) / scores.length;
const stdDev = Math.sqrt(variance);

// Utiliser pour calibrage
const threshold = mean - stdDev; // Seuil conservateur
```

### 2. Détection d'anomalies
```typescript
// Détecter les photos anormales
function isAnomaly(score: number, scores: number[]): boolean {
  const mean = scores.reduce((a, b) => a + b) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((a, b) => a + Math.pow(b - mean, 2)) / scores.length
  );
  
  // Anomalie si > 2 écarts-types
  return Math.abs(score - mean) > 2 * stdDev;
}
```

### 3. Analyse de tendance
```typescript
// Analyser la tendance des scores
function analyzeTrend(scores: number[]): string {
  const recent = scores.slice(-10);
  const older = scores.slice(-20, -10);
  
  const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b) / older.length;
  
  if (recentAvg > olderAvg) return 'improving';
  if (recentAvg < olderAvg) return 'degrading';
  return 'stable';
}
```

---

## 🎨 Intégration UI avancée

### 1. Indicateur de confiance
```typescript
// Afficher un indicateur visuel
function getConfidenceColor(confidence: number): string {
  if (confidence > 100) return 'green';    // Très confiant
  if (confidence > 75) return 'yellow';   // Confiant
  if (confidence > 50) return 'orange';   // Peu confiant
  return 'red';                           // Pas confiant
}
```

### 2. Suggestion d'action
```typescript
// Suggérer une action selon le score
function getSuggestion(blurScore: number): string {
  if (blurScore > 300) return '✅ Photo excellente';
  if (blurScore > 250) return '✅ Photo bonne';
  if (blurScore > 150) return '⚠️ Photo acceptable';
  if (blurScore > 100) return '⚠️ Photo floue';
  return '❌ Photo très floue';
}
```

### 3. Historique des photos
```typescript
// Afficher l'historique avec scores
function displayPhotoHistory(photos: CapturedPhoto[]): void {
  photos.forEach(photo => {
    const score = photo.meta.blurScore || 0;
    const status = photo.meta.isBlurry ? '⚠️' : '✅';
    console.log(`${status} ${score.toFixed(1)} - ${photo.takenAt}`);
  });
}
```

---

## 🔐 Validation et sécurité

### 1. Validation des paramètres
```typescript
// Valider les paramètres
function validateBlurConfig(config: BlurConfig): boolean {
  return (
    config.threshold >= 50 && config.threshold <= 500 &&
    config.analysisStep >= 1 && config.analysisStep <= 16 &&
    config.edgeMargin >= 0 && config.edgeMargin <= 200 &&
    config.minVariance >= 0 && config.minVariance <= 500
  );
}
```

### 2. Gestion des erreurs
```typescript
// Gérer les erreurs gracieusement
function detectBlurSafe(canvas: HTMLCanvasElement): BlurResult {
  try {
    return detectBlur(canvas);
  } catch (error) {
    console.error('Erreur détection flou:', error);
    // Retourner un résultat par défaut
    return { isBlurry: false, blurScore: 0, stats: { error: true } };
  }
}
```

---

## 📈 Monitoring et logging

### 1. Logging structuré
```typescript
// Logger avec contexte
function logBlurDetection(result: BlurResult, context: any): void {
  console.log({
    timestamp: new Date().toISOString(),
    blurScore: result.blurScore,
    isBlurry: result.isBlurry,
    confidence: result.stats?.confidence,
    context
  });
}
```

### 2. Métriques
```typescript
// Collecter les métriques
const metrics = {
  totalPhotos: 0,
  blurryPhotos: 0,
  averageScore: 0,
  maxScore: 0,
  minScore: Infinity
};

function updateMetrics(result: BlurResult): void {
  metrics.totalPhotos++;
  if (result.isBlurry) metrics.blurryPhotos++;
  metrics.averageScore = (metrics.averageScore * (metrics.totalPhotos - 1) + result.blurScore) / metrics.totalPhotos;
  metrics.maxScore = Math.max(metrics.maxScore, result.blurScore);
  metrics.minScore = Math.min(metrics.minScore, result.blurScore);
}
```

---

## 🚀 Prochaines étapes

- [ ] Implémenter la détection adaptative
- [ ] Ajouter l'analyse par zones
- [ ] Intégrer un Web Worker
- [ ] Ajouter le monitoring
- [ ] Collecter les métriques
- [ ] Optimiser les performances

Voir: [`BLUR_DETECTION.md`](./BLUR_DETECTION.md) pour plus de détails.

