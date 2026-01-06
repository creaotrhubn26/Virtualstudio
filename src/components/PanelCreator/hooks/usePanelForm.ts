/**
 * Custom hook for managing panel form state
 */

import React, { useState, useRef, useCallback } from 'react';
import { FormData as FormDataType, PanelConfig, PanelType } from '../types';
import { createDefaultFormData } from '../utils/panelHelpers';
import { generateFunctionContent, generateServiceContent } from '../utils/panelHelpers';
import { CREATORHUB_FUNCTIONS } from '../constants';

/**
 * Hook for managing panel form state
 */
export const usePanelForm = (
  onSave: (config: PanelConfig) => void,
  onCancel: () => void
) => {
  const [formData, setFormData] = useState<Partial<FormDataType>>(createDefaultFormData());
  const [editingPanel, setEditingPanel] = useState<PanelConfig | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setEditingPanel(null);
    setFormData(createDefaultFormData());
    setValidationErrors({});
  }, []);

  const initializeFormForEdit = useCallback((panel: PanelConfig) => {
    setEditingPanel(panel);
    setFormData({
      ...panel,
      // Ensure all fields are set
      name: panel.name || '',
      title: panel.title || '',
      description: panel.description || '',
      enabled: panel.enabled ?? true,
      position: panel.position || 'bottom',
      defaultHeight: panel.defaultHeight || 400,
      content: panel.content || '',
      type: panel.type || 'function',
      functionId: panel.functionId || '',
      serviceId: panel.serviceId || '',
      publishedToMarketplace: panel.publishedToMarketplace || false,
      version: panel.version || '1.0.0',
      author: panel.author || '',
      category: panel.category || 'service',
      tags: panel.tags || [],
    });
    setValidationErrors({});
  }, []);

  const handleTypeChange = useCallback((type: PanelType) => {
    setFormData(prev => ({
      ...prev,
      type,
      functionId: type === 'function' ? prev.functionId : '',
      serviceId: type === 'service' ? prev.serviceId : '',
      content: '', // Reset content when changing type
    }));
  }, []);

  const handleFunctionSelect = useCallback((functionId: string) => {
    const func = CREATORHUB_FUNCTIONS.find(f => f.id === functionId);
    if (func) {
      setFormData(prev => ({
        ...prev,
        functionId,
        name: func.id,
        title: func.name,
        description: func.description,
        content: generateFunctionContent(func.id),
      }));
    }
  }, []);

  const handleServiceSelect = useCallback((serviceId: string) => {
    // This will be handled by the parent component since it needs access to marketplace services
    // For now, just set the serviceId and generate content
    setFormData(prev => ({
      ...prev,
      serviceId,
      content: generateServiceContent(serviceId),
    }));
  }, []);

  const updateFormField = useCallback(<K extends keyof FormDataType>(
    field: K,
    value: FormDataType[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [validationErrors]);

  const setFieldError = useCallback((field: string, error: string) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    formData,
    editingPanel,
    validationErrors,
    resetForm,
    initializeFormForEdit,
    handleTypeChange,
    handleFunctionSelect,
    handleServiceSelect,
    updateFormField,
    setFieldError,
    clearValidationErrors,
    setFormData, // For complex updates
  };
};

