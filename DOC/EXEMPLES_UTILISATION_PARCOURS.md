# 💡 EXEMPLES D'UTILISATION - SYSTÈME DE PARCOURS

## 🎯 Guide pratique pour utiliser les données de parcours

---

## 📋 TABLE DES MATIÈRES

1. [Charger un parcours](#1-charger-un-parcours)
2. [Accéder aux données](#2-accéder-aux-données)
3. [Afficher les pièces](#3-afficher-les-pièces)
4. [Gérer les tâches](#4-gérer-les-tâches)
5. [Travailler avec les photos](#5-travailler-avec-les-photos)
6. [Forcer un mode (checkin/checkout)](#6-forcer-un-mode)
7. [Gérer le cache](#7-gérer-le-cache)
8. [Cas d'usage avancés](#8-cas-dusage-avancés)

---

## 1. CHARGER UN PARCOURS

### Méthode 1: Depuis l'URL (recommandé)

```typescript
import { useEffect } from 'react';
import { useParcoursActions } from '@/contexts/GlobalParcoursContext';

function MyComponent() {
  const { loadParcours, loading, error } = useParcoursActions();

  useEffect(() => {
    // Récupérer l'ID depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursId = urlParams.get('parcours');
    
    if (parcoursId) {
      loadParcours(parcoursId);
    }
  }, [loadParcours]);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  
  return <div>Parcours chargé !</div>;
}
```

### Méthode 2: Chargement direct

```typescript
import { useParcoursActions } from '@/contexts/GlobalParcoursContext';

function LoadParcoursButton() {
  const { loadParcours } = useParcoursActions();

  const handleClick = async () => {
    try {
      await loadParcours('1758613142823x462099088965380700');
      console.log('✅ Parcours chargé');
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  return <button onClick={handleClick}>Charger le parcours</button>;
}
```

### Méthode 3: Hook optimisé (évite les rechargements)

```typescript
import { useOptimizedParcours } from '@/hooks/useOptimizedParcours';

function MyPage() {
  const { 
    parcours, 
    parcoursInfo, 
    rooms, 
    loading, 
    loadParcoursFromUrl 
  } = useOptimizedParcours();

  useEffect(() => {
    loadParcoursFromUrl();
  }, []);

  return (
    <div>
      <h1>{parcoursInfo?.name}</h1>
      <p>{rooms.length} pièces</p>
    </div>
  );
}
```

---

## 2. ACCÉDER AUX DONNÉES

### Informations du parcours

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function ParcoursHeader() {
  const { info, isLoaded } = useParcoursData();

  if (!isLoaded) return <div>Chargement...</div>;

  return (
    <div>
      <h1>{info.name}</h1>
      <p>Type: {info.type}</p>
      <p>Logement: {info.logement}</p>
      <p>Photos: {info.takePicture}</p>
      
      {/* Exemples de valeurs:
        - info.name: "Ménage Appartement Centre"
        - info.type: "Ménage" ou "Voyageur"
        - info.logement: "Appartement 3 pièces"
        - info.takePicture: "checkInOnly" | "checkInAndCheckOut" | "checkOutOnly"
      */}
    </div>
  );
}
```

### Statistiques globales

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function ParcoursStats() {
  const { stats } = useParcoursData();

  return (
    <div>
      <p>Pièces: {stats.totalRooms}</p>
      <p>Tâches: {stats.completedTasks} / {stats.totalTasks}</p>
      <p>Photos: {stats.completedPhotos} / {stats.totalPhotos}</p>
      
      {/* Progression en % */}
      <p>
        Progression: {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
      </p>
    </div>
  );
}
```

### Accès au parcours complet

```typescript
import { useGlobalParcours } from '@/contexts/GlobalParcoursContext';

function DebugParcours() {
  const { currentParcours } = useGlobalParcours();

  if (!currentParcours) return null;

  return (
    <div>
      <h2>Debug Parcours</h2>
      <pre>{JSON.stringify(currentParcours.rawData, null, 2)}</pre>
      <p>Chargé à: {new Date(currentParcours.loadedAt).toLocaleString()}</p>
      <p>Flow type: {currentParcours.adaptedData.flowType}</p>
    </div>
  );
}
```

---

## 3. AFFICHER LES PIÈCES

### Liste simple des pièces

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function RoomsList() {
  const { rooms } = useParcoursData();

  return (
    <div>
      <h2>Pièces ({rooms.length})</h2>
      {rooms.map(room => (
        <div key={room.id}>
          <h3>{room.nom}</h3>
          <p>{room.tasks.length} tâches</p>
        </div>
      ))}
    </div>
  );
}
```

### Carte de pièce avec détails

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function RoomCard({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{room.nom}</CardTitle>
      </CardHeader>
      <CardContent>
        <p><strong>Ordre:</strong> {room.ordre}</p>
        <p><strong>Info:</strong> {room.roomInfo}</p>
        <p><strong>Nettoyage:</strong> {room.cleaningInfo}</p>
        <p><strong>Tâches:</strong> {room.tasks.length}</p>
        
        {/* Photos de référence */}
        {room.photoReferences.checkin && (
          <div>
            <h4>Photos checkin: {room.photoReferences.checkin.length}</h4>
          </div>
        )}
        {room.photoReferences.checkout && (
          <div>
            <h4>Photos checkout: {room.photoReferences.checkout.length}</h4>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Récupérer une pièce spécifique

```typescript
import { useGlobalParcours } from '@/contexts/GlobalParcoursContext';

function RoomDetail({ roomId }: { roomId: string }) {
  const { getRoomById } = useGlobalParcours();
  const room = getRoomById(roomId);

  if (!room) {
    return <div>Pièce non trouvée</div>;
  }

  return (
    <div>
      <h2>{room.nom}</h2>
      <p>{room.roomInfo}</p>
      {/* ... */}
    </div>
  );
}
```

---

## 4. GÉRER LES TÂCHES

### Afficher les tâches d'une pièce

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function RoomTasks({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  return (
    <div>
      <h3>Tâches de {room.nom}</h3>
      {room.tasks.map(task => (
        <div key={task.id}>
          <h4>{task.label}</h4>
          <p>Type: {task.type}</p>
          <p>Ordre: {task.ordre}</p>
          {task.description && <p>{task.description}</p>}
          {task.completed && <span>✅ Complétée</span>}
        </div>
      ))}
    </div>
  );
}
```

### Filtrer les tâches par type

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function TasksByType({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  // Séparer les tâches par type
  const referenceTasks = room.tasks.filter(t => t.type === 'reference_photos');
  const checkboxTasks = room.tasks.filter(t => t.type === 'checkbox');
  const photoTasks = room.tasks.filter(t => 
    t.type === 'photo_required' || 
    t.type === 'photo_optional' || 
    t.type === 'photo_multiple'
  );

  return (
    <div>
      <h3>Photos de référence ({referenceTasks.length})</h3>
      {referenceTasks.map(task => (
        <div key={task.id}>{task.label}</div>
      ))}

      <h3>Vérifications ({checkboxTasks.length})</h3>
      {checkboxTasks.map(task => (
        <div key={task.id}>{task.label}</div>
      ))}

      <h3>Photos à prendre ({photoTasks.length})</h3>
      {photoTasks.map(task => (
        <div key={task.id}>
          {task.label} - {task.total_photos_required} photo(s)
        </div>
      ))}
    </div>
  );
}
```

### Compter les tâches complétées

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function RoomProgress({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  const totalTasks = room.tasks.length;
  const completedTasks = room.tasks.filter(t => t.completed).length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div>
      <h3>{room.nom}</h3>
      <p>{completedTasks} / {totalTasks} tâches</p>
      <progress value={completedTasks} max={totalTasks} />
      <p>{progress}% complété</p>
    </div>
  );
}
```

---

## 5. TRAVAILLER AVEC LES PHOTOS

### Afficher les photos de référence

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function ReferencePhotos({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  // Trouver la tâche de photos de référence
  const referenceTask = room.tasks.find(t => t.type === 'reference_photos');

  if (!referenceTask || !referenceTask.photo_references) {
    return <div>Pas de photos de référence</div>;
  }

  return (
    <div>
      <h3>Photos de référence</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {referenceTask.photo_references.map((photo, index) => (
          <div key={photo.tache_id}>
            <img 
              src={photo.url} 
              alt={`Référence ${index + 1}`}
              style={{ width: '100%', height: 'auto' }}
            />
            <p>Orientation: {photo.expected_orientation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Tâches avec photo de validation

```typescript
import { useParcoursData } from '@/contexts/GlobalParcoursContext';

function TasksWithPhotos({ roomId }: { roomId: string }) {
  const { rooms } = useParcoursData();
  const room = rooms.find(r => r.id === roomId);

  if (!room) return null;

  const photoTasks = room.tasks.filter(t => t.photo_reference);

  return (
    <div>
      <h3>Tâches avec photo de validation</h3>
      {photoTasks.map(task => (
        <div key={task.id}>
          <h4>{task.label}</h4>
          {task.photo_reference && (
            <img 
              src={task.photo_reference.url} 
              alt={task.label}
              style={{ width: '200px', height: 'auto' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. FORCER UN MODE

### Basculer entre checkin et checkout

```typescript
import { useGlobalParcours } from '@/contexts/GlobalParcoursContext';

function ModeToggle() {
  const { currentParcours, forceCheckoutMode } = useGlobalParcours();

  const handleForceCheckout = () => {
    forceCheckoutMode();
    console.log('✅ Mode checkout forcé');
  };

  return (
    <div>
      <p>Mode actuel: {currentParcours?.adaptedData.flowType}</p>
      <button onClick={handleForceCheckout}>
        Forcer mode checkout
      </button>
    </div>
  );
}
```

### Utiliser le ParcoursManager directement

```typescript
import { parcoursManager } from '@/services/parcoursManager';

function AdvancedModeControl() {
  const handleForceCheckin = () => {
    const current = parcoursManager.getCurrentParcours();
    if (current) {
      parcoursManager.loadFromRawDataWithMode(current.rawData, 'checkin');
      console.log('✅ Mode checkin forcé');
    }
  };

  const handleForceCheckout = () => {
    const current = parcoursManager.getCurrentParcours();
    if (current) {
      parcoursManager.loadFromRawDataWithMode(current.rawData, 'checkout');
      console.log('✅ Mode checkout forcé');
    }
  };

  return (
    <div>
      <button onClick={handleForceCheckin}>Mode Checkin</button>
      <button onClick={handleForceCheckout}>Mode Checkout</button>
    </div>
  );
}
```

---

## 7. GÉRER LE CACHE

### Vérifier le cache

```typescript
import { parcoursCache } from '@/services/parcoursCache';

async function checkCache(parcoursId: string) {
  // Vérifier si le parcours est en cache
  const hasParcours = await parcoursCache.hasParcours(parcoursId);
  console.log('En cache:', hasParcours);

  // Vérifier la validité (24h par défaut)
  const isValid = await parcoursCache.isCacheValid(parcoursId, 24);
  console.log('Cache valide:', isValid);

  // Récupérer les métadonnées
  const metadata = await parcoursCache.getParcoursMetadata(parcoursId);
  console.log('Métadonnées:', metadata);
}
```

### Vider le cache

```typescript
import { parcoursCache } from '@/services/parcoursCache';

function CacheManager() {
  const handleClearCache = async () => {
    const parcoursId = '1758613142823x462099088965380700';
    await parcoursCache.removeParcours(parcoursId);
    console.log('✅ Cache vidé');
  };

  const handleClearAllCache = async () => {
    await parcoursCache.clearAll();
    console.log('✅ Tout le cache vidé');
  };

  return (
    <div>
      <button onClick={handleClearCache}>Vider ce parcours</button>
      <button onClick={handleClearAllCache}>Vider tout le cache</button>
    </div>
  );
}
```

---

## 8. CAS D'USAGE AVANCÉS

### Exemple complet: Page de parcours

```typescript
import { useEffect } from 'react';
import { useParcoursData, useParcoursActions } from '@/contexts/GlobalParcoursContext';

function ParcoursPage() {
  const { parcours, info, rooms, stats, isLoaded } = useParcoursData();
  const { loadParcours, loading, error } = useParcoursActions();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const parcoursId = urlParams.get('parcours');
    
    if (parcoursId && !isLoaded) {
      loadParcours(parcoursId);
    }
  }, [isLoaded, loadParcours]);

  if (loading) return <div>Chargement du parcours...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!isLoaded) return <div>Aucun parcours chargé</div>;

  return (
    <div>
      {/* Header */}
      <header>
        <h1>{info.name}</h1>
        <p>{info.logement}</p>
        <p>Type: {info.takePicture}</p>
      </header>

      {/* Stats */}
      <section>
        <h2>Progression</h2>
        <p>{stats.completedTasks} / {stats.totalTasks} tâches</p>
        <p>{stats.completedPhotos} / {stats.totalPhotos} photos</p>
      </section>

      {/* Rooms */}
      <section>
        <h2>Pièces ({rooms.length})</h2>
        {rooms.map(room => (
          <div key={room.id}>
            <h3>{room.nom}</h3>
            <p>{room.tasks.length} tâches</p>
            <ul>
              {room.tasks.map(task => (
                <li key={task.id}>
                  {task.label} ({task.type})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

**Créé le**: 2025-09-30  
**Auteur**: Guide pratique CheckEasy

