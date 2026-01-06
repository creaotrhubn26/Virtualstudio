import React from 'react';
import { Button, Box } from '@mui/material';

interface GooglePayButtonProps {
  amount: number;
  currency?: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  amount,
  currency = 'NOK',
  onSuccess,
  onError,
  disabled = false,
}) => {
  const handleClick = async () => {
    try {
      console.log('Google Pay clicked:', { amount, currency });
      onSuccess?.({ success: true, amount, currency });
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      disabled={disabled}
      sx={{
        bgcolor: '#000',
        color: '#fff',
        '&:hover': { bgcolor: '#333' },
        textTransform: 'none',
        fontWeight: 600,
      }}
    >
      <Box component="span" sx={{ mr: 1 }}>G</Box>
      Pay
    </Button>
  );
};

export default GooglePayButton;
