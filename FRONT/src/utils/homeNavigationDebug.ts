/**
 * 🔍 Debug Home Navigation
 * 
 * Outil pour diagnostiquer les problèmes de navigation du bouton Home
 */

export interface HomeNavigationState {
  currentPage: string;
  expectedHome: string;
  actualRedirection?: string;
  contextState: {
    checkinFlow?: any;
    checkoutFlow?: any;
    activeCheckId?: string;
  };
  urlParams: {
    parcours?: string;
    checkid?: string;
  };
  localStorage: {
    activeCheckId?: string;
    lastPath?: string;
  };
}

export class HomeNavigationDebugger {
  
  /**
   * 🔍 Analyser l'état actuel de navigation Home
   */
  static analyzeCurrentState(): HomeNavigationState {
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Déterminer la page attendue selon le chemin actuel
    let expectedHome = 'UNKNOWN';
    if (currentPath.includes('/checkin')) {
      expectedHome = '/checkin-home';
    } else if (currentPath.includes('/checkout')) {
      expectedHome = '/checkout-home';
    }
    
    return {
      currentPage: currentPath,
      expectedHome,
      contextState: {
        activeCheckId: localStorage.getItem('activeCheckId') || undefined
      },
      urlParams: {
        parcours: urlParams.get('parcours') || undefined,
        checkid: urlParams.get('checkid') || undefined
      },
      localStorage: {
        activeCheckId: localStorage.getItem('activeCheckId') || undefined,
        lastPath: localStorage.getItem('checkeasy_last_path') || undefined
      }
    };
  }
  
  /**
   * 🧪 Simuler la navigation Home selon la page actuelle
   */
  static simulateHomeNavigation(): {
    currentPage: string;
    expectedTarget: string;
    wouldNavigateTo: string;
    isCorrect: boolean;
    issues: string[];
  } {
    const state = this.analyzeCurrentState();
    const issues: string[] = [];
    
    // Simuler la logique de navigation
    let wouldNavigateTo = 'UNKNOWN';
    
    if (state.currentPage.includes('/checkin')) {
      wouldNavigateTo = '/checkin-home';
      if (state.urlParams.parcours && state.urlParams.checkid) {
        wouldNavigateTo += `?parcours=${state.urlParams.parcours}&checkid=${state.urlParams.checkid}`;
      }
    } else if (state.currentPage.includes('/checkout')) {
      wouldNavigateTo = '/checkout-home';
      if (state.urlParams.parcours && state.urlParams.checkid) {
        wouldNavigateTo += `?parcours=${state.urlParams.parcours}&checkid=${state.urlParams.checkid}`;
      }
    }
    
    // Vérifier la cohérence
    const isCorrect = wouldNavigateTo.includes(state.expectedHome);
    
    // Identifier les problèmes
    if (!state.urlParams.parcours) {
      issues.push('Paramètre parcours manquant dans URL');
    }
    
    if (!state.urlParams.checkid) {
      issues.push('Paramètre checkid manquant dans URL');
    }
    
    if (state.urlParams.checkid !== state.localStorage.activeCheckId) {
      issues.push('Incohérence checkId URL vs localStorage');
    }
    
    if (!isCorrect) {
      issues.push(`Navigation incorrecte: attendu ${state.expectedHome}, obtenu ${wouldNavigateTo}`);
    }
    
    return {
      currentPage: state.currentPage,
      expectedTarget: state.expectedHome,
      wouldNavigateTo,
      isCorrect,
      issues
    };
  }
  
  /**
   * 📊 Générer un rapport de diagnostic complet
   */
  static generateDiagnosticReport(): string {
    const state = this.analyzeCurrentState();
    const simulation = this.simulateHomeNavigation();
    
    let report = '🔍 DIAGNOSTIC NAVIGATION HOME\n';
    report += '═══════════════════════════════\n\n';
    
    report += '📍 ÉTAT ACTUEL:\n';
    report += `   Page: ${state.currentPage}\n`;
    report += `   Home Attendu: ${state.expectedHome}\n`;
    report += `   Parcours URL: ${state.urlParams.parcours || 'MANQUANT'}\n`;
    report += `   CheckId URL: ${state.urlParams.checkid || 'MANQUANT'}\n`;
    report += `   CheckId localStorage: ${state.localStorage.activeCheckId || 'MANQUANT'}\n\n`;
    
    report += '🧪 SIMULATION NAVIGATION:\n';
    report += `   Cible Attendue: ${simulation.expectedTarget}\n`;
    report += `   Navigation Simulée: ${simulation.wouldNavigateTo}\n`;
    report += `   Résultat: ${simulation.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}\n\n`;
    
    if (simulation.issues.length > 0) {
      report += '⚠️ PROBLÈMES DÉTECTÉS:\n';
      simulation.issues.forEach((issue, index) => {
        report += `   ${index + 1}. ${issue}\n`;
      });
      report += '\n';
    }
    
    report += '💡 RECOMMANDATIONS:\n';
    if (!state.urlParams.parcours || !state.urlParams.checkid) {
      report += '   • Vérifier la restauration des paramètres URL\n';
    }
    if (state.urlParams.checkid !== state.localStorage.activeCheckId) {
      report += '   • Synchroniser checkId entre URL et localStorage\n';
    }
    if (!simulation.isCorrect) {
      report += '   • Vérifier la logique handleGoBack dans les composants\n';
    }
    
    return report;
  }
  
  /**
   * 🔧 Tentative de correction automatique
   */
  static attemptAutoFix(): {
    success: boolean;
    fixesApplied: string[];
    remainingIssues: string[];
  } {
    const fixesApplied: string[] = [];
    const remainingIssues: string[] = [];
    
    try {
      const state = this.analyzeCurrentState();
      
      // Fix 1: Synchroniser checkId URL vs localStorage
      if (state.urlParams.checkid && state.localStorage.activeCheckId !== state.urlParams.checkid) {
        localStorage.setItem('activeCheckId', state.urlParams.checkid);
        fixesApplied.push('Synchronisation checkId URL → localStorage');
      }
      
      // Fix 2: Sauvegarder le chemin actuel
      if (state.currentPage) {
        localStorage.setItem('checkeasy_last_path', state.currentPage);
        fixesApplied.push('Sauvegarde chemin actuel');
      }
      
      // Fix 3: Sauvegarder les paramètres URL
      if (state.urlParams.parcours || state.urlParams.checkid) {
        const paramsToSave = {
          parcours: state.urlParams.parcours,
          checkid: state.urlParams.checkid,
          path: state.currentPage,
          timestamp: Date.now()
        };
        localStorage.setItem('checkeasy_url_params', JSON.stringify(paramsToSave));
        fixesApplied.push('Sauvegarde paramètres URL');
      }
      
      // Vérifier s'il reste des problèmes
      const newSimulation = this.simulateHomeNavigation();
      remainingIssues.push(...newSimulation.issues);
      
      return {
        success: fixesApplied.length > 0,
        fixesApplied,
        remainingIssues
      };
      
    } catch (error) {
      remainingIssues.push(`Erreur auto-fix: ${error}`);
      return {
        success: false,
        fixesApplied,
        remainingIssues
      };
    }
  }
}

// Fonctions utilitaires pour usage dans la console
export const debugHomeNavigation = () => {
  console.log('🔍 === DEBUG NAVIGATION HOME ===');
  const report = HomeNavigationDebugger.generateDiagnosticReport();
  console.log(report);
  return HomeNavigationDebugger.analyzeCurrentState();
};

export const fixHomeNavigation = () => {
  console.log('🔧 === CORRECTION NAVIGATION HOME ===');
  const result = HomeNavigationDebugger.attemptAutoFix();
  
  if (result.success) {
    console.log('✅ Corrections appliquées:');
    result.fixesApplied.forEach(fix => console.log(`  • ${fix}`));
  }
  
  if (result.remainingIssues.length > 0) {
    console.log('⚠️ Problèmes restants:');
    result.remainingIssues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  return result;
};
