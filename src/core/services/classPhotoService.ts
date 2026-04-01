export type TeacherRole = 'head_teacher' | 'assistant' | 'specialist';
export type TeacherPosition = 'center_front' | 'center_back' | 'left' | 'right' | 'left_front' | 'right_front' | 'left_end' | 'right_end' | 'seated_center';
export type PropType = 'chair' | 'stool' | 'riser' | 'bench' | 'podium' | 'apple_box' | 'folding_chair' | 'gym_bench' | 'photo_riser';
export type AgeGroup = 'barneskole' | 'ungdomsskole' | 'videregaende' | 'voksen' | 'elementary';
export type HeightDistribution = 'random' | 'ascending' | 'descending' | 'mixed' | 'bell_curve';
export type ArrangementStyle = 'traditional' | 'staggered' | 'curved' | 'casual' | 'flat' | 'tiered' | 'semi_circle';

export interface TeacherConfig {
  role: TeacherRole;
  name: string;
  height: number;
  position: TeacherPosition;
  color?: string;
  teacherPosition?: string;
}

export interface Student {
  id: string;
  name: string;
  height: number;
  row: number;
  assignedRow: number;
  position: number;
  isTeacher?: boolean;
  gender?: 'male' | 'female' | 'neutral';
  avatar?: string;
  position3D?: { x: number; y: number; z: number };
  visibilityScore?: number;
  color?: string;
  teacherPosition?: string;
  teacherRole?: TeacherRole;
  pose?: string;
}

export interface VisibilityIssue {
  type: 'overlap' | 'blocked' | 'edge' | 'height' | 'spacing';
  severity: 'warning' | 'error';
  message: string;
  affectedIds?: string[];
}

export interface ClassPhotoRow {
  id: string;
  index: number;
  students: Student[];
  studentIds?: string[];
  heightOffset: number;
  depthOffset: number;
  zPosition?: number;
  baseHeight?: number;
  label?: string;
}

export interface ClassPhotoProp {
  id: string;
  type: PropType;
  label: string;
  rowIndex: number;
  positionIndex: number;
  width?: number;
  height?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

export interface ClassPhotoSession {
  id: string;
  navn: string;
  rows: ClassPhotoRow[];
  props: ClassPhotoProp[];
  students: Map<string, Student>;
  totalStudents: number;
  aspectRatio: number;
  backgroundType: string;
  cameraHeight: number;
  cameraDistance: number;
  shootDate?: string;
  sceneWidth?: number;
  sceneDepth?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
}

export interface ClassPhotoSetup {
  studentCount: number;
  ageGroup: AgeGroup;
  heightDistribution: HeightDistribution;
  includeTeacher: boolean;
  teachers: TeacherConfig[];
  rowCount: number;
  arrangementStyle: ArrangementStyle;
  staggerPositions: boolean;
}

export const SPACING = {
  student: 0.55,
  row: 0.65,
  rowDepth: 0.50,
  platformHeight: 0.30,
  riserIncrement: 0.25,
  minHeadGap: 0.10,
};

export const HEIGHT_RANGES: Record<AgeGroup, { min: number; max: number; avg: number }> = {
  barneskole: { min: 110, max: 155, avg: 132 },
  ungdomsskole: { min: 145, max: 180, avg: 162 },
  videregaende: { min: 158, max: 195, avg: 173 },
  voksen: { min: 155, max: 200, avg: 175 },
  elementary: { min: 110, max: 145, avg: 125 },
};

export const TEACHER_HEIGHT = { min: 160, max: 195, avg: 175 };

export const TEACHER_COLORS: Record<string, string> = {
  primary: '#1565C0',
  secondary: '#6A1B9A',
  admin: '#2E7D32',
  specialist: '#E65100',
  head_teacher: '#1565C0',
  assistant: '#6A1B9A',
};

export const TEACHER_ROLE_LABELS: Record<string, string> = {
  primary: 'Kontaktlærer',
  secondary: 'Faglærer',
  admin: 'Rektor',
  specialist: 'Spesiallærer',
  head_teacher: 'Kontaktlærer',
  assistant: 'Assistent',
};

export const PROP_DEFINITIONS: Record<PropType, { label: string; heightBoost: number }> = {
  chair: { label: 'Stol', heightBoost: 0.45 },
  stool: { label: 'Krakk', heightBoost: 0.65 },
  riser: { label: 'Podium', heightBoost: 0.30 },
  bench: { label: 'Benk', heightBoost: 0.45 },
  apple_box: { label: 'Apple Box', heightBoost: 0.20 },
  folding_chair: { label: 'Sammenleggbar stol', heightBoost: 0.45 },
  gym_bench: { label: 'Gymbenk', heightBoost: 0.45 },
  photo_riser: { label: 'Foto-podium', heightBoost: 0.30 },
  podium: { label: 'Talerstol', heightBoost: 1.00 },
};

class ClassPhotoService {
  private currentSession: ClassPhotoSession | null = null;

  private generateStudentHeight(ageGroup: AgeGroup, distribution: HeightDistribution, index: number, total: number): number {
    const range = HEIGHT_RANGES[ageGroup];
    const spread = range.max - range.min;
    let normalized: number;
    switch (distribution) {
      case 'ascending':
        normalized = index / Math.max(1, total - 1);
        break;
      case 'descending':
        normalized = 1 - index / Math.max(1, total - 1);
        break;
      case 'mixed':
        normalized = index % 2 === 0 ? 0.3 + (index / total) * 0.4 : 0.6 - (index / total) * 0.2;
        break;
      default:
        normalized = 0.2 + Math.random() * 0.6;
    }
    return (range.min + normalized * spread) / 100;
  }

  createSession(setup: ClassPhotoSetup): ClassPhotoSession {
    const studentsPerRow = Math.ceil(setup.studentCount / setup.rowCount);
    const studentMap = new Map<string, Student>();
    const rows: ClassPhotoRow[] = Array.from({ length: setup.rowCount }, (_, rowIndex) => {
      const countInRow = Math.min(studentsPerRow, setup.studentCount - rowIndex * studentsPerRow);
      const students: Student[] = Array.from({ length: Math.max(0, countInRow) }, (__, posIndex) => {
        const globalIndex = rowIndex * studentsPerRow + posIndex;
        const h = this.generateStudentHeight(setup.ageGroup, setup.heightDistribution, globalIndex, setup.studentCount);
        const student: Student = {
          id: `student-${rowIndex}-${posIndex}-${Date.now()}`,
          name: `Elev ${globalIndex + 1}`,
          height: h,
          row: rowIndex,
          assignedRow: rowIndex,
          position: posIndex,
          gender: 'neutral',
          visibilityScore: 80 + Math.random() * 20,
        };
        studentMap.set(student.id, student);
        return student;
      });
      return {
        id: `row-${rowIndex}`,
        index: rowIndex,
        students,
        studentIds: students.map(s => s.id),
        heightOffset: rowIndex * SPACING.riserIncrement,
        depthOffset: rowIndex * SPACING.rowDepth,
        baseHeight: rowIndex * SPACING.riserIncrement,
      };
    });

    if (setup.includeTeacher) {
      setup.teachers.forEach((t, idx) => {
        const teacher: Student = {
          id: `teacher-${idx}-${Date.now()}`,
          name: t.name || `Lærer ${idx + 1}`,
          height: t.height / 100,
          row: -1,
          assignedRow: -1,
          position: idx,
          isTeacher: true,
          color: TEACHER_COLORS[t.role] ?? '#1565C0',
          teacherPosition: t.position,
          visibilityScore: 100,
        };
        studentMap.set(teacher.id, teacher);
      });
    }

    const session: ClassPhotoSession = {
      id: `session-${Date.now()}`,
      navn: `Klassebilde ${new Date().getFullYear()}`,
      rows,
      props: [],
      students: studentMap,
      totalStudents: setup.studentCount,
      aspectRatio: 16 / 9,
      backgroundType: 'seamless-white',
      cameraHeight: 1.6,
      cameraDistance: 4 + setup.rowCount * 0.5,
    };

    this.currentSession = session;
    return session;
  }

  getSession(): ClassPhotoSession | null {
    return this.currentSession;
  }

  randomizeHeights(): void {
    if (!this.currentSession) return;
    this.currentSession.students.forEach(student => {
      if (!student.isTeacher) {
        student.height = 1.2 + Math.random() * 0.6;
        student.visibilityScore = 70 + Math.random() * 30;
      }
    });
    this.currentSession.rows.forEach(row => {
      row.students.forEach(s => {
        const updated = this.currentSession!.students.get(s.id);
        if (updated) Object.assign(s, updated);
      });
    });
  }

  checkVisibility(): VisibilityIssue[] {
    if (!this.currentSession) return [];
    const issues: VisibilityIssue[] = [];
    this.currentSession.rows.forEach((row, rowIdx) => {
      if (rowIdx > 0) {
        const prevRow = this.currentSession!.rows[rowIdx - 1];
        const prevAvg = prevRow.students.reduce((s, st) => s + st.height, 0) / Math.max(1, prevRow.students.length);
        const curAvg = row.students.reduce((s, st) => s + st.height, 0) / Math.max(1, row.students.length);
        if (curAvg <= prevAvg && row.heightOffset <= prevRow.heightOffset) {
          issues.push({
            type: 'blocked',
            severity: 'warning',
            message: `Rad ${rowIdx + 1} kan bli delvis skjult av rad ${rowIdx}`,
          });
        }
      }
    });
    return issues;
  }

  optimizeVisibility(): { issues: VisibilityIssue[] } {
    if (!this.currentSession) return { issues: [] };
    let heightOffset = 0;
    this.currentSession.rows.forEach((row, idx) => {
      row.heightOffset = heightOffset;
      row.baseHeight = heightOffset;
      heightOffset += SPACING.riserIncrement + idx * 0.05;
    });
    const issues = this.checkVisibility();
    return { issues };
  }

  addRiserForRow(rowIndex: number): void {
    if (!this.currentSession) return;
    const row = this.currentSession.rows[rowIndex];
    if (!row) return;
    row.heightOffset = (row.heightOffset ?? 0) + SPACING.riserIncrement;
    row.baseHeight = row.heightOffset;
    this.currentSession.props.push({
      id: `prop-riser-${rowIndex}-${Date.now()}`,
      type: 'riser',
      label: PROP_DEFINITIONS.riser.label,
      rowIndex,
      positionIndex: 0,
    });
  }

  moveStudentToRow(studentId: string, targetRow: number): void {
    if (!this.currentSession) return;
    const student = this.currentSession.students.get(studentId);
    if (!student) return;
    const oldRow = this.currentSession.rows[student.assignedRow];
    if (oldRow) {
      oldRow.students = oldRow.students.filter(s => s.id !== studentId);
      oldRow.studentIds = oldRow.students.map(s => s.id);
    }
    const newRow = this.currentSession.rows[targetRow];
    if (newRow) {
      student.row = targetRow;
      student.assignedRow = targetRow;
      student.position = newRow.students.length;
      newRow.students.push(student);
      newRow.studentIds = newRow.students.map(s => s.id);
    }
    this.currentSession.students.set(studentId, student);
  }

  addTeacher(data: { name: string; role?: TeacherRole; height?: number; position?: TeacherPosition | number; color?: string; teacherRole?: TeacherRole }): void {
    if (!this.currentSession) return;
    const posStr = typeof data.position === 'string' ? data.position : 'center_front';
    const teacher: Student = {
      id: `teacher-${Date.now()}`,
      name: data.name,
      height: data.height != null ? data.height / 100 : TEACHER_HEIGHT.avg / 100,
      row: -1,
      assignedRow: -1,
      position: 0,
      isTeacher: true,
      color: data.color ?? (data.role ? TEACHER_COLORS[data.role] : undefined) ?? '#1565C0',
      teacherPosition: posStr,
      teacherRole: data.teacherRole ?? data.role,
      visibilityScore: 100,
    };
    this.currentSession.students.set(teacher.id, teacher);
  }

  updateTeacher(teacherId: string, updates: { position?: TeacherPosition | number; teacherRole?: TeacherRole; name?: string; height?: number; color?: string; [k: string]: unknown }): void {
    if (!this.currentSession) return;
    const teacher = this.currentSession.students.get(teacherId);
    if (!teacher) return;
    if (updates.name != null) teacher.name = updates.name as string;
    if (updates.height != null) teacher.height = (updates.height as number) / 100;
    if (updates.color != null) teacher.color = updates.color as string;
    if (updates.teacherRole != null) teacher.teacherRole = updates.teacherRole as TeacherRole;
    if (updates.position != null) teacher.teacherPosition = String(updates.position);
    this.currentSession.students.set(teacherId, teacher);
  }

  removeTeacher(teacherId: string): void {
    if (!this.currentSession) return;
    this.currentSession.students.delete(teacherId);
  }

  getTeachersArray(): Student[] {
    if (!this.currentSession) return [];
    return Array.from(this.currentSession.students.values()).filter(s => s.isTeacher);
  }

  getStudentsArray(): Student[] {
    if (!this.currentSession) return [];
    return Array.from(this.currentSession.students.values()).filter(s => !s.isTeacher);
  }

  addStudent(session: ClassPhotoSession, rowIndex: number, student: Omit<Student, 'id'>): ClassPhotoSession {
    const newStudent: Student = { ...student, id: `student-${Date.now()}` };
    const rows = session.rows.map((row) => {
      if (row.index !== rowIndex) return row;
      return { ...row, students: [...row.students, newStudent] };
    });
    session.students.set(newStudent.id, newStudent);
    return { ...session, rows, totalStudents: session.totalStudents + 1 };
  }

  removeStudent(session: ClassPhotoSession, studentId: string): ClassPhotoSession {
    const rows = session.rows.map((row) => ({
      ...row,
      students: row.students.filter((s) => s.id !== studentId),
    }));
    session.students.delete(studentId);
    return { ...session, rows, totalStudents: session.totalStudents - 1 };
  }

  getStudentWorldPosition(student: Student, row: ClassPhotoRow): [number, number, number] {
    const x = (student.position - (row.students.length - 1) / 2) * SPACING.student;
    const y = row.heightOffset;
    const z = -row.depthOffset;
    return [x, y, z];
  }
}

export const classPhotoService = new ClassPhotoService();
export default classPhotoService;
