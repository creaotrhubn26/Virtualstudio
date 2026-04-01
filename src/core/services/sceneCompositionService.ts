export interface CompositionSuggestion {
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CompositionAnalysis {
  ruleOfThirdsScore: number;
  balanceScore: number;
  depthScore: number;
  focusScore: number;
  overallScore: number;
  suggestions: string[] | CompositionSuggestion[];
  score?: { overall: number; balance: number; depth: number; focus: number };
}

export interface SubjectPlacement {
  x: number;
  y: number;
  z: number;
  rule: 'rule-of-thirds' | 'center' | 'golden-ratio' | 'dynamic';
}

class SceneCompositionService {
  analyze(_nodes: unknown[]): CompositionAnalysis {
    return {
      ruleOfThirdsScore: 0.75,
      balanceScore: 0.80,
      depthScore: 0.65,
      focusScore: 0.85,
      overallScore: 0.76,
      suggestions: [
        'Flytt motivet litt til venstre for bedre tredjedelsregel',
        'Legg til et bakgrunnselement for mer dybde',
      ],
    };
  }

  suggestPlacement(shootType: string): SubjectPlacement {
    void shootType;
    return { x: 0.33, y: 0.33, z: 2.5, rule: 'rule-of-thirds' };
  }

  calculateBalance(_positions: Array<[number, number, number]>): number {
    return 0.78;
  }

  async analyzeComposition(_imageUrl: string): Promise<{
    score: { overall: number; balance: number; depth: number; focus: number };
    suggestions: Array<{ message: string; priority: 'high' | 'medium' | 'low' }>;
  }> {
    return {
      score: { overall: 0.75, balance: 0.80, depth: 0.65, focus: 0.85 },
      suggestions: [
        { message: 'Flytt motivet litt til venstre for bedre tredjedelsregel', priority: 'medium' },
        { message: 'Legg til et bakgrunnselement for mer dybde', priority: 'low' },
      ],
    };
  }
}

export const sceneCompositionService = new SceneCompositionService();
export default sceneCompositionService;
