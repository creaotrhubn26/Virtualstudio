export interface FaceAnalysisResult { landmarks?: number[][]; bounds?: { x: number; y: number; width: number; height: number }; }
export const faceXFormerService = { analyze: async (_frame: unknown): Promise<FaceAnalysisResult> => ({}) };
export default faceXFormerService;
