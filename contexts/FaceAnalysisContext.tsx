/**
 * Face Analysis Context
 * Shares face analysis data (landmarks, head pose, composition guides)
 * between the FaceAnalysisPanel and viewport overlays.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface FaceAnalysisData {
  landmarks?: unknown;
  headPose?: unknown;
  compositionGuides?: unknown;
}

interface FaceAnalysisContextType {
  analysisData: FaceAnalysisData | null;
  setAnalysisData: (data: FaceAnalysisData) => void;
}

const FaceAnalysisContext = createContext<FaceAnalysisContextType>({
  analysisData: null,
  setAnalysisData: () => {},
});

export function FaceAnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisData, setAnalysisData] = useState<FaceAnalysisData | null>(null);
  return (
    <FaceAnalysisContext.Provider value={{ analysisData, setAnalysisData }}>
      {children}
    </FaceAnalysisContext.Provider>
  );
}

export function useFaceAnalysis() {
  return useContext(FaceAnalysisContext);
}
