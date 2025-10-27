# 📱 Rotation d'Interface pour Photos Paysage

**Date:** 2025-10-06
**Status:** ✅ IMPLÉMENTÉ

---

## 📋 Résumé de la Fonctionnalité

Système de rotation automatique de l'interface de capture photo pour les photos de référence en mode paysage. L'interface reste en mode portrait mais **tourne de 90°** pour forcer l'utilisateur à tourner physiquement son téléphone et aligner correctement la photo.

---

## 🎯 Objectifs

1. **Détecter automatiquement** l'orientation de chaque photo de référence (portrait vs paysage)
2. **Afficher la photo tournée de 90°** si elle est en paysage (sans basculer le responsive)
3. **Guider l'utilisateur** avec un message pour tourner son téléphone
4. **Repositionner les contrôles** (bouton de capture à droite, slider à gauche) pour les photos paysage
5. **Garder l'interface en mode portrait** tout le temps (pas de basculement responsive)

---

## 🆕 Nouveaux Composants et Hooks

### 1️⃣ **OrientationPrompt.tsx**

**Localisation:** `FRONT/src/components/OrientationPrompt.tsx`

**Rôle:** Composant de notification qui s'affiche en haut de l'écran pour les photos paysage.

**Fonctionnalités:**
- Bannière compacte en haut de l'écran (non bloquante)
- Animation de rotation du téléphone (icône Smartphone tournée de 90°)
- Flèche de rotation animée
- Message explicatif : "Tournez votre téléphone"
- Animations CSS fluides (pulse, spin)

**Props:**
```typescript
interface OrientationPromptProps {
  isLandscapePhoto: boolean;
}
```

**Affichage:**
- Bannière semi-transparente en haut de l'écran
- S'affiche uniquement pour les photos paysage
- Ne bloque pas l'interface (pointer-events-none)

---

### 2️⃣ **useImageOrientation Hook**

**Localisation:** `FRONT/src/hooks/useOrientation.ts`

**Rôle:** Hook pour détecter l'orientation d'une image à partir de son URL.

**Fonctionnalités:**
- Charge l'image en arrière-plan
- Compare `naturalWidth` et `naturalHeight`
- Retourne `'landscape'` si largeur > hauteur, sinon `'portrait'`
- Gestion des erreurs de chargement

**API:**
```typescript
const orientation = useImageOrientation(imageUrl);
// Retourne: 'portrait' | 'landscape' | null
```

---

## 🔧 Modifications du PhotoCaptureModal

**Fichier:** `FRONT/src/components/PhotoCaptureModal.tsx`

### Imports Ajoutés
```typescript
import { useOrientation, useImageOrientation, OrientationType } from '@/hooks/useOrientation';
import { OrientationPrompt } from '@/components/OrientationPrompt';
```

### États Ajoutés
```typescript
// Détection de l'orientation de la photo de référence actuelle
const currentReferencePhoto = referencePhotos[currentRefIndex];
const referenceOrientation = useImageOrientation(currentReferencePhoto?.url);

// Vérifier si la photo est en paysage
const isLandscapePhoto = referenceOrientation === 'landscape';
```

### Logique d'Adaptation

**1. Affichage du prompt pour photos paysage:**
```tsx
<OrientationPrompt isLandscapePhoto={isLandscapePhoto} />
```

**2. Rotation de l'interface pour photos paysage:**
```tsx
<div className="relative w-full h-full overflow-hidden">
  {/* Conteneur avec rotation pour photos paysage */}
  <div
    className="absolute inset-0 transition-transform duration-500"
    style={{
      transform: isLandscapePhoto ? 'rotate(90deg)' : 'rotate(0deg)',
      transformOrigin: 'center center'
    }}
  >
    <video
      ref={videoRef}
      style={{
        // Ajuster les dimensions pour compenser la rotation
        width: isLandscapePhoto ? '100vh' : '100%',
        height: isLandscapePhoto ? '100vw' : '100%',
        left: isLandscapePhoto ? '50%' : '0',
        top: isLandscapePhoto ? '50%' : '0',
        transform: isLandscapePhoto ? 'translate(-50%, -50%)' : 'none'
      }}
    />
    <img
      ref={ghostRef}
      style={{
        // Même ajustement pour l'image fantôme
        width: isLandscapePhoto ? '100vh' : '100%',
        height: isLandscapePhoto ? '100vw' : '100%',
        left: isLandscapePhoto ? '50%' : '0',
        top: isLandscapePhoto ? '50%' : '0',
        transform: isLandscapePhoto ? 'translate(-50%, -50%)' : 'none'
      }}
    />
  </div>
</div>
```

**3. Repositionnement du bouton de capture:**
```tsx
<div
  className={`absolute z-10 transition-all duration-500 ${
    isLandscapePhoto
      ? 'right-8 top-1/2 -translate-y-1/2'  // À droite pour paysage
      : 'bottom-20 left-1/2 -translate-x-1/2'  // En bas pour portrait
  }`}
>
  <Button onClick={handleCapture}>
    <Camera />
  </Button>
</div>
```

**4. Repositionnement du slider d'opacité:**
```tsx
<div
  className={`absolute z-10 transition-all duration-500 ${
    isLandscapePhoto
      ? 'left-4 top-1/2 -translate-y-1/2'  // À gauche pour paysage
      : 'right-4 top-1/2 -translate-y-1/2'  // À droite pour portrait
  }`}
>
  {/* Slider d'opacité */}
</div>
```

---

## 🎨 Comportement Utilisateur

### Scénario 1 : Photo Portrait
```
1. Ouvrir le modal → Photo portrait détectée
2. Interface normale (pas de rotation)
3. Bouton de capture en bas
4. Slider d'opacité à droite
5. ✅ Capture possible normalement
```

### Scénario 2 : Photo Paysage
```
1. Ouvrir le modal → Photo paysage détectée
2. 🔄 Interface tourne de 90° (vidéo + image fantôme)
3. 📱 Bannière s'affiche : "Tournez votre téléphone"
4. Bouton de capture repositionné à droite
5. Slider d'opacité repositionné à gauche
6. L'utilisateur tourne physiquement son téléphone de 90°
7. La photo s'aligne correctement avec la caméra
8. ✅ Capture possible
```

### Scénario 3 : Changement de Photo (Paysage → Portrait)
```
1. Photo paysage capturée (interface tournée)
2. Passer à photo suivante (portrait)
3. 🔄 Interface revient en position normale (transition fluide 500ms)
4. Bannière disparaît
5. Bouton de capture revient en bas
6. Slider d'opacité revient à droite
7. L'utilisateur remet son téléphone en position normale
8. ✅ Capture possible
```

---

## 🔍 Détails Techniques

### Détection d'Orientation de l'Image
```typescript
const img = new Image();
img.onload = () => {
  const orientation = img.naturalWidth > img.naturalHeight 
    ? 'landscape' 
    : 'portrait';
};
img.src = imageUrl;
```

### Détection d'Orientation de l'Appareil
```typescript
// Méthode 1: Screen Orientation API
if (window.screen?.orientation) {
  const type = window.screen.orientation.type;
  return type.includes('landscape') ? 'landscape' : 'portrait';
}

// Méthode 2: window.orientation (legacy)
if (typeof window.orientation !== 'undefined') {
  const angle = window.orientation;
  return (angle === 90 || angle === -90) ? 'landscape' : 'portrait';
}

// Méthode 3: Dimensions (fallback)
return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
```

### Verrouillage d'Orientation
```typescript
await window.screen.orientation.lock('landscape');
// ou
await window.screen.orientation.lock('portrait');
```

**Note:** Le verrouillage peut échouer si :
- L'app n'est pas en plein écran
- Le navigateur ne supporte pas l'API
- Les permissions sont refusées

---

## 📊 Compatibilité Navigateurs

| Fonctionnalité | Chrome | Firefox | Safari | Edge |
|----------------|--------|---------|--------|------|
| Screen Orientation API | ✅ 38+ | ✅ 43+ | ❌ | ✅ 79+ |
| window.orientation | ✅ | ✅ | ✅ | ✅ |
| Fallback (resize) | ✅ | ✅ | ✅ | ✅ |

**Stratégie:** Utilisation de 3 méthodes en cascade pour garantir la compatibilité maximale.

---

## 🧪 Tests Recommandés

### Test 1 : Photo Portrait
1. Ouvrir le modal avec une photo portrait
2. Vérifier que la capture est possible immédiatement
3. Vérifier que l'interface utilise `object-cover`

### Test 2 : Photo Paysage
1. Ouvrir le modal avec une photo paysage (appareil en portrait)
2. Vérifier que l'OrientationPrompt s'affiche
3. Tourner le téléphone en paysage
4. Vérifier que le prompt disparaît
5. Vérifier que la capture est possible
6. Vérifier que l'interface utilise `object-contain`

### Test 3 : Changement d'Orientation
1. Capturer une photo en paysage
2. Passer à une photo portrait
3. Vérifier que le prompt demande de remettre en portrait
4. Tourner le téléphone
5. Vérifier l'adaptation automatique

### Test 4 : Fermeture du Modal
1. Ouvrir le modal avec une photo paysage
2. Tourner le téléphone
3. Fermer le modal
4. Vérifier que l'orientation est déverrouillée

---

## 📝 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- ✅ `FRONT/src/components/OrientationPrompt.tsx`
- ✅ `FRONT/src/hooks/useOrientation.ts`
- 📄 `FRONT/docs/ORIENTATION_DETECTION_FEATURE.md` (ce document)

### Fichiers Modifiés
- ✅ `FRONT/src/components/PhotoCaptureModal.tsx`

---

## 🎯 Améliorations Futures (Optionnel)

1. **Vibration haptique** : Vibrer quand l'orientation est correcte
2. **Son de confirmation** : Jouer un son quand l'orientation change
3. **Prévisualisation** : Montrer un aperçu de la photo dans la bonne orientation
4. **Statistiques** : Tracker combien de fois les utilisateurs doivent tourner leur téléphone
5. **Mode auto-rotate** : Détecter si l'auto-rotation est désactivée et afficher un message

---

**Créé le:** 2025-10-06  
**Auteur:** Implémentation avec Augment AI  
**Version:** 1.0

