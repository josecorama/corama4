const API_BASE = '/api';

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

class ApiService {
  // User
  async getUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/me`);
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
  async getContracts(page: number = 1): Promise<{contracts: Contract[], total_pages: number, total_contracts: number}> {
    const res = await fetch(`${API_BASE}/contracts?page=${page}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Not authenticated');
      }
      throw new Error('Failed to fetch contracts');
    }
    return res.json();
  }

  async searchContracts(query: string, page: number = 1): Promise<{success: boolean, contracts: Contract[], total_pages: number, total_contracts: number}> {
    const res = await fetch('/dashboard_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, page })
    });
    if (!res.ok) throw new Error('Failed to search contracts');
    return res.json();
  }

  // Top Five
  async getTopFiveContracts(): Promise<{success: boolean, matches: ContractMatch[], has_matches: boolean}> {
    const res = await fetch(`${API_BASE}/top-five-contracts`);
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

    const res = await fetch('/ai_assistant_enhanced', {
      method: 'POST',
      body: formData
    });
    return res.json();
  }

  // Credits
  async getCredits(): Promise<{success: boolean, current_balance: number, credits_used: number, packages: CreditPackage[]}> {
    const res = await fetch(`${API_BASE}/credits`);
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
    const res = await fetch('/create_credit_checkout', {
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

    const res = await fetch('/upload_and_process', {
      method: 'POST',
      body: formData
    });
    return res.json();
  }

  // Directory
  async getDirectory(page: number = 1, search: string = ''): Promise<{success: boolean, companies: DirectoryCompany[], total: number, page: number, total_pages: number}> {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/directory?${params}`);
    if (!res.ok) throw new Error('Failed to fetch directory');
    return res.json();
  }

  // Logout
  logout(): void {
    window.location.href = '/logout';
  }
}

export const api = new ApiService();
