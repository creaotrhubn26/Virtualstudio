import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';

interface GestureConfig {
  pinchZoomEnabled: boolean;
  panEnabled: boolean;
  rotateEnabled: boolean;
  minScale: number;
  maxScale: number;
}

interface TabletSupportContextValue {
  shouldUseTouch: () => boolean;
  gestureConfig: GestureConfig;
  isTablet: boolean;
  isMobile: boolean;
}

const defaultGestureConfig: GestureConfig = {
  pinchZoomEnabled: true,
  panEnabled: true,
  rotateEnabled: false,
  minScale: 0.5,
  maxScale: 3,
};

const TabletSupportContext = createContext<TabletSupportContextValue>({
  shouldUseTouch: () => false,
  gestureConfig: defaultGestureConfig,
  isTablet: false,
  isMobile: false,
});

interface TabletSupportProviderProps {
  children: ReactNode;
}

export function TabletSupportProvider({ children }: TabletSupportProviderProps) {
  const isTablet = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  }, []);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipod|android.*mobile|windows phone/i.test(userAgent);
  }, []);

  const shouldUseTouch = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const value = useMemo(() => ({
    shouldUseTouch,
    gestureConfig: defaultGestureConfig,
    isTablet,
    isMobile,
  }), [shouldUseTouch, isTablet, isMobile]);

  return (
    <TabletSupportContext.Provider value={value}>
      {children}
    </TabletSupportContext.Provider>
  );
}

export function useTabletSupport() {
  return useContext(TabletSupportContext);
}

