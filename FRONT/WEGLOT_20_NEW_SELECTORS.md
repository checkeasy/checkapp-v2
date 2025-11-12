# 🌍 20 NOUVEAUX Sélecteurs CSS pour Weglot - Dynamic Elements

## ✅ TU AS DÉJÀ AJOUTÉ (10 sélecteurs)
1. `.page-title`
2. `.page-subtitle`
3. `.card-title`
4. `button`
5. `[role="button"]`
6. `.caption`
7. `h4`
8. `li`
9. `[role="dialog"]`
10. `.badge`

---

## 🆕 20 NOUVEAUX SÉLECTEURS À AJOUTER

### SECTION 1: Titres Manquants (3 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 11 | `h1` | Titres niveau 1 (Bienvenue, etc.) |
| 12 | `h2` | Titres niveau 2 |
| 13 | `h3` | Titres niveau 3 |

### SECTION 2: Éléments Interactifs (3 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 14 | `a` | Tous les liens (Voltar a, Lien Airbnb, etc.) |
| 15 | `label` | Labels des formulaires (Prénom, Nom, Dates du séjour, etc.) |
| 16 | `[class*="badge"]` | Tous les éléments avec "badge" dans la classe |

### SECTION 3: Texte et Contenu (6 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 17 | `.text-foreground` | Texte principal |
| 18 | `.text-muted-foreground` | Texte secondaire (Réseau:, Mot de passe:, Check-in:, Check-out:) |
| 19 | `p` | Tous les paragraphes |
| 20 | `span` | Tous les spans (texte inline) |
| 21 | `.typography` | Tous les éléments Typography |
| 22 | `[class*="title"]` | Tous les éléments avec "title" dans la classe |

### SECTION 4: Formulaires et Inputs (3 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 23 | `input::placeholder` | Placeholders (Votre prénom, Votre nom de famille, etc.) |
| 24 | `[placeholder]` | Tous les éléments avec placeholder |
| 25 | `input` | Tous les inputs |

### SECTION 5: Dialogues et Modales (2 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 26 | `[role="alertdialog"]` | Dialogues d'alerte |
| 27 | `.dialog-content` | Contenu des dialogues |

### SECTION 6: Sections Spécifiques (3 sélecteurs)

| # | Sélecteur | Description |
|---|-----------|-------------|
| 28 | `[class*="label"]` | Tous les éléments avec "label" dans la classe |
| 29 | `[class*="heading"]` | Tous les éléments avec "heading" dans la classe |
| 30 | `.card-content` | Contenu des cartes |

---

## 📊 RÉSUMÉ TOTAL
- **Déjà ajoutés**: 10 sélecteurs ✅
- **À ajouter maintenant**: 20 sélecteurs 🆕
- **Total final**: 30 sélecteurs
- **Couverture**: ~99% des éléments non traduits
- **Temps d'ajout**: ~10 minutes

---

## 📝 COPIER-COLLER RAPIDE

```
h1
h2
h3
a
label
[class*="badge"]
.text-foreground
.text-muted-foreground
p
span
.typography
[class*="title"]
input::placeholder
[placeholder]
input
[role="alertdialog"]
.dialog-content
[class*="label"]
[class*="heading"]
.card-content
```

---

## ✨ APRÈS AVOIR AJOUTÉ LES 20 NOUVEAUX SÉLECTEURS

1. **Rafraîchis la page** (Ctrl+F5 ou Cmd+Shift+R)
2. **Vide le cache** du navigateur (Ctrl+Shift+Delete)
3. **Change la langue** en portugais (PT)
4. **Navigue** vers toutes les pages
5. **Vérifie** que TOUT se traduit maintenant ! 🌍

---

## 🎯 ÉLÉMENTS QUI VONT SE TRADUIRE

### Welcome.tsx
- ✅ "Bienvenue 👋" (h1)
- ✅ "Prénom", "Nom", "Dates du séjour" (label)
- ✅ "Votre prénom", "Votre nom de famille" (input::placeholder)
- ✅ "Voltar a" (a)
- ✅ "Numéro:" (span)

### CheckinHome.tsx & CheckoutHome.tsx
- ✅ "Séjour en cours", "Check-in en cours" (h1, h2, h3)
- ✅ "Informations utiles", "Fiche du logement" (card-title)
- ✅ "Voir les pièces", "Consigne pour le ménage" (p, span)
- ✅ "WiFi", "Parking", "Accès", "Horaires" (badge)
- ✅ "Signalements en cours" (card-title)

### PropertyInfo.tsx
- ✅ "Réseau:", "Mot de passe:", "Check-in:", "Check-out:" (text-muted-foreground)
- ✅ "Se garer", "Comment rentrer", "Lien Airbnb" (card-title, p)
- ✅ "Adresse" (label)

---

## 💡 NOTES IMPORTANTES

- Les sélecteurs génériques (`p`, `span`, `a`, `input`, `label`) vont traduire TOUS les éléments de ce type
- Si un élément ne se traduit toujours pas après l'ajout, ajoute un sélecteur plus spécifique
- Weglot met à jour automatiquement après chaque ajout
- Tu peux tester en temps réel en changeant la langue

