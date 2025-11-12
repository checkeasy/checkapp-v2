# 📖 Guide d'utilisation - Système de Détection de Flou

## 🎯 Utilisation basique

### 1. Aucune action requise!
Le système fonctionne **automatiquement** avec les valeurs par défaut.

### 2. Les photos sont capturées avec détection de flou
```typescript
// Dans PhotoCaptureModal.tsx
const capturedPhoto = await capturePhoto(videoRef.current, currentRef.tache_id);

// Les métadonnées de flou sont automatiquement incluses
console.log(capturedPhoto.meta.isBlurry);      // true/false
console.log(capturedPhoto.meta.blurScore);     // 285.42
console.log(capturedPhoto.meta.blurStats);     // Statistiques détaillées
```

### 3. Les avertissements s'affichent automatiquement
```
Si photo floue: ⚠️ Photo potentiellement floue (score: 145.3)
Si photo nette: Aucun avertissement
```

## 🔧 Configuration

### Configuration par défaut (Recommandée)
Aucune action requise! Les valeurs par défaut sont optimisées.

### Ajuster la sensibilité

**Trop de faux positifs?** (photos marquées floues à tort)
```env
# Dans .env ou .env.local
VITE_BLUR_THRESHOLD=350
```

**Pas assez de détection?** (photos floues non détectées)
```env
# Dans .env ou .env.local
VITE_BLUR_THRESHOLD=150
```

**Trop lent?**
```env
# Dans .env ou .env.local
VITE_BLUR_ANALYSIS_STEP=8
```

## 📊 Comprendre les scores

### blurScore
- **Qu'est-ce que c'est**: Score Laplacien (mesure de netteté)
- **Plus haut = Plus net**
- **< 250**: Probablement flou
- **> 250**: Probablement net

### maxLaplacian
- **Qu'est-ce que c'est**: Variation maximale dans l'image
- **Plus haut = Plus de variations (net)**
- **< 100**: Très peu de variations (flou)
- **> 100**: Beaucoup de variations (net)

### confidence
- **Qu'est-ce que c'est**: Confiance en pourcentage
- **0-50%**: Peu confiant
- **50-100%**: Confiant
- **> 100%**: Très confiant

## 🧪 Tester le système

### Lancer les tests automatisés
```javascript
// Dans la console du navigateur (F12)
import { runBlurDetectionTests } from '@/utils/blurDetectionTest';
await runBlurDetectionTests();
```

### Résultat attendu
```
✅ Image nette: isBlurry = false
✅ Image floue: isBlurry = true
✅ Dégradé: isBlurry = true
```

### Tester manuellement
1. Prendre une photo nette → Aucun avertissement ✅
2. Prendre une photo floue → Avertissement affiché ⚠️
3. Vérifier les logs → Scores cohérents 📊

## 📈 Monitorer en production

### Logs à vérifier
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

### Métriques à suivre
- Nombre de photos marquées comme floues
- Nombre de photos acceptées
- Taux de satisfaction utilisateur
- Scores moyens par condition

## 🔄 Workflow typique

```
1. Utilisateur ouvre l'app
   ↓
2. Accède au module de capture photo
   ↓
3. Prend une photo
   ↓
4. Détection de flou automatique
   ├─ Si net: Aucun avertissement ✅
   └─ Si flou: Avertissement affiché ⚠️
   ↓
5. Utilisateur accepte ou reprend
   ↓
6. Photo uploadée avec métadonnées
```

## 🎨 Intégration UI

### Afficher les statistiques
```typescript
// Afficher le score
<div>Score: {photo.meta.blurScore?.toFixed(1)}</div>

// Afficher la confiance
<div>Confiance: {photo.meta.blurStats?.confidence.toFixed(1)}%</div>

// Afficher le statut
<div>
  {photo.meta.isBlurry ? '⚠️ Flou' : '✅ Net'}
</div>
```

### Créer un indicateur visuel
```typescript
function BlurIndicator({ photo }: { photo: CapturedPhoto }) {
  const score = photo.meta.blurScore || 0;
  const color = score > 250 ? 'green' : score > 150 ? 'yellow' : 'red';
  
  return (
    <div style={{ color }}>
      {score.toFixed(1)}
    </div>
  );
}
```

## 🔐 Validation

### Rejeter les photos trop floues
```typescript
const acceptablePhotos = capturedPhotos.filter(photo => {
  const score = photo.meta.blurScore || 0;
  return score > 200;  // Seuil personnalisé
});

if (acceptablePhotos.length === 0) {
  alert('Aucune photo acceptable. Veuillez reprendre.');
}
```

### Envoyer les statistiques au serveur
```typescript
const uploadData = {
  photo: capturedPhoto.blob,
  metadata: {
    isBlurry: capturedPhoto.meta.isBlurry,
    blurScore: capturedPhoto.meta.blurScore,
    blurStats: capturedPhoto.meta.blurStats
  }
};

await uploadPhoto(uploadData);
```

## 🆘 Dépannage

### Les logs ne s'affichent pas
1. Vérifier que `VITE_DEBUG_MODE=true`
2. Vérifier que `VITE_BLUR_DETECTION_ENABLED=true`
3. Recharger la page (Ctrl+Shift+R)

### Les scores sont très bas
1. Vérifier la luminosité
2. Vérifier que l'appareil photo fonctionne
3. Essayer avec une image plus contrastée

### Trop de faux positifs
1. Augmenter `VITE_BLUR_THRESHOLD`
2. Réduire `VITE_BLUR_MIN_VARIANCE`
3. Augmenter `VITE_BLUR_EDGE_MARGIN`

### Pas assez de détection
1. Réduire `VITE_BLUR_THRESHOLD`
2. Augmenter `VITE_BLUR_MIN_VARIANCE`
3. Réduire `VITE_BLUR_EDGE_MARGIN`

## 📚 Documentation complète

- `START_HERE.md` - Point d'entrée
- `BLUR_DETECTION_QUICK_START.md` - Guide rapide
- `BLUR_DETECTION_EXAMPLES.md` - Exemples
- `BLUR_DETECTION_TESTING.md` - Tests
- `BLUR_DETECTION_ADVANCED.md` - Avancé

## ✅ Checklist d'utilisation

- [ ] Lire ce guide
- [ ] Tester: `await runBlurDetectionTests()`
- [ ] Capturer quelques photos
- [ ] Vérifier les avertissements
- [ ] Vérifier les logs
- [ ] Ajuster si nécessaire
- [ ] Déployer!

## 🎉 Résultat

✅ Système de détection de flou robuste
✅ Faux positifs minimisés
✅ Détection réelle améliorée
✅ Facile à utiliser
✅ Prêt pour la production

Bonne utilisation! 🚀

