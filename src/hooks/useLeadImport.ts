import { useState, useCallback } from 'react';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  createdAt: string;
}

export function useLeadImport() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importLeads = useCallback(async (data: Lead[]) => {
    setImporting(true);
    setError(null);
    try {
      setLeads(prev => [...prev, ...data]);
      return { success: true, count: data.length };
    } catch (err) {
      setError('Feil ved import av leads');
      return { success: false, count: 0 };
    } finally {
      setImporting(false);
    }
  }, []);

  const clearLeads = useCallback(() => {
    setLeads([]);
  }, []);

  return { leads, importing, error, importLeads, clearLeads };
}
