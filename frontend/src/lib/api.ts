import { auth } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const getHeaders = (extraHeaders = {}) => {
  const token = auth.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders
  };
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    auth.logout();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Request failed");
  }
  return res.json();
};

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(formData: FormData) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', body: formData });
    return handleResponse(res);
  },

  async signup(data: any) {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Leads ─────────────────────────────────────────────────────────────────
  async getLeads(filters: any = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE_URL}/leads?${params}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async triggerScrape(campaignId: number, niche: string, location: string, maxResults: number = 20) {
    const res = await fetch(
      `${API_BASE_URL}/leads/scrape?campaign_id=${campaignId}&niche=${niche}&location=${location}&max_results=${maxResults}`,
      { method: 'POST', headers: getHeaders() }
    );
    return handleResponse(res);
  },

  async updateLeadStatus(leadId: number, status: string) {
    const res = await fetch(`${API_BASE_URL}/leads/${leadId}/status?status=${status}`, {
      method: 'PATCH', headers: getHeaders()
    });
    return handleResponse(res);
  },

  async generateMessage(leadId: number) {
    const res = await fetch(`${API_BASE_URL}/leads/${leadId}/generate-message`, {
      method: 'POST', headers: getHeaders()
    });
    return handleResponse(res);
  },

  // ── Scoring ───────────────────────────────────────────────────────────────
  async getScoringConfig() {
    const res = await fetch(`${API_BASE_URL}/scoring/config`);
    return handleResponse(res);
  },

  async updateScoringConfig(data: any) {
    const res = await fetch(`${API_BASE_URL}/scoring/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async recalculateScores() {
    const res = await fetch(`${API_BASE_URL}/scoring/recalculate`, { method: 'POST' });
    return handleResponse(res);
  },

  // ── Campaigns (unified) ───────────────────────────────────────────────────
  async getCampaigns() {
    const res = await fetch(`${API_BASE_URL}/campaigns`, { headers: getHeaders() });
    return handleResponse(res);
  },

  /** Create a campaign – manual or AI-driven, all via one endpoint */
  async createCampaign(payload: {
    name: string;
    niche: string;
    // Manual mode
    location?: string;
    llm_key_id?: number;
    prompt_instructions?: string;
    // AI mode
    is_ai_driven?: boolean;
    ai_prompt?: string;
    target_leads?: number;
    // Scoring
    weight_has_website?: number;
    weight_no_website?: number;
    weight_has_whatsapp?: number;
    weight_no_chatbot?: number;
    weight_has_booking?: number;
    weight_no_response_mechanism?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateCampaign(
    campaignId: number,
    name?: string,
    niche?: string,
    location?: string,
    weights?: any,
    llmKeyId?: number,
    promptInstructions?: string
  ) {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (niche) params.append('niche', niche);
    if (location) params.append('location', location);
    if (llmKeyId !== undefined) params.append('llm_key_id', llmKeyId.toString());
    if (promptInstructions !== undefined) params.append('prompt_instructions', promptInstructions);

    const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}?${params.toString()}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: weights ? JSON.stringify(weights) : null,
    });
    return handleResponse(res);
  },

  async stopCampaign(campaignId: number) {
    const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/stop`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async deleteCampaign(campaignId: number) {
    const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // ── Auto-Pilot shims (kept for the Auto-Pilot page) ──────────────────────
  async getMacroCampaigns() {
    const res = await fetch(`${API_BASE_URL}/campaigns/macro/list`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createMacroCampaign(name: string, prompt: string, targetLeads: number, niche: string) {
    const res = await fetch(`${API_BASE_URL}/campaigns/macro/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, prompt, target_leads: targetLeads, niche }),
    });
    return handleResponse(res);
  },

  async stopMacroCampaign(id: number) {
    return this.stopCampaign(id);
  },

  async deleteMacroCampaign(id: number) {
    return this.deleteCampaign(id);
  },

  // ── LLM Keys ─────────────────────────────────────────────────────────────
  async getLLMKeys() {
    const res = await fetch(`${API_BASE_URL}/llm-keys`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async addLLMKey(provider: string, apiKey: string, name: string) {
    const res = await fetch(`${API_BASE_URL}/llm-keys`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ provider, api_key: apiKey, name }),
    });
    return handleResponse(res);
  },

  async deleteLLMKey(keyId: number) {
    const res = await fetch(`${API_BASE_URL}/llm-keys/${keyId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
