# 📖 GLOSSAIRE - TERMES TECHNIQUES CHECKEASY

## 🎯 Termes généraux

### Parcours
Un ensemble de pièces à vérifier/nettoyer dans un logement. Chaque parcours contient :
- Des informations générales (nom, type, logement)
- Une liste de pièces
- Un type de photos (checkInOnly, checkOutOnly, checkInAndCheckOut)

**Exemple**: "Ménage Appartement Centre" avec 5 pièces

---

### Pièce (Room)
Une zone du logement à vérifier/nettoyer. Chaque pièce contient :
- Un identifiant unique (pieceID)
- Un nom (ex: "Chambre 1")
- Des informations (roomInfo, cleaningInfo)
- Des étapes (etapes)
- Des tâches générées (tasks)

**Exemple**: "🛏️ Chambre 1" avec 3 photos de référence et 5 tâches

---

### Étape (Etape)
Une action à effectuer dans une pièce, définie dans l'API. Deux types :
- **isTodo: false** → Photo de référence à consulter
- **isTodo: true** → Tâche de vérification à effectuer

**Exemple**: 
```json
{
  "isTodo": false,
  "image": "https://s3.amazonaws.com/photo.jpg"
}
```

---

### Tâche (Task)
Une action générée par le DataAdapter à partir des étapes. Types :
- **reference_photos** → Consultation des photos de référence
- **checkbox** → Vérification simple (cocher)
- **photo_required** → Vérification avec photo obligatoire
- **photo_optional** → Vérification avec photo optionnelle
- **photo_multiple** → Plusieurs photos à prendre

**Exemple**:
```typescript
{
  id: "verifier-lit",
  type: "photo_required",
  label: "Vérifier la propreté du lit",
  photo_reference: {...}
}
```

---

## 🔄 Termes de flux

### FlowType
Le mode de fonctionnement du parcours. Deux valeurs :
- **checkin** → Arrivée (photos de référence uniquement)
- **checkout** → Sortie (photos de référence + vérifications)

**Déterminé par**: `parcoursType` de l'API ou forcé manuellement

---

### isTodo
Champ booléen dans les étapes de l'API qui détermine le type :
- **false** → Photo de référence (TOUJOURS affichée)
- **true** → Tâche de vérification (SEULEMENT en checkout)

**Impact**: Détermine quelles tâches sont générées selon le flowType

---

### takePicture
Champ de l'API qui indique quand prendre des photos :
- **checkInOnly** → Photos uniquement à l'arrivée
- **checkOutOnly** → Photos uniquement au départ
- **checkInAndCheckOut** → Photos à l'arrivée ET au départ

**Utilisation**: Détermine le flow et les écrans à afficher

---

## 🏗️ Architecture

### ParcoursManager
Singleton qui gère le parcours actuel en mémoire. Responsabilités :
- Charger les parcours depuis l'API ou le cache
- Stocker le parcours actuel
- Notifier les listeners des changements
- Coordonner le cache et l'adaptation

**Fichier**: `FRONT/src/services/parcoursManager.ts`

---

### DataAdapter
Service qui transforme les données brutes de l'API en format utilisable. Responsabilités :
- Adapter les pièces (Room)
- Générer les tâches selon le flowType
- Créer les références photos
- Nettoyer les données

**Fichier**: `FRONT/src/services/dataAdapter.ts`

---

### ParcoursCache
Service de cache local utilisant IndexedDB. Responsabilités :
- Sauvegarder les parcours en local
- Vérifier la validité du cache (24h)
- Gérer les métadonnées
- Stocker la progression

**Fichier**: `FRONT/src/services/parcoursCache.ts`

---

### GlobalParcoursContext
Context React qui fournit les données de parcours à l'application. Responsabilités :
- S'abonner au ParcoursManager
- Gérer le state React (loading, error)
- Fournir les hooks (useParcoursData, useParcoursActions)
- Calculer les données dérivées (stats)

**Fichier**: `FRONT/src/contexts/GlobalParcoursContext.tsx`

---

## 📦 Structures de données

### ParcoursData
Structure complète d'un parcours chargé :
```typescript
{
  id: string;                    // ID du parcours
  rawData: any;                  // Données brutes de l'API
  adaptedData: {
    roomsData: Record<string, Room & { tasks: Task[] }>;
    flowType: FlowType;
    parcoursInfo: {...};
  };
  loadedAt: number;              // Timestamp de chargement
}
```

---

### Room
Structure d'une pièce adaptée :
```typescript
{
  id: string;                    // pieceID de l'API
  nom: string;                   // Nom nettoyé
  ordre: number;                 // Ordre d'affichage
  roomInfo: string;              // Informations pour le voyageur
  cleaningInfo: string;          // Instructions de nettoyage
  photoReferences: {
    checkin?: PhotoReference[];
    checkout?: PhotoReference[];
  };
  tasks: Task[];                 // Tâches générées
}
```

---

### Task
Structure d'une tâche :
```typescript
{
  id: string;                    // Identifiant unique
  piece_id: string;              // ID de la pièce
  ordre: number;                 // Ordre d'affichage
  type: TaskType;                // Type de tâche
  label: string;                 // Titre affiché
  description?: string;          // Description optionnelle
  completed?: boolean;           // État de complétion
  photo_reference?: PhotoReference;      // Photo de référence
  photo_references?: PhotoReference[];   // Plusieurs photos
  total_photos_required?: number;        // Nombre de photos à prendre
}
```

---

### PhotoReference
Structure d'une référence photo :
```typescript
{
  tache_id: string;              // ID de la tâche associée
  url: string;                   // URL de l'image
  expected_orientation: 'portrait' | 'paysage';
  overlay_enabled: boolean;      // Activer l'overlay
}
```

---

## 🎨 Patterns de conception

### Singleton
Pattern où une seule instance existe pour toute l'application.

**Utilisé par**: ParcoursManager

**Avantage**: Source de vérité unique, pas de duplication

---

### Observer
Pattern où des objets s'abonnent aux changements d'un autre objet.

**Utilisé par**: ParcoursManager (listeners)

**Avantage**: Réactivité automatique, découplage

---

### Adapter
Pattern qui transforme une interface en une autre.

**Utilisé par**: DataAdapter

**Avantage**: Séparation API/Application, flexibilité

---

### Cache-First
Stratégie où on vérifie d'abord le cache avant d'appeler l'API.

**Utilisé par**: ParcoursCache

**Avantage**: Performance, réduction des appels API

---

## 🔧 Hooks React

### useParcoursData
Hook pour accéder aux données du parcours (lecture seule).

**Retourne**: `{ parcours, info, rooms, stats, isLoaded }`

**Usage**: Affichage des données

---

### useParcoursActions
Hook pour effectuer des actions sur les parcours.

**Retourne**: `{ loadParcours, switchParcours, clearParcours, loading, error }`

**Usage**: Chargement, changement de parcours

---

### useGlobalParcours
Hook complet qui combine données et actions.

**Retourne**: Toutes les données et actions disponibles

**Usage**: Composants complexes nécessitant tout

---

### useOptimizedParcours
Hook optimisé qui évite les rechargements redondants.

**Retourne**: Données + fonction de chargement optimisée

**Usage**: Pages principales, éviter les doubles chargements

---

## 💾 Stockage

### IndexedDB
Base de données locale du navigateur pour stocker des données structurées.

**Utilisé pour**: Cache des parcours, métadonnées, progression

**Limite**: ~50 MB par domaine

---

### LocalStorage
Stockage clé-valeur simple du navigateur.

**Utilisé pour**: Petites données (préférences, état temporaire)

**Limite**: ~5-10 MB par domaine

---

### SessionStorage
Stockage temporaire qui persiste uniquement pendant la session.

**Utilisé pour**: Données temporaires de la session

**Limite**: ~5-10 MB par domaine

---

## 🔍 Termes de debugging

### Cache hit
Quand les données sont trouvées dans le cache local.

**Performance**: ~50ms

**Indicateur**: Logs "✅ Données trouvées dans le cache"

---

### Cache miss
Quand les données ne sont pas dans le cache, nécessite un appel API.

**Performance**: ~500-1000ms

**Indicateur**: Logs "🌐 Chargement depuis l'API..."

---

### rawData
Données brutes reçues de l'API, non transformées.

**Format**: JSON de l'API Bubble

**Usage**: Stockage en cache, transformation

---

### adaptedData
Données transformées par le DataAdapter, prêtes à l'emploi.

**Format**: Structure Room/Task de l'application

**Usage**: Affichage dans les composants

---

## 🎯 Termes métier

### Agent de ménage
Utilisateur qui effectue le nettoyage du logement.

**Type**: AGENT

**Flow**: checkout (vérifications + photos)

---

### Voyageur
Utilisateur qui loue le logement.

**Type**: CLIENT

**Flow**: checkin (photos) ou checkout (état des lieux de sortie)

---

### Gestionnaire
Utilisateur qui gère les logements.

**Type**: GESTIONNAIRE

**Flow**: checkout (vérifications + photos)

---

### État initial
Photos et vérifications effectuées à l'arrivée.

**Écran**: EtatInitial.tsx

**Usage**: Documenter l'état avant le séjour/ménage

---

### État final
Photos et vérifications effectuées au départ.

**Écran**: CheckOut.tsx

**Usage**: Documenter l'état après le séjour/ménage

---

## 📊 Métriques

### Progression
Pourcentage de tâches complétées.

**Calcul**: `(completedTasks / totalTasks) * 100`

**Affichage**: Barre de progression, pourcentage

---

### Stats
Statistiques globales du parcours.

**Contient**: totalRooms, totalTasks, completedTasks, totalPhotos, completedPhotos

**Usage**: Affichage de la progression globale

---

## 🔐 Sécurité

### CheckID
Identifiant unique d'une session de vérification.

**Format**: UUID ou ID Bubble

**Usage**: Traçabilité, sauvegarde de la progression

---

### Token
Jeton d'authentification pour l'API.

**Usage**: Authentification des requêtes API

**Stockage**: LocalStorage ou SessionStorage

---

## 🌐 API

### Endpoint
URL de l'API pour récupérer les données.

**Exemple**: `https://checkeasy-57905.bubbleapps.io/version-test/api/1.1/wf/endpointPiece`

**Paramètre**: `?parcours={parcoursId}`

---

### Response
Réponse de l'API contenant les données du parcours.

**Format**: JSON

**Structure**: Voir rawData dans ANALYSE_FLUX_DONNEES.md

---

## 📝 Conventions de nommage

### pieceID
Identifiant unique d'une pièce dans l'API.

**Format**: `1758613142823x123456789` (Bubble ID)

**Usage**: Clé primaire, référence

---

### taskId
Identifiant unique d'une tâche générée.

**Format**: Slug du titre (ex: "verifier-lit")

**Usage**: Clé primaire, référence

---

### parcoursId
Identifiant unique d'un parcours.

**Format**: `1758613142823x462099088965380700` (Bubble ID)

**Usage**: Paramètre URL, clé de cache

---

**Créé le**: 2025-09-30  
**Version**: 1.0  
**Auteur**: Documentation CheckEasy

