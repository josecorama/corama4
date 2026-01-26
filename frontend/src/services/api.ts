// Use window.location.origin to avoid issues with credentials in URL (e.g., user:pass@domain)
const getOrigin = () => typeof window === 'undefined' ? '' : window.location.origin;
const API_BASE = () => `${getOrigin()}/api`;
const apiUrl = (path: string) => `${getOrigin()}${path}`;

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  username: string;
  credits_balance: number;
  has_capability_statement: boolean;
}

export interface Contract {
  bid_number: string;
  bid_name: string;
  bid_description: string;
  status: string;
  category: string;
  due_date: string;
  detail_link: string;
  naics_code: string;
  hash_value?: string;
  contract_id?: string;
  organization?: string;
}

export interface ContractMatch {
  rank: number;
  Company: string;
  Bid_Number: string;
  Bid_Name: string;
  Bid_Description: string;
  Status: string;
  Category: string;
  Due_Date: string;
  Detail_Link: string;
  State: string;
  Organization: string;
  Budget: string;
  Similarity_Score: number | string;
  hash_value: string;
  NAICS_Code?: string;
  Contract_Type?: string;
}

export interface CreditPackage {
  credits: number;
  price: number;
  price_display: string;
  description: string;
}

export interface DirectoryCompany {
  id: string;
  name: string;
  contactName: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  employees: string;
  yearsInBusiness: number;
  logo: string;
  services: string;
  certifications: string;
  linkedinUrl: string;
  pastProjects: string;
}

export interface DirectoryProfile {
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  linkedin_url: string;
  services: string;
  description: string;
  certifications: string;
  past_projects: string;
  team_size: string;
  years_in_business: string;
  logo_url: string;
  listed: boolean;
}

export interface CapabilityStatementData {
  companyName?: string;
  website?: string;
  contactName?: string;
  contactTitle?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  companyDescription?: string;
  industryFocus?: string;
  ueiCode?: string;
  cageCode?: string;
  competencies?: string[];
  differentiators?: string[];
  naicsCodes?: string[];
  certifications?: string[];
  pastPerformance?: string[];
}

class ApiService {
  // User
  async getUser(): Promise<User> {
    const res = await fetch(`${API_BASE()}/me`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch user');
    }
    const data = await res.json();
    return data.user;
  }

  // Contracts - with cursor-based pagination support
  async getContracts(
    page: number = 1, 
    limit: number = 50, 
    cursor?: string
  ): Promise<{
    contracts: Contract[], 
    total_pages: number, 
    total_contracts: number, 
    next_cursor?: string | null,
    has_more?: boolean,
    top_categories?: {name: string, count: number, percentage: number}[]
  }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (cursor) params.append('cursor', cursor);
    
    const res = await fetch(`${API_BASE()}/contracts?${params}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch contracts');
    }
    return res.json();
  }

  // Grants - fetch from government_grants collection
  async getGrants(
    page: number = 1, 
    limit: number = 50
  ): Promise<{
    contracts: Contract[], 
    total_pages: number, 
    total_contracts: number, 
    has_more?: boolean,
    top_categories?: {name: string, count: number, percentage: number}[]
  }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    
    const res = await fetch(`${API_BASE()}/grants?${params}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch grants');
    }
    return res.json();
  }

    async searchContracts(
      query: string, 
      page: number = 1, 
      contractType: string = 'all', 
      states: string[] = []
    ): Promise<{
      success: boolean, 
      contracts: Contract[], 
      total_pages: number, 
      total_contracts: number, 
      next_cursor?: string | null,
      has_more?: boolean,
      top_categories?: {name: string, count: number, percentage: number}[]
    }> {
    const res = await fetch(apiUrl('/dashboard_search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, page, contract_type: contractType, states })
    });
    if (!res.ok) throw new Error('Failed to search contracts');
    return res.json();
  }

  // Top Five
  async getTopFiveContracts(
    contractType?: string,
    states?: string[],
    offset?: number
  ): Promise<{success: boolean, matches: ContractMatch[], has_matches: boolean, filtered_count?: number, total_available?: number, has_more?: boolean, next_offset?: number | null, current_offset?: number}> {
    const params = new URLSearchParams();
    if (contractType && contractType !== 'all' && contractType !== '') {
      params.append('contract_type', contractType);
    }
    if (states && states.length > 0) {
      const filteredStates = states.filter(s => s !== 'all');
      if (filteredStates.length > 0) {
        params.append('states', filteredStates.join(','));
      }
    }
    if (offset !== undefined && offset > 0) {
      params.append('offset', offset.toString());
    }
    const qs = params.toString();
    const url = qs ? `${API_BASE()}/top-five-contracts?${qs}` : `${API_BASE()}/top-five-contracts`;
    
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch top five');
    }
    return res.json();
  }

  // Re-run Top Five matching with existing capability statement
  async rerunTopFiveMatching(
    contractTypes?: string[],
    states?: string[]
  ): Promise<{success: boolean, matches: ContractMatch[], total_found?: number, message?: string, error?: string}> {
    const res = await fetch(`${API_BASE()}/rerun-top-five`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractTypes: contractTypes || [],
        states: states || []
      })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to re-run matching' }));
      return { success: false, matches: [], error: errorData.error || 'Failed to re-run matching' };
    }
    return res.json();
  }

  // AI Assistant
  async sendMessage(query: string, hashValue?: string, actionType: string = 'general'): Promise<{response: string, credits_used: number, remaining_credits: number, casual_greeting: boolean}> {
    const formData = new FormData();
    formData.append('query', query);
    if (hashValue) formData.append('hash_value', hashValue);
    formData.append('action_type', actionType);

    const res = await fetch(apiUrl('/ai_assistant_enhanced'), {
      method: 'POST',
      body: formData
    });
    return res.json();
  }

  // AI Assistant Action (with credit deduction, idempotency support, and optional conversation history)
  async aiAssistantAction(
    action: string, 
    contractName: string, 
    conversationHistory?: Array<{role: string, content: string}>,
    idempotencyKey?: string
  ): Promise<{success: boolean, message: string, credits_balance?: number, error?: string, cached?: boolean}> {
    const res = await fetch(`${API_BASE()}/ai-assistant-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action, 
        contractName,
        conversationHistory: conversationHistory || [],
        idempotency_key: idempotencyKey
      })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to process AI action' }));
      return { success: false, message: '', error: errorData.error || 'Failed to process AI action' };
    }
    return res.json();
  }

  // Credits
  async getCredits(): Promise<{success: boolean, current_balance: number, credits_used: number, packages: CreditPackage[]}> {
    const res = await fetch(`${API_BASE()}/credits`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch credits');
    }
    return res.json();
  }

  async createCheckout(credits: number, price: number): Promise<{checkout_url: string}> {
    const res = await fetch(apiUrl('/create_credit_checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits, price })
    });
    if (!res.ok) throw new Error('Failed to create checkout');
    return res.json();
  }

  // Deduct credits for an action (with idempotency support)
  async deductCredits(
    amount: number, 
    actionType: string, 
    description: string,
    idempotencyKey?: string
  ): Promise<{success: boolean, new_balance?: number, error?: string, cached?: boolean}> {
    const res = await fetch(`${API_BASE()}/deduct-credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        action_type: actionType, 
        description,
        idempotency_key: idempotencyKey 
      })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      if (res.status === 402) {
        return { success: false, error: 'Insufficient credits. Please purchase more credits.' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to deduct credits' }));
      return { success: false, error: errorData.error || 'Failed to deduct credits' };
    }
    const data = await res.json();
    
    // Dispatch event to notify Header of credit change (triggers animation)
    // Don't dispatch if this was a cached response (already processed)
    if (data.success && data.new_balance !== undefined && !data.cached) {
      window.dispatchEvent(new CustomEvent('creditsChanged', { 
        detail: { credits: data.new_balance } 
      }));
    }
    
    return data;
  }

  // Upload CS
  async uploadCapabilityStatement(file: File, contractTypes: string[], states: string[]): Promise<{success: boolean, message: string, redirect?: string}> {
    const formData = new FormData();
    formData.append('file', file);
    contractTypes.forEach(t => formData.append('contractTypes[]', t));
    states.forEach(s => formData.append('states[]', s));

    const res = await fetch(apiUrl('/upload_and_process'), {
      method: 'POST',
      body: formData
    });
    return res.json();
  }

  // Import Capability Statement from File (uses /process-capability-statement endpoint)
  async importCapabilityFromFile(file: File): Promise<{success: boolean, error?: string, data?: CapabilityStatementData}> {
    const formData = new FormData();
    formData.append('capabilityFile', file);

    const res = await fetch(apiUrl('/process-capability-statement'), {
      method: 'POST',
      body: formData
    });
    return res.json();
  }

  // Import Capability Statement from URL (uses /process-capability-statement endpoint)
  // This extracts data from web pages (HTML scraping), not expecting PDFs
  async importCapabilityFromUrl(url: string): Promise<{success: boolean, error?: string, data?: CapabilityStatementData}> {
    const res = await fetch(apiUrl('/process-capability-statement'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  }

  // Enhance Capability Statement content using AI
  async enhanceCapabilityStatement(formData: {
    companyName?: string;
    companyDescription?: string;
    coreCompetencies?: string;
    keyDifferentiators?: string;
    projectDescription?: string;
    certifications?: string;
    naicsCodes?: string;
  }): Promise<{success: boolean, error?: string, data?: {
    companyDescription: string;
    coreCompetencies: string;
    keyDifferentiators: string;
    projectDescription: string;
    certifications: string;
  }}> {
    const res = await fetch(`${API_BASE()}/enhance-capability-statement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to enhance content' }));
      return { success: false, error: errorData.error || 'Failed to enhance content' };
    }
    return res.json();
  }

  // Directory
  async getDirectory(page: number = 1, search: string = ''): Promise<{success: boolean, companies: DirectoryCompany[], total: number, page: number, total_pages: number}> {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE()}/directory?${params}`);
    if (!res.ok) throw new Error('Failed to fetch directory');
    return res.json();
  }

  // Directory Profile
  // Note: This endpoint is used to check if user has a directory profile.
  // We don't redirect on 401 here because this is often called as a capability check,
  // not as a critical auth-required operation. Let the caller handle auth errors.
  async getDirectoryProfile(): Promise<{success: boolean, user_id?: string, profile?: DirectoryProfile, error?: string}> {
    const res = await fetch(`${API_BASE()}/get_directory_profile`, {
      credentials: 'include'
    });
    if (!res.ok) {
      // Don't redirect on 401 - let the caller handle it gracefully
      // This prevents logout when just checking if user has a directory profile
      if (res.status === 401) {
        return { success: false, error: 'Not authenticated' };
      }
      return { success: false, error: 'Failed to fetch directory profile' };
    }
    return res.json();
  }

  async updateDirectoryProfile(data: Partial<DirectoryProfile>): Promise<{success: boolean, error?: string, authorization_error?: boolean}> {
    const res = await fetch(`${API_BASE()}/update_directory_profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    // Don't throw on 403 - let the caller handle authorization errors
    if (!res.ok && res.status !== 403) throw new Error('Failed to update directory profile');
    return res.json();
  }

  async uploadDirectoryLogo(file: File): Promise<{success: boolean, logo_url?: string, error?: string, authorization_error?: boolean}> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${API_BASE()}/upload_directory_logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    // Don't throw on 403 - let the caller handle authorization errors
    if (!res.ok && res.status !== 403) throw new Error('Failed to upload logo');
    return res.json();
  }

  // Contract Analysis - Create async job for PDF analysis (recommended for large PDFs)
  async createContractAnalysisJob(formData: FormData): Promise<{
    success: boolean;
    job_id?: string;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/contract-analysis/jobs`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to create analysis job' }));
      return { success: false, error: errorData.error || 'Failed to create analysis job' };
    }
    return res.json();
  }

  // Contract Analysis - Get job status and results
  async getContractAnalysisJob(jobId: string): Promise<{
    success: boolean;
    job_id?: string;
    status?: 'queued' | 'running' | 'completed' | 'error';
    progress?: string;
    created_at?: number;
    started_at?: number;
    completed_at?: number;
    result?: {
      markdown_summary: string;
      findings: Array<{
        id: string;
        type: string;
        title: string;
        quote: string;
        page_hint: number;
        rationale: string;
        severity?: string;
        coordinates?: Array<{
          page: number;
          left: number;
          top: number;
          width: number;
          height: number;
        }>;
      }>;
      total_pages: number;
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/contract-analysis/jobs/${jobId}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to get job status' }));
      return { success: false, error: errorData.error || 'Failed to get job status' };
    }
    return res.json();
  }

  // Contract Analysis - Generate AI findings from PDF (sync - may timeout on large PDFs)
  async generateContractAnalysis(formData: FormData): Promise<{
    success: boolean;
    findings?: string;
    structured_findings?: Array<{
      id: string;
      type: string;
      title: string;
      quote: string;
      page_hint: number;
      rationale: string;
      severity?: string;
      coordinates?: Array<{
        page: number;
        left: number;
        top: number;
        width: number;
        height: number;
        rect_raw?: number[];
      }>;
    }>;
    manifest?: {
      [key: string]: {
        page: number;
        left: number;
        top: number;
        width: number;
        height: number;
        not_found?: boolean;
      };
    };
    annotated_pdf_url?: string;
    page_count?: number;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/contract-analysis/findings`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to analyze contract' }));
      return { success: false, error: errorData.error || 'Failed to analyze contract' };
    }
    return res.json();
  }

  // Team Builder - Get AI suggestions for team selection
  async getTeamSuggestions(aiFindings: string, contractName: string): Promise<{success: boolean, suggestions?: string, error?: string}> {
    const res = await fetch(`${API_BASE()}/team-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiFindings, contractName })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to get team suggestions' }));
      return { success: false, error: errorData.error || 'Failed to get team suggestions' };
    }
    return res.json();
  }

  // Team Builder - Extract company info from website URL
  async extractCompanyFromWebsite(url: string): Promise<{
    success: boolean;
    company_name?: string;
    contact_number?: string;
    email?: string;
    services_area?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/team-from-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to extract company info' }));
      return { success: false, error: errorData.error || 'Failed to extract company info' };
    }
    return res.json();
  }

  // Proposal Summary - Get checkpoint
  async getProposalSummary(contractId: string): Promise<{
    success: boolean;
    summary?: {
      contract_id: string;
      contract_name: string;
      ai_findings: string;
      ai_suggestions: string;
      ai_strategy: string;
      team_members: Array<{name: string; role: string; email?: string; phone?: string}>;
      labor_costs: Array<{id: string; role: string; hours: number; rate: number; cost: number}>;
      materials: Array<{id: string; item: string; quantity: number; unit_cost: number; cost: number}>;
      margin_risk: {profit_margin_pct: number; risk_reserve_pct: number};
      totals: {
        labor_costs: number;
        materials_costs: number;
        subtotal: number;
        profit_margin: number;
        risk_reserve: number;
        total_bid_amount: number;
      };
      updated_at: string;
    } | null;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/proposal-summary?contract_id=${encodeURIComponent(contractId)}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to get proposal summary' }));
      return { success: false, error: errorData.error || 'Failed to get proposal summary' };
    }
    return res.json();
  }

  // Proposal Summary - Save checkpoint
  async saveProposalSummary(data: {
    contract_id: string;
    contract_name: string;
    ai_findings: string;
    ai_suggestions: string;
    ai_strategy: string;
    team_members: Array<{name: string; role: string; email?: string; phone?: string}>;
    labor_costs: Array<{id: string; role: string; hours: number; rate: number; cost: number}>;
    materials: Array<{id: string; item: string; quantity: number; unit_cost: number; cost: number}>;
    margin_risk: {profit_margin_pct: number; risk_reserve_pct: number};
  }): Promise<{success: boolean; summary?: object; error?: string}> {
    const res = await fetch(`${API_BASE()}/proposal-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to save proposal summary' }));
      return { success: false, error: errorData.error || 'Failed to save proposal summary' };
    }
    return res.json();
  }

  // Proposal Strategy - Generate AI strategy
  async generateProposalStrategy(data: {
    contract_id: string;
    contract_name: string;
    ai_findings: string;
    ai_suggestions: string;
    team_members: Array<{name: string; role: string; email?: string; phone?: string}>;
  }): Promise<{success: boolean; strategy?: string; error?: string}> {
    const res = await fetch(`${API_BASE()}/proposal-strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to generate strategy' }));
      return { success: false, error: errorData.error || 'Failed to generate strategy' };
    }
    return res.json();
  }

  // Initialize Proposal Draft - Creates/updates a draft in proposal_drafts for use with generate_proposal_sections
  async initializeProposalDraft(data: {
    contract_id: string;
    contract_name: string;
    ai_findings: string;
    ai_suggestions: string;
    ai_strategy: string;
    team_members: Array<{name: string; role: string; email?: string; phone?: string}>;
    labor_costs: Array<{id: string; role: string; hours: number; rate: number; cost: number}>;
    materials: Array<{id: string; item: string; quantity: number; unit_cost: number; cost: number}>;
    margin_risk: {profit_margin_pct: number; risk_reserve_pct: number};
  }): Promise<{success: boolean; draft_id?: string; error?: string}> {
    const res = await fetch(`${API_BASE()}/initialize-proposal-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to initialize draft' }));
      return { success: false, error: errorData.error || 'Failed to initialize draft' };
    }
    return res.json();
  }

  // Generate Proposal Sections - Starts job and returns job_id for SSE streaming
  async generateProposalSections(draftId: string): Promise<{
    success: boolean;
    job_id?: string;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/generate_proposal_sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ draft_id: draftId })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to generate proposal' }));
      return { success: false, error: errorData.error || 'Failed to generate proposal' };
    }
    return res.json();
  }

  // Get SSE URL for proposal generation progress
  getProposalEventsUrl(jobId: string): string {
    return `${API_BASE()}/generate_proposal_sections/events/${jobId}`;
  }

  // Get proposal generation job status
  async getProposalJobStatus(jobId: string): Promise<{
    success: boolean;
    job_id?: string;
    status?: string;
    sections_completed?: number[];
    sections_total?: number;
    full_proposal?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/generate_proposal_sections/status/${jobId}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to get job status' }));
      return { success: false, error: errorData.error || 'Failed to get job status' };
    }
    return res.json();
  }

  // Download Proposal DOCX - Opens download in new window
  downloadProposalDocx(draftId: string): void {
    window.open(`${API_BASE()}/download_proposal_pdf?draft_id=${draftId}`, '_blank');
  }

  // Send Team Assignment Emails - Notifies team members added from Corama Directory
  async sendTeamAssignmentEmails(data: {
    team_members: Array<{name: string; role: string; email?: string; phone?: string}>;
    contract_name: string;
  }): Promise<{success: boolean; emails_sent?: number; errors?: string[]; error?: string}> {
    const res = await fetch(`${API_BASE()}/send-team-assignment-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Not authenticated' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to send emails' }));
      return { success: false, error: errorData.error || 'Failed to send emails' };
    }
    return res.json();
  }

  // ============================================================================
  // ADMIN API ENDPOINTS
  // ============================================================================

  // Check if current user has admin privileges
  async checkAdminStatus(): Promise<{success: boolean; is_admin: boolean; email?: string; error?: string}> {
    const res = await fetch(`${API_BASE()}/admin/check-status`, {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, is_admin: false, error: 'Not authenticated' };
      }
      return { success: false, is_admin: false, error: 'Failed to check admin status' };
    }
    return res.json();
  }

  // Get all directory listings (admin only)
  async adminGetDirectoryListings(): Promise<{
    success: boolean;
    listings?: Array<{
      user_id: string;
      company: string;
      contact_name: string;
      email: string;
      phone: string;
      listed: boolean;
      updated_at?: string;
    }>;
    count?: number;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/admin/directory/list`, {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Not authenticated' };
      }
      if (res.status === 403) {
        return { success: false, error: 'Admin access required' };
      }
      return { success: false, error: 'Failed to load directory listings' };
    }
    return res.json();
  }

  // Delete a directory listing (admin only)
  async adminDeleteDirectoryListing(userId: string): Promise<{
    success: boolean;
    message?: string;
    deleted_user_id?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/admin/directory/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Not authenticated' };
      }
      if (res.status === 403) {
        return { success: false, error: 'Admin access required' };
      }
      if (res.status === 404) {
        return { success: false, error: 'Directory listing not found' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to delete listing' }));
      return { success: false, error: errorData.error || 'Failed to delete listing' };
    }
    return res.json();
  }

  // Credit History
  async getCreditHistory(): Promise<{
    success: boolean;
    transactions?: Array<{
      id: string;
      date: string;
      action: string;
      cost: number;
      timestamp: string;
    }>;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/credit-history`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to fetch credit history' }));
      return { success: false, error: errorData.error || 'Failed to fetch credit history' };
    }
    return res.json();
  }

  // Send Support Message
  async sendSupportMessage(message: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/send-support-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
      return { success: false, error: errorData.error || 'Failed to send message' };
    }
    return res.json();
  }

  // Update Username
  async updateUsername(username: string): Promise<{
    success: boolean;
    message?: string;
    username?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/update-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to update username' }));
      return { success: false, error: errorData.error || 'Failed to update username' };
    }
    return res.json();
  }

  // Change Password
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to change password' }));
      return { success: false, error: errorData.error || 'Failed to change password' };
    }
    return res.json();
  }

  // Logout
  logout(): void {
    // Clear credits cache to prevent showing previous user's credits on next login
    sessionStorage.removeItem('corama_credits_cache');
    sessionStorage.removeItem('corama_credits_animated');
    sessionStorage.removeItem('corama_credits_last_value');
    window.location.href = '/logout';
  }

  // Admin: Backfill NAICS codes for contracts missing them
  async adminBackfillNaics(limit?: number): Promise<{
    success: boolean;
    total_contracts?: number;
    contracts_without_naics?: number;
    generated_count?: number;
    failed_count?: number;
    results?: Array<{
      title: string;
      naics_codes: string;
      success: boolean;
    }>;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/backfill_naics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(limit ? { limit } : {})
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized - admin access required' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to backfill NAICS codes' }));
      return { success: false, error: errorData.error || 'Failed to backfill NAICS codes' };
    }
    return res.json();
  }

  // Admin: List all contracts with hidden status
  async adminGetContracts(page: number = 1, perPage: number = 50, search: string = ''): Promise<{
    success: boolean;
    contracts?: Array<{
      id: string;
      title: string;
      state: string;
      contract_type: string;
      agency: string;
      deadline: string;
      hidden: boolean;
    }>;
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
    hidden_count?: number;
    error?: string;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      ...(search && { search })
    });
    const res = await fetch(`${API_BASE()}/admin/contracts/list?${params}`, {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized - admin access required' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to load contracts' }));
      return { success: false, error: errorData.error || 'Failed to load contracts' };
    }
    return res.json();
  }

  // Admin: Hide a contract from normal users
  async adminHideContract(contractId: string): Promise<{
    success: boolean;
    message?: string;
    contract_id?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/admin/contracts/hide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ contract_id: contractId })
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized - admin access required' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to hide contract' }));
      return { success: false, error: errorData.error || 'Failed to hide contract' };
    }
    return res.json();
  }

  // Admin: Unhide a contract (make visible to normal users again)
  async adminUnhideContract(contractId: string): Promise<{
    success: boolean;
    message?: string;
    contract_id?: string;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/admin/contracts/unhide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ contract_id: contractId })
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized - admin access required' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to unhide contract' }));
      return { success: false, error: errorData.error || 'Failed to unhide contract' };
    }
    return res.json();
  }

  // Admin: Get list of hidden contract IDs
  async adminGetHiddenContracts(): Promise<{
    success: boolean;
    hidden_contract_ids?: string[];
    count?: number;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE()}/admin/contracts/hidden`, {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized - admin access required' };
      }
      const errorData = await res.json().catch(() => ({ error: 'Failed to get hidden contracts' }));
      return { success: false, error: errorData.error || 'Failed to get hidden contracts' };
    }
    return res.json();
  }
}

export const api = new ApiService();
