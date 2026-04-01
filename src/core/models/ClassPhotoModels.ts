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

export interface StudentPlaceholder {
  id: string;
  width: number;
  height: number;
  depth: number;
  color: string;
  pose?: string;
}

export interface PropObject {
  id: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  color: string;
}

export function createStudentPlaceholder(overrides: Partial<StudentPlaceholder> = {}): StudentPlaceholder {
  return { id: `placeholder-${Date.now()}`, width: 0.4, height: 1.3, depth: 0.3, color: '#4a90d9', ...overrides };
}

export function createPhotoRiser(overrides: Partial<PropObject> = {}): PropObject {
  return { id: `riser-${Date.now()}`, type: 'photo_riser', width: 1.2, height: 0.3, depth: 0.6, color: '#8B7355', ...overrides };
}

export function createGymBench(overrides: Partial<PropObject> = {}): PropObject {
  return { id: `bench-${Date.now()}`, type: 'gym_bench', width: 1.8, height: 0.45, depth: 0.4, color: '#6B4226', ...overrides };
}

export function createStool(overrides: Partial<PropObject> = {}): PropObject {
  return { id: `stool-${Date.now()}`, type: 'stool', width: 0.35, height: 0.65, depth: 0.35, color: '#8B7355', ...overrides };
}

export function createAppleBox(overrides: Partial<PropObject> = {}): PropObject {
  return { id: `applebox-${Date.now()}`, type: 'apple_box', width: 0.5, height: 0.2, depth: 0.3, color: '#D2691E', ...overrides };
}

export function createFoldingChair(overrides: Partial<PropObject> = {}): PropObject {
  return { id: `chair-${Date.now()}`, type: 'folding_chair', width: 0.45, height: 0.9, depth: 0.45, color: '#808080', ...overrides };
}
