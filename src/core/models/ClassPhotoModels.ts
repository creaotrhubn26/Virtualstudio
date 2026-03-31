export interface ClassPhotoModelConfig {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  gender: 'male' | 'female' | 'neutral';
  ageGroup: 'child' | 'teen' | 'adult';
  height: number;
  skinTone: string;
  hairColor: string;
  clothingPreset: string;
  posePreset: string;
}

export interface ClassGroupConfig {
  id: string;
  name: string;
  models: ClassPhotoModelConfig[];
  rowCount: number;
  studentsPerRow: number;
  arrangement: 'rows' | 'diagonal' | 'v-shape' | 'semicircle';
}

export const DEFAULT_STUDENT_MODEL: ClassPhotoModelConfig = {
  id: 'default-student',
  role: 'student',
  gender: 'neutral',
  ageGroup: 'child',
  height: 1.3,
  skinTone: '#FFDAB9',
  hairColor: '#4A3728',
  clothingPreset: 'school-uniform-blue',
  posePreset: 'stand-neutral',
};

export const DEFAULT_TEACHER_MODEL: ClassPhotoModelConfig = {
  id: 'default-teacher',
  role: 'teacher',
  gender: 'female',
  ageGroup: 'adult',
  height: 1.65,
  skinTone: '#D4A574',
  hairColor: '#2C1810',
  clothingPreset: 'formal-dark',
  posePreset: 'stand-professional',
};

export function createStudentModel(overrides: Partial<ClassPhotoModelConfig> = {}): ClassPhotoModelConfig {
  return { ...DEFAULT_STUDENT_MODEL, id: `student-${Date.now()}`, ...overrides };
}

export function createClassGroup(
  name: string,
  studentCount: number,
  rows: number,
): ClassGroupConfig {
  const studentsPerRow = Math.ceil(studentCount / rows);
  const models: ClassPhotoModelConfig[] = Array.from({ length: studentCount }, (_, i) =>
    createStudentModel({ id: `student-${i}`, gender: i % 2 === 0 ? 'male' : 'female' }),
  );

  return {
    id: `group-${Date.now()}`,
    name,
    models,
    rowCount: rows,
    studentsPerRow,
    arrangement: 'rows',
  };
}
