/**
 * Enhanced error handling utilities for production manuscript view
 * Provides user-friendly error messages and error categorization
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorInfo {
  message: string;
  severity: ErrorSeverity;
  userMessage: string;
  code?: string;
  details?: string;
  isOnline: boolean;
  timestamp: Date;
}

/**
 * Categorize API errors and provide user-friendly messages
 */
export function handleApiError(error: any, context: string, isOnline: boolean): ErrorInfo {
  const timestamp = new Date();
  
  // Network error (offline)
  if (!isOnline) {
    return {
      message: `Offline: Could not ${context}`,
      severity: 'warning',
      userMessage: 'Du er frakoblet nettverk. Endringer lagres lokalt og synkroniseres når du får tilkobling igjen.',
      code: 'OFFLINE',
      isOnline: false,
      timestamp,
    };
  }
  
  // Network error (timeout or connection refused)
  if (error instanceof TypeError && error.message && error.message.indexOf('fetch') > -1) {
    return {
      message: `Network error during ${context}`,
      severity: 'error',
      userMessage: 'Nettverksfeil. Sjekk tilkoblingen og prøv igjen.',
      code: 'NETWORK_ERROR',
      isOnline: true,
      timestamp,
    };
  }
  
  // HTTP response errors
  if (error?.status) {
    const status = error.status;
    
    if (status === 400) {
      return {
        message: `Bad request during ${context}`,
        severity: 'warning',
        userMessage: 'Ugyldig data. Sjekk verdiene dine.',
        code: 'BAD_REQUEST',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status === 401) {
      return {
        message: `Unauthorized during ${context}`,
        severity: 'error',
        userMessage: 'Du er ikke autentisert. Logg inn på nytt.',
        code: 'UNAUTHORIZED',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status === 403) {
      return {
        message: `Forbidden during ${context}`,
        severity: 'error',
        userMessage: 'Du har ikke tilgang til denne ressursen.',
        code: 'FORBIDDEN',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status === 404) {
      return {
        message: `Not found during ${context}`,
        severity: 'warning',
        userMessage: 'Ressursen ble ikke funnet. Den kan ha blitt slettet.',
        code: 'NOT_FOUND',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status === 409) {
      return {
        message: `Conflict during ${context}`,
        severity: 'warning',
        userMessage: 'Konflikten med eksisterende data. Prøv å laste siden på nytt.',
        code: 'CONFLICT',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status === 429) {
      return {
        message: `Rate limited during ${context}`,
        severity: 'warning',
        userMessage: 'For mange forespørsler. Prøv igjen om noen sekunder.',
        code: 'RATE_LIMITED',
        isOnline: true,
        timestamp,
      };
    }
    
    if (status >= 500) {
      return {
        message: `Server error during ${context}`,
        severity: 'error',
        userMessage: 'Serverfeil. Vennligst prøv igjen senere.',
        code: 'SERVER_ERROR',
        details: `HTTP ${status}`,
        isOnline: true,
        timestamp,
      };
    }
  }
  
  // JSON parse errors
  if (error instanceof SyntaxError) {
    return {
      message: `JSON parse error during ${context}`,
      severity: 'error',
      userMessage: 'Feil ved behandling av respons fra serveren.',
      code: 'PARSE_ERROR',
      isOnline: true,
      timestamp,
    };
  }
  
  // Generic error
  return {
    message: error?.message || `Unknown error during ${context}`,
    severity: 'error',
    userMessage: `Feil ved ${context}. Prøv igjen.`,
    code: 'UNKNOWN',
    isOnline: true,
    timestamp,
  };
}

/**
 * Log error for debugging and analytics
 */
export function logError(errorInfo: ErrorInfo, additionalContext?: Record<string, any>): void {
  const timestamp = errorInfo.timestamp.toISOString();
  const logLevel = errorInfo.severity === 'critical' ? 'error' : 'warn';
  
  console[logLevel as 'error' | 'warn'](
    `[${timestamp}] ${errorInfo.code}: ${errorInfo.message}`,
    { errorInfo, additionalContext }
  );
}

/**
 * Format error for user display
 */
export function formatErrorForUser(errorInfo: ErrorInfo): string {
  if (errorInfo.severity === 'info') {
    return errorInfo.userMessage;
  }
  
  if (errorInfo.details) {
    return `${errorInfo.userMessage}\n(${errorInfo.details})`;
  }
  
  return errorInfo.userMessage;
}

/**
 * Determine if error is recoverable (can retry)
 */
export function isRecoverable(errorInfo: ErrorInfo): boolean {
  const recoverableCodes = [
    'OFFLINE',
    'NETWORK_ERROR',
    'RATE_LIMITED',
    'CONFLICT',
    'SERVER_ERROR',
  ];
  
  return recoverableCodes.indexOf(errorInfo.code || '') > -1;
}
