// Centralized translations for the app
// Language preference is stored in localStorage with key 'corama_language'

export type Language = 'en' | 'es'

export const LANGUAGE_KEY = 'corama_language'

export const translations = {
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    yes: 'Yes',
    no: 'No',
    or: 'or',
    and: 'and',
    of: 'of',
    
    // Header
    searchInCorama: 'SEARCH IN CORAMA',
    credits: 'Credits',
    logOut: 'Log out',
    settings: 'Settings',
    
    // Sidebar
    menu: 'Menu',
    collapseMenu: 'Collapse Menu',
    dashboard: 'Dashboard',
    topFiveMatches: 'Top Five Matches',
    capabilityBuilder: 'Capability Builder',
    coramaDirectory: 'CORAMA Directory',
    getMoreCredits: 'Get More Credits',
    support: 'Support',
    aboutUs: 'About Us',
    adminDirectory: 'Admin: Directory',
    goBack: 'Go Back',
    learnMoreIHCC: 'Learn More About IHCC',
    followCorama: 'Follow Contract Radar Maximizer',
    
    // Dashboard
    overview: 'Overview',
    contractsView: 'Contracts View',
    grantsView: 'Grants View',
    accounts: 'Accounts',
    topContractCategories: 'TOP CONTRACT CATEGORIES',
    topGrantCategories: 'TOP GRANT CATEGORIES',
    contracts: 'contracts',
    availableContracts: 'Available Contracts',
    availableGrants: 'Available Grants',
    searchContracts: 'SEARCH CONTRACTS',
    searchGrants: 'SEARCH GRANTS',
    contractName: 'Contract Name',
    grantName: 'Grant Name',
    category: 'Category',
    naicsCode: 'NAICS Code(s)',
    cfdaAln: 'CFDA/ALN',
    dueDate: 'Due Date',
    status: 'Status',
    aiAssistant: 'AI Assistant',
    visitSite: 'Visit Site',
    editProfile: 'Edit Profile',
    previous: 'Previous',
    
    // Top Five Contracts
    topFiveMatchesTitle: 'Top Five Matches',
    basedOnCapability: 'Based on your Capability Statement',
    matchScore: 'Match Score',
    loadMore: 'Load More',
    printResults: 'Print Results',
    noMoreContracts: 'No more contracts',
    rerunMatching: 'Rerun Matching',
    rerunningMatching: 'Rerunning...',
    
    // AI Assistant
    aiAssistantTitle: 'AI Assistant',
    askQuestion: 'Ask a question about this contract...',
    send: 'Send',
    thinking: 'Thinking...',
    contractAnalysis: 'Contract Analysis',
    proposalTeam: 'Proposal Team',
    proposalSummary: 'Proposal Summary',
    proposalGenerator: 'Proposal Generator',
    
    // Contract Analysis
    analyzingContract: 'Analyzing contract...',
    analysisComplete: 'Analysis Complete',
    keyRequirements: 'Key Requirements',
    evaluationCriteria: 'Evaluation Criteria',
    timeline: 'Timeline',
    budget: 'Budget',
    eligibility: 'Eligibility',
    
    // Proposal Team
    buildYourTeam: 'Build Your Team',
    teamMembers: 'Team Members',
    addTeamMember: 'Add Team Member',
    role: 'Role',
    name: 'Name',
    email: 'Email',
    responsibilities: 'Responsibilities',
    
    // Proposal Summary
    proposalSummaryTitle: 'Proposal Summary',
    executiveSummary: 'Executive Summary',
    technicalApproach: 'Technical Approach',
    managementApproach: 'Management Approach',
    pastPerformance: 'Past Performance',
    costProposal: 'Cost Proposal',
    
    // Proposal Generator
    generatingProposal: 'Generating proposal...',
    downloadProposal: 'Download Proposal',
    
    // Capability Builder
    capabilityBuilderTitle: 'Capability Builder',
    uploadCapabilityStatement: 'Upload Capability Statement',
    dragAndDrop: 'Drag and drop your file here',
    browseFiles: 'Browse Files',
    supportedFormats: 'Supported formats: PDF, DOC, DOCX',
    importFromUrl: 'Import from URL',
    enterUrl: 'Enter URL',
    import: 'Import',
    companyName: 'Company Name',
    companyDescription: 'Company Description',
    coreCompetencies: 'Core Competencies',
    pastProjects: 'Past Projects',
    certifications: 'Certifications',
    naicsCodes: 'NAICS Codes',
    saveCapabilityStatement: 'Save Capability Statement',
    
    // Support
    supportTitle: 'Support',
    contactUs: 'Contact Us',
    howCanWeHelp: 'How can we help?',
    sendMessage: 'Send Message',
    sending: 'Sending...',
    messageSent: 'Message sent successfully!',
    meetTheTeam: 'Meet the Team',
    faq: 'FAQ',
    
    // Get More Credits
    getMoreCreditsTitle: 'Get More Credits',
    currentBalance: 'Current Balance',
    creditsAvailable: 'credits available',
    purchaseCredits: 'Purchase Credits',
    selectPackage: 'Select a package',
    bestValue: 'Best Value',
    popular: 'Popular',
    buyNow: 'Buy Now',
    
    // Directory
    directoryTitle: 'CORAMA Directory',
    searchDirectory: 'Search directory...',
    joinDirectory: 'Join Directory',
    viewProfile: 'View Profile',
    contactInfo: 'Contact Information',
    phone: 'Phone',
    website: 'Website',
    services: 'Services',
    yearsInBusiness: 'Years in Business',
    teamSize: 'Team Size',
    
    // Edit Directory Profile
    editDirectoryProfile: 'Edit Directory Profile',
    companyLogo: 'Company Logo',
    uploadLogo: 'Upload Logo',
    contactName: 'Contact Name',
    description: 'Description',
    saveProfile: 'Save Profile',
    
    // Settings
    accountSettings: 'Account Settings',
    manageProfile: 'Manage profile, security & preferences',
    profileSecurity: 'Profile & Security',
    username: 'Username',
    language: 'Language',
    english: 'English',
    spanish: 'Espanol',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    creditsUsage: 'Credits Usage',
    date: 'Date',
    action: 'Action',
    cost: 'Cost',
    loadingHistory: 'Loading credit history...',
    noTransactions: 'No credit transactions yet',
    viewFullHistory: 'View Full History',
    contactSupport: 'Contact Support',
    needHelp: 'Need help with your account or finding contracts?',
    
    // No Capability Statement
    noCapabilityStatement: 'No Capability Statement',
    uploadToGetStarted: 'Upload your Capability Statement to get started',
    uploadNow: 'Upload Now',
    
    // Popups
    discardChanges: 'Discard Changes?',
    discardChangesMessage: 'You have unsaved changes. Are you sure you want to leave?',
    stayOnPage: 'Stay on Page',
    leaveWithoutSaving: 'Leave Without Saving',
    insufficientCredits: 'Insufficient Credits',
    insufficientCreditsMessage: "You don't have enough credits for this action.",
    getCredits: 'Get Credits',
    notNow: 'Not Now',
    
    // Errors
    errorOccurred: 'An error occurred',
    tryAgain: 'Try Again',
    somethingWentWrong: 'Something went wrong. Please try again.',
    
    // Filter
    filterContracts: 'Filter Contracts',
    contractType: 'Contract Type',
    stateProvince: 'State/Province',
    applyFilters: 'Apply Filters',
    clearFilters: 'Clear Filters',
  },
  es: {
    // Common
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    back: 'Atras',
    next: 'Siguiente',
    submit: 'Enviar',
    search: 'Buscar',
    filter: 'Filtrar',
    all: 'Todos',
    yes: 'Si',
    no: 'No',
    or: 'o',
    and: 'y',
    of: 'de',
    
    // Header
    searchInCorama: 'BUSCAR EN CORAMA',
    credits: 'Creditos',
    logOut: 'Cerrar sesion',
    settings: 'Configuracion',
    
    // Sidebar
    menu: 'Menu',
    collapseMenu: 'Contraer Menu',
    dashboard: 'Panel',
    topFiveMatches: 'Cinco Mejores',
    capabilityBuilder: 'Constructor de Capacidades',
    coramaDirectory: 'Directorio CORAMA',
    getMoreCredits: 'Obtener Creditos',
    support: 'Soporte',
    aboutUs: 'Sobre Nosotros',
    adminDirectory: 'Admin: Directorio',
    goBack: 'Volver',
    learnMoreIHCC: 'Mas sobre IHCC',
    followCorama: 'Seguir Contract Radar Maximizer',
    
    // Dashboard
    overview: 'Resumen',
    contractsView: 'Vista de Contratos',
    grantsView: 'Vista de Subvenciones',
    accounts: 'Cuentas',
    topContractCategories: 'CATEGORIAS PRINCIPALES DE CONTRATOS',
    topGrantCategories: 'CATEGORIAS PRINCIPALES DE SUBVENCIONES',
    contracts: 'contratos',
    availableContracts: 'Contratos Disponibles',
    availableGrants: 'Subvenciones Disponibles',
    searchContracts: 'BUSCAR CONTRATOS',
    searchGrants: 'BUSCAR SUBVENCIONES',
    contractName: 'Nombre del Contrato',
    grantName: 'Nombre de la Subvencion',
    category: 'Categoria',
    naicsCode: 'Codigo(s) NAICS',
    cfdaAln: 'CFDA/ALN',
    dueDate: 'Fecha de Vencimiento',
    status: 'Estado',
    aiAssistant: 'Asistente IA',
    visitSite: 'Visitar Sitio',
    editProfile: 'Editar Perfil',
    previous: 'Anterior',
    
    // Top Five Contracts
    topFiveMatchesTitle: 'Cinco Mejores Coincidencias',
    basedOnCapability: 'Basado en su Declaracion de Capacidades',
    matchScore: 'Puntuacion',
    loadMore: 'Cargar Mas',
    printResults: 'Imprimir Resultados',
    noMoreContracts: 'No hay mas contratos',
    rerunMatching: 'Ejecutar de Nuevo',
    rerunningMatching: 'Ejecutando...',
    
    // AI Assistant
    aiAssistantTitle: 'Asistente IA',
    askQuestion: 'Haga una pregunta sobre este contrato...',
    send: 'Enviar',
    thinking: 'Pensando...',
    contractAnalysis: 'Analisis de Contrato',
    proposalTeam: 'Equipo de Propuesta',
    proposalSummary: 'Resumen de Propuesta',
    proposalGenerator: 'Generador de Propuesta',
    
    // Contract Analysis
    analyzingContract: 'Analizando contrato...',
    analysisComplete: 'Analisis Completo',
    keyRequirements: 'Requisitos Clave',
    evaluationCriteria: 'Criterios de Evaluacion',
    timeline: 'Cronograma',
    budget: 'Presupuesto',
    eligibility: 'Elegibilidad',
    
    // Proposal Team
    buildYourTeam: 'Construya su Equipo',
    teamMembers: 'Miembros del Equipo',
    addTeamMember: 'Agregar Miembro',
    role: 'Rol',
    name: 'Nombre',
    email: 'Correo',
    responsibilities: 'Responsabilidades',
    
    // Proposal Summary
    proposalSummaryTitle: 'Resumen de Propuesta',
    executiveSummary: 'Resumen Ejecutivo',
    technicalApproach: 'Enfoque Tecnico',
    managementApproach: 'Enfoque de Gestion',
    pastPerformance: 'Desempeno Anterior',
    costProposal: 'Propuesta de Costos',
    
    // Proposal Generator
    generatingProposal: 'Generando propuesta...',
    downloadProposal: 'Descargar Propuesta',
    
    // Capability Builder
    capabilityBuilderTitle: 'Constructor de Capacidades',
    uploadCapabilityStatement: 'Subir Declaracion de Capacidades',
    dragAndDrop: 'Arrastre y suelte su archivo aqui',
    browseFiles: 'Explorar Archivos',
    supportedFormats: 'Formatos soportados: PDF, DOC, DOCX',
    importFromUrl: 'Importar desde URL',
    enterUrl: 'Ingrese URL',
    import: 'Importar',
    companyName: 'Nombre de la Empresa',
    companyDescription: 'Descripcion de la Empresa',
    coreCompetencies: 'Competencias Principales',
    pastProjects: 'Proyectos Anteriores',
    certifications: 'Certificaciones',
    naicsCodes: 'Codigos NAICS',
    saveCapabilityStatement: 'Guardar Declaracion',
    
    // Support
    supportTitle: 'Soporte',
    contactUs: 'Contactenos',
    howCanWeHelp: 'Como podemos ayudarle?',
    sendMessage: 'Enviar Mensaje',
    sending: 'Enviando...',
    messageSent: 'Mensaje enviado exitosamente!',
    meetTheTeam: 'Conozca al Equipo',
    faq: 'Preguntas Frecuentes',
    
    // Get More Credits
    getMoreCreditsTitle: 'Obtener Mas Creditos',
    currentBalance: 'Saldo Actual',
    creditsAvailable: 'creditos disponibles',
    purchaseCredits: 'Comprar Creditos',
    selectPackage: 'Seleccione un paquete',
    bestValue: 'Mejor Valor',
    popular: 'Popular',
    buyNow: 'Comprar Ahora',
    
    // Directory
    directoryTitle: 'Directorio CORAMA',
    searchDirectory: 'Buscar en directorio...',
    joinDirectory: 'Unirse al Directorio',
    viewProfile: 'Ver Perfil',
    contactInfo: 'Informacion de Contacto',
    phone: 'Telefono',
    website: 'Sitio Web',
    services: 'Servicios',
    yearsInBusiness: 'Anos en el Negocio',
    teamSize: 'Tamano del Equipo',
    
    // Edit Directory Profile
    editDirectoryProfile: 'Editar Perfil del Directorio',
    companyLogo: 'Logo de la Empresa',
    uploadLogo: 'Subir Logo',
    contactName: 'Nombre de Contacto',
    description: 'Descripcion',
    saveProfile: 'Guardar Perfil',
    
    // Settings
    accountSettings: 'Configuracion de Cuenta',
    manageProfile: 'Administrar perfil, seguridad y preferencias',
    profileSecurity: 'Perfil y Seguridad',
    username: 'Nombre de Usuario',
    language: 'Idioma',
    english: 'English',
    spanish: 'Espanol',
    changePassword: 'Cambiar Contrasena',
    currentPassword: 'Contrasena Actual',
    newPassword: 'Nueva Contrasena',
    saveChanges: 'Guardar Cambios',
    saving: 'Guardando...',
    creditsUsage: 'Uso de Creditos',
    date: 'Fecha',
    action: 'Accion',
    cost: 'Costo',
    loadingHistory: 'Cargando historial de creditos...',
    noTransactions: 'Sin transacciones de creditos aun',
    viewFullHistory: 'Ver Historial Completo',
    contactSupport: 'Contactar Soporte',
    needHelp: 'Necesita ayuda con su cuenta o encontrar contratos?',
    
    // No Capability Statement
    noCapabilityStatement: 'Sin Declaracion de Capacidades',
    uploadToGetStarted: 'Suba su Declaracion de Capacidades para comenzar',
    uploadNow: 'Subir Ahora',
    
    // Popups
    discardChanges: 'Descartar Cambios?',
    discardChangesMessage: 'Tiene cambios sin guardar. Esta seguro de que desea salir?',
    stayOnPage: 'Permanecer en la Pagina',
    leaveWithoutSaving: 'Salir sin Guardar',
    insufficientCredits: 'Creditos Insuficientes',
    insufficientCreditsMessage: 'No tiene suficientes creditos para esta accion.',
    getCredits: 'Obtener Creditos',
    notNow: 'Ahora No',
    
    // Errors
    errorOccurred: 'Ocurrio un error',
    tryAgain: 'Intentar de Nuevo',
    somethingWentWrong: 'Algo salio mal. Por favor intente de nuevo.',
    
    // Filter
    filterContracts: 'Filtrar Contratos',
    contractType: 'Tipo de Contrato',
    stateProvince: 'Estado/Provincia',
    applyFilters: 'Aplicar Filtros',
    clearFilters: 'Limpiar Filtros',
  }
}

export type TranslationKey = keyof typeof translations.en

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return (stored === 'es' ? 'es' : 'en') as Language
}

export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LANGUAGE_KEY, lang)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }))
}

export function t(key: TranslationKey, lang?: Language): string {
  const language = lang || getLanguage()
  return translations[language][key] || translations.en[key] || key
}
