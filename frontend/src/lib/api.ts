const API_BASE_URL = 'https://app-yincusyo.fly.dev/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getOpportunities(params?: {
    source?: string;
    naics?: string;
    due_before?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.source) searchParams.append('source', params.source);
    if (params?.naics) searchParams.append('naics', params.naics);
    if (params?.due_before) searchParams.append('due_before', params.due_before);
    
    const query = searchParams.toString();
    return this.request(`/opportunities${query ? `?${query}` : ''}`);
  }

  async createOpportunity(opportunity: any) {
    return this.request('/opportunities', {
      method: 'POST',
      body: JSON.stringify(opportunity),
    });
  }

  async scoreOpportunity(opportunityId: number): Promise<any> {
    return this.request(`/opportunities/${opportunityId}/score`, {
      method: 'POST',
    });
  }

  async createLead(lead: any): Promise<any> {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }

  async generateQuote(quoteRequest: any, leadId?: number): Promise<any> {
    const body = leadId ? { ...quoteRequest, lead_id: leadId } : quoteRequest;
    return this.request('/quotes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async downloadQuotePdf(quoteId: number) {
    const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/pdf`);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    return response.blob();
  }

  async enhanceDescription(data: {
    company_name: string;
    industry: string;
    services: string;
  }) {
    const formData = new FormData();
    formData.append('company_name', data.company_name);
    formData.append('industry', data.industry);
    formData.append('services', data.services);

    return this.request('/ai/enhance-description', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async generateBulletPoints(ideas: string) {
    const formData = new FormData();
    formData.append('ideas', ideas);

    return this.request('/ai/generate-bullet-points', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async getDashboardKPIs(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.date_from) searchParams.append('date_from', params.date_from);
    if (params?.date_to) searchParams.append('date_to', params.date_to);
    
    const query = searchParams.toString();
    return this.request(`/dashboard/kpis${query ? `?${query}` : ''}`);
  }

  async fetchSamOpportunities(params?: {
    naics?: string;
    keywords?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.naics) searchParams.append('naics', params.naics);
    if (params?.keywords) searchParams.append('keywords', params.keywords);
    
    const query = searchParams.toString();
    return this.request(`/integrations/sam-gov/opportunities${query ? `?${query}` : ''}`);
  }

  async fetchIllinoisOpportunities() {
    return this.request('/integrations/illinois-bidbuy/opportunities');
  }

  async uploadDocument(file: File, documentType: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return this.request('/documents/upload', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }
}

export const apiClient = new ApiClient();
