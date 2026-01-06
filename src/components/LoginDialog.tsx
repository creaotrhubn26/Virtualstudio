import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
} from '@mui/material';
import { Close as CloseIcon, Lock as LockIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: number; email: string; role: string; display_name: string }) => void;
  isLandingPage?: boolean;
}

const professionCategories = [
  {
    id: 'admin',
    label: 'Admin',
    icon: '/role-admin.png',
    roles: [
      { id: 'owner', label: 'Eier', description: 'Full tilgang til alt' },
      { id: 'admin', label: 'Administrator', description: 'Brukeradministrasjon og innstillinger' },
    ],
  },
  {
    id: 'foto',
    label: 'Foto-profesjon',
    icon: '/role-foto.png',
    roles: [
      { id: 'photographer', label: 'Fotograf', description: 'Leder fotoshoots' },
      { id: 'photo_director', label: 'Fotodirektør', description: 'Kreativ ledelse for foto' },
      { id: 'photo_assistant', label: 'Fotoassistent', description: 'Støttefunksjon' },
    ],
  },
  {
    id: 'video',
    label: 'Video-profesjon',
    icon: '/role-video.png',
    roles: [
      { id: 'director', label: 'Regissør', description: 'Kreativ ledelse for video' },
      { id: 'producer', label: 'Produsent', description: 'Prosjektledelse og budsjett' },
      { id: 'casting_director', label: 'Casting Director', description: 'Ansvarlig for casting-prosessen' },
      { id: 'camera_operator', label: 'Kameraoperatør', description: 'Teknisk utførelse' },
    ],
  },
  {
    id: 'felles',
    label: 'Felles/Andre',
    icon: '/role-felles.png',
    roles: [
      { id: 'talent', label: 'Talent/Modell', description: 'De som castes' },
      { id: 'agent', label: 'Agent', description: 'Representerer talent' },
      { id: 'client', label: 'Klient', description: 'Oppdragsgiver/merkevare' },
    ],
  },
];

export default function LoginDialog({ open, onClose, onLoginSuccess, isLandingPage = false }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('E-post og passord er påkrevd');
      return;
    }

    if (isLandingPage && !selectedRole) {
      setError('Vennligst velg en rolle');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role: selectedRole }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        localStorage.setItem('currentUserId', data.user.id.toString());
        if (selectedRole) {
          localStorage.setItem('selectedProfession', selectedRole);
        }
        window.dispatchEvent(new Event('auth-user-updated'));
        onLoginSuccess(data.user);
        setEmail('');
        setPassword('');
        setSelectedRole('');
        onClose();
      } else {
        setError(data.detail || 'Ugyldig e-post eller passord');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Nettverksfeil. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const getSelectedRoleInfo = () => {
    for (const category of professionCategories) {
      const role = category.roles.find(r => r.id === selectedRole);
      if (role) {
        return { role, category };
      }
    }
    return null;
  };

  const selectedInfo = getSelectedRoleInfo();

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      bgcolor: 'rgba(255,255,255,0.03)',
      borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#8b5cf6' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#0d1117',
          color: '#fff',
          borderRadius: 3,
          border: '1px solid rgba(139,92,246,0.2)',
          minWidth: { xs: '90%', sm: 480 },
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1)',
        },
      }}
    >
      <IconButton 
        onClick={onClose} 
        sx={{ 
          position: 'absolute', 
          top: 12, 
          right: 12, 
          color: 'rgba(255,255,255,0.5)',
          zIndex: 10,
          '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
        }}
      >
        <CloseIcon />
      </IconButton>

      <Box
        sx={{
          background: 'linear-gradient(135deg, #1c2128 0%, #0d1117 100%)',
          p: 4,
          textAlign: 'center',
          borderBottom: '1px solid rgba(139,92,246,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <AnimatePresence>
            {selectedInfo && (
              <motion.div
                key="glow-burst"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.5, 2] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
                }}
              />
            )}
          </AnimatePresence>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{ opacity: 0 }}
              animate={selectedInfo ? {
                opacity: [0, 0.8, 0],
                x: [0, (Math.random() - 0.5) * 150],
                y: [0, (Math.random() - 0.5) * 150],
                scale: [0, 1, 0],
              } : { opacity: 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.05,
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#8b5cf6',
                boxShadow: '0 0 10px #8b5cf6',
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: 140,
            height: 140,
            margin: '0 auto 20px auto',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedInfo ? selectedInfo.category.id : 'default'}
              initial={{ 
                opacity: 0, 
                scale: 0.3,
                rotateY: -180,
                filter: 'blur(10px)',
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                rotateY: 0,
                filter: 'blur(0px)',
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.3,
                rotateY: 180,
                filter: 'blur(10px)',
              }}
              transition={{
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                perspective: 1000,
              }}
            >
              <motion.img
                src={selectedInfo ? selectedInfo.category.icon : '/casting-planner-logo.png'}
                alt="Casting Planner"
                animate={{ 
                  filter: [
                    'drop-shadow(0 8px 32px rgba(139, 92, 246, 0.4))',
                    'drop-shadow(0 12px 48px rgba(139, 92, 246, 0.6))',
                    'drop-shadow(0 8px 32px rgba(139, 92, 246, 0.4))',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'contain',
                }}
              />
            </motion.div>
          </AnimatePresence>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #fff 0%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5,
          }}
        >
          {isLandingPage ? 'Logg Inn' : 'Admin Logg Inn'}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
          {isLandingPage 
            ? 'Velg din rolle og logg inn for å starte'
            : 'Logg inn for å administrere Casting Planner'}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                bgcolor: 'rgba(239,68,68,0.1)', 
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 2,
                '& .MuiAlert-icon': { color: '#ef4444' },
              }}
            >
              {error}
            </Alert>
          )}

          {isLandingPage && (
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Velg rolle</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Velg rolle"
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#1c2128',
                      border: '1px solid rgba(255,255,255,0.1)',
                      maxHeight: 400,
                      '& .MuiMenuItem-root': {
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(139,92,246,0.2)' },
                        '&.Mui-selected': { bgcolor: 'rgba(139,92,246,0.3)' },
                      },
                      '& .MuiListSubheader-root': {
                        bgcolor: '#0d1117',
                        color: '#8b5cf6',
                        fontWeight: 700,
                        lineHeight: '40px',
                      },
                    },
                  },
                }}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(139,92,246,0.5)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
                }}
              >
                {professionCategories.map((category) => [
                  <ListSubheader key={`header-${category.id}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <img 
                        src={category.icon} 
                        alt={category.label} 
                        style={{ width: 24, height: 24, borderRadius: 4 }} 
                      />
                      {category.label}
                    </Box>
                  </ListSubheader>,
                  ...category.roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box>
                        <Typography sx={{ fontWeight: 500 }}>{role.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>
          )}

          <TextField
            label="E-post"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            autoFocus={!isLandingPage}
            sx={inputStyles}
          />

          <TextField
            label="Passord"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            fullWidth
            sx={inputStyles}
          />

          <Button
            onClick={handleLogin}
            variant="contained"
            disabled={loading}
            fullWidth
            startIcon={loading ? null : <LockIcon />}
            sx={{ 
              mt: 1,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
              '&:hover': { 
                background: 'linear-gradient(135deg, #9b6cf6 0%, #7376f1 100%)',
                boxShadow: '0 6px 24px rgba(139,92,246,0.4)',
              },
              '&:disabled': {
                background: 'rgba(139,92,246,0.3)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Logg Inn'}
          </Button>

          <Button 
            onClick={onClose} 
            sx={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.9rem',
              '&:hover': { color: 'rgba(255,255,255,0.8)', bgcolor: 'transparent' },
            }}
          >
            Avbryt
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
