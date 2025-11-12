import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { migrateCheckSessionsToIndexedDB } from './services/migrateCheckSessions'

// 🔄 Migration automatique des CheckSessions vers IndexedDB
migrateCheckSessionsToIndexedDB().then(result => {
  if (result.success) {
    console.log('✅ Migration CheckSessions terminée:', result);
  } else {
    console.warn('⚠️ Migration CheckSessions avec erreurs:', result);
  }
}).catch(error => {
  console.error('❌ Erreur migration CheckSessions:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
