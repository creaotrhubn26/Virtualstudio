export interface Student {
  id: string;
  name: string;
  height: number;
  row: number;
  position: number;
  isTeacher?: boolean;
  gender?: 'male' | 'female' | 'neutral';
  avatar?: string;
}

export interface ClassPhotoRow {
  id: string;
  index: number;
  students: Student[];
  heightOffset: number;
  depthOffset: number;
  label?: string;
}

export interface ClassPhotoProp {
  id: string;
  type: 'chair' | 'stool' | 'riser' | 'bench' | 'podium';
  label: string;
  rowIndex: number;
  positionIndex: number;
}

export interface ClassPhotoSession {
  id: string;
  navn: string;
  rows: ClassPhotoRow[];
  props: ClassPhotoProp[];
  totalStudents: number;
  aspectRatio: number;
  backgroundType: string;
  cameraHeight: number;
  cameraDistance: number;
  shootDate?: string;
}

export const SPACING = {
  student: 0.55,
  row: 0.65,
  rowDepth: 0.50,
  platformHeight: 0.30,
  riserIncrement: 0.25,
};

export const TEACHER_COLORS: Record<string, string> = {
  primary: '#1565C0',
  secondary: '#6A1B9A',
  admin: '#2E7D32',
  specialist: '#E65100',
};

export const TEACHER_ROLE_LABELS: Record<string, string> = {
  primary: 'Kontaktlærer',
  secondary: 'Faglærer',
  admin: 'Rektor',
  specialist: 'Spesiallærer',
};

class ClassPhotoService {
  createSession(opts: { navn: string; studentCount: number; rowCount: number }): ClassPhotoSession {
    const studentsPerRow = Math.ceil(opts.studentCount / opts.rowCount);
    const rows: ClassPhotoRow[] = Array.from({ length: opts.rowCount }, (_, rowIndex) => {
      const students: Student[] = Array.from(
        { length: Math.min(studentsPerRow, opts.studentCount - rowIndex * studentsPerRow) },
        (_, posIndex) => ({
          id: `student-${rowIndex}-${posIndex}`,
          name: `Elev ${rowIndex * studentsPerRow + posIndex + 1}`,
          height: 1.5 + Math.random() * 0.3,
          row: rowIndex,
          position: posIndex,
          gender: 'neutral',
        }),
      );
      return {
        id: `row-${rowIndex}`,
        index: rowIndex,
        students,
        heightOffset: rowIndex * SPACING.riserIncrement,
        depthOffset: rowIndex * SPACING.rowDepth,
      };
    });

    return {
      id: `session-${Date.now()}`,
      navn: opts.navn,
      rows,
      props: [],
      totalStudents: opts.studentCount,
      aspectRatio: 16 / 9,
      backgroundType: 'seamless-white',
      cameraHeight: 1.6,
      cameraDistance: 4 + opts.rowCount * 0.5,
    };
  }

  addStudent(session: ClassPhotoSession, rowIndex: number, student: Omit<Student, 'id'>): ClassPhotoSession {
    const rows = session.rows.map((row) => {
      if (row.index !== rowIndex) return row;
      const newStudent: Student = { ...student, id: `student-${Date.now()}` };
      return { ...row, students: [...row.students, newStudent] };
    });
    return { ...session, rows, totalStudents: session.totalStudents + 1 };
  }

  removeStudent(session: ClassPhotoSession, studentId: string): ClassPhotoSession {
    const rows = session.rows.map((row) => ({
      ...row,
      students: row.students.filter((s) => s.id !== studentId),
    }));
    return { ...session, rows, totalStudents: session.totalStudents - 1 };
  }

  getStudentWorldPosition(
    student: Student,
    row: ClassPhotoRow,
  ): [number, number, number] {
    const x = (student.position - (row.students.length - 1) / 2) * SPACING.student;
    const y = row.heightOffset;
    const z = -row.depthOffset;
    return [x, y, z];
  }
}

export const classPhotoService = new ClassPhotoService();
export default classPhotoService;
