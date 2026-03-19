import type {
  AssetRetrievalRequest,
  AssetRetrievalResponse,
} from '../core/models/assetRetrieval';
import { apiRequest } from '../lib/api';

class EnvironmentAssetRetrievalService {
  async retrieveAssets(request: AssetRetrievalRequest): Promise<AssetRetrievalResponse> {
    return apiRequest<AssetRetrievalResponse>('/api/environment/retrieve-assets', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const environmentAssetRetrievalService = new EnvironmentAssetRetrievalService();
