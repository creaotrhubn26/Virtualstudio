/**
 * Hook for fetching virtual studio recommendations
 */

import { useState, useEffect, useCallback } from 'react';

export interface VirtualStudioRecommendation {
  id: string;
  title: string;
  name: string;
  description: string;
  projectType: string;
  successRate: number;
  usageCount: number;
  basedOnProjectsCount: number;
  isTrending: boolean;
  tags: string[];
  configuration: {
    resolution: string;
    frameRate: number;
    bitrate: number;
    codec: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseVirtualStudioRecommendationsReturn {
  recommendations: VirtualStudioRecommendation[];
  trending: VirtualStudioRecommendation[];
  isLoading: boolean;
  error: string | null;
  fetchTrending: () => Promise<void>;
}

export function useVirtualStudioRecommendations(projectType: string): UseVirtualStudioRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<VirtualStudioRecommendation[]>([]);
  const [trending, setTrending] = useState<VirtualStudioRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Mock data for now - replace with actual API call
        const mockRecommendations: VirtualStudioRecommendation[] = [
          {
            id: '1',
            title: 'Standard HD Setup',
            name: 'Standard HD Setup',
            description: 'Optimal settings for HD video production',
            projectType: projectType,
            successRate: 95,
            usageCount: 1250,
            basedOnProjectsCount: 500,
            isTrending: false,
            tags: ['HD', 'Standard', 'Recommended'],
            configuration: {
              resolution: '1920x1080',
              frameRate: 30,
              bitrate: 8000,
              codec: 'H.264'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            title: '4K Professional',
            name: '4K Professional',
            description: 'High-quality 4K settings for professional use',
            projectType: projectType,
            successRate: 92,
            usageCount: 850,
            basedOnProjectsCount: 300,
            isTrending: true,
            tags: ['4K', 'Professional', 'High Quality'],
            configuration: {
              resolution: '3840x2160',
              frameRate: 60,
              bitrate: 25000,
              codec: 'H.265'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        setRecommendations(mockRecommendations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectType) {
      fetchRecommendations();
    }
  }, [projectType]);

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock trending data - replace with actual API call
      const mockTrending: VirtualStudioRecommendation[] = [
        {
          id: 't1',
          title: 'Trending: Social Media Optimized',
          name: 'Trending: Social Media Optimized',
          description: 'Popular settings for social media content',
          projectType: 'social',
          successRate: 98,
          usageCount: 5000,
          basedOnProjectsCount: 2000,
          isTrending: true,
          tags: ['Trending', 'Social Media', 'Viral'],
          configuration: {
            resolution: '1080x1920',
            frameRate: 30,
            bitrate: 6000,
            codec: 'H.264'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setTrending(mockTrending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recommendations,
    trending,
    isLoading,
    error,
    fetchTrending
  };
}

