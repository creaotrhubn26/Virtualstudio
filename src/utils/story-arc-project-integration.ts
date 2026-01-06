export interface ProjectToEditorData {
  projectId: string;
  projectName: string;
  projectType: string;
  clientName?: string;
  clientEmail?: string;
  deadline?: string;
  timeline?: {
    startDate: string;
    endDate: string;
  };
  scenes?: Array<{
    id: string;
    name: string;
    duration: number;
  }>;
}

export interface EditorToProjectResult {
  success: boolean;
  projectId: string;
  scenes: Array<{
    id: string;
    name: string;
    duration: number;
    status: 'created' | 'updated' | 'error';
  }>;
  errors?: string[];
  worklogEntry?: {
    id: string;
    duration: number;
    description: string;
  };
  videoUrl?: string;
  duration?: number;
  clipCount?: number;
  transitionCount?: number;
  usedAI?: boolean;
  aiConfidence?: number;
  culturalMoments?: string[];
  appliedLUTs?: string[];
  exportSettings?: {
    format: string;
    resolution: string;
    codec: string;
  };
  editingTime?: number;
}

export function projectToEditorData(project: {
  id: string;
  name: string;
  type: string;
  clientName?: string;
  clientEmail?: string;
  deadline?: string;
}): ProjectToEditorData {
  return {
    projectId: project.id,
    projectName: project.name,
    projectType: project.type,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    deadline: project.deadline,
    scenes: [],
  };
}

export function editorToProjectResult(data: ProjectToEditorData): EditorToProjectResult {
  return {
    success: true,
    projectId: data.projectId,
    scenes: data.scenes?.map(s => ({ ...s, status: 'created' as const })) || [],
    videoUrl: '',
    duration: 0,
    clipCount: 0,
    transitionCount: 0,
    usedAI: false,
    aiConfidence: 0,
    culturalMoments: [],
    appliedLUTs: [],
    exportSettings: { format: 'mp4', resolution: '1080p', codec: 'h264' },
    editingTime: 0,
    worklogEntry: { id: '', duration: 0, description: '' },
  };
}
