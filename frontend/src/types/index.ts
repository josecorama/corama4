export interface Company {
  id: number;
  name: string;
  tax_id?: string;
  addresses: Address[];
  contacts: Contact[];
  created_at: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  type: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface User {
  id: number;
  company_id: number;
  role: 'admin' | 'sales' | 'production' | 'purchasing';
  email: string;
  phone?: string;
  locale: 'es' | 'en';
  created_at: string;
}

export interface Opportunity {
  id: number;
  source: string;
  buyer?: string;
  title: string;
  description?: string;
  naics: string[];
  publish_date?: string;
  due_date?: string;
  budget?: number;
  docs: string[];
  set_asides: string[];
  status: string;
  delivery_location?: string;
  contact?: Contact;
  days_until_due?: number;
  d_day_status?: string;
}

export interface Score {
  opportunity_id: number;
  total_score: number;
  breakdown: {
    technical: number;
    economic: number;
    operational: number;
    compliance: number;
    strategy: number;
  };
  recommendation: 'BID' | 'NO-BID' | 'REVIEW';
  rationale: {
    technical: string;
    economic: string;
    operational: string;
    compliance: string;
    strategy: string;
    overall: string;
  };
  improvements: string[];
}

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  utm?: Record<string, any>;
  interest?: string;
  created_at: string;
}

export interface QuoteRequest {
  width: number;
  height: number;
  quantity: number;
  substrate: string;
  dpi: number;
  finishes: string[];
  urgency: 'normal' | 'urgent' | 'express';
}

export interface Quote {
  id: number;
  items: QuoteItem[];
  subtotal: number;
  overhead: number;
  margin: number;
  total: number;
  pdf_url?: string;
  breakdown: CostBreakdown;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  specifications: {
    width: number;
    height: number;
    substrate: string;
    dpi: number;
    finishes: string[];
  };
}

export interface CostBreakdown {
  area_m2: number;
  total_area: number;
  material_cost: number;
  printing_cost: number;
  labor_cost: number;
  labor_hours: number;
  machine_cost: number;
  finishing_cost: number;
  subtotal: number;
  overhead: number;
  overhead_pct: number;
  margin: number;
  margin_pct: number;
  total: number;
  unit_price: number;
}

export interface Deal {
  id: number;
  opportunity_id?: number;
  lead_id?: number;
  stage: 'discovery' | 'qualification' | 'bid_no_bid' | 'proposal' | 'negotiation' | 'won' | 'lost';
  owner_id: number;
  amount?: number;
  probability?: number;
  close_date?: string;
  created_at: string;
}

export interface KPIs {
  total_opportunities: number;
  total_leads: number;
  total_quotes: number;
  total_deals: number;
  win_rate: number;
  total_revenue: number;
  avg_deal_size: number;
}

export interface CatalogItem {
  id: number;
  company_id: number;
  name: string;
  category: 'gran_formato' | 'offset' | 'digital' | 'serigrafia' | 'sublimacion';
  substrates: string[];
  finishes: string[];
  base_costs: Record<string, number>;
  created_at: string;
}
