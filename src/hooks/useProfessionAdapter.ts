import { useMemo } from 'react';
import { useProfessionConfigs, ProfessionConfig } from './useProfessionConfigs';

export interface AdaptedProfession {
  config: ProfessionConfig;
  displayName: string;
  shortName: string;
  isActive: boolean;
}

export const useProfessionAdapter = (professionId?: string) => {
  const { configs, getConfigById } = useProfessionConfigs();
  
  const adapted = useMemo((): AdaptedProfession | null => {
    if (!professionId) return null;
    
    const config = getConfigById(professionId);
    if (!config) return null;
    
    return {
      config,
      displayName: config.name,
      shortName: config.name.substring(0, 3).toUpperCase(),
      isActive: true,
    };
  }, [professionId, getConfigById]);
  
  const adaptAll = useMemo(() => {
    return configs.map(config => ({
      config,
      displayName: config.name,
      shortName: config.name.substring(0, 3).toUpperCase(),
      isActive: config.id === professionId,
    }));
  }, [configs, professionId]);
  
  return {
    adapted,
    adaptAll,
  };
};

export default useProfessionAdapter;
