import React, { ComponentType } from 'react';

interface IntegrationConfig {
  componentId: string;
  componentName: string;
  componentType: string;
  componentCategory: string;
  featureIds: string[];
}

export function withUniversalIntegration<P extends object>(
  Component: ComponentType<P>,
  config: IntegrationConfig
): ComponentType<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    // Simply return the component with props
    // Integration logic can be added here if needed
    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withUniversalIntegration(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}


