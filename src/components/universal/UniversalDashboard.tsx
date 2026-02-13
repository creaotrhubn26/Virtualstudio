import React from 'react';
import { Box, Typography } from '@mui/material';

interface UniversalDashboardProps {
  profession?: string;
}

const UniversalDashboard: React.FC<UniversalDashboardProps> = ({ profession }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Universell Dashboard</Typography>
      {profession && (
        <Typography variant="body1" color="text.secondary">
          Profesjon: {profession}
        </Typography>
      )}
    </Box>
  );
};

export default UniversalDashboard;
