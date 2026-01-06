export const trackButtonClick = (buttonName: string, metadata?: Record<string, unknown>) => {
  console.log(`[ActionTracker] Button clicked: ${buttonName}`, metadata);
};

export const trackModalOpen = (modalName: string, metadata?: Record<string, unknown>) => {
  console.log(`[ActionTracker] Modal opened: ${modalName}`, metadata);
};

export const trackFormSubmit = (formName: string, metadata?: Record<string, unknown>) => {
  console.log(`[ActionTracker] Form submitted: ${formName}`, metadata);
};

export const trackError = (errorType: string, errorMessage: string, metadata?: Record<string, unknown>) => {
  console.error(`[ActionTracker] Error: ${errorType} - ${errorMessage}`, metadata);
};
