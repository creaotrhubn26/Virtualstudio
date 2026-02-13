import { createContext, useCallback, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import type { AlertColor } from '@mui/material';
import { ToastProvider, useToast } from './components/ToastStack';

export interface VirtualStudioToast {
  message: string;
  type?: AlertColor;
  duration?: number;
}

interface VirtualStudioContextValue {
  addToast: (toast: VirtualStudioToast) => void;
}

const VirtualStudioContext = createContext<VirtualStudioContextValue | undefined>(undefined);

const VirtualStudioBridge: FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToast();

  const addToast = useCallback(
    ({ message, type = 'info', duration }: VirtualStudioToast) => {
      toast.showToast({
        message,
        severity: type,
        duration,
      });
    },
    [toast]
  );

  return (
    <VirtualStudioContext.Provider value={{ addToast }}>
      {children}
    </VirtualStudioContext.Provider>
  );
};

export const VirtualStudioProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <ToastProvider>
    <VirtualStudioBridge>{children}</VirtualStudioBridge>
  </ToastProvider>
);

export const useVirtualStudio = () => {
  const context = useContext(VirtualStudioContext);
  if (!context) {
    throw new Error('useVirtualStudio must be used within VirtualStudioProvider');
  }
  return context;
};
