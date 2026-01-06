import { SceneComposition } from '../core/models/sceneComposer';

export type ExportFormat = 'json' | 'xml' | 'yaml';

export interface ExportOptions {
  format: ExportFormat;
  includeCameras: boolean;
  includeLights: boolean;
  includeActors: boolean;
  includeProps: boolean;
  includeSettings: boolean;
  includeLayers: boolean;
  includeTimeline: boolean;
  includeThumbnail: boolean;
  includeEnvironment: boolean;
}

export const sceneExportService = {
  /**
   * Export scene to JSON
   */
  exportToJSON(scene: SceneComposition, options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'json',
      includeCameras: true,
      includeLights: true,
      includeActors: true,
      includeProps: true,
      includeSettings: true,
      includeLayers: true,
      includeTimeline: true,
      includeThumbnail: true,
      includeEnvironment: true,
    };

    const opts = { ...defaultOptions, ...options };
    const exported: Partial<SceneComposition> = {
      id: scene.id,
      name: scene.name,
      description: scene.description,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
      tags: scene.tags,
    };

    if (opts.includeCameras) exported.cameras = scene.cameras;
    if (opts.includeLights) exported.lights = scene.lights;
    if (opts.includeActors) exported.actors = scene.actors;
    if (opts.includeProps) exported.props = scene.props;
    if (opts.includeSettings) exported.cameraSettings = scene.cameraSettings;
    if (opts.includeLayers) exported.layers = scene.layers;
    if (opts.includeTimeline) exported.timeline = scene.timeline;
    if (opts.includeThumbnail) exported.thumbnail = scene.thumbnail;
    if (opts.includeEnvironment) exported.environment = scene.environment;

    return JSON.stringify(exported, null, 2);
  },

  /**
   * Export scene to XML
   */
  exportToXML(scene: SceneComposition, options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'xml',
      includeCameras: true,
      includeLights: true,
      includeActors: true,
      includeProps: true,
      includeSettings: true,
      includeLayers: true,
      includeTimeline: true,
      includeThumbnail: true,
      includeEnvironment: true,
    };

    const opts = { ...defaultOptions, ...options };
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<scene>\n';
    xml += `  <id>${this.escapeXML(scene.id)}</id>\n`;
    xml += `  <name>${this.escapeXML(scene.name)}</name>\n`;
    if (scene.description) {
      xml += `  <description>${this.escapeXML(scene.description)}</description>\n`;
    }
    xml += `  <createdAt>${scene.createdAt}</createdAt>\n`;
    xml += `  <updatedAt>${scene.updatedAt}</updatedAt>\n`;

    if (opts.includeCameras && scene.cameras.length > 0) {
      xml += '  <cameras>\n';
      scene.cameras.forEach(cam => {
        xml += `    <camera id="${cam.id}">\n`;
        xml += `      <alpha>${cam.alpha}</alpha>\n`;
        xml += `      <beta>${cam.beta}</beta>\n`;
        xml += `      <radius>${cam.radius}</radius>\n`;
        xml += `      <fov>${cam.fov}</fov>\n`;
        xml += '    </camera>\n';
      });
      xml += '  </cameras>\n';
    }

    if (opts.includeLights && scene.lights.length > 0) {
      xml += '  <lights>\n';
      scene.lights.forEach(light => {
        xml += `    <light id="${light.id}">\n`;
        xml += `      <name>${this.escapeXML(light.name)}</name>\n`;
        xml += `      <intensity>${light.intensity}</intensity>\n`;
        xml += `      <cct>${light.cct}</cct>\n`;
        xml += '    </light>\n';
      });
      xml += '  </lights>\n';
    }

    if (opts.includeEnvironment && scene.environment) {
      xml += '  <environment>\n';
      if (scene.environment.walls && scene.environment.walls.length > 0) {
        xml += '    <walls>\n';
        scene.environment.walls.forEach(wall => {
          xml += `      <wall id="${wall.id}" assetId="${this.escapeXML(wall.assetId)}">\n`;
          xml += `        <position>${wall.position.join(',')}</position>\n`;
          xml += `        <rotation>${wall.rotation.join(',')}</rotation>\n`;
          xml += `        <scale>${wall.scale.join(',')}</scale>\n`;
          xml += '      </wall>\n';
        });
        xml += '    </walls>\n';
      }
      if (scene.environment.floors && scene.environment.floors.length > 0) {
        xml += '    <floors>\n';
        scene.environment.floors.forEach(floor => {
          xml += `      <floor id="${floor.id}" assetId="${this.escapeXML(floor.assetId)}">\n`;
          xml += `        <position>${floor.position.join(',')}</position>\n`;
          xml += '      </floor>\n';
        });
        xml += '    </floors>\n';
      }
      if (scene.environment.atmosphere) {
        xml += '    <atmosphere>\n';
        xml += `      <fogEnabled>${scene.environment.atmosphere.fogEnabled}</fogEnabled>\n`;
        xml += `      <fogDensity>${scene.environment.atmosphere.fogDensity}</fogDensity>\n`;
        xml += `      <fogColor>${this.escapeXML(scene.environment.atmosphere.fogColor)}</fogColor>\n`;
        xml += `      <clearColor>${this.escapeXML(scene.environment.atmosphere.clearColor)}</clearColor>\n`;
        xml += `      <ambientColor>${this.escapeXML(scene.environment.atmosphere.ambientColor)}</ambientColor>\n`;
        xml += `      <ambientIntensity>${scene.environment.atmosphere.ambientIntensity}</ambientIntensity>\n`;
        xml += '    </atmosphere>\n';
      }
      xml += '  </environment>\n';
    }

    xml += '</scene>';
    return xml;
  },

  /**
   * Export scene to YAML
   */
  exportToYAML(scene: SceneComposition, options: Partial<ExportOptions> = {}): string {
    const defaultOptions: ExportOptions = {
      format: 'yaml',
      includeCameras: true,
      includeLights: true,
      includeActors: true,
      includeProps: true,
      includeSettings: true,
      includeLayers: true,
      includeTimeline: true,
      includeThumbnail: true,
      includeEnvironment: true,
    };

    const opts = { ...defaultOptions, ...options };
    let yaml = `id: ${scene.id}\n`;
    yaml += `name: ${scene.name}\n`;
    if (scene.description) {
      yaml += `description: ${scene.description}\n`;
    }
    yaml += `createdAt: ${scene.createdAt}\n`;
    yaml += `updatedAt: ${scene.updatedAt}\n`;

    if (opts.includeCameras) {
      yaml += 'cameras:\n';
      scene.cameras.forEach(cam => {
        yaml += `  - id: ${cam.id}\n`;
        yaml += `    alpha: ${cam.alpha}\n`;
        yaml += `    beta: ${cam.beta}\n`;
        yaml += `    radius: ${cam.radius}\n`;
        yaml += `    fov: ${cam.fov}\n`;
      });
    }

    if (opts.includeLights) {
      yaml += 'lights:\n';
      scene.lights.forEach(light => {
        yaml += `  - id: ${light.id}\n`;
        yaml += `    name: ${light.name}\n`;
        yaml += `    intensity: ${light.intensity}\n`;
        yaml += `    cct: ${light.cct}\n`;
      });
    }

    if (opts.includeEnvironment && scene.environment) {
      yaml += 'environment:\n';
      if (scene.environment.walls && scene.environment.walls.length > 0) {
        yaml += '  walls:\n';
        scene.environment.walls.forEach(wall => {
          yaml += `    - id: ${wall.id}\n`;
          yaml += `      assetId: ${wall.assetId}\n`;
          yaml += `      position: [${wall.position.join(', ')}]\n`;
          yaml += `      rotation: [${wall.rotation.join(', ')}]\n`;
          yaml += `      scale: [${wall.scale.join(', ')}]\n`;
        });
      }
      if (scene.environment.floors && scene.environment.floors.length > 0) {
        yaml += '  floors:\n';
        scene.environment.floors.forEach(floor => {
          yaml += `    - id: ${floor.id}\n`;
          yaml += `      assetId: ${floor.assetId}\n`;
          yaml += `      position: [${floor.position.join(', ')}]\n`;
        });
      }
      if (scene.environment.atmosphere) {
        yaml += '  atmosphere:\n';
        yaml += `    fogEnabled: ${scene.environment.atmosphere.fogEnabled}\n`;
        yaml += `    fogDensity: ${scene.environment.atmosphere.fogDensity}\n`;
        yaml += `    fogColor: ${scene.environment.atmosphere.fogColor}\n`;
        yaml += `    clearColor: ${scene.environment.atmosphere.clearColor}\n`;
        yaml += `    ambientColor: ${scene.environment.atmosphere.ambientColor}\n`;
        yaml += `    ambientIntensity: ${scene.environment.atmosphere.ambientIntensity}\n`;
      }
    }

    return yaml;
  },

  /**
   * Escape XML special characters
   */
  escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  /**
   * Download scene in specified format
   */
  downloadScene(scene: SceneComposition, format: ExportFormat, options: Partial<ExportOptions> = {}): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'json':
        content = this.exportToJSON(scene, options);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'xml':
        content = this.exportToXML(scene, options);
        mimeType = 'application/xml';
        extension = 'xml';
        break;
      case 'yaml':
        content = this.exportToYAML(scene, options);
        mimeType = 'text/yaml';
        extension = 'yaml';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.name.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

