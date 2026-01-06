import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  clientName?: string;
  clientEmail?: string;
  budget?: number;
  deadline?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ProjectBackup {
  id: string;
  createdAt: string;
  size: number;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  createProject: (data: Partial<Project>) => Promise<Project>;
  loadProject: (id: string) => Promise<Project | null>;
  duplicateProject: (id: string) => Promise<Project>;
  archiveProject: (id: string) => Promise<void>;
  updateProjectSettings: (id: string, settings: Record<string, unknown>) => Promise<void>;
  getProjectSettings: (id: string) => Record<string, unknown>;
  updateProjectMetadata: (id: string, metadata: Record<string, unknown>) => Promise<void>;
  getProjectMetadata: (id: string) => Record<string, unknown>;
  updateIntegrationStatus: (id: string, integration: string, status: boolean) => Promise<void>;
  getIntegrationStatus: (id: string, integration: string) => boolean;
  addProjectCollaborator: (projectId: string, collaborator: Collaborator) => Promise<void>;
  getProjectCollaborators: (projectId: string) => Collaborator[];
  uploadProjectFile: (projectId: string, file: File) => Promise<ProjectFile>;
  getProjectFiles: (projectId: string) => ProjectFile[];
  addProjectMilestone: (projectId: string, milestone: Milestone) => Promise<void>;
  updateProjectStatus: (projectId: string, status: Project['status']) => Promise<void>;
  addProjectComment: (projectId: string, comment: string) => Promise<Comment>;
  getProjectComments: (projectId: string) => Comment[];
  createProjectBackup: (projectId: string) => Promise<ProjectBackup>;
  getProjectBackups: (projectId: string) => ProjectBackup[];
  getProjectAnalytics: (projectId: string) => Record<string, number>;
  getProjectPerformanceMetrics: (projectId: string) => Record<string, number>;
  searchProjects: (query: string) => Project[];
  getProjectsByDateRange: (start: string, end: string) => Project[];
  validateProjectData: (data: Partial<Project>) => { valid: boolean; errors: string[] };
  checkProjectHealth: (projectId: string) => { score: number; issues: string[] };
  cacheProjectData: (projectId: string, data: unknown) => void;
  getCachedProjectData: (projectId: string) => unknown | null;
  invalidateProjectCache: (projectId: string) => void;
  refreshProjectCache: (projectId: string) => Promise<void>;
  saveProjectDraft: (data: Partial<Project>) => void;
  getProjectDraft: () => Partial<Project> | null;
  deleteProjectDraft: () => void;
  syncProjectOffline: (projectId: string) => Promise<void>;
  connectProjectIntegration: (projectId: string, integration: string) => Promise<void>;
  disconnectProjectIntegration: (projectId: string, integration: string) => Promise<void>;
  getProjectIntegrations: (projectId: string) => string[];
  testProjectIntegration: (projectId: string, integration: string) => Promise<boolean>;
  transformProjectData: (data: unknown, format: string) => unknown;
  migrateProjectData: (projectId: string, version: string) => Promise<void>;
  getProjectDataVersion: (projectId: string) => string;
  rollbackProjectData: (projectId: string, version: string) => Promise<void>;
  optimizeProjectData: (projectId: string) => Promise<void>;
  analyzeProjectData: (projectId: string) => Record<string, unknown>;
  cleanupProjectData: (projectId: string) => Promise<void>;
  setProjectPermissions: (projectId: string, userId: string, permissions: string[]) => Promise<void>;
  getProjectPermissions: (projectId: string, userId: string) => string[];
  checkProjectAccess: (projectId: string, userId: string, action: string) => { hasAccess: boolean; reason?: string };
  auditProjectAccess: (projectId: string) => { userId: string; action: string; timestamp: string }[];
  validateProjectCompliance: (projectId: string) => { compliant: boolean; issues: string[] };
  getProjectComplianceReport: (projectId: string) => Record<string, unknown>;
  updateProjectCompliance: (projectId: string, data: Record<string, unknown>) => Promise<void>;
  getProjectAuditTrail: (projectId: string) => { action: string; timestamp: string; userId: string }[];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [cache] = useState<Map<string, unknown>>(new Map());
  const [draft, setDraft] = useState<Partial<Project> | null>(null);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator[]>>(new Map());
  const [projectFiles, setProjectFiles] = useState<Map<string, ProjectFile[]>>(new Map());
  const [milestones, setMilestones] = useState<Map<string, Milestone[]>>(new Map());
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [backups, setBackups] = useState<Map<string, ProjectBackup[]>>(new Map());
  const [integrations, setIntegrations] = useState<Map<string, string[]>>(new Map());

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [...prev, project]);
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const createProject = useCallback(async (data: Partial<Project>): Promise<Project> => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.name || 'Nytt prosjekt',
      type: data.type || 'general',
      description: data.description || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const loadProject = useCallback(async (id: string): Promise<Project | null> => {
    const project = projects.find(p => p.id === id);
    if (project) setCurrentProject(project);
    return project || null;
  }, [projects]);

  const duplicateProject = useCallback(async (id: string): Promise<Project> => {
    const original = projects.find(p => p.id === id);
    const duplicate: Project = {
      ...original!,
      id: `project-${Date.now()}`,
      name: `${original?.name} (kopi)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, duplicate]);
    return duplicate;
  }, [projects]);

  const archiveProject = useCallback(async (id: string) => {
    updateProject(id, { status: 'archived' });
  }, [updateProject]);

  const updateProjectSettings = useCallback(async (id: string, settings: Record<string, unknown>) => {
    updateProject(id, { settings: { ...(projects.find(p => p.id === id)?.settings || {}), ...settings } });
  }, [projects, updateProject]);

  const getProjectSettings = useCallback((id: string) => {
    return projects.find(p => p.id === id)?.settings || {};
  }, [projects]);

  const updateProjectMetadata = useCallback(async (id: string, metadata: Record<string, unknown>) => {
    updateProject(id, { metadata: { ...(projects.find(p => p.id === id)?.metadata || {}), ...metadata } });
  }, [projects, updateProject]);

  const getProjectMetadata = useCallback((id: string) => {
    return projects.find(p => p.id === id)?.metadata || {};
  }, [projects]);

  const updateIntegrationStatus = useCallback(async (id: string, integration: string, status: boolean) => {
    console.log(`[Project] Integration ${integration} for ${id}: ${status}`);
  }, []);

  const getIntegrationStatus = useCallback((id: string, integration: string) => true, []);

  const addProjectCollaborator = useCallback(async (projectId: string, collaborator: Collaborator) => {
    setCollaborators(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, [...existing, collaborator]);
      return updated;
    });
  }, []);

  const getProjectCollaborators = useCallback((projectId: string): Collaborator[] => {
    return collaborators.get(projectId) || [];
  }, [collaborators]);

  const uploadProjectFile = useCallback(async (projectId: string, file: File): Promise<ProjectFile> => {
    const newFile: ProjectFile = { id: `file-${Date.now()}`, name: file.name, type: file.type, size: file.size, url: URL.createObjectURL(file), uploadedAt: new Date().toISOString() };
    setProjectFiles(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, [...existing, newFile]);
      return updated;
    });
    return newFile;
  }, []);

  const getProjectFiles = useCallback((projectId: string): ProjectFile[] => {
    return projectFiles.get(projectId) || [];
  }, [projectFiles]);

  const addProjectMilestone = useCallback(async (projectId: string, milestone: Milestone) => {
    setMilestones(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, [...existing, milestone]);
      return updated;
    });
  }, []);

  const updateProjectStatus = useCallback(async (projectId: string, status: Project['status']) => {
    updateProject(projectId, { status });
  }, [updateProject]);

  const addProjectComment = useCallback(async (projectId: string, content: string): Promise<Comment> => {
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: 'user-1', content, createdAt: new Date().toISOString() };
    setComments(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, [...existing, newComment]);
      return updated;
    });
    return newComment;
  }, []);

  const getProjectComments = useCallback((projectId: string): Comment[] => {
    return comments.get(projectId) || [];
  }, [comments]);

  const createProjectBackup = useCallback(async (projectId: string): Promise<ProjectBackup> => {
    const project = projects.find(p => p.id === projectId);
    const newBackup: ProjectBackup = { id: `backup-${Date.now()}`, createdAt: new Date().toISOString(), size: JSON.stringify(project).length };
    setBackups(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, [...existing, newBackup]);
      return updated;
    });
    return newBackup;
  }, [projects]);

  const getProjectBackups = useCallback((projectId: string): ProjectBackup[] => {
    return backups.get(projectId) || [];
  }, [backups]);

  const getProjectAnalytics = useCallback((projectId: string) => ({ views: 0, edits: 0, exports: 0 }), []);
  const getProjectPerformanceMetrics = useCallback((projectId: string) => ({ loadTime: 0, renderTime: 0 }), []);
  const searchProjects = useCallback((query: string) => projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [projects]);
  const getProjectsByDateRange = useCallback((start: string, end: string) => projects, [projects]);
  const validateProjectData = useCallback((data: Partial<Project>) => ({ valid: true, errors: [] }), []);
  const checkProjectHealth = useCallback((projectId: string) => ({ score: 100, issues: [] }), []);
  const cacheProjectData = useCallback((projectId: string, data: unknown) => cache.set(projectId, data), [cache]);
  const getCachedProjectData = useCallback((projectId: string) => cache.get(projectId) || null, [cache]);
  const invalidateProjectCache = useCallback((projectId: string) => cache.delete(projectId), [cache]);
  const refreshProjectCache = useCallback(async (projectId: string) => {}, []);
  const saveProjectDraft = useCallback((data: Partial<Project>) => setDraft(data), []);
  const getProjectDraft = useCallback(() => draft, [draft]);
  const deleteProjectDraft = useCallback(() => setDraft(null), []);
  const syncProjectOffline = useCallback(async (projectId: string) => {}, []);
  const connectProjectIntegration = useCallback(async (projectId: string, integration: string) => {
    setIntegrations(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      if (!existing.includes(integration)) {
        updated.set(projectId, [...existing, integration]);
      }
      return updated;
    });
  }, []);
  const disconnectProjectIntegration = useCallback(async (projectId: string, integration: string) => {
    setIntegrations(prev => {
      const updated = new Map(prev);
      const existing = updated.get(projectId) || [];
      updated.set(projectId, existing.filter(i => i !== integration));
      return updated;
    });
  }, []);
  const getProjectIntegrations = useCallback((projectId: string): string[] => {
    return integrations.get(projectId) || [];
  }, [integrations]);
  const testProjectIntegration = useCallback(async (projectId: string, integration: string) => true, []);
  const transformProjectData = useCallback((data: unknown, format: string) => data, []);
  const migrateProjectData = useCallback(async (projectId: string, version: string) => {}, []);
  const getProjectDataVersion = useCallback((projectId: string) => '1.0.0', []);
  const rollbackProjectData = useCallback(async (projectId: string, version: string) => {}, []);
  const optimizeProjectData = useCallback(async (projectId: string) => {}, []);
  const analyzeProjectData = useCallback((projectId: string) => ({}), []);
  const cleanupProjectData = useCallback(async (projectId: string) => {}, []);
  const setProjectPermissions = useCallback(async (projectId: string, userId: string, permissions: string[]) => {}, []);
  const getProjectPermissions = useCallback((projectId: string, userId: string): string[] => ['read', 'write'], []);
  const checkProjectAccess = useCallback((projectId: string, userId: string, action: string) => ({ hasAccess: true, reason: 'Tilgang godkjent' }), []);
  const auditProjectAccess = useCallback((projectId: string) => [], []);
  const validateProjectCompliance = useCallback((projectId: string) => ({ compliant: true, issues: [] }), []);
  const getProjectComplianceReport = useCallback((projectId: string) => ({}), []);
  const updateProjectCompliance = useCallback(async (projectId: string, data: Record<string, unknown>) => {}, []);
  const getProjectAuditTrail = useCallback((projectId: string) => [], []);

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      loading,
      setCurrentProject,
      addProject,
      updateProject,
      deleteProject,
      createProject,
      loadProject,
      duplicateProject,
      archiveProject,
      updateProjectSettings,
      getProjectSettings,
      updateProjectMetadata,
      getProjectMetadata,
      updateIntegrationStatus,
      getIntegrationStatus,
      addProjectCollaborator,
      getProjectCollaborators,
      uploadProjectFile,
      getProjectFiles,
      addProjectMilestone,
      updateProjectStatus,
      addProjectComment,
      getProjectComments,
      createProjectBackup,
      getProjectBackups,
      getProjectAnalytics,
      getProjectPerformanceMetrics,
      searchProjects,
      getProjectsByDateRange,
      validateProjectData,
      checkProjectHealth,
      cacheProjectData,
      getCachedProjectData,
      invalidateProjectCache,
      refreshProjectCache,
      saveProjectDraft,
      getProjectDraft,
      deleteProjectDraft,
      syncProjectOffline,
      connectProjectIntegration,
      disconnectProjectIntegration,
      getProjectIntegrations,
      testProjectIntegration,
      transformProjectData,
      migrateProjectData,
      getProjectDataVersion,
      rollbackProjectData,
      optimizeProjectData,
      analyzeProjectData,
      cleanupProjectData,
      setProjectPermissions,
      getProjectPermissions,
      checkProjectAccess,
      auditProjectAccess,
      validateProjectCompliance,
      getProjectComplianceReport,
      updateProjectCompliance,
      getProjectAuditTrail,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
