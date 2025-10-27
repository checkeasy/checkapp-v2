import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests d'intégrité etapeID
 */
export default defineConfig({
  testDir: './tests',
  
  // Timeout pour chaque test
  timeout: 60 * 1000,
  
  // Nombre de tentatives en cas d'échec
  retries: 2,
  
  // Exécution en parallèle
  workers: 1,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  use: {
    // URL de base de l'application
    baseURL: 'http://localhost:5173',
    
    // Capture d'écran en cas d'échec
    screenshot: 'only-on-failure',
    
    // Vidéo en cas d'échec
    video: 'retain-on-failure',
    
    // Trace en cas d'échec
    trace: 'on-first-retry',
  },
  
  // Configuration des projets (navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Serveur de développement
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

