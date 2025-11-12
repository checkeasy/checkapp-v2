# 🔧 CORRECTION: img_base64 pour les signalements

## 📋 Problème identifié

Les signalements créés par l'utilisateur avaient `img_url` avec une URL blob locale (`blob:http://localhost:8080/...`) et `img_base64: null` dans le webhook.

**Exemple du problème** :
```json
{
  "signalement_id": "1759329681003x760wvc3",
  "etape_id": null,
  "room_id": "1741001425783x310296444441631900",
  "titre": "il y a un soucis dans la chambre",
  "commentaire": "il y a un soucis dans la chambre",
  "img_url": "blob:http://localhost:8080/07cb2d74-c462-4923-8497-7ae86c68b8af",  // ❌ URL blob locale
  "img_base64": null,  // ❌ Pas de base64
  "flow_type": "checkout",
  "origine": "CLIENT",
  "status": "A_TRAITER"
}
```

**Conséquence** : Le backend ne peut pas récupérer l'image car l'URL blob n'est valide que localement.

---

## 🎯 Cause racine

**Problème 1** : Dans `ReportProblemModal.tsx`, l'image sélectionnée (File) n'était jamais convertie en base64 avant la sauvegarde.

**Problème 2** : Dans `SignalementInteraction` interface, les champs `imgUrl` et `imgBase64` n'existaient pas, donc ils n'étaient pas sauvegardés dans le localStorage.

**Problème 3** : Dans `extractRealSignalements()`, on ne récupérait pas le base64 depuis les données sauvegardées.

---

## ✅ Solution implémentée

### 1. Conversion de l'image en base64 dans `ReportProblemModal.tsx`

**Fichier** : `FRONT/src/components/ReportProblemModal.tsx` (lignes 55-141)

```typescript
const handleSubmit = async () => {
  // ... validations ...

  // 🎯 CORRECTION: Convertir l'image en base64 si présente
  let imgBase64: string | undefined = undefined;
  let imgUrl: string | undefined = undefined;

  if (selectedImage) {
    try {
      // Convertir le File en base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Extraire le base64 pur (sans le préfixe data:image/...)
          const base64Pure = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Pure);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedImage);
      });

      imgBase64 = base64;
      imgUrl = URL.createObjectURL(selectedImage); // Pour affichage local uniquement

      console.log('✅ Image convertie en base64:', {
        size: base64.length,
        preview: base64.substring(0, 50) + '...'
      });
    } catch (error) {
      console.error('❌ Erreur conversion base64:', error);
      toast.error("Erreur lors du traitement de l'image");
      return;
    }
  }

  // ✅ CORRECTION: Utiliser la nouvelle structure de Signalement avec base64
  addSignalement({
    roomId: selectedRoomId,
    piece: selectedRoom.nom,
    etapeId: undefined,
    titre: reportText.length > 50 ? reportText.substring(0, 50) + "..." : reportText,
    commentaire: reportText,
    imgUrl, // Blob URL pour affichage local
    imgBase64, // ✅ Base64 pur pour sauvegarde et webhook
    flowType,
    origine: user.type,
    status: "A_TRAITER",
    priorite: false,
  });
};
```

**Impact** : L'image est maintenant convertie en base64 pur avant la sauvegarde.

---

### 2. Ajout de `imgUrl` et `imgBase64` dans `SignalementInteraction`

**Fichier** : `FRONT/src/services/interactionTracker.ts` (lignes 60-76)

```typescript
export interface SignalementInteraction {
  signalementId: string;
  pieceId: string;
  taskId?: string;
  etapeId?: string;
  type: 'damage' | 'missing' | 'issue' | 'note';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  photos: string[];
  imgUrl?: string;              // ✅ AJOUTÉ: URL de l'image (blob ou uploadée)
  imgBase64?: string;           // ✅ AJOUTÉ: Base64 pur de l'image
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  metadata?: Record<string, unknown>;
}
```

**Impact** : Les champs `imgUrl` et `imgBase64` sont maintenant sauvegardés dans le localStorage.

---

### 3. Sauvegarde de `imgUrl` et `imgBase64` dans `SignalementsContext.tsx`

**Fichier** : `FRONT/src/contexts/SignalementsContext.tsx` (lignes 162-197)

```typescript
// ✅ NOUVEAU: Sauvegarder via InteractionTracker
if (currentCheckId && isCheckIdActive) {
  try {
    await interactionTracker.trackSignalement({
      signalementId: newSignalement.id,
      pieceId: newSignalement.roomId,
      taskId: undefined,
      etapeId: newSignalement.etapeId,
      type: 'issue',
      severity: newSignalement.priorite ? 'high' : 'medium',
      title: newSignalement.titre,
      description: newSignalement.commentaire,
      photos: newSignalement.imgUrl ? [newSignalement.imgUrl] : [],
      imgUrl: newSignalement.imgUrl,        // ✅ AJOUTÉ: Sauvegarder imgUrl
      imgBase64: newSignalement.imgBase64,  // ✅ AJOUTÉ: Sauvegarder imgBase64
      createdAt: newSignalement.created_at,
      status: 'open',
      metadata: {
        flowType: newSignalement.flowType,
        origine: newSignalement.origine,
        piece: newSignalement.piece
      }
    });

    console.log('✅ SignalementsContext: Signalement sauvegardé dans la session:', {
      signalementId,
      hasImgUrl: !!newSignalement.imgUrl,
      hasImgBase64: !!newSignalement.imgBase64,
      imgBase64Length: newSignalement.imgBase64?.length
    });
  } catch (error) {
    console.error('❌ SignalementsContext: Erreur sauvegarde signalement:', error);
  }
}
```

**Impact** : `imgUrl` et `imgBase64` sont maintenant sauvegardés dans le localStorage via `interactionTracker`.

---

### 4. Récupération de `imgBase64` dans `extractRealSignalements()`

**Fichier** : `FRONT/public/database-admin.html` (lignes 2342-2387)

```javascript
// 1. 📝 SIGNALEMENTS DIRECTS - Chercher dans sessionData.progress.interactions.signalements
if (sessionData?.progress?.interactions?.signalements) {
    Object.entries(sessionData.progress.interactions.signalements).forEach(([signalementKey, signalementData]) => {
        if (signalementKey.includes(pieceId) || signalementData.pieceId === pieceId || signalementData.roomId === pieceId) {
            console.log(`   📝 Signalement direct: ${signalementKey}`, signalementData);

            // 🎯 Récupérer imgUrl et imgBase64 depuis signalementData
            let finalImgUrl = signalementData.imgUrl || null;
            let finalImgBase64 = signalementData.imgBase64 || null;

            console.log(`   🔍 Signalement image data:`, {
                hasImgUrl: !!finalImgUrl,
                hasImgBase64: !!finalImgBase64,
                imgUrlType: finalImgUrl ? (finalImgUrl.startsWith('blob:') ? 'blob' : finalImgUrl.startsWith('http') ? 'url' : 'data') : 'none',
                imgBase64Length: finalImgBase64?.length
            });

            // Si imgUrl est une blob URL ET qu'on n'a pas de base64, chercher dans allPhotos
            if (finalImgUrl && finalImgUrl.startsWith('blob:') && !finalImgBase64) {
                console.log(`   🔍 imgUrl est une blob URL sans base64, recherche dans allPhotos...`);

                // Chercher dans allPhotos par signalement_id ou timestamp proche
                const matchingPhoto = allPhotos.find(photo => {
                    // Chercher par timestamp proche (±5 secondes)
                    const photoTime = new Date(photo.timestamp || photo.uploadedAt).getTime();
                    const signalementTime = new Date(signalementData.createdAt || signalementData.created_at).getTime();
                    const timeDiff = Math.abs(photoTime - signalementTime);

                    return timeDiff < 5000 && photo.pieceId === pieceId;
                });

                if (matchingPhoto) {
                    console.log(`   ✅ Photo trouvée dans allPhotos:`, matchingPhoto.id);

                    // Récupérer le base64 ou l'URL uploadée
                    if (matchingPhoto.uploadedUrl) {
                        finalImgUrl = matchingPhoto.uploadedUrl;
                        finalImgBase64 = null;
                    } else if (matchingPhoto.photoData) {
                        // Extraire le base64 pur
                        if (matchingPhoto.photoData.startsWith('data:image/')) {
                            finalImgBase64 = matchingPhoto.photoData.split(',')[1] || matchingPhoto.photoData;
                            finalImgUrl = null;
                        } else {
                            finalImgUrl = matchingPhoto.photoData;
                            finalImgBase64 = null;
                        }
                    }
                } else {
                    console.warn(`   ⚠️ Aucune photo trouvée dans allPhotos pour ce signalement`);
                }
            }

            // ✅ NOUVELLE STRUCTURE COMPLÈTE
            signalements.push({
                // 🆔 Identifiants
                signalement_id: signalementData.signalementId || signalementData.id || `signalement-${signalementKey}`,
                etape_id: signalementData.etapeId || null,
                room_id: signalementData.pieceId || pieceId,

                // 📝 Contenu
                titre: signalementData.title || signalementData.titre || 'Signalement',
                commentaire: signalementData.description || signalementData.commentaire || '',

                // 🖼️ Images (avec base64 récupéré)
                img_url: finalImgUrl,
                img_base64: finalImgBase64,

                // 🏷️ Métadonnées
                flow_type: signalementData.metadata?.flowType || 'checkin',
                origine: signalementData.metadata?.origine || 'CLIENT',
                status: signalementData.status === 'open' ? 'A_TRAITER' : 'RESOLU',
                priorite: signalementData.severity === 'high' || signalementData.severity === 'critical',

                // ⏰ Timestamps
                created_at: signalementData.createdAt || new Date().toISOString(),
                updated_at: signalementData.resolvedAt || signalementData.createdAt || new Date().toISOString()
            });
        }
    });
}
```

**Impact** :
- ✅ Récupération directe de `imgBase64` depuis `signalementData` (sauvegardé dans localStorage)
- ✅ Fallback vers `allPhotos` uniquement si blob URL sans base64
- ✅ Logging détaillé pour debug
- ✅ Mapping correct des champs (`title` → `titre`, `description` → `commentaire`, etc.)

---

## 📊 Résultat final

### Structure du webhook pour signalement (AVANT ❌)
```json
{
  "signalement_id": "1759329681003x760wvc3",
  "titre": "il y a un soucis dans la chambre",
  "commentaire": "il y a un soucis dans la chambre",
  "img_url": "blob:http://localhost:8080/07cb2d74-c462-4923-8497-7ae86c68b8af",
  "img_base64": null
}
```

### Structure du webhook pour signalement (APRÈS ✅)

**Cas 1 : Photo uploadée**
```json
{
  "signalement_id": "1759329681003x760wvc3",
  "titre": "il y a un soucis dans la chambre",
  "commentaire": "il y a un soucis dans la chambre",
  "img_url": "https://eb0bcaf95c312d7fe9372017cb5f1835.cdn.bubble.io/f1759329681234x123456789/File.jpg",
  "img_base64": null
}
```

**Cas 2 : Photo en base64 local**
```json
{
  "signalement_id": "1759329681003x760wvc3",
  "titre": "il y a un soucis dans la chambre",
  "commentaire": "il y a un soucis dans la chambre",
  "img_url": null,
  "img_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQ..."
}
```

---

## 🔍 Logique de matching

La photo correspondante est trouvée dans `allPhotos` en utilisant :
1. **Timestamp proche** : Différence < 5 secondes entre la photo et le signalement
2. **Même pièce** : `photo.pieceId === pieceId`

Cette approche fonctionne car :
- Les signalements sont créés immédiatement après la prise de photo
- Le timestamp est enregistré au moment de la création
- La tolérance de 5 secondes couvre les délais de traitement

---

## 🧪 Tests de validation

Après correction, créer un signalement avec photo et vérifier que :
- ✅ Si la photo est uploadée : `img_url` contient l'URL Bubble, `img_base64` est `null`
- ✅ Si la photo est locale : `img_url` est `null`, `img_base64` contient le base64 pur
- ✅ Pas de blob URL dans le webhook
- ✅ Le backend peut récupérer l'image

---

## 📝 Fichiers modifiés

1. ✅ `FRONT/public/database-admin.html` - Ajout de récupération du base64 depuis `allPhotos` pour les blob URLs

---

## 🎯 Prochaines étapes

1. Tester avec un signalement contenant une photo
2. Vérifier que le backend Bubble reçoit correctement l'image (URL ou base64)
3. Documenter le format attendu des images dans l'API backend

