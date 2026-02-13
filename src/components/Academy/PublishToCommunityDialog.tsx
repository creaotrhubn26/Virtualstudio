import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { Publish } from '@mui/icons-material';

interface PublishToCommunityDialogProps {
  open: boolean;
  onClose: () => void;
  courseId?: string;
  courseTitle?: string;
  course?: any;
  allCourses?: any[];
  onSuccess?: () => void;
}

const PublishToCommunityDialog: React.FC<PublishToCommunityDialogProps> = ({
  open,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Publish color="primary" />
          <Typography variant="h6">Publiser til Community</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography>
          Vil du publisere "{courseTitle || 'dette kurset'}" til community?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Avbryt
        </Button>
        <Button
          onClick={handlePublish}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Publish />}
        >
          {loading ? 'Publiserer...' : 'Publiser'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublishToCommunityDialog;
