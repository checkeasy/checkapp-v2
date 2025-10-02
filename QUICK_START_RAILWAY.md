# 🚀 Quick Start - Déploiement Railway

Guide rapide pour déployer CheckEasy Plugin Photo sur Railway en 5 minutes.

## Option 1: Script Automatique (Recommandé pour Windows)

### Windows PowerShell

```powershell
.\railway-setup.ps1
```

Ce script va :
- ✅ Vérifier et installer Railway CLI si nécessaire
- ✅ Vous connecter à Railway
- ✅ Initialiser le projet
- ✅ Déployer l'application

### Linux/Mac

```bash
chmod +x railway-deploy.sh
./railway-deploy.sh
```

## Option 2: Manuel

### Étape 1: Installer Railway CLI

```bash
npm install -g @railway/cli
```

### Étape 2: Se connecter

```bash
railway login
```

### Étape 3: Initialiser le projet

```bash
railway init
```

Choisissez "Create a new project" et donnez un nom (ex: `checkeasy-plugin`).

### Étape 4: Déployer

```bash
railway up
```

### Étape 5: Obtenir l'URL

```bash
railway domain
```

## 🎯 Vérification Rapide

Après le déploiement :

```bash
# Voir les logs
railway logs

# Ouvrir l'application dans le navigateur
railway open

# Voir le statut
railway status
```

## 🔧 Configuration Rapide des Variables

Si vous avez besoin de variables d'environnement :

```bash
# Une par une
railway variables set VITE_API_URL=https://api.example.com

# Depuis un fichier
railway variables set --from env.example
```

## 📱 Accès Mobile

L'application est une PWA. Après déploiement :
1. Ouvrez l'URL sur votre mobile
2. Ajoutez à l'écran d'accueil
3. Utilisez comme une app native

## 🐛 Problèmes Courants

### Le build échoue
```bash
# Testez localement d'abord
cd FRONT
npm install
npm run build
```

### Port non configuré
Railway définit automatiquement `$PORT`. La configuration est déjà prête.

### Logs nécessaires
```bash
railway logs --follow
```

## 🔗 Liens Utiles

- Dashboard : https://railway.app/dashboard
- Documentation complète : Voir `README_RAILWAY.md`
- Support : https://discord.gg/railway

## ⚡ Commandes Essentielles

```bash
# Déployer
railway up

# Logs en temps réel
railway logs -f

# Redéployer
railway up --detach

# Variables
railway variables

# Ouvrir dashboard
railway open

# Status
railway status
```

---

**🎉 C'est tout ! Votre application devrait être en ligne en moins de 5 minutes.**

