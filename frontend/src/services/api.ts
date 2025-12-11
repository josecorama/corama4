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
  Similarity_Score: number;
  hash_value: string;
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

  // Contracts
  async getContracts(page: number = 1): Promise<{contracts: Contract[], total_pages: number, total_contracts: number, top_categories?: {name: string, count: number, percentage: number}[]}> {
    const res = await fetch(`${API_BASE()}/contracts?page=${page}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch contracts');
    }
    return res.json();
  }

  async searchContracts(
    query: string, 
    page: number = 1, 
    contractType: string = 'all', 
    states: string[] = []
  ): Promise<{success: boolean, contracts: Contract[], total_pages: number, total_contracts: number, top_categories?: {name: string, count: number, percentage: number}[]}> {
    const res = await fetch(apiUrl('/dashboard_search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, page, contract_type: contractType, states })
    });
    if (!res.ok) throw new Error('Failed to search contracts');
    return res.json();
  }

  // Top Five
  async getTopFiveContracts(): Promise<{success: boolean, matches: ContractMatch[], has_matches: boolean}> {
    const res = await fetch(`${API_BASE()}/top-five-contracts`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch top five');
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

  // Directory
  async getDirectory(page: number = 1, search: string = ''): Promise<{success: boolean, companies: DirectoryCompany[], total: number, page: number, total_pages: number}> {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE()}/directory?${params}`);
    if (!res.ok) throw new Error('Failed to fetch directory');
    return res.json();
  }

  // Directory Profile
  async getDirectoryProfile(): Promise<{success: boolean, user_id: string, profile: DirectoryProfile}> {
    const res = await fetch(`${API_BASE()}/get_directory_profile`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch directory profile');
    }
    return res.json();
  }

  async updateDirectoryProfile(data: Partial<DirectoryProfile>): Promise<{success: boolean, error?: string}> {
    const res = await fetch(`${API_BASE()}/update_directory_profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update directory profile');
    return res.json();
  }

  async uploadDirectoryLogo(file: File): Promise<{success: boolean, logo_url?: string, error?: string}> {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${API_BASE()}/upload_directory_logo`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload logo');
    return res.json();
  }

  // Logout
  logout(): void {
    window.location.href = '/logout';
  }
}

export const api = new ApiService();
