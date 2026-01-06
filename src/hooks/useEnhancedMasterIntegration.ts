import { useState, useCallback } from 'react';

export interface EnhancedMasterIntegrationType {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface CommunicationConfig {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
}

export function useEnhancedMasterIntegration() {
  const [features] = useState<EnhancedMasterIntegrationType[]>([
    { id: 'calendar', name: 'Kalender', enabled: true, config: {} },
    { id: 'invoicing', name: 'Fakturering', enabled: true, config: {} },
    { id: 'crm', name: 'CRM', enabled: true, config: {} },
    { id: 'gallery', name: 'Galleri', enabled: true, config: {} },
    { id: 'contracts', name: 'Kontrakter', enabled: false, config: {} },
  ]);

  const [communication] = useState<CommunicationConfig>({
    email: true,
    sms: false,
    push: true,
    inApp: true,
  });

  const isFeatureEnabled = useCallback((featureId: string): boolean => {
    const feature = features.find(f => f.id === featureId);
    return feature?.enabled || false;
  }, [features]);

  const getFeatureConfig = useCallback((featureId: string): Record<string, unknown> => {
    const feature = features.find(f => f.id === featureId);
    return feature?.config || {};
  }, [features]);

  const toggleFeature = useCallback((featureId: string, enabled: boolean) => {
    console.log(`[Integration] Toggle ${featureId}: ${enabled}`);
  }, []);

  return {
    features,
    communication,
    isFeatureEnabled,
    getFeatureConfig,
    toggleFeature,
  };
}

export default useEnhancedMasterIntegration;
