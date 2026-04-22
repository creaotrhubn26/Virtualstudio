import React from 'react';
import { CustomThemeProvider } from '../contexts/ThemeContext';
import { StoryCharacterHUD } from '../components/StoryCharacterHUD';

const StoryCharacterHUDApp: React.FC = () => (
  <CustomThemeProvider>
    <StoryCharacterHUD />
  </CustomThemeProvider>
);

export default StoryCharacterHUDApp;
