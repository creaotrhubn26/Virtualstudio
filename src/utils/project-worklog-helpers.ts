export interface ProjectTypeNextStep {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function getProjectTypeNextSteps(projectType: string): ProjectTypeNextStep[] {
  const steps: Record<string, ProjectTypeNextStep[]> = {
    wedding: [
      { id: '1', title: 'Planlegg tidslinje', description: 'Lag en detaljert tidslinje for bryllupsdagen', priority: 'high' },
      { id: '2', title: 'Rekognosering', description: 'Besøk lokasjonene på forhånd', priority: 'high' },
      { id: '3', title: 'Utstyrsliste', description: 'Forbered alt nødvendig utstyr', priority: 'medium' },
    ],
    portrait: [
      { id: '1', title: 'Konseptutvikling', description: 'Definer stil og stemning', priority: 'high' },
      { id: '2', title: 'Lysoppsett', description: 'Planlegg belysning', priority: 'medium' },
    ],
    commercial: [
      { id: '1', title: 'Brief gjennomgang', description: 'Gå gjennom klientens krav', priority: 'high' },
      { id: '2', title: 'Storyboard', description: 'Lag visuell plan', priority: 'high' },
    ],
  };
  return steps[projectType] || [];
}

export function getProjectTypeInitialDescription(projectType: string): string {
  const descriptions: Record<string, string> = {
    wedding: 'Profesjonell bryllupsfotografering med komplett dekning av seremonien og feiringen.',
    portrait: 'Kreativ portrettfotografering med fokus på personlighet og uttrykk.',
    commercial: 'Profesjonell kommersiell fotografering for merkevarebygging og markedsføring.',
    event: 'Dokumentasjon av arrangementer og begivenheter.',
    video: 'Profesjonell videoproduksjon fra konsept til ferdig produkt.',
  };
  return descriptions[projectType] || 'Nytt prosjekt';
}
