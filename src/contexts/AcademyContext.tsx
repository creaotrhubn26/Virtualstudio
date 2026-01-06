import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AcademyContextType {
  courses: any[];
  currentCourse: any | null;
  setCurrentCourse: (course: any) => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export const AcademyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [currentCourse, setCurrentCourse] = useState<any | null>(null);

  return (
    <AcademyContext.Provider value={{ courses, currentCourse, setCurrentCourse }}>
      {children}
    </AcademyContext.Provider>
  );
};

export const useAcademyContext = () => {
  const context = useContext(AcademyContext);
  if (!context) {
    return { courses: [], currentCourse: null, setCurrentCourse: () => {} };
  }
  return context;
};

export const useAcademy = () => {
  return useAcademyContext();
};





















