# 📋 Liste des éléments qui ne se traduisent pas

## 🔴 PROBLÈME IDENTIFIÉ
Weglot ne peut pas traduire le contenu généré dynamiquement par React car il scanne le DOM au chargement initial, mais React génère le contenu APRÈS.

---

## 📍 ÉLÉMENTS À TRADUIRE

### 1️⃣ **CheckinHome.tsx** (Page d'accueil Check-in)

#### Titres et labels
- ✅ "Séjour en cours" (ligne 240)
- ✅ "Check-in en cours" (ligne 239)
- ✅ "État des lieux de sortie" (ligne 237)
- ✅ "Ménage en cours" (ligne 232)
- ✅ "Parcours en cours" (ligne 242)

#### Sections
- ✅ "Informations utiles" (ligne 503)
- ✅ "Voir les pièces" (ligne 554)
- ✅ "Consigne pour le ménage" (ligne 570)
- ✅ "Signalements en cours" (ligne 588)

#### Badges
- ✅ "WiFi" (ligne 513)
- ✅ "Parking" (ligne 519)
- ✅ "Accès" (ligne 525)
- ✅ "Horaires" (ligne 531)

#### Messages
- ✅ "Check d'entrée effectué" (ligne 474)
- ✅ "Heure d'arrivée:" (ligne 480)
- ✅ "Adresse non disponible" (ligne 450)
- ✅ "Signaler un problème" (ligne 639)
- ✅ "Le rapport IA est en cours de génération, veuillez patienter..." (ligne 215)

#### Boutons CTA
- ✅ "Continuer mon état des lieux" (ligne 313, 422)
- ✅ "Commencer mon état des lieux de sortie" (ligne 326)
- ✅ "Commencer le contrôle de sortie" (ligne 326)
- ✅ "Commencer mon ménage" (ligne 341)
- ✅ "Finaliser mon ménage" (ligne 350)
- ✅ "Continuer mon état des lieux d'entrée" (ligne 393)
- ✅ "Continuer mon check-in" (ligne 402)
- ✅ "Faire mon check out" (ligne 411)
- ✅ "📋 Voir mon rapport" (ligne 287)
- ✅ "📋 Rapport en cours..." (ligne 287)

---

### 2️⃣ **CheckoutHome.tsx** (Page d'accueil Check-out)

#### Titres et labels
- ✅ "Ménage en cours" (ligne 277)
- ✅ "État des lieux de sortie" (ligne 282)
- ✅ "Check-in en cours" (ligne 284)
- ✅ "Séjour en cours" (ligne 285)
- ✅ "Parcours en cours" (ligne 287)

#### Sections
- ✅ "Informations utiles" (ligne 551)
- ✅ "Fiche du logement" (ligne 551)
- ✅ "Voir les pièces" (ligne 601)
- ✅ "Consigne pour le ménage" (ligne 616)
- ✅ "Signalements en cours" (ligne 634)

#### Badges
- ✅ "Adresse" (ligne 560)
- ✅ "WiFi" (ligne 566)
- ✅ "Parking" (ligne 572)
- ✅ "Horaires" (ligne 578)

#### Messages
- ✅ "Adresse non disponible" (ligne 465)
- ✅ "Signaler un problème" (ligne 677)
- ✅ "Le rapport IA est en cours de génération, veuillez patienter..." (ligne 450)

#### Boutons CTA
- ✅ "Commencer mon état des lieux de sortie" (ligne 436)
- ✅ "Faire mon état des lieux de sortie" (ligne 436)
- ✅ "✅ Ménage terminé" (ligne 423)
- ✅ "✅ État des lieux de sortie terminé" (ligne 425)
- ✅ "Finaliser mon ménage" (ligne 430)

---

### 3️⃣ **Autres composants**

#### PropertyInfo.tsx
- ✅ "Numéro:" (affichage du numéro de téléphone)
- ✅ "Retour" (bouton back)

#### CleaningTasks.tsx
- ✅ "Consignes ménage" (ligne 50)

#### HelpSheet.tsx
- ✅ "Tutoriel" (ligne 16)
- ✅ "Parcours guidé pour bien commencer" (ligne 17)
- ✅ "Cas d'usage" (ligne 27)
- ✅ "Bonnes pratiques et exemples" (ligne 28)
- ✅ "FAQ" (ligne 38)
- ✅ "Questions fréquentes" (ligne 39)

---

## 🔧 SOLUTIONS

### Option 1: Ajouter les sélecteurs CSS dans Weglot Dashboard
1. Va dans **Weglot Dashboard** → **Settings** → **App Settings**
2. Clique sur **"Add Dynamic"**
3. Ajoute les sélecteurs CSS:
   - `.page-title`
   - `.card-title`
   - `.page-subtitle`
   - `[role="button"]`
   - `.badge`

### Option 2: Utiliser un système de traductions i18n
Créer un hook `useTranslation()` qui utilise le fichier `translations.ts` existant.

### Option 3: Forcer Weglot à retraduite plus agressivement
Améliorer le `WeglotTranslationWrapper` pour détecter les changements de texte.

---

## 📊 RÉSUMÉ
- **Total d'éléments à traduire**: ~50+
- **Fichiers affectés**: 5+ composants
- **Langues supportées**: EN, FR, ES, DE, PT, AR

