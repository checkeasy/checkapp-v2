# 🔍 AUDIT - Popup des Ménages (CleaningInstructionsModal)

**Date:** 2025-10-06  
**Problème:** Aucune donnée réelle n'est affichée dans la popup des ménages sur la page Check-in Home

---

## 📋 RÉSUMÉ DU PROBLÈME

### Données Attendues mais Manquantes
1. **Consignes de ménage** (cleaningInfo / travelerNote)
2. **Tâches de ménage** (tasks avec isTodo=true)

### Composant Concerné
- **Fichier:** `FRONT/src/components/CleaningInstructionsModal.tsx`
- **Utilisé dans:** `CheckinHome.tsx` (ligne 226)
- **Props:** `flowType="checkin"`

---

## ✅ ÉTAPE 1 : AUDIT DU PAYLOAD INITIAL

### Résultat : ✅ DONNÉES PRÉSENTES DANS L'API

**Fichier analysé:** `FRONT/public/Data.json`

#### 1.1 Consignes de Ménage (travelerNote / cleanerNote)
```json
{
  "travelerNote": "",
  "cleanerNote": ""
}
```
**❌ PROBLÈME IDENTIFIÉ #1:** Dans le fichier Data.json, TOUS les champs `travelerNote` et `cleanerNote` sont **VIDES** pour toutes les pièces.

**Note:** Selon la documentation `TRAVELER_CLEANER_NOTES_FIX.md`, il y a une inversion :
- `travelerNote` devrait contenir les instructions de ménage
- `cleanerNote` est souvent vide
- Mais dans Data.json, les deux sont vides

#### 1.2 Tâches de Ménage (isTodo=true)
```json
{
  "etapeID": "1758627896352x414128111641044030",
  "pieceID": "1758627881896x569756605849995650",
  "image": "",
  "isTodo": true,
  "todoParam": "",
  "todoTitle": "🔹 Vérifications supplémentaires :",
  "todoOrder": "🧹 Faire la poussière sous le lit. 🗑️ Vérifier les chauffages. 🏡 Fermer les fenêtres et ajuster les rideaux/stores.",
  "todoImage": ""
}
```

**✅ RÉSULTAT:** Les tâches avec `isTodo=true` sont **PRÉSENTES** dans le payload initial.

**Exemples trouvés:**
- Chambre3: 2 tâches (Vérifications supplémentaires, Refaire le lit)
- Chambre2: 2 tâches (Vérifications supplémentaires, Refaire le lit)
- Cuisine: 7 tâches (Nettoyer le four, Machine à café, Lave-vaisselle, etc.)
- Salon: 2 tâches (Vérifications générales, Télécommande)
- Salle de Bain: 3 tâches (Toilettes, Siphon, Poubelle)

**Total:** ~16 tâches de ménage dans le payload

---

## 🔄 ÉTAPE 2 : AUDIT DU DATA ADAPTER

### Fichier : `FRONT/src/services/dataAdapter.ts`

#### 2.1 Extraction de cleaningInfo (lignes 105-108)
```typescript
// 🎯 FIX: INVERSION - Dans l'API, travelerNote contient les instructions de ménage
const cleaningInfo = realPiece.travelerNote || `Instructions de nettoyage pour ${this.cleanRoomName(realPiece.nom)}`;
const roomInfo = realPiece.infoEntrance || realPiece.cleanerNote || `Informations pour ${this.cleanRoomName(realPiece.nom)}`;
```

**✅ LOGIQUE CORRECTE** mais...
**❌ PROBLÈME #2:** Comme `travelerNote` est vide dans Data.json, le fallback est utilisé :
- `cleaningInfo = "Instructions de nettoyage pour Cuisine"`
- Ce sont des données génériques, pas les vraies consignes

#### 2.2 Génération des Tâches (lignes 232-274)
```typescript
static generateTasksFromRealData(
  realPiece: RealPiece, 
  flowType: FlowType
): Task[] {
  const tasks: Task[] = [];
  const todoEtapes = realPiece.etapes.filter(e => e.isTodo);
  const photoEtapes = realPiece.etapes.filter(e => !e.isTodo);

  // 1. D'ABORD : Créer une tâche spéciale pour les photos de référence
  if (photoEtapes.length > 0) {
    const referencePhotoTask = this.createReferencePhotoTask(...);
    tasks.push(referencePhotoTask);
  }

  // 2. ENSUITE : Ajouter les tâches de vérification SEULEMENT en mode checkout
  if (flowType === 'checkout') {
    todoEtapes.forEach((etape, index) => {
      const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
      if (task) {
        tasks.push(task);
      }
    });
  } else {
    console.log(`⏭️ Mode checkin: ignorer les ${todoEtapes.length} tâches détaillées (isTodo=true)`);
  }

  return tasks;
}
```

**❌ PROBLÈME MAJEUR #3:** Les tâches de ménage (isTodo=true) ne sont générées **QUE en mode checkout** !

**Impact:**
- En mode `checkin`, les tâches TODO sont **IGNORÉES** (ligne 269)
- Seules les photos de référence sont créées
- Les 16 tâches de ménage du payload ne sont jamais transformées en objets Task

---

## 🎯 ÉTAPE 3 : AUDIT DU FLUX VERS CleaningInstructionsModal

### Fichier : `FRONT/src/components/CleaningInstructionsModal.tsx`

#### 3.1 Récupération des Données (ligne 14)
```typescript
const { rooms } = useParcoursData();
```

**Source:** `GlobalParcoursContext` → `currentParcours.adaptedData.roomsData`

#### 3.2 Filtrage des Tâches de Ménage (lignes 31-53)
```typescript
const getCleaningTasks = (room: any) => {
  if (!room.tasks) return [];

  return room.tasks.filter((task: any) => {
    // Inclure uniquement les tâches de ménage (isTodo=true)
    if (task.isTodo) return true;

    // Exclure les tâches de photos de référence
    if (task.type === 'photo_multiple' || task.type === 'photo_optional') {
      return false;
    }

    // Exclure les tâches de comparaison
    const excludeKeywords = ['similaires', 'état d\'entrée', 'contrôle', 'référence'];
    const taskLabel = task.label?.toLowerCase() || '';

    if (excludeKeywords.some(keyword => taskLabel.includes(keyword))) {
      return false;
    }

    return false;
  });
};
```

**❌ PROBLÈME #4:** Le filtre cherche `task.isTodo === true`, mais...
- Les objets Task créés par le DataAdapter n'ont **PAS** de propriété `isTodo`
- Cette propriété existe dans les `RealEtape` mais n'est pas copiée dans les objets `Task`

#### 3.3 Affichage des Consignes (lignes 83, 100-110)
```typescript
const cleaningInfo = room.cleaningInfo || room.cleanerNote;

{cleaningInfo && (
  <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border-l-4 border-primary">
    <h4 className="font-medium mb-2 flex items-center gap-2 text-primary">
      <Info className="h-4 w-4" />
      Instructions spéciales
    </h4>
    <p className="text-foreground text-sm leading-relaxed">
      {cleaningInfo}
    </p>
  </div>
)}
```

**Résultat:** Affiche le fallback générique car `travelerNote` est vide

---

## 🐛 PROBLÈMES IDENTIFIÉS - RÉSUMÉ

### Problème #1 : Données Source Vides
- **Localisation:** Payload API (Data.json)
- **Impact:** `travelerNote` et `cleanerNote` sont vides pour toutes les pièces
- **Conséquence:** Seules les consignes génériques sont affichées

### Problème #2 : Tâches Non Générées en Mode Checkin
- **Localisation:** `dataAdapter.ts` ligne 260
- **Impact:** Les tâches TODO ne sont créées qu'en mode `checkout`
- **Conséquence:** Aucune tâche de ménage n'est disponible pour CheckinHome

### Problème #3 : Propriété isTodo Manquante
- **Localisation:** `dataAdapter.ts` ligne 290-308 (createTaskFromEtape)
- **Impact:** La propriété `isTodo` n'est pas copiée dans l'objet Task
- **Conséquence:** Le filtre dans CleaningInstructionsModal ne trouve aucune tâche

### Problème #4 : CheckinHome Utilise flowType="checkin"
- **Localisation:** `CheckinHome.tsx` ligne 226
- **Impact:** Le modal est ouvert avec `flowType="checkin"`
- **Conséquence:** Même si les tâches étaient générées, elles seraient filtrées

---

## 💡 SOLUTIONS PROPOSÉES

### Solution 1 : Générer les Tâches TODO en Mode Checkin
**Fichier:** `dataAdapter.ts` ligne 260-270

**Avant:**
```typescript
if (flowType === 'checkout') {
  todoEtapes.forEach((etape, index) => {
    const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
    if (task) {
      tasks.push(task);
    }
  });
}
```

**Après:**
```typescript
// Générer les tâches TODO pour TOUS les modes (checkin ET checkout)
todoEtapes.forEach((etape, index) => {
  const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
  if (task) {
    tasks.push(task);
  }
});
```

### Solution 2 : Ajouter la Propriété isTodo aux Objets Task
**Fichier:** `dataAdapter.ts` ligne 290-308

**Avant:**
```typescript
return {
  id: taskId,
  etapeID: etape.etapeID,
  piece_id: pieceId,
  ordre: index + 1,
  type: etape.todoImage ? 'photo_required' : 'checkbox',
  label: title.trim(),
  description: etape.todoOrder?.trim(),
  completed: false,
  // ...
};
```

**Après:**
```typescript
return {
  id: taskId,
  etapeID: etape.etapeID,
  piece_id: pieceId,
  ordre: index + 1,
  type: etape.todoImage ? 'photo_required' : 'checkbox',
  label: title.trim(),
  description: etape.todoOrder?.trim(),
  completed: false,
  isTodo: true,  // ✅ AJOUT: Marquer comme tâche de ménage
  // ...
};
```

### Solution 3 : Mettre à Jour le Type Task
**Fichier:** `types/room.ts` ligne 11-27

**Ajouter:**
```typescript
export interface Task {
  id: string;
  etapeID: string;
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | 'photo_optional' | 'photo_multiple' | 'reference_photos' | 'photo_validation';
  label: string;
  description?: string;
  hint?: string;
  total_photos_required?: number;
  photos_done?: number;
  completed?: boolean;
  isTodo?: boolean;  // ✅ AJOUT: Indique si c'est une tâche de ménage
  photo_reference?: PhotoReference;
  photo_references?: PhotoReference[];
  allowRetake?: boolean;
  validationState?: 'pending' | 'validated' | 'retaken';
}
```

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Implémenter Solution 1 : Générer les tâches TODO en mode checkin
2. ✅ Implémenter Solution 2 : Ajouter isTodo aux objets Task
3. ✅ Implémenter Solution 3 : Mettre à jour le type Task
4. 🧪 Tester l'affichage dans CleaningInstructionsModal
5. 📝 Documenter les changements

---

## ✅ CORRECTIONS APPLIQUÉES

### Correction 1 : Type Task - Ajout de la propriété isTodo
**Fichier:** `FRONT/src/types/room.ts` (ligne 22)

```typescript
export interface Task {
  id: string;
  etapeID: string;
  piece_id: string;
  ordre: number;
  type: 'checkbox' | 'photo_required' | 'photo_optional' | 'photo_multiple' | 'reference_photos' | 'photo_validation';
  label: string;
  description?: string;
  hint?: string;
  total_photos_required?: number;
  photos_done?: number;
  completed?: boolean;
  isTodo?: boolean;  // ✅ AJOUTÉ - Indique si c'est une tâche de ménage (isTodo=true dans l'API)
  photo_reference?: PhotoReference;
  photo_references?: PhotoReference[];
  allowRetake?: boolean;
  validationState?: 'pending' | 'validated' | 'retaken';
}
```

### Correction 2 : DataAdapter - Ajout de isTodo=true dans createTaskFromEtape
**Fichier:** `FRONT/src/services/dataAdapter.ts` (ligne 299)

```typescript
return {
  id: taskId,
  etapeID: etape.etapeID,
  piece_id: pieceId,
  ordre: index + 1,
  type: etape.todoImage ? 'photo_required' : 'checkbox',
  label: title.trim(),
  description: etape.todoOrder?.trim(),
  completed: false,
  isTodo: true,  // ✅ AJOUTÉ: Marquer comme tâche de ménage pour le filtre dans CleaningInstructionsModal
  // ...
};
```

### Correction 3 : DataAdapter - Génération des tâches TODO en mode checkin
**Fichier:** `FRONT/src/services/dataAdapter.ts` (lignes 259-267)

**Avant:**
```typescript
// 2. ENSUITE : Ajouter les tâches de vérification SEULEMENT en mode checkout
if (flowType === 'checkout') {
  todoEtapes.forEach((etape, index) => {
    const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
    if (task) {
      tasks.push(task);
      console.log(`✅ Tâche todo créée (checkout): ${task.label}`);
    }
  });
} else {
  console.log(`⏭️ Mode checkin: ignorer les ${todoEtapes.length} tâches détaillées (isTodo=true)`);
}
```

**Après:**
```typescript
// 2. ENSUITE : Ajouter les tâches de vérification pour TOUS les modes (checkin ET checkout)
// 🎯 FIX: Les tâches de ménage doivent être visibles dans CleaningInstructionsModal même en mode checkin
todoEtapes.forEach((etape, index) => {
  const task = this.createTaskFromEtape(etape, realPiece.pieceID, tasks.length + index);
  if (task) {
    tasks.push(task);
    console.log(`✅ Tâche todo créée (${flowType}): ${task.label}`);
  }
});
```

---

## 📊 RÉSULTAT ATTENDU

Après ces corrections, la popup `CleaningInstructionsModal` devrait afficher :

### Pour chaque pièce :

1. **Instructions spéciales** (si `travelerNote` ou `cleanerNote` non vide)
   - Actuellement vide dans Data.json, donc affichera le fallback générique
   - Exemple : "Instructions de nettoyage pour Cuisine"

2. **Tâches à effectuer** (toutes les tâches avec `isTodo=true`)
   - ✅ Cuisine : 7 tâches (Nettoyer le four, Machine à café, etc.)
   - ✅ Chambre3 : 2 tâches (Vérifications supplémentaires, Refaire le lit)
   - ✅ Chambre2 : 2 tâches (Vérifications supplémentaires, Refaire le lit)
   - ✅ Salon : 2 tâches (Vérifications générales, Télécommande)
   - ✅ Salle de Bain : 3 tâches (Toilettes, Siphon, Poubelle)
   - **Total : ~16 tâches de ménage affichées**

### Exemple d'affichage pour la Cuisine :

```
┌─────────────────────────────────────┐
│ 🍽️ Cuisine                          │
│ (7 tâches)                          │
└─────────────────────────────────────┘

  📋 Instructions spéciales
  Instructions de nettoyage pour Cuisine

  ✓ Tâches à effectuer :

  ☑ 🔥 Nettoyer le four
     Nettoyez l'intérieur et l'extérieur du four

  ☑ ☕ Nettoyer la machine à café et laisser 3 capsules
     Rincer la machine et vérifier qu'il y a 3 capsules disponibles.

  ☑ 🧼 Vider le lave-vaisselle
     Vérifier qu'il reste au moins 1 pastille de lavage pour le prochain voyageur.

  ... (4 autres tâches)
```

---

## ⚠️ LIMITATION RESTANTE

**Problème #1 non résolu :** Les champs `travelerNote` et `cleanerNote` sont vides dans le payload Data.json.

**Impact :** Les "Instructions spéciales" afficheront le texte générique au lieu des vraies consignes de ménage.

**Solution future :**
- Vérifier avec l'équipe backend pourquoi ces champs sont vides
- S'assurer que les consignes de ménage sont bien renseignées dans Bubble
- Ou utiliser un autre champ pour stocker ces informations

