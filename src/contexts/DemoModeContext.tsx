import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
  setDemoMode: (value: boolean) => void;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const value = useMemo(() => ({
    isDemoMode,
    setDemoMode: setIsDemoMode,
    toggleDemoMode: () => setIsDemoMode(prev => !prev),
  }), [isDemoMode]);

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (!context) {
    return { isDemoMode: false, setDemoMode: () => {}, toggleDemoMode: () => {} };
  }
  return context;
};

interface DemoData {
  courses: any[];
  users: any[];
  analytics: any;
}

const defaultDemoData: DemoData = {
  courses: [
    { id: '1', title: 'Grunnleggende Studiofotografering', instructor: 'Per Hansen', duration: '4 timer', level: 'Nybegynner' },
    { id: '2', title: 'Avansert Lyssetup', instructor: 'Lise Berg', duration: '6 timer', level: 'Avansert' },
    { id: '3', title: 'Portrettfotografering', instructor: 'Erik Nilsen', duration: '3 timer', level: 'Mellom' },
  ],
  users: [
    { id: '1', name: 'Test Bruker', email: 'test@example.com', role: 'student' },
  ],
  analytics: {
    totalStudents: 1250,
    totalCourses: 45,
    averageRating: 4.7,
    totalRevenue: 125000,
  },
};

export const useDemoModeData = () => {
  const { isDemoMode } = useDemoMode();
  
  return useMemo(() => ({
    data: isDemoMode ? defaultDemoData : null,
    isLoading: false,
  }), [isDemoMode]);
};

export default DemoModeContext;
