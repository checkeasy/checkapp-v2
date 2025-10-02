# Déploiement Railway - CheckEasy Plugin Photo

## 📋 Prérequis

1. **Compte Railway**: Créez un compte sur [railway.app](https://railway.app)
2. **Railway CLI**: Installez le CLI Railway

```bash
# Avec npm
npm install -g @railway/cli

# Ou avec curl
curl -fsSL https://railway.app/install.sh | sh
```

## 🚀 Installation et Configuration

### 1. Connexion à Railway

```bash
railway login
```

Cela ouvrira votre navigateur pour vous connecter.

### 2. Initialisation du projet

Depuis le dossier racine du projet :

```bash
railway init
```

Choisissez "Create a new project" et donnez un nom à votre projet (ex: checkeasy-plugin-photo).

### 3. Lier le projet (si déjà existant)

Si le projet existe déjà sur Railway :

```bash
railway link
```

### 4. Configuration des variables d'environnement (optionnel)

Si votre application nécessite des variables d'environnement :

```bash
railway variables set KEY=value
```

Ou créez un fichier `.env` localement et utilisez :

```bash
railway variables set --from .env
```

### 5. Déploiement

```bash
railway up
```

Cette commande va :
- Construire votre application (build)
- La déployer sur Railway
- Générer une URL publique

### 6. Obtenir l'URL de déploiement

```bash
railway domain
```

Ou créez un domaine personnalisé :

```bash
railway domain
```

## 📦 Structure de Déploiement

Le projet est configuré pour déployer l'application FRONT (React/Vite) :

```
racine/
├── railway.json          # Configuration Railway (JSON)
├── railway.toml          # Configuration Railway (TOML)
├── nixpacks.toml         # Configuration Nixpacks
├── Dockerfile            # Configuration Docker (alternative)
├── .railwayignore       # Fichiers à ignorer
└── FRONT/               # Application React/Vite
    ├── package.json
    ├── src/
    └── dist/            # Build output
```

## 🔧 Commandes Utiles

### Voir les logs en temps réel
```bash
railway logs
```

### Ouvrir le dashboard Railway
```bash
railway open
```

### Exécuter une commande dans l'environnement Railway
```bash
railway run <command>
```

### Voir les variables d'environnement
```bash
railway variables
```

### Supprimer le déploiement
```bash
railway down
```

### Redéployer
```bash
railway up --detach
```

## 🌐 Configuration des Domaines

### Domaine Railway (automatique)
Railway génère automatiquement un domaine `*.up.railway.app`

### Domaine personnalisé
1. Allez sur le dashboard Railway
2. Sélectionnez votre service
3. Onglet "Settings" > "Domains"
4. Ajoutez votre domaine personnalisé
5. Configurez les DNS selon les instructions

## 🐛 Dépannage

### Le build échoue
- Vérifiez les logs : `railway logs`
- Assurez-vous que toutes les dépendances sont dans package.json
- Vérifiez que le build local fonctionne : `cd FRONT && npm run build`

### L'application ne démarre pas
- Vérifiez que le port $PORT est bien utilisé
- Vérifiez les logs : `railway logs`
- Testez localement avec : `npm run preview`

### Variables d'environnement manquantes
- Listez les variables : `railway variables`
- Ajoutez les variables manquantes : `railway variables set KEY=value`

## 📝 Notes Importantes

1. **Port dynamique** : Railway assigne un port dynamique via la variable `$PORT`. L'application est configurée pour l'utiliser.

2. **Build automatique** : Railway détecte automatiquement les changements git et redéploie.

3. **Environnement** : Railway utilise Node.js 20 par défaut (configuré dans nixpacks.toml).

4. **Cache** : Railway met en cache les node_modules pour accélérer les builds.

## 🔗 Liens Utiles

- [Documentation Railway](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Railway Community](https://help.railway.app)

## 📞 Support

Pour toute question sur Railway, consultez :
- Discord Railway : https://discord.gg/railway
- Documentation : https://docs.railway.app

