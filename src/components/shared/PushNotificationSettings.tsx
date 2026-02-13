import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Paper } from '@mui/material';

interface PushNotificationSettingsProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  userId?: string;
  showDescription?: boolean;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  enabled = false,
  onToggle,
}) => {
  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>
        Varslingsinnstillinger
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onToggle?.(e.target.checked)}
            color="primary"
          />
        }
        label="Aktiver push-varsler"
      />
    </Paper>
  );
};

export default PushNotificationSettings;
