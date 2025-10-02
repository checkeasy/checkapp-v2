#!/bin/bash

# Script de déploiement Railway pour CheckEasy Plugin Photo
# Usage: ./railway-deploy.sh

set -e

echo "🚀 Déploiement Railway - CheckEasy Plugin Photo"
echo "================================================"

# Vérifier si Railway CLI est installé
if ! command -v railway &> /dev/null
then
    echo "❌ Railway CLI n'est pas installé."
    echo "📦 Installation de Railway CLI..."
    npm install -g @railway/cli
fi

echo "✅ Railway CLI détecté"

# Vérifier si l'utilisateur est connecté
if ! railway whoami &> /dev/null
then
    echo "🔐 Connexion à Railway..."
    railway login
else
    echo "✅ Déjà connecté à Railway"
fi

# Vérifier si un projet est lié
if ! railway status &> /dev/null
then
    echo "🔗 Aucun projet Railway lié"
    echo "📝 Initialisation d'un nouveau projet..."
    railway init
else
    echo "✅ Projet Railway déjà lié"
fi

# Afficher le statut
echo ""
echo "📊 Statut du projet:"
railway status

# Demander confirmation avant le déploiement
echo ""
read -p "🚢 Voulez-vous déployer maintenant? (o/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]
then
    echo "🚀 Déploiement en cours..."
    railway up
    
    echo ""
    echo "✅ Déploiement terminé!"
    echo "🌐 Pour voir votre application:"
    railway open
    
    echo ""
    echo "📋 Pour voir les logs:"
    echo "   railway logs"
else
    echo "❌ Déploiement annulé"
fi

