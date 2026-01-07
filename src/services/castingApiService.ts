const API_BASE = '/api/casting';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
}

export interface CastingProject {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  project_data: Record<string, unknown>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CastingCandidate {
  id: string;
  project_id: string;
  name: string;
  role_id?: string;
  candidate_data: Record<string, unknown>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CastingRole {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  role_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CastingCrew {
  id: string;
  project_id: string;
  name: string;
  role?: string;
  department?: string;
  crew_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CastingLocation {
  id: string;
  project_id: string;
  name: string;
  address?: string;
  location_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CastingProp {
  id: string;
  project_id: string;
  name: string;
  category?: string;
  prop_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CastingSchedule {
  id: string;
  project_id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  schedule_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const favoritesApi = {
  get: async (projectId: string, favoriteType: string): Promise<string[]> => {
    try {
      const result = await apiRequest<{ favorites: string[] }>(`/favorites/${projectId}/${favoriteType}`);
      return result.favorites;
    } catch {
      return [];
    }
  },
  
  set: async (projectId: string, favoriteType: string, itemIds: string[]): Promise<boolean> => {
    try {
      await apiRequest(`/favorites/${projectId}/${favoriteType}`, {
        method: 'POST',
        body: JSON.stringify({ itemIds }),
      });
      return true;
    } catch {
      return false;
    }
  },
  
  add: async (projectId: string, favoriteType: string, itemId: string): Promise<boolean> => {
    try {
      await apiRequest(`/favorites/${projectId}/${favoriteType}/add`, {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      return true;
    } catch {
      return false;
    }
  },
  
  remove: async (projectId: string, favoriteType: string, itemId: string): Promise<boolean> => {
    try {
      await apiRequest(`/favorites/${projectId}/${favoriteType}/remove`, {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      return true;
    } catch {
      return false;
    }
  },
};

export const projectsApi = {
  getAll: async (userId?: string): Promise<CastingProject[]> => {
    const params = userId ? `?user_id=${userId}` : '';
    const result = await apiRequest<{ projects: CastingProject[] }>(`/projects${params}`);
    return result.projects;
  },
  
  get: async (projectId: string): Promise<CastingProject> => {
    const result = await apiRequest<{ project: CastingProject }>(`/projects/${projectId}`);
    return result.project;
  },
  
  save: async (project: Partial<CastingProject>, userId?: string): Promise<CastingProject> => {
    const result = await apiRequest<{ project: CastingProject }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ ...project, userId }),
    });
    return result.project;
  },
  
  delete: async (projectId: string): Promise<boolean> => {
    await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
    return true;
  },
};

export const candidatesApi = {
  getAll: async (projectId: string): Promise<CastingCandidate[]> => {
    const result = await apiRequest<{ candidates: CastingCandidate[] }>(`/projects/${projectId}/candidates`);
    return result.candidates;
  },
  
  save: async (candidate: Partial<CastingCandidate>): Promise<CastingCandidate> => {
    const result = await apiRequest<{ candidate: CastingCandidate }>('/candidates', {
      method: 'POST',
      body: JSON.stringify(candidate),
    });
    return result.candidate;
  },
  
  delete: async (candidateId: string): Promise<boolean> => {
    await apiRequest(`/candidates/${candidateId}`, { method: 'DELETE' });
    return true;
  },
};

export const rolesApi = {
  getAll: async (projectId: string): Promise<CastingRole[]> => {
    const result = await apiRequest<{ roles: CastingRole[] }>(`/projects/${projectId}/roles`);
    return result.roles;
  },
  
  save: async (role: Partial<CastingRole>): Promise<CastingRole> => {
    const result = await apiRequest<{ role: CastingRole }>('/roles', {
      method: 'POST',
      body: JSON.stringify(role),
    });
    return result.role;
  },
  
  delete: async (roleId: string): Promise<boolean> => {
    await apiRequest(`/roles/${roleId}`, { method: 'DELETE' });
    return true;
  },
};

export const crewApi = {
  getAll: async (projectId: string): Promise<CastingCrew[]> => {
    const result = await apiRequest<{ crew: CastingCrew[] }>(`/projects/${projectId}/crew`);
    return result.crew;
  },
  
  save: async (crew: Partial<CastingCrew>): Promise<CastingCrew> => {
    const result = await apiRequest<{ crew: CastingCrew }>('/crew', {
      method: 'POST',
      body: JSON.stringify(crew),
    });
    return result.crew;
  },
  
  delete: async (crewId: string): Promise<boolean> => {
    await apiRequest(`/crew/${crewId}`, { method: 'DELETE' });
    return true;
  },
};

export const locationsApi = {
  getAll: async (projectId: string): Promise<CastingLocation[]> => {
    const result = await apiRequest<{ locations: CastingLocation[] }>(`/projects/${projectId}/locations`);
    return result.locations;
  },
  
  save: async (location: Partial<CastingLocation>): Promise<CastingLocation> => {
    const result = await apiRequest<{ location: CastingLocation }>('/locations', {
      method: 'POST',
      body: JSON.stringify(location),
    });
    return result.location;
  },
  
  delete: async (locationId: string): Promise<boolean> => {
    await apiRequest(`/locations/${locationId}`, { method: 'DELETE' });
    return true;
  },
};

export const propsApi = {
  getAll: async (projectId: string): Promise<CastingProp[]> => {
    const result = await apiRequest<{ props: CastingProp[] }>(`/projects/${projectId}/props`);
    return result.props;
  },
  
  save: async (prop: Partial<CastingProp>): Promise<CastingProp> => {
    const result = await apiRequest<{ prop: CastingProp }>('/props', {
      method: 'POST',
      body: JSON.stringify(prop),
    });
    return result.prop;
  },
  
  delete: async (propId: string): Promise<boolean> => {
    await apiRequest(`/props/${propId}`, { method: 'DELETE' });
    return true;
  },
};

export const schedulesApi = {
  getAll: async (projectId: string): Promise<CastingSchedule[]> => {
    const result = await apiRequest<{ schedules: CastingSchedule[] }>(`/projects/${projectId}/schedules`);
    return result.schedules;
  },
  
  save: async (schedule: Partial<CastingSchedule>): Promise<CastingSchedule> => {
    const result = await apiRequest<{ schedule: CastingSchedule }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
    return result.schedule;
  },
  
  delete: async (scheduleId: string): Promise<boolean> => {
    await apiRequest(`/schedules/${scheduleId}`, { method: 'DELETE' });
    return true;
  },
};

export const castingApi = {
  favorites: favoritesApi,
  projects: projectsApi,
  candidates: candidatesApi,
  roles: rolesApi,
  crew: crewApi,
  locations: locationsApi,
  props: propsApi,
  schedules: schedulesApi,
};

export default castingApi;
