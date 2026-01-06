export const academyTheme = {
  colors: {
    primary: '#00d4ff',
    primaryDark: '#00a8cc',
    primaryLight: '#33ddff',
    secondary: '#58a6ff',
    secondaryDark: '#388bfd',
    
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    info: '#58a6ff',
    
    background: {
      default: '#0d1117',
      paper: '#1c2128',
      elevated: '#21262d',
      hover: '#30363d',
    },
    
    text: {
      primary: '#e6edf3',
      secondary: '#8b949e',
      muted: '#6e7681',
    },
    
    border: {
      default: 'rgba(48, 54, 61, 0.8)',
      subtle: 'rgba(48, 54, 61, 0.4)',
      accent: 'rgba(0, 212, 255, 0.3)',
    },
  },
  
  gradients: {
    primary: 'linear-gradient(135deg, #00d4ff 0%, #58a6ff 100%)',
    primarySubtle: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(88,166,255,0.15) 100%)',
    dark: 'linear-gradient(135deg, #1c2128 0%, #0d1117 100%)',
    success: 'linear-gradient(135deg, #3fb950 0%, #238636 100%)',
    accent: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)',
  },
  
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 16px rgba(0, 0, 0, 0.4)',
    large: '0 8px 32px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(0, 212, 255, 0.3)',
    glowStrong: '0 0 30px rgba(0, 212, 255, 0.5)',
  },
  
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    xl: '16px',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};

export const academyStyles = {
  card: {
    backgroundColor: academyTheme.colors.background.paper,
    border: `1px solid ${academyTheme.colors.border.default}`,
    borderRadius: academyTheme.borderRadius.large,
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: academyTheme.colors.border.accent,
      boxShadow: academyTheme.shadows.glow,
    },
  },
  
  cardElevated: {
    backgroundColor: academyTheme.colors.background.elevated,
    border: `1px solid ${academyTheme.colors.border.default}`,
    borderRadius: academyTheme.borderRadius.large,
    boxShadow: academyTheme.shadows.medium,
  },
  
  button: {
    primary: {
      background: academyTheme.gradients.primary,
      color: '#ffffff',
      border: 'none',
      borderRadius: academyTheme.borderRadius.medium,
      '&:hover': {
        boxShadow: academyTheme.shadows.glow,
      },
    },
    secondary: {
      backgroundColor: 'transparent',
      color: academyTheme.colors.primary,
      border: `1px solid ${academyTheme.colors.primary}`,
      borderRadius: academyTheme.borderRadius.medium,
      '&:hover': {
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
      },
    },
  },
  
  input: {
    backgroundColor: academyTheme.colors.background.default,
    border: `1px solid ${academyTheme.colors.border.default}`,
    borderRadius: academyTheme.borderRadius.medium,
    color: academyTheme.colors.text.primary,
    '&:focus': {
      borderColor: academyTheme.colors.primary,
      boxShadow: `0 0 0 2px rgba(0, 212, 255, 0.2)`,
    },
  },
  
  avatar: {
    primary: {
      background: academyTheme.gradients.primary,
    },
    secondary: {
      background: academyTheme.gradients.accent,
    },
  },
  
  badge: {
    primary: {
      backgroundColor: 'rgba(0, 212, 255, 0.15)',
      color: academyTheme.colors.primary,
      border: `1px solid ${academyTheme.colors.primary}`,
    },
    success: {
      backgroundColor: 'rgba(63, 185, 80, 0.15)',
      color: academyTheme.colors.success,
      border: `1px solid ${academyTheme.colors.success}`,
    },
  },
};

export default academyTheme;
