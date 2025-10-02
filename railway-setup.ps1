# Script de déploiement Railway pour CheckEasy Plugin Photo (Windows PowerShell)
# Usage: .\railway-setup.ps1

Write-Host "🚀 Déploiement Railway - CheckEasy Plugin Photo" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Railway CLI est installé
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI n'est pas installé." -ForegroundColor Red
    Write-Host "📦 Installation de Railway CLI..." -ForegroundColor Yellow
    
    # Installer via npm
    npm install -g @railway/cli
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation de Railway CLI" -ForegroundColor Red
        Write-Host "💡 Installez manuellement avec: npm install -g @railway/cli" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Railway CLI détecté" -ForegroundColor Green
}

# Vérifier si l'utilisateur est connecté
$railwayWhoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔐 Connexion à Railway..." -ForegroundColor Yellow
    railway login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur de connexion à Railway" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Déjà connecté à Railway" -ForegroundColor Green
}

# Vérifier si un projet est lié
$railwayStatus = railway status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔗 Aucun projet Railway lié" -ForegroundColor Yellow
    Write-Host "📝 Initialisation d'un nouveau projet..." -ForegroundColor Yellow
    railway init
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'initialisation du projet" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Projet Railway déjà lié" -ForegroundColor Green
}

# Afficher le statut
Write-Host ""
Write-Host "📊 Statut du projet:" -ForegroundColor Cyan
railway status

# Demander confirmation avant le déploiement
Write-Host ""
$response = Read-Host "🚢 Voulez-vous déployer maintenant? (o/N)"

if ($response -eq "o" -or $response -eq "O") {
    Write-Host "🚀 Déploiement en cours..." -ForegroundColor Yellow
    railway up
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Déploiement terminé!" -ForegroundColor Green
        Write-Host "🌐 Pour voir votre application:" -ForegroundColor Cyan
        railway open
        
        Write-Host ""
        Write-Host "📋 Pour voir les logs:" -ForegroundColor Cyan
        Write-Host "   railway logs" -ForegroundColor White
    } else {
        Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
        Write-Host "📋 Consultez les logs avec: railway logs" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Déploiement annulé" -ForegroundColor Yellow
}

