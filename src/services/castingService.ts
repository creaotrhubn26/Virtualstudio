import { 
  CastingProject, 
  Role, 
  Candidate, 
  Schedule,
  CrewMember,
  Location,
  Prop,
  ProductionDay,
  ShotList,
  UserRole,
  Consent,
} from '../core/models/casting';
import { sceneComposerService } from './sceneComposerService';
import { apiRequest } from '../lib/queryClient';

// Database availability cache
let dbAvailable: boolean | null = null;
let dbCheckPromise: Promise<boolean> | null = null;

// Local storage fallback for projects
const PROJECTS_STORAGE_KEY = 'casting-projects';

/**
 * Get projects from local storage fallback
 */
function getProjectsFromStorage(): CastingProject[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to get projects from storage:', error);
    return [];
  }
}

/**
 * Save projects to local storage fallback
 */
function saveProjectsToStorage(projects: CastingProject[]): void {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('Failed to save projects to storage:', error);
  }
}

/**
 * Check if database is available
 */
async function checkDatabaseAvailability(): Promise<boolean> {
  if (dbAvailable !== null) {
    return dbAvailable;
  }
  
  if (dbCheckPromise) {
    return dbCheckPromise;
  }
  
  dbCheckPromise = (async () => {
    try {
      const response = await fetch('/api/casting/health');
      const result = await response.json();
      dbAvailable = result.status === 'healthy';
      return dbAvailable;
    } catch (error) {
      console.error('Database not available:', error);
      dbAvailable = false;
      return false;
    } finally {
      dbCheckPromise = null;
    }
  })();
  
  return dbCheckPromise;
}

/**
 * Get projects from database with fallback to storage
 */
async function getProjectsFromDb(): Promise<CastingProject[]> {
  try {
    const response = await fetch('/api/casting/projects');
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    const projects = Array.isArray(data) ? data : data.projects || [];
    saveProjectsToStorage(projects); // Cache to storage
    return projects;
  } catch (error) {
    console.error('Error fetching projects from database:', error);
    // Fall back to local storage
    console.log('Using cached projects from local storage');
    return getProjectsFromStorage();
  }
}

/**
 * Save project to database with fallback to storage
 */
async function saveProjectToDb(project: CastingProject): Promise<void> {
  // Always save to storage first
  const projects = getProjectsFromStorage();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  saveProjectsToStorage(projects);
  
  // Try to sync with database
  try {
    const response = await fetch('/api/casting/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save project: ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to save project to database, using local storage:', error);
    // Not throwing - user can continue working offline
  }
}

/**
 * Delete project from database with fallback to storage
 */
async function deleteProjectFromDb(id: string): Promise<void> {
  // Remove from storage first
  let projects = getProjectsFromStorage();
  projects = projects.filter(p => p.id !== id);
  saveProjectsToStorage(projects);
  
  // Try to sync with database
  try {
    const response = await fetch(`/api/casting/projects/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to delete project from database, using local storage:', error);
    // Not throwing - user can continue working offline
  }
}

export const castingService = {
  /**
   * Get all projects from database or storage
   */
  async getProjects(): Promise<CastingProject[]> {
    try {
      return await getProjectsFromDb();
    } catch (error) {
      console.error('Database fetch failed, falling back to storage:', error);
      // Return projects from local storage even if database is unavailable
      return getProjectsFromStorage();
    }
  },

  /**
   * Get project by ID from database or storage
   */
  async getProject(id: string): Promise<CastingProject | null> {
    try {
      const response = await fetch(`/api/casting/projects/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      // Fall back to storage
      const projects = getProjectsFromStorage();
      return projects.find(p => p.id === id) || null;
    }
  },

  /**
   * Save project (create or update) to database or storage
   */
  async saveProject(project: CastingProject): Promise<void> {
    // Update timestamp
    project = { ...project, updatedAt: new Date().toISOString() };
    
    try {
      await saveProjectToDb(project);
    } catch (error) {
      console.warn('Database save failed, using local storage:', error);
      // Still save to storage as fallback
      const projects = getProjectsFromStorage();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      if (existingIndex >= 0) {
        projects[existingIndex] = project;
      } else {
        projects.push(project);
      }
      saveProjectsToStorage(projects);
    }
  },

  /**
   * Delete project from database or storage
   */
  async deleteProject(id: string): Promise<void> {
    try {
      await deleteProjectFromDb(id);
    } catch (error) {
      console.warn('Database delete failed, using local storage:', error);
      // Still delete from storage as fallback
      let projects = getProjectsFromStorage();
      projects = projects.filter(p => p.id !== id);
      saveProjectsToStorage(projects);
    }
  },

  /**
   * Get roles for a project
   */
  async getRoles(projectId: string): Promise<Role[]> {
    const project = await this.getProject(projectId);
    return project?.roles || [];
  },

  /**
   * Save role to project
   */
  async saveRole(projectId: string, role: Role): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const index = project.roles.findIndex(r => r.id === role.id);
    if (index >= 0) {
      project.roles[index] = role;
    } else {
      project.roles.push(role);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete role from project
   */
  async deleteRole(projectId: string, roleId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.roles = project.roles.filter(r => r.id !== roleId);
    await this.saveProject(project);
  },

  /**
   * Get candidates for a project
   */
  async getCandidates(projectId: string): Promise<Candidate[]> {
    const project = await this.getProject(projectId);
    return project?.candidates || [];
  },

  /**
   * Save candidate to project
   */
  async saveCandidate(projectId: string, candidate: Candidate): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const index = project.candidates.findIndex(c => c.id === candidate.id);
    if (index >= 0) {
      project.candidates[index] = { ...candidate, updatedAt: new Date().toISOString() };
    } else {
      project.candidates.push(candidate);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete candidate from project
   */
  async deleteCandidate(projectId: string, candidateId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.candidates = project.candidates.filter(c => c.id !== candidateId);
    await this.saveProject(project);
  },

  /**
   * Get schedules for a project
   */
  async getSchedules(projectId: string): Promise<Schedule[]> {
    const project = await this.getProject(projectId);
    return project?.schedules || [];
  },

  /**
   * Save schedule to project
   */
  async saveSchedule(projectId: string, schedule: Schedule): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const index = project.schedules.findIndex(s => s.id === schedule.id);
    if (index >= 0) {
      project.schedules[index] = schedule;
    } else {
      project.schedules.push(schedule);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete schedule from project
   */
  async deleteSchedule(projectId: string, scheduleId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.schedules = project.schedules.filter(s => s.id !== scheduleId);
    await this.saveProject(project);
  },

  /**
   * Link role to Scene Composer scene
   */
  async linkRoleToScene(projectId: string, roleId: string, sceneId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const role = project.roles.find(r => r.id === roleId);
    if (role) {
      if (!role.sceneIds) {
        role.sceneIds = [];
      }
      if (!role.sceneIds.includes(sceneId)) {
        role.sceneIds.push(sceneId);
      }
      await this.saveRole(projectId, role);
    }
  },

  /**
   * Get scenes for a role
   */
  async getScenesForRole(projectId: string, roleId: string): Promise<string[]> {
    const roles = await this.getRoles(projectId);
    const role = roles.find(r => r.id === roleId);
    return role?.sceneIds || [];
  },

  /**
   * Get available scenes from Scene Composer
   */
  getAvailableScenes(): Array<{ id: string; name: string; thumbnail?: string }> {
    try {
      const scenes = sceneComposerService.getAllScenes();
      return scenes.map(scene => ({
        id: scene.id,
        name: scene.name,
        thumbnail: scene.thumbnail,
      }));
    } catch (error) {
      console.error('Error getting scenes from Scene Composer:', error);
      return [];
    }
  },

  /**
   * Sync with Scene Composer (validate scene IDs)
   */
  async syncWithSceneComposer(projectId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const availableScenes = this.getAvailableScenes();
    const availableSceneIds = new Set(availableScenes.map(s => s.id));
    
    // Remove invalid scene references
    project.roles.forEach(role => {
      if (role.sceneIds) {
        role.sceneIds = role.sceneIds.filter(id => availableSceneIds.has(id));
      }
    });
    
    project.schedules.forEach(schedule => {
      if (schedule.sceneId && !availableSceneIds.has(schedule.sceneId)) {
        schedule.sceneId = undefined;
      }
    });
    
    // Sync production days
    project.productionDays?.forEach(day => {
      day.scenes = day.scenes.filter(id => availableSceneIds.has(id));
    });
    
    // Sync crew assigned scenes
    project.crew?.forEach(crew => {
      crew.assignedScenes = crew.assignedScenes.filter(id => availableSceneIds.has(id));
    });
    
    // Sync location assigned scenes
    project.locations?.forEach(location => {
      location.assignedScenes = location.assignedScenes.filter(id => availableSceneIds.has(id));
    });
    
    // Sync prop assigned scenes
    project.props?.forEach(prop => {
      prop.assignedScenes = prop.assignedScenes.filter(id => availableSceneIds.has(id));
    });
    
    // Sync shot lists
    project.shotLists?.forEach(shotList => {
      if (!availableSceneIds.has(shotList.sceneId)) {
        // Remove shot list if scene is invalid
        project.shotLists = project.shotLists?.filter(sl => sl.id !== shotList.id) || [];
      }
    });
    
    await this.saveProject(project);
  },

  // ============================================================================
  // Crew Management
  // ============================================================================

  /**
   * Get crew members for a project
   */
  async getCrew(projectId: string): Promise<CrewMember[]> {
    const project = await this.getProject(projectId);
    // Ensure crew is always an array
    if (!project) return [];
    if (!project.crew) return [];
    return Array.isArray(project.crew) ? project.crew : [];
  },

  /**
   * Save crew member to project
   */
  async saveCrew(projectId: string, crew: CrewMember): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.crew) {
      project.crew = [];
    }
    
    const index = project.crew.findIndex(c => c.id === crew.id);
    if (index >= 0) {
      project.crew[index] = { ...crew, updatedAt: new Date().toISOString() };
    } else {
      project.crew.push(crew);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete crew member from project
   */
  async deleteCrew(projectId: string, crewId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.crew = (project.crew || []).filter(c => c.id !== crewId);
    await this.saveProject(project);
  },

  // ============================================================================
  // Location Management
  // ============================================================================

  /**
   * Get locations for a project
   */
  async getLocations(projectId: string): Promise<Location[]> {
    const project = await this.getProject(projectId);
    return project?.locations || [];
  },

  /**
   * Save location to project
   */
  async saveLocation(projectId: string, location: Location): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.locations) {
      project.locations = [];
    }
    
    const index = project.locations.findIndex(l => l.id === location.id);
    if (index >= 0) {
      project.locations[index] = { ...location, updatedAt: new Date().toISOString() };
    } else {
      project.locations.push(location);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete location from project
   */
  async deleteLocation(projectId: string, locationId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.locations = (project.locations || []).filter(l => l.id !== locationId);
    await this.saveProject(project);
  },

  // ============================================================================
  // Prop Management
  // ============================================================================

  /**
   * Get props for a project
   */
  async getProps(projectId: string): Promise<Prop[]> {
    const project = await this.getProject(projectId);
    return project?.props || [];
  },

  /**
   * Save prop to project
   */
  async saveProp(projectId: string, prop: Prop): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.props) {
      project.props = [];
    }
    
    const index = project.props.findIndex(p => p.id === prop.id);
    if (index >= 0) {
      project.props[index] = { ...prop, updatedAt: new Date().toISOString() };
    } else {
      project.props.push(prop);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete prop from project
   */
  async deleteProp(projectId: string, propId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.props = (project.props || []).filter(p => p.id !== propId);
    await this.saveProject(project);
  },

  // ============================================================================
  // Production Day Management
  // ============================================================================

  /**
   * Get production days for a project
   */
  async getProductionDays(projectId: string): Promise<ProductionDay[]> {
    const project = await this.getProject(projectId);
    return project?.productionDays || [];
  },

  /**
   * Save production day to project
   */
  async saveProductionDay(projectId: string, productionDay: ProductionDay): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.productionDays) {
      project.productionDays = [];
    }
    
    const index = project.productionDays.findIndex(pd => pd.id === productionDay.id);
    if (index >= 0) {
      project.productionDays[index] = { ...productionDay, updatedAt: new Date().toISOString() };
    } else {
      project.productionDays.push(productionDay);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete production day from project
   */
  async deleteProductionDay(projectId: string, productionDayId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.productionDays = (project.productionDays || []).filter(pd => pd.id !== productionDayId);
    await this.saveProject(project);
  },

  // ============================================================================
  // Shot List Management
  // ============================================================================

  /**
   * Get shot lists for a project
   */
  async getShotLists(projectId: string): Promise<ShotList[]> {
    const project = await this.getProject(projectId);
    return project?.shotLists || [];
  },

  /**
   * Get shot list by scene ID
   */
  async getShotListByScene(projectId: string, sceneId: string): Promise<ShotList | null> {
    const shotLists = await this.getShotLists(projectId);
    return shotLists.find(sl => sl.sceneId === sceneId) || null;
  },

  /**
   * Save shot list to project
   */
  async saveShotList(projectId: string, shotList: ShotList): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.shotLists) {
      project.shotLists = [];
    }
    
    const index = project.shotLists.findIndex(sl => sl.id === shotList.id);
    if (index >= 0) {
      project.shotLists[index] = { ...shotList, updatedAt: new Date().toISOString() };
    } else {
      project.shotLists.push(shotList);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete shot list from project
   */
  async deleteShotList(projectId: string, shotListId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.shotLists = (project.shotLists || []).filter(sl => sl.id !== shotListId);
    await this.saveProject(project);
  },

  // ============================================================================
  // User Role Management
  // ============================================================================

  /**
   * Get user roles for a project
   */
  async getUserRoles(projectId: string): Promise<UserRole[]> {
    const project = await this.getProject(projectId);
    return project?.userRoles || [];
  },

  /**
   * Save user role to project
   */
  async saveUserRole(projectId: string, userRole: UserRole): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.userRoles) {
      project.userRoles = [];
    }
    
    const index = project.userRoles.findIndex(ur => ur.id === userRole.id);
    if (index >= 0) {
      project.userRoles[index] = { ...userRole, updatedAt: new Date().toISOString() };
    } else {
      project.userRoles.push(userRole);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete user role from project
   */
  async deleteUserRole(projectId: string, userRoleId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    project.userRoles = (project.userRoles || []).filter(ur => ur.id !== userRoleId);
    await this.saveProject(project);
  },

  // ============================================================================
  // Consent Management
  // ============================================================================

  /**
   * Get consents for a candidate
   */
  async getConsents(projectId: string, candidateId: string): Promise<Consent[]> {
    const candidates = await this.getCandidates(projectId);
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate?.consent || [];
  },

  /**
   * Save consent for a candidate
   */
  async saveConsent(projectId: string, candidateId: string, consent: Consent): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const candidate = project.candidates.find(c => c.id === candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found`);
    }
    
    if (!candidate.consent) {
      candidate.consent = [];
    }
    
    const index = candidate.consent.findIndex(c => c.id === consent.id);
    if (index >= 0) {
      candidate.consent[index] = { ...consent, updatedAt: new Date().toISOString() };
    } else {
      candidate.consent.push(consent);
    }
    
    await this.saveProject(project);
  },

  /**
   * Delete consent from candidate
   */
  async deleteConsent(projectId: string, candidateId: string, consentId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const candidate = project.candidates.find(c => c.id === candidateId);
    if (!candidate || !candidate.consent) {
      throw new Error(`Candidate ${candidateId} or consent not found`);
    }
    
    candidate.consent = candidate.consent.filter(c => c.id !== consentId);
    await this.saveProject(project);
  },

  /**
   * Initialize mock data for testing
   */
  async initializeMockData(): Promise<void> {
    try {
      const existingProjects = await this.getProjects();
      if (existingProjects.length > 0) {
        // Don't overwrite existing data
        return;
      }
    } catch (error) {
      console.error('Error checking existing projects:', error);
      // Continue to create mock data if database is available
    }

    const now = new Date().toISOString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const mockProject: CastingProject = {
      id: 'mock-project-1',
      name: 'TV-reklame: Sommerkampanje 2025',
      description: 'Produksjon av TV-reklame for Norsk Tipping sin sommerkampanje. Familievennlig konsept med fokus på utendørsaktiviteter og samhold. Sendes på TV2, NRK og sosiale medier.',
      roles: [
        {
          id: 'role-1',
          name: 'Hovedperson - Mor',
          description: 'Mor i 30-årene, vennlig og varm personlighet',
          requirements: {
            age: { min: 28, max: 38 },
            gender: ['female'],
            appearance: ['nordisk', 'naturlig'],
            skills: ['acting', 'natural'],
          },
          status: 'casting',
          sceneIds: [],
        },
        {
          id: 'role-2',
          name: 'Hovedperson - Far',
          description: 'Far i 30-årene, aktiv og engasjert',
          requirements: {
            age: { min: 30, max: 40 },
            gender: ['male'],
            appearance: ['nordisk'],
            skills: ['acting'],
          },
          status: 'open',
          sceneIds: [],
        },
        {
          id: 'role-3',
          name: 'Barn - 8 år',
          description: 'Barn i 8-årsalderen, naturlig og spontan',
          requirements: {
            age: { min: 7, max: 9 },
            skills: ['natural'],
          },
          status: 'casting',
          sceneIds: [],
        },
      ],
      candidates: [
        {
          id: 'candidate-1',
          name: 'Emma Hansen',
          contactInfo: {
            email: 'emma.hansen@example.com',
            phone: '+47 123 45 678',
            address: 'Storgata 1, 0155 Oslo',
          },
          photos: ['/attached_assets/generated_images/professional_female_headshot_portrait.png'],
          videos: [],
          auditionNotes: 'Sterk kandidat med god erfaring. Naturlig og varm fremtoning.',
          status: 'shortlist',
          assignedRoles: ['role-1'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'candidate-2',
          name: 'Lars Johansen',
          contactInfo: {
            email: 'lars.johansen@example.com',
            phone: '+47 987 65 432',
            address: 'Karl Johans gate 10, 0162 Oslo',
          },
          photos: ['/attached_assets/generated_images/professional_male_headshot_portrait.png'],
          videos: [],
          auditionNotes: 'Profesjonell skuespiller med bred erfaring.',
          status: 'requested',
          assignedRoles: ['role-2'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'candidate-3',
          name: 'Sofie Olsen',
          contactInfo: {
            email: 'sofie.olsen@example.com',
            phone: '+47 555 12 345',
          },
          photos: ['/attached_assets/generated_images/young_female_casting_headshot.png'],
          videos: [],
          auditionNotes: 'Ung og lovende kandidat.',
          status: 'pending',
          assignedRoles: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'candidate-4',
          name: 'Ole Berg',
          contactInfo: {
            email: 'ole.berg@example.com',
            phone: '+47 444 33 222',
          },
          photos: [],
          videos: [],
          auditionNotes: 'Naturlig og spontan. Perfekt for barnerolle.',
          status: 'selected',
          assignedRoles: ['role-3'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'candidate-5',
          name: 'Maria Svendsen',
          contactInfo: {
            email: 'maria.svendsen@example.com',
            phone: '+47 666 77 888',
          },
          photos: [],
          videos: [],
          auditionNotes: 'Ikke passende for denne rollen.',
          status: 'rejected',
          assignedRoles: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'candidate-6',
          name: 'Kari Nordmann',
          contactInfo: {
            email: 'kari.nordmann@example.com',
            phone: '+47 111 22 333',
          },
          photos: [],
          videos: [],
          auditionNotes: 'Bekreftet deltakelse.',
          status: 'confirmed',
          assignedRoles: ['role-1'],
          createdAt: now,
          updatedAt: now,
        },
      ],
      schedules: [
        {
          id: 'schedule-1',
          candidateId: 'candidate-1',
          roleId: 'role-1',
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          location: 'Studio A, Filmbyen',
          notes: 'Første audition',
          status: 'scheduled',
        },
        {
          id: 'schedule-2',
          candidateId: 'candidate-2',
          roleId: 'role-2',
          date: tomorrow.toISOString().split('T')[0],
          time: '14:00',
          location: 'Studio A, Filmbyen',
          notes: 'Callback audition',
          status: 'scheduled',
        },
      ],
      crew: [
        {
          id: 'crew-1',
          name: 'Anders Regissør',
          role: 'director',
          contactInfo: {
            email: 'anders@production.no',
            phone: '+47 999 88 777',
            address: 'Produksjonsveien 5, 0270 Oslo',
          },
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          rate: 5000,
          notes: 'Hovedregissør',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'crew-2',
          name: 'Kari Produsent',
          role: 'producer',
          contactInfo: {
            email: 'kari@production.no',
            phone: '+47 888 77 666',
          },
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          rate: 6000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'crew-3',
          name: 'Tom Kameramann',
          role: 'camera_operator',
          contactInfo: {
            email: 'tom@camera.no',
            phone: '+47 777 66 555',
            address: 'Kameragata 12, 0165 Oslo',
          },
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          rate: 4000,
          createdAt: now,
          updatedAt: now,
        },
      ],
      locations: [
        {
          id: 'location-1',
          name: 'Studio A - Filmbyen Jar',
          address: 'Sandviksveien 26, 1363 Høvik, Oslo',
          type: 'studio',
          capacity: 80,
          facilities: ['parking', 'restrooms', 'catering', 'wifi', 'power', 'dressing_rooms', 'makeup_area', 'loading_dock', 'green_room'],
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          contactInfo: {
            name: 'Erik Studiosjef',
            phone: '+47 67 12 34 56',
            email: 'booking@filmbyen.no',
          },
          coordinates: {
            lat: 59.9139,
            lng: 10.6200,
          },
          propertyId: '219/45/12',
          notes: 'Profesjonelt studio med 600 kvm og 8m takhøyde. Greenscreen, lydstudio og redigeringsrom inkludert.',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'location-2',
          name: 'Huk Strand - Bygdøy',
          address: 'Huk Aveny 2, 0287 Oslo',
          type: 'outdoor',
          capacity: 150,
          facilities: ['parking', 'restrooms', 'cafe_nearby', 'beach_access'],
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          coordinates: {
            lat: 59.8975,
            lng: 10.6745,
          },
          propertyId: '301/89/3',
          notes: 'Populær badestrand med panoramautsikt. Perfekt for sommerlige familiescener. Tillatelse fra Oslo kommune påkrevd.',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'location-3',
          name: 'Frognerparken - Monolitten',
          address: 'Nobels gate 32, 0268 Oslo',
          type: 'outdoor',
          capacity: 200,
          facilities: ['parking', 'restrooms', 'cafe_nearby'],
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          coordinates: {
            lat: 59.9271,
            lng: 10.7016,
          },
          propertyId: '301/156/1',
          notes: 'Ikonisk skulpturpark. Tillatelse fra Oslo Bymiljøetaten påkrevd for filming. Tidlig morgen eller kveld anbefales.',
          createdAt: now,
          updatedAt: now,
        },
      ],
      props: [
        {
          id: 'prop-1',
          name: 'Sykler - Familie',
          category: 'equipment',
          description: '3 sykler i ulike størrelser',
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          quantity: 3,
          location: 'Studio A - Lager',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prop-2',
          name: 'Picknick-teppe',
          category: 'decoration',
          description: 'Rødt og hvitrutet picknick-teppe',
          availability: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: nextWeek.toISOString().split('T')[0],
          },
          assignedScenes: [],
          quantity: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      productionDays: [
        {
          id: 'prod-day-1',
          projectId: 'mock-project-1',
          date: tomorrow.toISOString().split('T')[0],
          callTime: '08:00',
          wrapTime: '18:00',
          locationId: 'location-1',
          scenes: [],
          crew: ['crew-1', 'crew-2', 'crew-3'],
          props: ['prop-1', 'prop-2'],
          notes: 'Første produksjonsdag - Studio opptak',
          status: 'planned',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'prod-day-2',
          projectId: 'mock-project-1',
          date: nextWeek.toISOString().split('T')[0],
          callTime: '09:00',
          wrapTime: '17:00',
          locationId: 'location-2',
          scenes: [],
          crew: ['crew-1', 'crew-3'],
          props: ['prop-2'],
          notes: 'Utendørs opptak',
          status: 'planned',
          createdAt: now,
          updatedAt: now,
        },
      ],
      shotLists: [],
      userRoles: [],
      createdAt: now,
      updatedAt: now,
    };

    // Save to database
    try {
      await this.saveProject(mockProject);
      console.log('Mock data initialized for Casting Planner in database');
      console.log('Mock project ID:', mockProject.id);
      console.log('Mock candidates count:', mockProject.candidates.length);
      
      // Verify it was saved
      const saved = await this.getProject(mockProject.id);
      if (saved) {
        console.log('Mock project verified in database, candidates:', saved.candidates?.length || 0);
      } else {
        console.error('Failed to verify mock project was saved!');
      }
    } catch (error) {
      console.error('Failed to initialize mock data in database:', error);
      throw error;
    }
  },
};

