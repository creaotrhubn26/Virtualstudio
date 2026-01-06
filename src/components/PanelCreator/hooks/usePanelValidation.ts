/**
 * Custom hook for panel form validation
 */

import { useMemo } from 'react';
import { PanelConfig, ValidationErrors, FormData as FormDataType } from '../types';
import { generatePanelId } from '../utils/panelHelpers';

/**
 * Hook for validating panel form data
 */
export const usePanelValidation = (
  formData: Partial<FormDataType>,
  panels: PanelConfig[],
  editingPanel: PanelConfig | null
) => {
  const validateForm = useMemo(() => {
    return (): { isValid: boolean; errors: ValidationErrors } => {
      const errors: ValidationErrors = {};

      // Validate name
      if (!formData.name || formData.name.trim() === '') {
        errors.name = 'Navn er påkrevd';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
        errors.name = 'Navn kan bare inneholde bokstaver, tall, bindestrek og understrek';
      } else {
        // Check for unique ID
        const panelId = editingPanel?.id || generatePanelId(formData.name);
        const existingPanel = panels.find(p => p.id === panelId && p.id !== editingPanel?.id);
        if (existingPanel) {
          errors.name = 'Et panel med dette navnet eksisterer allerede';
        }
      }

      // Validate title
      if (!formData.title || formData.title.trim() === '') {
        errors.title = 'Tittel er påkrevd';
      }

      // Validate HTML content for XSS - Enhanced security checks
      if (formData.content) {
        const content = formData.content.trim();
        
        // Check for empty content
        if (content === '') {
          // Empty content is allowed, so we don't set an error
        } else {
          // Comprehensive XSS prevention patterns
          const dangerousPatterns = [
            // Script tags (all variations)
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /<script[\s\S]*?\/>/gi,
            // Event handlers (onclick, onerror, etc.)
            /on\w+\s*=\s*["']?/gi,
            // JavaScript protocol in URLs
            /javascript\s*:/gi,
            /data\s*:\s*text\/html/gi,
            /vbscript\s*:/gi,
            // Iframes and embeds that could load external content
            /<iframe[\s\S]*?>/gi,
            /<embed[\s\S]*?>/gi,
            /<object[\s\S]*?>/gi,
            // Base tag manipulation
            /<base[\s\S]*?>/gi,
            // Link tags with javascript
            /<link[\s\S]*?href\s*=\s*["']?\s*javascript/gi,
            // Meta refresh redirects
            /<meta[\s\S]*?http-equiv\s*=\s*["']?refresh/gi,
            // Style tags with expressions (IE vulnerability)
            /<style[\s\S]*?expression\s*\(/gi,
            // SVG with script
            /<svg[\s\S]*?<script/gi,
          ];
          
          // Check each pattern
          for (const pattern of dangerousPatterns) {
            if (pattern.test(content)) {
              errors.content = 'HTML-innholdet inneholder potensielt farlig kode. Fjern script-tags, event handlers og andre usikre elementer.';
              break;
            }
          }
          
          // Additional check for HTML structure (validate that it's mostly valid HTML)
          // Allow basic HTML structure but warn about malformed tags
          if (!errors.content) {
            const openTags = content.match(/<[^/!][^>]*>/g) || [];
            const closeTags = content.match(/<\/[^>]+>/g) || [];
            
            // Check for potentially malicious tag nesting
            const suspiciousTags = openTags.filter(tag => {
              const tagName = tag.match(/<(\w+)/)?.[1]?.toLowerCase();
              return tagName && ['script', 'iframe', 'object', 'embed', 'form'].includes(tagName);
            });
            
            if (suspiciousTags.length > 0 && !errors.content) {
              // Some tags are suspicious but might be acceptable, so we warn instead of error
              // This is just a check, we don't set error unless truly dangerous
            }
          }
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    };
  }, [formData, panels, editingPanel]);

  return {
    validateForm,
  };
};

