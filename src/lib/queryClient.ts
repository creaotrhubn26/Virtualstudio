import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Mock data for fallback when backend is unavailable
const mockData: Record<string, any> = {
  '/api/casting/projects': {
    projects: [],
  },
  '/api/user/kv/casting-profession': {
    profession: 'producer',
  },
};

export const apiRequest = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    // Fallback: Return mock data or empty response
    console.warn(`[API Fallback] ${url} failed, using mock data:`, error);
    
    // Try to find matching mock data
    for (const [mockUrl, mockResponse] of Object.entries(mockData)) {
      if (url.includes(mockUrl)) {
        return mockResponse;
      }
    }
    
    // Generic fallback response
    if (url.includes('/api/casting')) {
      return { data: [], success: true };
    }
    if (url.includes('/api/user')) {
      return { success: true };
    }
    
    throw error;
  }
};

export default queryClient;
