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
    
      // Top Five Contracts - additional
      contractValue: 'Contract Value',
      submissionDeadline: 'Submission Deadline',
      contractingAgency: 'Contracting Agency',
      contractWebsite: 'Contract Website',
      askAiAboutThis: 'Ask AI About This',
      clickToPrint: 'Click to print your contract matches.',
      showingContracts: 'Showing',
      allContractsLoaded: 'All contracts loaded',
      changeCapabilityStatement: 'Change Capability Statement',
      clickToUploadNewCS: 'Click to upload a new CS.',
      noContractsMatchFilters: 'No contracts match these filters.',
      noContractsToShow: 'No contracts to show yet.',
                        match: 'Match',
                  matchPending: 'Match Pending',
    
                  // Get More Credits - additional
      choosePack: 'Choose Pack',
      processing: 'Processing...',
      howCreditsWork: 'How Credits Work',
      basicAiChat: 'Basic AI Chat',
      basicAiChatDesc: 'Get instant answers to your questions about government contracting, procurement processes, and general guidance.',
      complianceCheck: 'Compliance Check',
      complianceCheckDesc: 'Deep analysis of contract opportunities to identify key requirements, evaluation criteria, and match them against your capabilities.',
      contractAnalysisDesc: 'Verify that your capability statement or proposal meets all necessary compliance requirements for government contracting.',
      fullProposal: 'Full Proposal',
      fullProposalDesc: 'Generate a comprehensive, professionally formatted proposal document tailored to a specific contract opportunity.',
      credit: 'Credit',
    
      // AI Assistant - additional
      discardUnsavedChanges: 'Discard unsaved changes?',
      workflowInProgress: "You're in the middle of a workflow.",
      progressNotSaved: 'If you go back now, your progress in this page will not be saved.',
      stayHere: 'Stay Here',
      discardAndGoBack: 'Discard & Go Back',
      startGuidedProcess: 'Start Guided Process',
      typeMessageHere: 'Type your message here...',
    
      // Contract Analysis - additional
      uploadPdf: 'Upload PDF',
      contractDocument: 'Contract Document',
      clickOrDragToUpload: 'Click or drag to upload PDF',
      uploaded: 'Uploaded',
      contractInsights: 'Contract Insights',
      uploadingPdf: 'Uploading PDF...',
      processingContract: 'Processing contract...',
      continueToNextStep: 'Continue to Next Step',
    
            // Capability Builder - additional
            companyInfo: 'Company Information',
            capabilitiesAndDifferentiators: 'Capabilities & Differentiators',
      governmentCodes: 'Government Codes',
      pastPerformanceTitle: 'Past Performance',
      generatePdf: 'Generate PDF',
      resetForm: 'Reset Form',
      clearAll: 'Clear All',
      importFromFile: 'Import from File',
      selectFile: 'Select File',
      noFileSelected: 'No file selected',
    
      // Support - additional
      coramaTeam: 'CORAMA Team',
      expertAdvisors: 'Expert Advisors',
      ihccMembers: 'IHCC Members',
      connect: 'Connect',
    
      // Directory - additional
      searchInDirectory: 'Search in directory...',
      noCompaniesFound: 'No companies found',
      viewDetails: 'View Details',
      linkedinProfile: 'LinkedIn Profile',
    },
    es: {
      // Common
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      confirm: 'Confirmar',
      back: 'Atrás',
      next: 'Siguiente',
      submit: 'Enviar',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      yes: 'Sí',
      no: 'No',
      or: 'o',
      and: 'y',
      of: 'de',
    
      // Header
      searchInCorama: 'BUSCAR EN CORAMA',
      credits: 'Créditos',
      logOut: 'Cerrar sesión',
      settings: 'Configuración',
    
      // Sidebar
      menu: 'Menú',
      collapseMenu: 'Contraer Menú',
      dashboard: 'Panel',
      topFiveMatches: 'Cinco Mejores',
      capabilityBuilder: 'Constructor de Capacidades',
      coramaDirectory: 'Directorio CORAMA',
      getMoreCredits: 'Obtener Créditos',
      support: 'Soporte',
      aboutUs: 'Sobre Nosotros',
      adminDirectory: 'Admin: Directorio',
      goBack: 'Volver',
      learnMoreIHCC: 'Más sobre IHCC',
      followCorama: 'Seguir Contract Radar Maximizer',
    
        // Dashboard
        overview: 'Resumen',
        contractsView: 'Vista de Contratos',
        grantsView: 'Vista de Subvenciones',
        accounts: 'Cuentas',
        topContractCategories: 'CATEGORÍAS PRINCIPALES DE CONTRATOS',
        topGrantCategories: 'CATEGORÍAS PRINCIPALES DE SUBVENCIONES',
        contracts: 'contratos',
        availableContracts: 'Contratos Disponibles',
        availableGrants: 'Subvenciones Disponibles',
        searchContracts: 'BUSCAR CONTRATOS',
        searchGrants: 'BUSCAR SUBVENCIONES',
        contractName: 'Nombre del Contrato',
        grantName: 'Nombre de la Subvención',
        category: 'Categoría',
        naicsCode: 'Código(s) NAICS',
        cfdaAln: 'CFDA/ALN',
        dueDate: 'Fecha de Vencimiento',
        status: 'Estado',
        aiAssistant: 'Asistente IA',
        visitSite: 'Visitar Sitio',
        editProfile: 'Editar Perfil',
        previous: 'Anterior',
    
        // Top Five Contracts
        topFiveMatchesTitle: 'Cinco Mejores Coincidencias',
        basedOnCapability: 'Basado en su Declaración de Capacidades',
        matchScore: 'Puntuación',
        loadMore: 'Cargar Más',
        printResults: 'Imprimir Resultados',
        noMoreContracts: 'No hay más contratos',
        rerunMatching: 'Ejecutar de Nuevo',
        rerunningMatching: 'Ejecutando...',
    
        // AI Assistant
        aiAssistantTitle: 'Asistente IA',
        askQuestion: 'Haga una pregunta sobre este contrato...',
        send: 'Enviar',
        thinking: 'Pensando...',
        contractAnalysis: 'Análisis de Contrato',
        proposalTeam: 'Equipo de Propuesta',
        proposalSummary: 'Resumen de Propuesta',
        proposalGenerator: 'Generador de Propuesta',
    
        // Contract Analysis
        analyzingContract: 'Analizando contrato...',
        analysisComplete: 'Análisis Completo',
        keyRequirements: 'Requisitos Clave',
        evaluationCriteria: 'Criterios de Evaluación',
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
        technicalApproach: 'Enfoque Técnico',
        managementApproach: 'Enfoque de Gestión',
        pastPerformance: 'Desempeño Anterior',
        costProposal: 'Propuesta de Costos',
    
    // Proposal Generator
    generatingProposal: 'Generando propuesta...',
    downloadProposal: 'Descargar Propuesta',
    
        // Capability Builder
        capabilityBuilderTitle: 'Constructor de Capacidades',
        uploadCapabilityStatement: 'Subir Declaración de Capacidades',
        dragAndDrop: 'Arrastre y suelte su archivo aquí',
        browseFiles: 'Explorar Archivos',
        supportedFormats: 'Formatos soportados: PDF, DOC, DOCX',
        importFromUrl: 'Importar desde URL',
        enterUrl: 'Ingrese URL',
        import: 'Importar',
        companyName: 'Nombre de la Empresa',
        companyDescription: 'Descripción de la Empresa',
        coreCompetencies: 'Competencias Principales',
        pastProjects: 'Proyectos Anteriores',
        certifications: 'Certificaciones',
        naicsCodes: 'Códigos NAICS',
        saveCapabilityStatement: 'Guardar Declaración',
    
        // Support
        supportTitle: 'Soporte',
        contactUs: 'Contáctenos',
        howCanWeHelp: '¿Cómo podemos ayudarle?',
        sendMessage: 'Enviar Mensaje',
        sending: 'Enviando...',
        messageSent: '¡Mensaje enviado exitosamente!',
        meetTheTeam: 'Conozca al Equipo',
        faq: 'Preguntas Frecuentes',
    
        // Get More Credits
        getMoreCreditsTitle: 'Obtener Más Créditos',
        currentBalance: 'Saldo Actual',
        creditsAvailable: 'créditos disponibles',
        purchaseCredits: 'Comprar Créditos',
        selectPackage: 'Seleccione un paquete',
        bestValue: 'Mejor Valor',
        popular: 'Popular',
        buyNow: 'Comprar Ahora',
    
        // Directory
        directoryTitle: 'Directorio CORAMA',
        searchDirectory: 'Buscar en directorio...',
        joinDirectory: 'Unirse al Directorio',
        viewProfile: 'Ver Perfil',
        contactInfo: 'Información de Contacto',
        phone: 'Teléfono',
        website: 'Sitio Web',
        services: 'Servicios',
        yearsInBusiness: 'Años en el Negocio',
        teamSize: 'Tamaño del Equipo',
    
        // Edit Directory Profile
        editDirectoryProfile: 'Editar Perfil del Directorio',
        companyLogo: 'Logo de la Empresa',
        uploadLogo: 'Subir Logo',
        contactName: 'Nombre de Contacto',
        description: 'Descripción',
        saveProfile: 'Guardar Perfil',
    
        // Settings
        accountSettings: 'Configuración de Cuenta',
        manageProfile: 'Administrar perfil, seguridad y preferencias',
        profileSecurity: 'Perfil y Seguridad',
        username: 'Nombre de Usuario',
        language: 'Idioma',
        english: 'English',
        spanish: 'Español',
        changePassword: 'Cambiar Contraseña',
        currentPassword: 'Contraseña Actual',
        newPassword: 'Nueva Contraseña',
        saveChanges: 'Guardar Cambios',
        saving: 'Guardando...',
        creditsUsage: 'Uso de Créditos',
        date: 'Fecha',
        action: 'Acción',
        cost: 'Costo',
        loadingHistory: 'Cargando historial de créditos...',
        noTransactions: 'Sin transacciones de créditos aún',
        viewFullHistory: 'Ver Historial Completo',
        contactSupport: 'Contactar Soporte',
        needHelp: '¿Necesita ayuda con su cuenta o encontrar contratos?',
    
        // No Capability Statement
        noCapabilityStatement: 'Sin Declaración de Capacidades',
        uploadToGetStarted: 'Suba su Declaración de Capacidades para comenzar',
        uploadNow: 'Subir Ahora',
    
        // Popups
        discardChanges: '¿Descartar Cambios?',
        discardChangesMessage: 'Tiene cambios sin guardar. ¿Está seguro de que desea salir?',
        stayOnPage: 'Permanecer en la Página',
        leaveWithoutSaving: 'Salir sin Guardar',
        insufficientCredits: 'Créditos Insuficientes',
        insufficientCreditsMessage: 'No tiene suficientes créditos para esta acción.',
        getCredits: 'Obtener Créditos',
        notNow: 'Ahora No',
    
        // Errors
        errorOccurred: 'Ocurrió un error',
        tryAgain: 'Intentar de Nuevo',
        somethingWentWrong: 'Algo salió mal. Por favor intente de nuevo.',
    
    // Filter
    filterContracts: 'Filtrar Contratos',
    contractType: 'Tipo de Contrato',
    stateProvince: 'Estado/Provincia',
    applyFilters: 'Aplicar Filtros',
    clearFilters: 'Limpiar Filtros',
    
        // Top Five Contracts - additional
        contractValue: 'Valor del Contrato',
        submissionDeadline: 'Fecha Límite de Envío',
        contractingAgency: 'Agencia Contratante',
        contractWebsite: 'Sitio Web del Contrato',
        askAiAboutThis: 'Preguntar a la IA',
        clickToPrint: 'Haga clic para imprimir sus coincidencias de contratos.',
        showingContracts: 'Mostrando',
        allContractsLoaded: 'Todos los contratos cargados',
        changeCapabilityStatement: 'Cambiar Declaración de Capacidades',
        clickToUploadNewCS: 'Haga clic para subir una nueva DC.',
        noContractsMatchFilters: 'Ningún contrato coincide con estos filtros.',
        noContractsToShow: 'No hay contratos para mostrar aún.',
        match: 'Coincidencia',
        matchPending: 'Coincidencia Pendiente',
    
        // Get More Credits - additional
        choosePack: 'Elegir Paquete',
        processing: 'Procesando...',
        howCreditsWork: 'Cómo Funcionan los Créditos',
        basicAiChat: 'Chat Básico con IA',
        basicAiChatDesc: 'Obtenga respuestas instantáneas a sus preguntas sobre contratación gubernamental, procesos de adquisición y orientación general.',
        complianceCheck: 'Verificación de Cumplimiento',
        complianceCheckDesc: 'Análisis profundo de oportunidades de contratos para identificar requisitos clave, criterios de evaluación y compararlos con sus capacidades.',
        contractAnalysisDesc: 'Verifique que su declaración de capacidades o propuesta cumpla con todos los requisitos de cumplimiento necesarios para la contratación gubernamental.',
        fullProposal: 'Propuesta Completa',
        fullProposalDesc: 'Genere un documento de propuesta completo y profesionalmente formateado adaptado a una oportunidad de contrato específica.',
        credit: 'Crédito',
    
        // AI Assistant - additional
        discardUnsavedChanges: '¿Descartar cambios sin guardar?',
        workflowInProgress: 'Está en medio de un flujo de trabajo.',
        progressNotSaved: 'Si regresa ahora, su progreso en esta página no se guardará.',
        stayHere: 'Permanecer Aquí',
        discardAndGoBack: 'Descartar y Volver',
        startGuidedProcess: 'Iniciar Proceso Guiado',
        typeMessageHere: 'Escriba su mensaje aquí...',
    
        // Contract Analysis - additional
        uploadPdf: 'Subir PDF',
        contractDocument: 'Documento del Contrato',
        clickOrDragToUpload: 'Haga clic o arrastre para subir PDF',
        uploaded: 'Subido',
        contractInsights: 'Análisis del Contrato',
        uploadingPdf: 'Subiendo PDF...',
        processingContract: 'Procesando contrato...',
        continueToNextStep: 'Continuar al Siguiente Paso',
    
        // Capability Builder - additional
        companyInfo: 'Información de la Empresa',
        capabilitiesAndDifferentiators: 'Capacidades y Diferenciadores',
        governmentCodes: 'Códigos Gubernamentales',
        pastPerformanceTitle: 'Desempeño Anterior',
        generatePdf: 'Generar PDF',
        resetForm: 'Restablecer Formulario',
        clearAll: 'Limpiar Todo',
        importFromFile: 'Importar desde Archivo',
        selectFile: 'Seleccionar Archivo',
        noFileSelected: 'Ningún archivo seleccionado',
    
    // Support - additional
    coramaTeam: 'Equipo CORAMA',
    expertAdvisors: 'Asesores Expertos',
    ihccMembers: 'Miembros de IHCC',
    connect: 'Conectar',
    
    // Directory - additional
    searchInDirectory: 'Buscar en directorio...',
    noCompaniesFound: 'No se encontraron empresas',
    viewDetails: 'Ver Detalles',
    linkedinProfile: 'Perfil de LinkedIn',
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
