import { useCallback } from 'react';

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Weather {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export function useExternalData() {
  const getKartverketAddress = useCallback(async (query: string): Promise<Address | null> => {
    console.log('[ExternalData] Kartverket address lookup:', query);
    return {
      street: query,
      city: 'Oslo',
      postalCode: '0150',
      country: 'Norge',
    };
  }, []);

  const searchKartverketPlaceNames = useCallback(async (query: string): Promise<string[]> => {
    console.log('[ExternalData] Kartverket place search:', query);
    return ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'];
  }, []);

  const analyzeProperty = useCallback(async (address: string): Promise<object> => {
    return { type: 'residential', size: 120, floors: 2 };
  }, []);

  const getCurrentWeather = useCallback(async (location: string): Promise<Weather> => {
    return { temperature: 15, condition: 'partly_cloudy', humidity: 65, windSpeed: 8 };
  }, []);

  const getWeatherForecast = useCallback(async (location: string, days: number): Promise<Weather[]> => {
    return Array(days).fill(null).map((_, i) => ({
      temperature: 15 + Math.random() * 10 - 5,
      condition: 'partly_cloudy',
      humidity: 60 + Math.random() * 20,
      windSpeed: 5 + Math.random() * 10,
    }));
  }, []);

  const calculateTravelCosts = useCallback(async (from: string, to: string): Promise<{ km: number; fuel: number; toll: number }> => {
    return { km: 50, fuel: 150, toll: 45 };
  }, []);

  const getFuelPrices = useCallback(async (): Promise<{ diesel: number; petrol: number }> => {
    return { diesel: 19.5, petrol: 20.2 };
  }, []);

  return {
    getKartverketAddress,
    searchKartverketPlaceNames,
    analyzeProperty,
    getCurrentWeather,
    getWeatherForecast,
    calculateTravelCosts,
    getFuelPrices,
  };
}

export default useExternalData;
