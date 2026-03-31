export interface DiagramLight {
  id: string;
  label: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  intensity: number;
  modifier?: string;
  color?: string;
}

export interface LightDiagram {
  id: string;
  title: string;
  lights: DiagramLight[];
  subject: { position: [number, number, number]; label: string };
  camera: { position: [number, number, number]; focalLength: number };
  viewMode: 'top' | 'front' | 'side' | 'isometric';
  scale: number;
  generatedAt: string;
}

export type DiagramFormat = 'svg' | 'png' | 'pdf' | 'json';

class LightDiagramGenerator {
  generate(
    lights: DiagramLight[],
    subject: LightDiagram['subject'],
    camera: LightDiagram['camera'],
  ): LightDiagram {
    return {
      id: `diagram-${Date.now()}`,
      title: 'Lysdiagram',
      lights,
      subject,
      camera,
      viewMode: 'top',
      scale: 1.0,
      generatedAt: new Date().toISOString(),
    };
  }

  toSVG(diagram: LightDiagram): string {
    const w = 400;
    const h = 400;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 40;

    const lightElems = diagram.lights
      .map((l) => {
        const x = cx + l.position[0] * scale;
        const y = cy - l.position[2] * scale;
        return `<circle cx="${x}" cy="${y}" r="8" fill="#FFD700" stroke="#000" stroke-width="1"/>
                <text x="${x}" y="${y - 12}" text-anchor="middle" font-size="10" fill="#333">${l.label}</text>`;
      })
      .join('\n');

    const sx = cx + diagram.subject.position[0] * scale;
    const sy = cy - diagram.subject.position[2] * scale;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#1a1a2e"/>
  <line x1="0" y1="${cy}" x2="${w}" y2="${cy}" stroke="#333" stroke-width="1" stroke-dasharray="4"/>
  <line x1="${cx}" y1="0" x2="${cx}" y2="${h}" stroke="#333" stroke-width="1" stroke-dasharray="4"/>
  <ellipse cx="${sx}" cy="${sy}" rx="12" ry="20" fill="#4CAF50" stroke="#fff" stroke-width="1"/>
  <text x="${sx}" y="${sy + 32}" text-anchor="middle" font-size="10" fill="#fff">${diagram.subject.label}</text>
  ${lightElems}
</svg>`;
  }

  async export(_diagram: LightDiagram, _format: DiagramFormat): Promise<Blob> {
    return new Blob([''], { type: 'image/svg+xml' });
  }
}

export const lightDiagramGenerator = new LightDiagramGenerator();
export default lightDiagramGenerator;
