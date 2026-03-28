import type {
  EnvironmentPlan,
  EnvironmentValidateRequest,
  EnvironmentValidateResponse,
} from '../core/models/environmentPlan';
import { apiRequest } from '../lib/api';

type EnvironmentValidationMock =
  | EnvironmentValidateResponse
  | ((
    request: EnvironmentValidateRequest,
  ) => EnvironmentValidateResponse | Promise<EnvironmentValidateResponse>);

type EnvironmentValidationWindow = Window & {
  __virtualStudioEnvironmentValidationMock?: EnvironmentValidationMock;
  __virtualStudioEnvironmentValidationRequests?: EnvironmentValidateRequest[];
};

function getWindowRef(): EnvironmentValidationWindow | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window as EnvironmentValidationWindow;
}

function clonePlan(plan: EnvironmentPlan): EnvironmentPlan {
  return JSON.parse(JSON.stringify(plan)) as EnvironmentPlan;
}

class EnvironmentValidationService {
  async getStatus(): Promise<Record<string, unknown>> {
    return apiRequest<Record<string, unknown>>('/api/environment/validate/status', {
      method: 'GET',
    });
  }

  async validate(
    plan: EnvironmentPlan,
    options: Omit<EnvironmentValidateRequest, 'plan'> = {},
  ): Promise<EnvironmentValidateResponse> {
    const payload: EnvironmentValidateRequest = {
      plan,
      previewImage: options.previewImage ?? null,
      provider: options.provider,
      validationOptions: options.validationOptions,
    };
    const win = getWindowRef();
    const mock = win?.__virtualStudioEnvironmentValidationMock;
    if (mock) {
      const clonedPayload: EnvironmentValidateRequest = {
        ...payload,
        plan: clonePlan(plan),
      };
      win.__virtualStudioEnvironmentValidationRequests = [
        ...(win.__virtualStudioEnvironmentValidationRequests || []),
        clonedPayload,
      ];
      if (typeof mock === 'function') {
        return mock(clonedPayload);
      }
      return JSON.parse(JSON.stringify(mock));
    }

    return apiRequest<EnvironmentValidateResponse>('/api/environment/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const environmentValidationService = new EnvironmentValidationService();
