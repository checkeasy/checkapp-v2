/**
 * 🔍 Navigation Diagnostic Tool
 * 
 * Outil de diagnostic pour analyser les problèmes de navigation et de persistance des données
 */

export interface NavigationState {
  currentUrl: string;
  urlParams: {
    parcours?: string;
    checkid?: string;
  };
  localStorage: {
    activeCheckId?: string;
    lastPath?: string;
    urlParams?: string;
  };
  indexedDB: {
    hasSession: boolean;
    sessionData?: any;
  };
  reactState: {
    isAuthenticated: boolean;
    currentFlow?: string;
  };
}

export interface NavigationIssue {
  type: 'critical' | 'warning' | 'info';
  category: 'url' | 'storage' | 'state' | 'navigation';
  message: string;
  details?: any;
  fix?: string;
}

class NavigationDiagnostic {
  
  /**
   * 🔍 Analyse complète de l'état de navigation
   */
  async analyzeNavigationState(): Promise<{
    state: NavigationState;
    issues: NavigationIssue[];
    recommendations: string[];
  }> {
    console.log('🔍 Début diagnostic navigation...');
    
    const state = await this.getCurrentNavigationState();
    const issues = this.detectIssues(state);
    const recommendations = this.generateRecommendations(issues);
    
    return { state, issues, recommendations };
  }
  
  /**
   * 📊 Récupère l'état actuel de navigation
   */
  private async getCurrentNavigationState(): Promise<NavigationState> {
    const urlParams = new URLSearchParams(window.location.search);
    
    // État URL
    const currentUrl = window.location.href;
    const parcours = urlParams.get('parcours');
    const checkid = urlParams.get('checkid');
    
    // État localStorage
    const activeCheckId = localStorage.getItem('activeCheckId');
    const lastPath = localStorage.getItem('checkeasy_last_path');
    const savedUrlParams = localStorage.getItem('checkeasy_url_params');
    
    // État IndexedDB
    let indexedDBState = { hasSession: false, sessionData: undefined };
    try {
      if (activeCheckId) {
        const { checkSessionManager } = await import('@/services/checkSessionManager');
        const session = await checkSessionManager.getCheckSession(activeCheckId);
        indexedDBState = {
          hasSession: !!session,
          sessionData: session ? {
            checkId: session.checkId,
            flowType: session.flowType,
            currentPieceId: session.progress.currentPieceId,
            currentTaskIndex: session.progress.currentTaskIndex,
            status: session.status
          } : undefined
        };
      }
    } catch (error) {
      console.error('❌ Erreur lecture IndexedDB:', error);
    }
    
    return {
      currentUrl,
      urlParams: { parcours: parcours || undefined, checkid: checkid || undefined },
      localStorage: {
        activeCheckId: activeCheckId || undefined,
        lastPath: lastPath || undefined,
        urlParams: savedUrlParams || undefined
      },
      indexedDB: indexedDBState,
      reactState: {
        isAuthenticated: true, // À implémenter selon le contexte
        currentFlow: undefined // À implémenter selon le contexte
      }
    };
  }
  
  /**
   * 🚨 Détecte les problèmes de navigation
   */
  private detectIssues(state: NavigationState): NavigationIssue[] {
    const issues: NavigationIssue[] = [];
    
    // Vérification cohérence URL vs localStorage
    if (state.urlParams.checkid && state.localStorage.activeCheckId) {
      if (state.urlParams.checkid !== state.localStorage.activeCheckId) {
        issues.push({
          type: 'critical',
          category: 'state',
          message: 'Incohérence entre checkid URL et localStorage',
          details: {
            urlCheckId: state.urlParams.checkid,
            localStorageCheckId: state.localStorage.activeCheckId
          },
          fix: 'Synchroniser les checkId entre URL et localStorage'
        });
      }
    }
    
    // Vérification présence des paramètres essentiels
    if (!state.urlParams.parcours && !state.urlParams.checkid) {
      issues.push({
        type: 'warning',
        category: 'url',
        message: 'Aucun paramètre URL présent (parcours/checkid)',
        fix: 'Vérifier la restauration des paramètres depuis localStorage'
      });
    }
    
    // Vérification cohérence IndexedDB
    if (state.localStorage.activeCheckId && !state.indexedDB.hasSession) {
      issues.push({
        type: 'critical',
        category: 'storage',
        message: 'CheckId actif mais aucune session IndexedDB correspondante',
        details: { activeCheckId: state.localStorage.activeCheckId },
        fix: 'Nettoyer le localStorage ou restaurer la session IndexedDB'
      });
    }
    
    // Vérification navigation path
    const currentPath = new URL(state.currentUrl).pathname;
    if (state.localStorage.lastPath && state.localStorage.lastPath !== currentPath) {
      issues.push({
        type: 'info',
        category: 'navigation',
        message: 'Chemin actuel différent du dernier chemin sauvegardé',
        details: {
          currentPath,
          savedPath: state.localStorage.lastPath
        },
        fix: 'Vérifier si la restauration de route est nécessaire'
      });
    }
    
    return issues;
  }
  
  /**
   * 💡 Génère des recommandations
   */
  private generateRecommendations(issues: NavigationIssue[]): string[] {
    const recommendations: string[] = [];
    
    const criticalIssues = issues.filter(i => i.type === 'critical');
    const warningIssues = issues.filter(i => i.type === 'warning');
    
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Problèmes critiques détectés - Intervention immédiate requise');
      criticalIssues.forEach(issue => {
        if (issue.fix) recommendations.push(`• ${issue.fix}`);
      });
    }
    
    if (warningIssues.length > 0) {
      recommendations.push('⚠️ Problèmes potentiels détectés');
      warningIssues.forEach(issue => {
        if (issue.fix) recommendations.push(`• ${issue.fix}`);
      });
    }
    
    if (issues.length === 0) {
      recommendations.push('✅ Aucun problème de navigation détecté');
    }
    
    return recommendations;
  }
  
  /**
   * 🔧 Tentative de réparation automatique
   */
  async attemptAutoFix(): Promise<{
    success: boolean;
    fixesApplied: string[];
    remainingIssues: NavigationIssue[];
  }> {
    const { issues } = await this.analyzeNavigationState();
    const fixesApplied: string[] = [];
    
    for (const issue of issues) {
      try {
        if (issue.category === 'state' && issue.message.includes('Incohérence entre checkid')) {
          // Synchroniser checkId URL avec localStorage
          const urlParams = new URLSearchParams(window.location.search);
          const urlCheckId = urlParams.get('checkid');
          if (urlCheckId) {
            localStorage.setItem('activeCheckId', urlCheckId);
            fixesApplied.push('Synchronisation checkId URL → localStorage');
          }
        }
        
        if (issue.category === 'storage' && issue.message.includes('CheckId actif mais aucune session')) {
          // Nettoyer localStorage orphelin
          localStorage.removeItem('activeCheckId');
          fixesApplied.push('Nettoyage localStorage orphelin');
        }
      } catch (error) {
        console.error('❌ Erreur auto-fix:', error);
      }
    }
    
    // Re-analyser après les corrections
    const { issues: remainingIssues } = await this.analyzeNavigationState();
    
    return {
      success: fixesApplied.length > 0,
      fixesApplied,
      remainingIssues
    };
  }
  
  /**
   * 📋 Génère un rapport complet
   */
  async generateReport(): Promise<string> {
    const { state, issues, recommendations } = await this.analyzeNavigationState();
    
    let report = '# 🔍 Rapport de Diagnostic Navigation\n\n';
    
    // État actuel
    report += '## 📊 État Actuel\n\n';
    report += `**URL:** ${state.currentUrl}\n`;
    report += `**Parcours:** ${state.urlParams.parcours || 'Non défini'}\n`;
    report += `**CheckId:** ${state.urlParams.checkid || 'Non défini'}\n`;
    report += `**CheckId localStorage:** ${state.localStorage.activeCheckId || 'Non défini'}\n`;
    report += `**Session IndexedDB:** ${state.indexedDB.hasSession ? 'Présente' : 'Absente'}\n\n`;
    
    // Problèmes détectés
    if (issues.length > 0) {
      report += '## 🚨 Problèmes Détectés\n\n';
      issues.forEach((issue, index) => {
        const icon = issue.type === 'critical' ? '🔴' : issue.type === 'warning' ? '🟡' : '🔵';
        report += `${index + 1}. ${icon} **${issue.message}**\n`;
        if (issue.details) {
          report += `   - Détails: ${JSON.stringify(issue.details, null, 2)}\n`;
        }
        if (issue.fix) {
          report += `   - Solution: ${issue.fix}\n`;
        }
        report += '\n';
      });
    } else {
      report += '## ✅ Aucun Problème Détecté\n\n';
    }
    
    // Recommandations
    report += '## 💡 Recommandations\n\n';
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });
    
    return report;
  }
}

// Export singleton
export const navigationDiagnostic = new NavigationDiagnostic();

// Fonction utilitaire pour diagnostic rapide
export const quickNavigationCheck = async (): Promise<void> => {
  console.log('🔍 === DIAGNOSTIC NAVIGATION RAPIDE ===');
  const { state, issues } = await navigationDiagnostic.analyzeNavigationState();
  
  console.log('📊 État:', state);
  
  if (issues.length > 0) {
    console.log('🚨 Problèmes détectés:');
    issues.forEach(issue => console.log(`  - ${issue.type.toUpperCase()}: ${issue.message}`));
  } else {
    console.log('✅ Aucun problème détecté');
  }
};
