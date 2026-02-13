/**
 * Split Sheet API Service
 * Centralized frontend client for all split sheet related API endpoints
 */

import { apiRequest } from '@/lib/queryClient';
import type {
  SplitSheet,
  SplitSheetContributor,
  SplitSheetRevenue,
  SplitSheetPayment,
  Contract,
  CreateRevenueRequest,
  UpdatePaymentRequest,
} from '@/components/split-sheets/types';

// ==================== Revenue API ====================

export const revenueApi = {
  /**
   * Get revenue history for a split sheet
   */
  async getRevenue(splitSheetId: string): Promise<SplitSheetRevenue[]> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/revenue`);
    return response.data || [];
  },

  /**
   * Add revenue entry for a split sheet
   */
  async createRevenue(splitSheetId: string, data: CreateRevenueRequest): Promise<SplitSheetRevenue> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/revenue`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

// ==================== Payments API ====================

export const paymentsApi = {
  /**
   * Get payment history for a split sheet
   */
  async getPayments(splitSheetId: string): Promise<SplitSheetPayment[]> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/payments`);
    return response.data || [];
  },

  /**
   * Update payment status
   */
  async updatePayment(paymentId: string, data: UpdatePaymentRequest): Promise<SplitSheetPayment> {
    const response = await apiRequest(`/api/split-sheets/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

// ==================== Invoices API ====================

export interface Invoice {
  id: string;
  splitSheetId: string;
  splitSheetTitle: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  recipientEmail?: string;
  dueDate?: string;
  paidAt?: string;
  fikenInvoiceId?: string;
  createdAt: string;
}

export const invoicesApi = {
  /**
   * Get invoices for a user
   */
  async getInvoices(userId: string): Promise<Invoice[]> {
    const response = await fetch(`/api/split-sheets/invoices?userId=${userId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.invoices || [];
  },

  /**
   * Send invoice via email
   */
  async sendEmail(
    invoiceId: string,
    data: { recipientEmail: string; subject?: string; message?: string }
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiRequest(`/api/split-sheets/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Send invoice to Fiken accounting
   */
  async sendToFiken(invoiceId: string): Promise<{ success: boolean; fikenInvoiceId?: string }> {
    const response = await apiRequest(`/api/split-sheets/invoices/${invoiceId}/send-fiken`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Check Fiken integration status
   */
  async getFikenStatus(): Promise<{ hasFiken: boolean }> {
    const response = await fetch('/api/accounting/fiken/status');
    if (!response.ok) return { hasFiken: false };
    return response.json();
  },
};

// ==================== PRO Connections API ====================

export interface PROConnection {
  id?: string;
  user_id?: string;
  pro_name: 'tono' | 'stim' | 'other';
  pro_account_id?: string | null;
  isrc_prefix?: string | null;
  connection_status: 'pending' | 'connected' | 'disconnected' | 'error';
  last_sync_at?: string | null;
  created_at?: string;
}

export const proConnectionsApi = {
  /**
   * Get PRO connections for a user
   */
  async getConnections(userId?: string): Promise<PROConnection[]> {
    const url = userId
      ? `/api/split-sheets/pro-connections?userId=${userId}`
      : '/api/split-sheets/pro-connections';
    const response = await apiRequest(url);
    return response.data || [];
  },

  /**
   * Disconnect from a PRO
   */
  async disconnect(connectionId: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/api/split-sheets/pro-connections/${connectionId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ==================== Contracts API ====================

export const contractsApi = {
  /**
   * Get a contract by ID
   */
  async getContract(contractId: string): Promise<Contract | null> {
    const response = await apiRequest(`/api/contracts/${contractId}`);
    return response.data || null;
  },

  /**
   * List contracts with optional filters
   */
  async listContracts(params?: {
    split_sheet_id?: string;
    project_id?: string;
  }): Promise<Contract[]> {
    const queryParams = new URLSearchParams();
    if (params?.split_sheet_id) queryParams.set('split_sheet_id', params.split_sheet_id);
    if (params?.project_id) queryParams.set('project_id', params.project_id);

    const url = `/api/contracts${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiRequest(url);
    return response.data || [];
  },

  /**
   * Create a new contract
   */
  async createContract(data: Partial<Contract>): Promise<Contract> {
    const response = await apiRequest('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update a contract
   */
  async updateContract(contractId: string, data: Partial<Contract>): Promise<Contract> {
    const response = await apiRequest(`/api/contracts/${contractId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

// ==================== Legal Suggestions API ====================

export interface LegalSuggestion {
  id: string;
  split_sheet_id: string;
  law_id?: string;
  law_name?: string;
  law_code?: string;
  chapter?: string;
  paragraph?: string;
  content?: string;
  suggestion_type?: 'compliance_warning' | 'recommendation' | 'requirement' | 'best_practice';
  title?: string;
  description?: string;
  explanation?: string;
  confidence_score?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
  created_at?: string;
  updated_at?: string;
}

export interface LegalReference {
  id: string;
  split_sheet_id: string;
  law_id: string;
  law_name?: string;
  law_code?: string;
  chapter?: string;
  paragraph?: string;
  content?: string;
  category?: string;
  section_type?: string;
  relevance_score?: number;
  notes?: string;
  created_at?: string;
}

export const legalApi = {
  /**
   * Get legal suggestions for a split sheet
   */
  async getSuggestions(splitSheetId: string): Promise<LegalSuggestion[]> {
    const response = await apiRequest(
      `/api/norwegian-laws/split-sheets/${splitSheetId}/legal-suggestions`
    );
    return response.data || [];
  },

  /**
   * Update suggestion status
   */
  async updateSuggestion(
    splitSheetId: string,
    suggestionId: string,
    status: LegalSuggestion['status']
  ): Promise<LegalSuggestion> {
    const response = await apiRequest(
      `/api/norwegian-laws/split-sheets/${splitSheetId}/legal-suggestions/${suggestionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }
    );
    return response.data;
  },

  /**
   * Get legal references for a split sheet
   */
  async getReferences(splitSheetId: string): Promise<LegalReference[]> {
    const response = await apiRequest(
      `/api/norwegian-laws/split-sheets/${splitSheetId}/legal-references`
    );
    return response.data || [];
  },

  /**
   * Add a legal reference
   */
  async addReference(
    splitSheetId: string,
    data: Partial<LegalReference>
  ): Promise<LegalReference> {
    const response = await apiRequest(
      `/api/norwegian-laws/split-sheets/${splitSheetId}/legal-references`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Search Norwegian laws
   */
  async searchLaws(query: string, category?: string): Promise<any[]> {
    const params = new URLSearchParams({ query });
    if (category) params.set('category', category);

    const response = await apiRequest(`/api/norwegian-laws/search?${params}`);
    return response.data || [];
  },
};

// ==================== Comments API ====================

export interface SplitSheetComment {
  id: string;
  split_sheet_id: string;
  parent_comment_id?: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  content: string;
  mentions?: string[];
  is_resolved: boolean;
  created_at?: string;
  updated_at?: string;
}

export const commentsApi = {
  /**
   * Get comments for a split sheet
   */
  async getComments(splitSheetId: string): Promise<SplitSheetComment[]> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/comments`);
    return response.data || [];
  },

  /**
   * Add a comment
   */
  async addComment(
    splitSheetId: string,
    data: Partial<SplitSheetComment>
  ): Promise<SplitSheetComment> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    data: Partial<SplitSheetComment>
  ): Promise<SplitSheetComment> {
    const response = await apiRequest(`/api/split-sheets/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/api/split-sheets/comments/${commentId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ==================== Templates API ====================

export interface SplitSheetTemplate {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  is_system_template?: boolean;
  is_public?: boolean;
  profession?: 'photographer' | 'videographer' | 'music_producer' | 'vendor';
  contributors?: Partial<SplitSheetContributor>[];
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const templatesApi = {
  /**
   * Get templates
   */
  async getTemplates(userId?: string, includePublic = true): Promise<SplitSheetTemplate[]> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    params.set('include_public', String(includePublic));

    const response = await apiRequest(`/api/split-sheets/templates?${params}`);
    return response.data || [];
  },

  /**
   * Create a template
   */
  async createTemplate(data: Partial<SplitSheetTemplate>): Promise<SplitSheetTemplate> {
    const response = await apiRequest('/api/split-sheets/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/api/split-sheets/templates/${templateId}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Track template usage
   */
  async useTemplate(templateId: string): Promise<SplitSheetTemplate> {
    const response = await apiRequest(`/api/split-sheets/templates/${templateId}/use`, {
      method: 'POST',
    });
    return response.data;
  },
};

// ==================== Reports API ====================

export interface SplitSheetReport {
  id: string;
  user_id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  period?: string;
  generated_at?: string;
  download_url?: string;
  status: 'generating' | 'ready' | 'failed';
  report_data?: any;
  created_at?: string;
}

export const reportsApi = {
  /**
   * Get reports for a user
   */
  async getReports(userId: string): Promise<SplitSheetReport[]> {
    const response = await apiRequest(`/api/split-sheets/reports?userId=${userId}`);
    return response.data || [];
  },

  /**
   * Generate a new report
   */
  async generateReport(data: Partial<SplitSheetReport>): Promise<SplitSheetReport> {
    const response = await apiRequest('/api/split-sheets/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Get statistics
   */
  async getStatistics(
    userId: string
  ): Promise<{
    split_sheets: { total_split_sheets: number; completed: number; pending: number; drafts: number };
    revenue: Record<string, number>;
    payments: Record<string, { paid: number; pending: number }>;
  }> {
    const response = await apiRequest(`/api/split-sheets/statistics?userId=${userId}`);
    return response.data;
  },
};

// ==================== Export API ====================

export const exportApi = {
  /**
   * Export split sheet to CSV
   */
  async exportCsv(splitSheetId: string): Promise<Blob> {
    const response = await fetch(`/api/split-sheets/${splitSheetId}/export/csv`);
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  /**
   * Export split sheet to JSON
   */
  async exportJson(splitSheetId: string): Promise<any> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/export/json`);
    return response.data;
  },
};

// ==================== Security API ====================

export const securityApi = {
  /**
   * Get security settings
   */
  async getSettings(
    splitSheetId: string
  ): Promise<{ split_sheet_id: string; require_pin: boolean; require_password: boolean }> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/security`);
    return response.data;
  },

  /**
   * Update security settings
   */
  async updateSettings(
    splitSheetId: string,
    data: { require_pin?: boolean; require_password?: boolean }
  ): Promise<{ split_sheet_id: string; require_pin: boolean; require_password: boolean }> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}/security`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

// ==================== Core Split Sheet API ====================

export const splitSheetApi = {
  /**
   * Delete a split sheet
   */
  async delete(splitSheetId: string): Promise<{ success: boolean }> {
    const response = await apiRequest(`/api/split-sheets/${splitSheetId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ==================== Combined Export ====================

export const splitSheetService = {
  revenue: revenueApi,
  payments: paymentsApi,
  invoices: invoicesApi,
  proConnections: proConnectionsApi,
  contracts: contractsApi,
  legal: legalApi,
  comments: commentsApi,
  templates: templatesApi,
  reports: reportsApi,
  export: exportApi,
  security: securityApi,
  splitSheet: splitSheetApi,
};

export default splitSheetService;
