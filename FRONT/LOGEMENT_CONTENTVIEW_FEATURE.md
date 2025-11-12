# 📋 Fonctionnalité: Affichage Conditionnel des Informations du Logement

## 🎯 Vue d'ensemble

Cette fonctionnalité permet de contrôler dynamiquement quelles sections d'informations du logement sont affichées dans le modal "Informations utiles" via un paramètre `logementContentview` provenant de l'API.

---

## 📊 Paramètre API

### `logementContentview` (string, optionnel)

Chaîne de caractères contenant les sections à afficher, séparées par des virgules.

**Exemple:**
```json
{
  "logementContentview": "Check-in/out, WiFi, Adresse"
}
```

---

## 📝 Sections Disponibles

Liste des sections reconnues et leur mapping interne :

| Valeur API | Clé Interne | Section Affichée |
|------------|-------------|------------------|
| `Adresse` | `adresse` | 📍 Adresse du logement |
| `Wi-Fi` ou `WiFi` | `wifi` | 📶 Accès WiFi (réseau + mot de passe) |
| `Se garer` | `parking` | 🚗 Informations parking |
| `Comment rentrer` | `access` | 🔑 Instructions d'accès |
| `Lien de l'annonce` | `airbnb` | 🔗 Lien Airbnb |
| `Check-in / Check-out` | `checkin-checkout` | ⏰ Horaires d'arrivée et de départ |

---

## 🔧 Comportement

### 1. **Si `logementContentview` est fourni**

Seules les sections spécifiées sont affichées.

**Exemple:**
```json
{
  "logementContentview": "WiFi, Check-in/out"
}
```
→ Affiche uniquement WiFi et Horaires

### 2. **Si `logementContentview` est vide ou absent**

**Toutes les sections sont affichées par défaut** (comportement legacy).

---

## 💻 Implémentation Technique

### 1. **Réception des Données (dataAdapter.ts)**

```typescript
interface RealParcours {
  // ... autres champs
  logementContentview?: string;
}
```

### 2. **Parsing (propertyDataHelpers.ts)**

La fonction `parseVisibleSections()` :
- Parse la chaîne CSV
- Normalise les valeurs (minuscules, accents, variations)
- Retourne un tableau de clés internes

```typescript
parseVisibleSections("Check-in/out, WiFi, Adresse")
// → ['checkin-checkout', 'wifi', 'adresse']
```

### 3. **Affichage Conditionnel (PropertyInfo.tsx)**

Chaque section est enveloppée dans une condition :

```tsx
{isVisible('wifi') && (
  <Card>
    {/* Contenu WiFi */}
  </Card>
)}
```

---

## 🎨 UX

- **Modal "Informations utiles"** accessible depuis CheckinHome et CheckoutHome
- Les sections masquées ne laissent **aucun espace vide**
- L'ordre d'affichage est **fixe** (pas basé sur l'ordre du CSV)
- Les données sont extraites depuis `currentParcours.rawData` via `extractPropertyDataFromRawData()`

---

## 🧪 Exemples d'Utilisation

### Exemple 1: Voyageur avec accès limité
```json
{
  "logementContentview": "WiFi, Check-in/out"
}
```
✅ Le voyageur voit : WiFi + Horaires  
❌ Masqué : Adresse, Parking, Instructions accès, Lien Airbnb

### Exemple 2: Agent de ménage
```json
{
  "logementContentview": "Adresse, Comment rentrer, Se garer"
}
```
✅ L'agent voit : Adresse + Accès + Parking  
❌ Masqué : WiFi, Horaires, Lien Airbnb

### Exemple 3: Toutes les infos (par défaut - rétrocompatibilité)
```json
{
  // logementContentview absent (champ non présent)
}
```
→ **Toutes les sections affichées** (pour les anciens parcours)

### Exemple 4: Aucune information (volontaire)
```json
{
  "logementContentview": ""
}
```
→ **Aucune section affichée** (utile pour masquer toutes les infos)

---

## 🔍 Variations de Syntaxe Supportées

Le parser est **tolérant** aux variations :

| Variation API | Reconnu comme |
|---------------|---------------|
| `Wi-Fi` | `wifi` |
| `WiFi` | `wifi` |
| `wifi` | `wifi` |
| `Check-in/out` | `checkin-checkout` |
| `Check-in / Check-out` | `checkin-checkout` |
| `Horaires` | `checkin-checkout` |
| `Se garer` | `parking` |
| `Parking` | `parking` |
| `Comment rentrer` | `access` |
| `Accès` | `access` |
| `Acces` | `access` |
| `Lien de l'annonce` | `airbnb` |
| `Airbnb` | `airbnb` |
| `Lien` | `airbnb` |
| `Adresse` | `adresse` |

---

## 📦 Fichiers Modifiés

### 1. `src/services/dataAdapter.ts`
- Ajout du champ `logementContentview?: string` dans `RealParcours`

### 2. `src/utils/propertyDataHelpers.ts`
- Ajout du champ `visibleSections: string[]` dans `PropertyData`
- Fonction `parseVisibleSections()` pour parser le CSV
- Extraction de `logementContentview` depuis rawData

### 3. `src/components/PropertyInfo.tsx`
- Fonction helper `isVisible(sectionKey: string)`
- Enveloppement conditionnel de chaque section Card

---

## ✅ Validation

### Cas de Tests

| logementContentview | Résultat Attendu |
|---------------------|------------------|
| `undefined` (absent) | ✅ Toutes sections affichées (rétrocompatibilité) |
| `""` (vide) | ❌ Aucune section affichée |
| `"WiFi"` | ✅ Seulement WiFi |
| `"WiFi, Check-in/out"` | ✅ WiFi + Horaires |
| `"Adresse, WiFi, Se garer"` | ✅ Adresse + WiFi + Parking |

---

## 🚀 Migration

### Anciens Parcours (sans logementContentview)

✅ **Rétrocompatibilité totale** : Si le champ n'existe pas (`undefined`) → toutes sections affichées

### Nouveaux Parcours

**Afficher des sections spécifiques** :
```json
{
  "parcourID": "...",
  "logementContentview": "WiFi, Check-in/out, Adresse"
}
```

**Masquer toutes les sections** :
```json
{
  "parcourID": "...",
  "logementContentview": ""
}
```

---

## 📌 Notes Importantes

1. **Ordre d'affichage** : L'ordre est fixe dans le code, pas basé sur l'ordre du CSV
2. **Sensibilité casse** : Le parser est case-insensitive
3. **Valeurs inconnues** : Ignorées silencieusement (pas d'erreur)
4. **Performance** : Parsing une seule fois à l'extraction des données
5. **Logs** : Console log dans `parseVisibleSections()` pour debug
6. **Distinction importante** : 
   - `undefined` (champ absent) = Tout afficher (rétrocompatibilité)
   - `""` (champ vide) = Rien afficher (choix volontaire)

---

*Document créé le ${new Date().toLocaleDateString('fr-FR')}*

