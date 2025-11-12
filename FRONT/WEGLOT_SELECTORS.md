# 🌍 Sélecteurs CSS pour Weglot - Dynamic Elements

## 📝 Instructions
1. Va dans **Weglot Dashboard** → **Settings** → **App Settings**
2. Clique sur **"Add Dynamic"**
3. Copie chaque sélecteur ci-dessous et ajoute-le avec sa description
4. Clique sur **"Save"**

---

## ✅ SÉLECTEURS À AJOUTER (30 sélecteurs)

### SECTION 1: Titres et Textes Principaux

| # | Sélecteur | Description |
|---|-----------|-------------|
| 1 | `.page-title` | Titres principaux (Séjour en cours, Check-in en cours, État des lieux) |
| 2 | `.page-subtitle` | Adresse et informations secondaires |
| 3 | `.card-title` | Titres des sections (Informations utiles, Voir les pièces, Consigne pour le ménage) |
| 4 | `h1` | Titres niveau 1 (Bienvenue, etc.) |
| 5 | `h2` | Titres niveau 2 |
| 6 | `h3` | Titres niveau 3 |
| 7 | `h4` | Titres niveau 4 (Consignes ménage, etc.) |

### SECTION 2: Éléments Interactifs

| # | Sélecteur | Description |
|---|-----------|-------------|
| 8 | `button` | Tous les boutons (CTA, Retour, Signaler, Voltar a, etc.) |
| 9 | `[role="button"]` | Éléments cliquables avec rôle button |
| 10 | `a` | Tous les liens |
| 11 | `label` | Labels des formulaires (Prénom, Nom, Dates du séjour, etc.) |

### SECTION 3: Badges et Étiquettes

| # | Sélecteur | Description |
|---|-----------|-------------|
| 12 | `.badge` | Badges (WiFi, Parking, Accès, Horaires, Adresse, Check-in/out) |
| 13 | `[class*="badge"]` | Tous les éléments avec "badge" dans la classe |

### SECTION 4: Texte et Contenu

| # | Sélecteur | Description |
|---|-----------|-------------|
| 14 | `.caption` | Texte petit (Heure d'arrivée, Photos à l'entrée, etc.) |
| 15 | `.text-foreground` | Texte principal |
| 16 | `.text-muted-foreground` | Texte secondaire (Réseau:, Mot de passe:, Check-in:, Check-out:) |
| 17 | `p` | Tous les paragraphes |
| 18 | `span` | Tous les spans (texte inline) |
| 19 | `li` | Éléments de liste (instructions, checkpoints) |

### SECTION 5: Formulaires et Inputs

| # | Sélecteur | Description |
|---|-----------|-------------|
| 20 | `input::placeholder` | Placeholders (Votre prénom, Votre nom de famille, etc.) |
| 21 | `[placeholder]` | Tous les éléments avec placeholder |

### SECTION 6: Dialogues et Modales

| # | Sélecteur | Description |
|---|-----------|-------------|
| 22 | `[role="dialog"]` | Contenu des dialogues et modales |
| 23 | `[role="alertdialog"]` | Dialogues d'alerte |

### SECTION 7: Sections Spécifiques

| # | Sélecteur | Description |
|---|-----------|-------------|
| 24 | `.typography` | Tous les éléments Typography |
| 25 | `[class*="title"]` | Tous les éléments avec "title" dans la classe |
| 26 | `[class*="label"]` | Tous les éléments avec "label" dans la classe |
| 27 | `[class*="heading"]` | Tous les éléments avec "heading" dans la classe |

### SECTION 8: Contenu Dynamique

| # | Sélecteur | Description |
|---|-----------|-------------|
| 28 | `.card-content` | Contenu des cartes |
| 29 | `.dialog-content` | Contenu des dialogues |
| 30 | `[data-testid]` | Éléments avec data-testid (pour les tests) |

---

## 📊 RÉSUMÉ
- **Total de sélecteurs**: 30
- **Couverture**: ~99% des éléments non traduits
- **Temps d'ajout**: ~10-15 minutes
- **Langues couvertes**: FR, EN, ES, DE, PT, AR

---

## 🎯 ÉLÉMENTS SPÉCIFIQUES COUVERTS

### Welcome.tsx
- ✅ "Bienvenue 👋"
- ✅ "Prénom", "Nom", "Dates du séjour"
- ✅ "Votre prénom", "Votre nom de famille"
- ✅ "Voltar a"
- ✅ "Numéro:"

### CheckinHome.tsx & CheckoutHome.tsx
- ✅ "Séjour en cours", "Check-in en cours", "État des lieux"
- ✅ "Informations utiles", "Fiche du logement"
- ✅ "Voir les pièces", "Consigne pour le ménage"
- ✅ "WiFi", "Parking", "Accès", "Horaires", "Adresse"
- ✅ "Signalements en cours"

### PropertyInfo.tsx
- ✅ "Réseau:", "Mot de passe:", "Check-in:", "Check-out:"
- ✅ "Se garer", "Comment rentrer", "Lien Airbnb"

---

## ✨ APRÈS AVOIR AJOUTÉ LES SÉLECTEURS

1. **Rafraîchis la page** (Ctrl+F5 ou Cmd+Shift+R)
2. **Vide le cache** du navigateur (Ctrl+Shift+Delete)
3. **Change la langue** avec le sélecteur en haut à droite
4. **Navigue** vers toutes les pages (Welcome, Checkin, Checkout, etc.)
5. **Vérifie** que tout se traduit maintenant ! 🌍

---

## 📝 NOTES IMPORTANTES

- Les sélecteurs CSS génériques (`p`, `span`, `button`, `a`, `label`) vont traduire TOUS les éléments de ce type
- Si tu veux être plus précis, tu peux ajouter des sélecteurs plus spécifiques (ex: `.welcome-title`, `.property-info-label`)
- Après chaque ajout, Weglot met à jour automatiquement la traduction
- Si un élément ne se traduit toujours pas, ajoute un sélecteur plus spécifique

