import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';

interface AcademyState {
  courses: any[];
  enrollments: any[];
  selectedCategory: string;
  isLoading: boolean;
}

interface AcademyContextType {
  courses: any[];
  currentCourse: any | null;
  setCurrentCourse: (course: any) => void;
  state: AcademyState;
  filteredCourses: any[];
  enrolledCourses: any[];
  completedCourses: any[];
  inProgressCourses: any[];
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSortBy: (sort: string) => void;
  setFilterLevel: (level: string) => void;
  setFilterPrice: (price: string) => void;
  enrollInCourse: (courseId: string) => Promise<void>;
  setCurrentLesson: (lesson: any) => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export const AcademyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [currentCourse, setCurrentCourse] = useState<any | null>(null);
  const [currentLesson, setCurrentLesson] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterPrice, setFilterPrice] = useState('all');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading] = useState(false);

  const state: AcademyState = useMemo(() => ({
    courses,
    enrollments,
    selectedCategory,
    isLoading,
  }), [courses, enrollments, selectedCategory, isLoading]);

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];
    if (searchQuery) {
      filtered = filtered.filter((c: any) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((c: any) => c.category === selectedCategory);
    }
    if (filterLevel !== 'all') {
      filtered = filtered.filter((c: any) => c.level === filterLevel);
    }
    if (filterPrice === 'free') {
      filtered = filtered.filter((c: any) => !c.price || c.price === 0);
    }
    if (sortBy === 'popular') {
      filtered.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }
    return filtered;
  }, [courses, searchQuery, selectedCategory, sortBy, filterLevel, filterPrice]);

  const enrolledCourses = useMemo(
    () => courses.filter((c: any) => enrollments.some((e: any) => e.courseId === c.id)),
    [courses, enrollments]
  );

  const completedCourses = useMemo(
    () => enrolledCourses.filter((c: any) => c.progress === 100 || c.isCompleted),
    [enrolledCourses]
  );

  const inProgressCourses = useMemo(
    () => enrolledCourses.filter((c: any) => c.progress !== undefined && c.progress < 100 && !c.isCompleted),
    [enrolledCourses]
  );

  const enrollInCourse = useCallback(async (courseId: string) => {
    setEnrollments(prev => [...prev, { courseId, enrolledAt: new Date() }]);
  }, []);

  return (
    <AcademyContext.Provider value={{
      courses,
      currentCourse,
      setCurrentCourse,
      state,
      filteredCourses,
      enrolledCourses,
      completedCourses,
      inProgressCourses,
      setSearchQuery,
      setSelectedCategory,
      setSortBy,
      setFilterLevel,
      setFilterPrice,
      enrollInCourse,
      setCurrentLesson,
    }}>
      {children}
    </AcademyContext.Provider>
  );
};

export const useAcademyContext = () => {
  const context = useContext(AcademyContext);
  if (!context) {
    const noOp = () => {};
    const noOpAsync = async () => {};
    const defaultState: AcademyState = {
      courses: [],
      enrollments: [],
      selectedCategory: 'all',
      isLoading: false,
    };
    return {
      courses: [],
      currentCourse: null,
      setCurrentCourse: noOp,
      state: defaultState,
      filteredCourses: [],
      enrolledCourses: [],
      completedCourses: [],
      inProgressCourses: [],
      setSearchQuery: noOp,
      setSelectedCategory: noOp,
      setSortBy: noOp,
      setFilterLevel: noOp,
      setFilterPrice: noOp,
      enrollInCourse: noOpAsync as (courseId: string) => Promise<void>,
      setCurrentLesson: noOp,
    } satisfies AcademyContextType;
  }
  return context;
};

export const useAcademy = () => {
  return useAcademyContext();
};





















