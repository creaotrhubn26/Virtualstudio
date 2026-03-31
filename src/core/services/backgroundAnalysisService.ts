export interface BackgroundSuggestion {
  type: 'remove' | 'blur' | 'replace' | 'adjust';
  message: string;
  confidence: number;
}

export interface DistractingElement {
  label: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  severity: 'low' | 'medium' | 'high';
}

export interface BackgroundAnalysisResult {
  backgroundQuality: number;
  distractingElements: DistractingElement[];
  suggestions: BackgroundSuggestion[];
}

async function analyzeBackground(imageUrl: string): Promise<BackgroundAnalysisResult> {
  const response = await fetch('/api/ml/analyze-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  if (!response.ok) {
    throw new Error(`Background analysis request failed: ${response.status}`);
  }
  return response.json() as Promise<BackgroundAnalysisResult>;
}

export const backgroundAnalysisService = { analyzeBackground };
