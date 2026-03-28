import type { EnvironmentPlanRoomShell } from '../core/models/environmentPlan';
import type { EnvironmentScenegraphAssembly } from '../core/models/environmentScenegraph';
import type { EnvironmentRuntimePropRequest } from './environmentPropMapper';
import { apiRequest } from '../lib/api';

export interface EnvironmentAssembleResponse {
  success: boolean;
  provider: string;
  shell: EnvironmentPlanRoomShell;
  assembly: EnvironmentScenegraphAssembly;
  runtimeProps: EnvironmentRuntimePropRequest[];
}

type EnvironmentAssemblyMock =
  | EnvironmentAssembleResponse
  | ((plan: Record<string, unknown>) => EnvironmentAssembleResponse | Promise<EnvironmentAssembleResponse>);

type EnvironmentAssemblyWindow = Window & {
  __virtualStudioEnvironmentAssemblyMock?: EnvironmentAssemblyMock;
  __virtualStudioEnvironmentAssemblyRequests?: Record<string, unknown>[];
};

function getWindowRef(): EnvironmentAssemblyWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as EnvironmentAssemblyWindow;
}

function clonePlan(plan: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(plan));
}

class EnvironmentAssemblyService {
  async getStatus(): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/api/environment/assemble/status', {
      method: 'GET',
    });
  }

  async assemble(plan: Record<string, unknown>): Promise<EnvironmentAssembleResponse> {
    const win = getWindowRef();
    const mock = win?.__virtualStudioEnvironmentAssemblyMock;
    if (mock) {
      const clonedPlan = clonePlan(plan);
      win.__virtualStudioEnvironmentAssemblyRequests = [
        ...(win.__virtualStudioEnvironmentAssemblyRequests || []),
        clonedPlan,
      ];
      if (typeof mock === 'function') {
        return mock(clonedPlan);
      }
      return JSON.parse(JSON.stringify(mock));
    }

    return apiRequest<EnvironmentAssembleResponse>('/api/environment/assemble', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }
}

export const environmentAssemblyService = new EnvironmentAssemblyService();
