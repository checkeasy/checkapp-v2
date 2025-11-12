/**
 * 🌍 Traductions multilingues
 * Dictionnaire centralisé pour toutes les langues supportées
 */

export const translations = {
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      checkin: 'Entrée',
      checkout: 'Sortie',
      profile: 'Profil',
      logout: 'Déconnexion',
    },
    // Boutons
    buttons: {
      next: 'Suivant',
      previous: 'Précédent',
      submit: 'Soumettre',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      start: 'Commencer',
      finish: 'Terminer',
    },
    // Messages
    messages: {
      welcome: 'Bienvenue',
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      success: 'Succès',
      confirm: 'Êtes-vous sûr ?',
    },
  },
  en: {
    // Navigation
    nav: {
      home: 'Home',
      checkin: 'Check-in',
      checkout: 'Check-out',
      profile: 'Profile',
      logout: 'Logout',
    },
    // Buttons
    buttons: {
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      start: 'Start',
      finish: 'Finish',
    },
    // Messages
    messages: {
      welcome: 'Welcome',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      confirm: 'Are you sure?',
    },
  },
  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      checkin: 'Entrada',
      checkout: 'Salida',
      profile: 'Perfil',
      logout: 'Cerrar sesión',
    },
    // Buttons
    buttons: {
      next: 'Siguiente',
      previous: 'Anterior',
      submit: 'Enviar',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      start: 'Comenzar',
      finish: 'Terminar',
    },
    // Messages
    messages: {
      welcome: 'Bienvenido',
      loading: 'Cargando...',
      error: 'Ocurrió un error',
      success: 'Éxito',
      confirm: '¿Estás seguro?',
    },
  },
  de: {
    // Navigation
    nav: {
      home: 'Startseite',
      checkin: 'Einchecken',
      checkout: 'Auschecken',
      profile: 'Profil',
      logout: 'Abmelden',
    },
    // Buttons
    buttons: {
      next: 'Weiter',
      previous: 'Zurück',
      submit: 'Absenden',
      cancel: 'Abbrechen',
      save: 'Speichern',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      close: 'Schließen',
      start: 'Starten',
      finish: 'Fertig',
    },
    // Messages
    messages: {
      welcome: 'Willkommen',
      loading: 'Wird geladen...',
      error: 'Ein Fehler ist aufgetreten',
      success: 'Erfolg',
      confirm: 'Bist du sicher?',
    },
  },
  pt: {
    // Navigation
    nav: {
      home: 'Início',
      checkin: 'Check-in',
      checkout: 'Check-out',
      profile: 'Perfil',
      logout: 'Sair',
    },
    // Buttons
    buttons: {
      next: 'Próximo',
      previous: 'Anterior',
      submit: 'Enviar',
      cancel: 'Cancelar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      close: 'Fechar',
      start: 'Começar',
      finish: 'Terminar',
    },
    // Messages
    messages: {
      welcome: 'Bem-vindo',
      loading: 'Carregando...',
      error: 'Ocorreu um erro',
      success: 'Sucesso',
      confirm: 'Tem certeza?',
    },
  },
  ar: {
    // Navigation
    nav: {
      home: 'الرئيسية',
      checkin: 'تسجيل الدخول',
      checkout: 'تسجيل الخروج',
      profile: 'الملف الشخصي',
      logout: 'تسجيل الخروج',
    },
    // Buttons
    buttons: {
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      start: 'ابدأ',
      finish: 'إنهاء',
    },
    // Messages
    messages: {
      welcome: 'أهلا وسهلا',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'نجاح',
      confirm: 'هل أنت متأكد؟',
    },
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = string;

