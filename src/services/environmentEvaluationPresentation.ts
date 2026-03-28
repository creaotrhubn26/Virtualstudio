import type { AlertColor } from '@mui/material';
import type { EnvironmentPlanEvaluationSummary } from '../core/models/environmentPlan';

export interface EnvironmentEvaluationPresentation {
  severity: AlertColor;
  title: string;
  summary: string;
  details: string[];
}

export function getEnvironmentEvaluationPresentation(
  evaluation: EnvironmentPlanEvaluationSummary | null | undefined,
): EnvironmentEvaluationPresentation | null {
  if (!evaluation) {
    return null;
  }

  const scorePercent = Math.round(Math.max(0, Math.min(1, evaluation.overallScore)) * 100);
  const severity: AlertColor = evaluation.verdict === 'approved'
    ? scorePercent >= 82 ? 'success' : 'info'
    : scorePercent >= 65 ? 'warning' : 'error';

  const title = evaluation.verdict === 'approved'
    ? `Miljøet er evaluert til ${scorePercent}%`
    : `Miljøet trenger justering (${scorePercent}%)`;

  const lowCategories = Object.entries(evaluation.categories)
    .filter(([, category]) => category && typeof category.score === 'number' && category.score < 0.72)
    .map(([key]) => key);

  const summary = lowCategories.length > 0
    ? `Lavest score: ${lowCategories.join(', ')}`
    : 'Miljøet scorer jevnt godt på prompt, komposisjon, lys og rom.';

  const details = [
    ...evaluation.suggestedAdjustments.slice(0, 3),
    ...Object.entries(evaluation.categories)
      .flatMap(([key, category]) => {
        if (!category?.notes?.length) {
          return [];
        }
        return `${key}: ${category.notes[0]}`;
      })
      .slice(0, 4),
  ];

  return {
    severity,
    title,
    summary,
    details,
  };
}
