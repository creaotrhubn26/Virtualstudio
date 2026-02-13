import React, { createContext, useContext, ReactNode } from 'react';

interface FeatureAccess {
  checkFeatureAccess: (featureId: string, userRole?: string) => { hasAccess: boolean; reason?: string };
  trackFeatureUsage: (featureId: string, action: string, metadata?: any) => void;
  getFeatureAnalytics: () => {
    enabledFeatures: number;
    totalFeatures: number;
    featureAdoptionRate: number;
  };
}

interface Analytics {
  trackEvent: (eventName: string, metadata?: any) => void;
}

interface Performance {
  measure: (name: string, fn: () => void) => void;
  startTiming: (label: string) => () => void;
}

interface Debugging {
  log: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  logIntegration: (level: string, message: string, data?: any) => void;
}

interface AuthUser {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
  profession?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error?: string;
}

interface Auth {
  state: AuthState;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

interface Lifecycle {
  registerComponent: (config: {
    id: string;
    type: string;
    version: string;
    capabilities: Record<string, string[]>;
    dependencies: string[];
    lastActive: number;
    performance: { renderCount: number; avgRenderTime: number; memoryUsage: number };
  }) => void;
  unregisterComponent: (id: string) => void;
}

interface Health {
  status: string;
  uptime: number;
}

interface EnhancedMasterIntegrationType {
  analytics: Analytics;
  performance: Performance;
  debugging: Debugging;
  features: FeatureAccess;
  lifecycle: Lifecycle;
  health: Health;
  auth: Auth;
}

const EnhancedMasterIntegrationContext = createContext<EnhancedMasterIntegrationType | undefined>(undefined);

export const EnhancedMasterIntegrationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const analytics: Analytics = {
    trackEvent: (eventName: string, metadata?: any) => {
      console.log('[Analytics]', eventName, metadata);
    },
  };

  const performance: Performance = {
    measure: (name: string, fn: () => void) => {
      const start = Date.now();
      fn();
      const end = Date.now();
      console.log(`[Performance] ${name}: ${end - start}ms`);
    },
    startTiming: (label: string) => {
      const start = Date.now();
      return () => {
        const end = Date.now();
        console.log(`[Performance] ${label}: ${end - start}ms`);
      };
    },
  };

  const debugging: Debugging = {
    log: (message: string, data?: any) => {
      console.log('[Debug]', message, data);
    },
    error: (message: string, error?: any) => {
      console.error('[Debug Error]', message, error);
    },
    logIntegration: (level: string, message: string, data?: any) => {
      console.log(`[Integration ${level}]`, message, data);
    },
  };

  const features: FeatureAccess = {
    checkFeatureAccess: (featureId: string, _userRole?: string) => {
      // Default: all features enabled
      return { hasAccess: true, reason: undefined };
    },
    trackFeatureUsage: (featureId: string, action: string, metadata?: any) => {
      console.log('[Feature Usage]', featureId, action, metadata);
    },
    getFeatureAnalytics: () => {
      return {
        enabledFeatures: 10,
        totalFeatures: 10,
        featureAdoptionRate: 1.0,
      };
    },
  };

  const lifecycle: Lifecycle = {
    registerComponent: (config) => {
      console.log('[Lifecycle] Register:', config.id);
    },
    unregisterComponent: (id) => {
      console.log('[Lifecycle] Unregister:', id);
    },
  };

  const health: Health = {
    status: 'healthy',
    uptime: Date.now(),
  };

  const auth: Auth = {
    state: {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: undefined,
    },
    login: () => { console.log('[Auth] Login'); },
    logout: () => { console.log('[Auth] Logout'); },
    hasRole: (_role: string) => false,
  };

  const value: EnhancedMasterIntegrationType = {
    analytics,
    performance,
    debugging,
    features,
    lifecycle,
    health,
    auth,
  };

  return (
    <EnhancedMasterIntegrationContext.Provider value={value}>
      {children}
    </EnhancedMasterIntegrationContext.Provider>
  );
};

export const useEnhancedMasterIntegration = (): EnhancedMasterIntegrationType => {
  const context = useContext(EnhancedMasterIntegrationContext);
  if (!context) {
    // Return default implementation if context not available
    return {
      analytics: {
        trackEvent: () => {},
      },
      performance: {
        measure: (name, fn) => fn(),
        startTiming: () => () => {},
      },
      debugging: {
        log: () => {},
        error: () => {},
        logIntegration: () => {},
      },
      features: {
        checkFeatureAccess: () => ({ hasAccess: true, reason: undefined }),
        trackFeatureUsage: () => {},
        getFeatureAnalytics: () => ({
          enabledFeatures: 10,
          totalFeatures: 10,
          featureAdoptionRate: 1.0,
        }),
      },
      lifecycle: {
        registerComponent: () => {},
        unregisterComponent: () => {},
      },
      health: {
        status: 'healthy',
        uptime: Date.now(),
      },
      auth: {
        state: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: undefined,
        },
        login: () => {},
        logout: () => {},
        hasRole: () => false,
      },
    };
  }
  return context;
};





















