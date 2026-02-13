// Interactive state styles for UI components
import { colors, transitions } from './designTokens';

export const hoverState = {
  backgroundColor: colors.action.hover,
  transition: `background-color ${transitions.fast} ${transitions.easing.easeInOut}`,
  cursor: 'pointer',
};

export const activeState = {
  backgroundColor: colors.action.selected,
  transform: 'scale(0.98)',
  transition: `all ${transitions.fast} ${transitions.easing.easeInOut}`,
};

export const focusState = {
  outline: `2px solid ${colors.primary}`,
  outlineOffset: '2px',
};

export const disabledState = {
  opacity: 0.5,
  cursor: 'not-allowed',
  pointerEvents: 'none' as const,
};

export const selectedState = {
  backgroundColor: colors.action.selected,
  borderColor: colors.primary,
};

export const loadingState = {
  opacity: 0.6,
  cursor: 'wait',
  pointerEvents: 'none' as const,
};

export const errorState = {
  borderColor: colors.error,
  color: colors.error,
};

export const successState = {
  borderColor: colors.success,
  color: colors.success,
};
