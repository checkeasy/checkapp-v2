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

### 2️⃣ **useOrientation Hook**

**Localisation:** `FRONT/src/hooks/useOrientation.ts`

**Rôle:** Hook personnalisé pour détecter et gérer l'orientation de l'appareil.

**Fonctionnalités:**
- Détection de l'orientation actuelle (portrait/landscape)
- Écoute des changements d'orientation (3 méthodes pour compatibilité)
- Verrouillage/déverrouillage de l'orientation
- Support multi-navigateurs (Screen Orientation API, orientationchange, resize)

**API:**
```typescript
const {
  currentOrientation,    // 'portrait' | 'landscape'
  isPortrait,           // boolean
  isLandscape,          // boolean
  lockOrientation,      // (orientation) => Promise<void>
  unlockOrientation     // () => Promise<void>
} = useOrientation();
```

**Méthodes de détection:**
1. **Screen Orientation API** (moderne) : `window.screen.orientation.type`
2. **window.orientation** (legacy, iOS) : angles 90/-90 = landscape
3. **Dimensions fenêtre** (fallback) : `innerWidth > innerHeight`

---

### 3️⃣ **useImageOrientation Hook**

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
// Détection de l'orientation de l'appareil
const { currentOrientation, lockOrientation, unlockOrientation } = useOrientation();

// Détection de l'orientation de la photo de référence actuelle
const currentReferencePhoto = referencePhotos[currentRefIndex];
const referenceOrientation = useImageOrientation(currentReferencePhoto?.url);

// Vérifier si l'orientation est correcte
const isOrientationCorrect = !referenceOrientation || referenceOrientation === currentOrientation;
```

### Logique d'Adaptation

**1. Déverrouillage à la fermeture du modal:**
```typescript
useEffect(() => {
  if (isOpen) {
    // ... initialisation
  } else {
    unlockOrientation(); // Déverrouiller quand le modal se ferme
  }
}, [isOpen, unlockOrientation]);
```

**2. Verrouillage selon la photo de référence:**
```typescript
useEffect(() => {
  if (!isOpen || !referenceOrientation) return;

  const adaptOrientation = async () => {
    if (referenceOrientation !== currentOrientation) {
      await lockOrientation(referenceOrientation);
    }
  };

  adaptOrientation();
}, [isOpen, referenceOrientation, currentOrientation, lockOrientation]);
```

**3. Affichage du prompt d'orientation:**
```tsx
{referenceOrientation && !isOrientationCorrect && (
  <OrientationPrompt
    requiredOrientation={referenceOrientation}
    currentOrientation={currentOrientation}
  />
)}
```

**4. Adaptation de l'interface vidéo:**
```tsx
<div className={`relative w-full h-full transition-all duration-500 ${
  currentOrientation === 'landscape' ? 'landscape-mode' : 'portrait-mode'
}`}>
  <video
    className={`absolute inset-0 w-full h-full transition-all duration-500 ${
      currentOrientation === 'landscape' ? 'object-contain' : 'object-cover'
    }`}
  />
  <img
    ref={ghostRef}
    className={`absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ${
      currentOrientation === 'landscape' ? 'object-contain' : 'object-cover'
    }`}
  />
</div>
```

**5. Désactivation du bouton de capture:**
```tsx
<Button
  onClick={handleCapture}
  disabled={isCapturing || !stream || !isOrientationCorrect}
  className={`h-20 w-20 rounded-full border-4 transition-all duration-200 ${
    !isOrientationCorrect
      ? 'bg-gray-400 border-gray-300 cursor-not-allowed opacity-50'
      : currentCapturedPhoto
      ? 'bg-green-500 border-green-300 hover:bg-green-600'
      : 'bg-white border-white/50 hover:bg-gray-100'
  }`}
  title={!isOrientationCorrect ? 'Tournez votre téléphone pour capturer' : ''}
>
```

---

## 🎨 Comportement Utilisateur

### Scénario 1 : Photo Portrait
1. L'utilisateur ouvre le modal de capture
2. La photo de référence est en portrait
3. L'appareil est déjà en portrait → ✅ Capture possible immédiatement
4. L'interface utilise `object-cover` pour remplir l'écran

### Scénario 2 : Photo Paysage (Appareil Portrait)
1. L'utilisateur ouvre le modal de capture
2. La photo de référence est en paysage
3. L'appareil est en portrait → ❌ Capture bloquée
4. **OrientationPrompt s'affiche** avec animation de rotation
5. Message : "Tournez votre téléphone"
6. L'utilisateur tourne son téléphone en paysage
7. Le prompt disparaît automatiquement
8. L'interface s'adapte avec `object-contain`
9. ✅ Capture possible

### Scénario 3 : Changement de Photo
1. L'utilisateur a capturé une photo en paysage
2. Il passe à la photo suivante (portrait)
3. **OrientationPrompt s'affiche** avec animation inverse
4. Message : "Remettez votre téléphone en position verticale"
5. L'utilisateur tourne son téléphone en portrait
6. L'interface s'adapte automatiquement

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

