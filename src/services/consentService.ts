import { Consent, Candidate } from '../core/models/casting';
import { castingService } from './castingService';

/**
 * Consent Service
 * Handles consent management for candidates
 */
export const consentService = {
  /**
   * Get all consents for a candidate
   */
  async getConsents(projectId: string, candidateId: string): Promise<Consent[]> {
    return await castingService.getConsents(projectId, candidateId);
  },

  /**
   * Get consent by ID
   */
  async getConsent(projectId: string, candidateId: string, consentId: string): Promise<Consent | null> {
    const consents = await this.getConsents(projectId, candidateId);
    return consents.find(c => c.id === consentId) || null;
  },

  /**
   * Create a new consent
   */
  async createConsent(projectId: string, candidateId: string, type: Consent['type']): Promise<Consent> {
    const consent: Consent = {
      id: `consent-${Date.now()}`,
      candidateId,
      type,
      signed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await castingService.saveConsent(projectId, candidateId, consent);
    return consent;
  },

  /**
   * Update consent
   */
  async updateConsent(projectId: string, candidateId: string, consent: Consent): Promise<void> {
    await castingService.saveConsent(projectId, candidateId, consent);
  },

  /**
   * Sign consent
   */
  async signConsent(projectId: string, candidateId: string, consentId: string, document?: string): Promise<void> {
    const consent = await this.getConsent(projectId, candidateId, consentId);
    if (!consent) return;
    
    consent.signed = true;
    consent.date = new Date().toISOString();
    if (document) {
      consent.document = document;
    }
    
    await castingService.saveConsent(projectId, candidateId, consent);
  },

  /**
   * Delete consent
   */
  async deleteConsent(projectId: string, candidateId: string, consentId: string): Promise<void> {
    await castingService.deleteConsent(projectId, candidateId, consentId);
  },

  /**
   * Check if candidate has all required consents
   */
  async hasAllRequiredConsents(projectId: string, candidateId: string, requiredTypes: Consent['type'][]): Promise<boolean> {
    const consents = await this.getConsents(projectId, candidateId);
    const signedConsents = consents.filter(c => c.signed);
    
    return requiredTypes.every(type => 
      signedConsents.some(c => c.type === type)
    );
  },

  /**
   * Get missing consents for a candidate
   */
  async getMissingConsents(projectId: string, candidateId: string, requiredTypes: Consent['type'][]): Promise<Consent['type'][]> {
    const consents = await this.getConsents(projectId, candidateId);
    const signedConsents = consents.filter(c => c.signed);
    const signedTypes = signedConsents.map(c => c.type);
    
    return requiredTypes.filter(type => !signedTypes.includes(type));
  },

  /**
   * Get consent status summary for a candidate
   */
  async getConsentStatus(projectId: string, candidateId: string): Promise<{
    total: number;
    signed: number;
    pending: number;
    missing: Consent['type'][];
  }> {
    const consents = await this.getConsents(projectId, candidateId);
    const consentsArray = Array.isArray(consents) ? consents : [];
    const signed = consentsArray.filter(c => c.signed).length;
    const pending = consentsArray.filter(c => !c.signed).length;
    
    return {
      total: consentsArray.length,
      signed,
      pending,
      missing: [], // Can be extended to check against required types
    };
  },
};





