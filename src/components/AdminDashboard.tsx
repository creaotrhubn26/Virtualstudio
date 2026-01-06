import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { EmailDesigner, EmailTemplate as DesignerEmailTemplate } from './EmailDesigner';
import {
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  VpnKey as VpnKeyIcon,
  People as PeopleIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Movie as MovieIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

interface AdminUser {
  id: number;
  email: string;
  role: string;
  display_name: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: 'invitation' | 'callback' | 'confirmation' | 'rejection' | 'reminder' | 'custom' | 'owner_invitation' | 'owner_welcome' | 'owner_transfer';
  subject: string;
  body: string;
  variables: string[];
}

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

const API_BASE = '/api/auth';

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'casting-invitation',
    name: 'Casting Invitasjon',
    type: 'invitation',
    subject: 'Du er invitert til casting for {{projectName}}',
    body: `Hei {{candidateName}},

Vi er glade for å invitere deg til casting for vår kommende produksjon "{{projectName}}".

<strong>Detaljer:</strong>
📅 Dato: {{auditionDate}}
⏰ Tid: {{auditionTime}}
📍 Sted: {{location}}
🎬 Rolle: {{roleName}}

Vennligst bekreft din deltagelse ved å svare på denne e-posten innen {{responseDeadline}}.

Ta med deg:
• Gyldig ID
• Oppdaterte bilder (hode og helfigur)
• Relevant portfolio/showreel

Vi ser frem til å møte deg!

Med vennlig hilsen,
{{senderName}}
{{companyName}}
{{contactPhone}}`,
    variables: ['candidateName', 'projectName', 'auditionDate', 'auditionTime', 'location', 'roleName', 'responseDeadline', 'senderName', 'companyName', 'contactPhone'],
  },
  {
    id: 'callback',
    name: 'Callback Invitasjon',
    type: 'callback',
    subject: 'Callback invitasjon - {{projectName}}',
    body: `Hei {{candidateName}},

Gratulerer! Du har blitt valgt ut til callback for "{{projectName}}".

<strong>Callback detaljer:</strong>
📅 Dato: {{callbackDate}}
⏰ Tid: {{callbackTime}}
📍 Sted: {{location}}
🎬 Rolle: {{roleName}}

<strong>Forberedelser:</strong>
{{preparationNotes}}

Vennligst bekreft din deltagelse så snart som mulig.

Med vennlig hilsen,
{{senderName}}
{{companyName}}`,
    variables: ['candidateName', 'projectName', 'callbackDate', 'callbackTime', 'location', 'roleName', 'preparationNotes', 'senderName', 'companyName'],
  },
  {
    id: 'confirmation',
    name: 'Rollebekreftelse',
    type: 'confirmation',
    subject: '🎉 Gratulerer! Du har fått rollen i {{projectName}}',
    body: `Hei {{candidateName}},

Vi er utrolig glade for å kunne meddele at du har fått rollen som <strong>{{roleName}}</strong> i "{{projectName}}"!

<strong>Neste steg:</strong>
1. Signering av kontrakt
2. Kostymemøte
3. Leseprøve med resten av ensemblet

<strong>Produksjonsdetaljer:</strong>
📅 Oppstart: {{productionStartDate}}
📍 Hovedlokasjon: {{mainLocation}}
📋 Estimert varighet: {{productionDuration}}

Velkommen til teamet!

Med vennlig hilsen,
{{senderName}}
{{companyName}}`,
    variables: ['candidateName', 'projectName', 'roleName', 'productionStartDate', 'mainLocation', 'productionDuration', 'senderName', 'companyName'],
  },
  {
    id: 'rejection',
    name: 'Høflig Avslag',
    type: 'rejection',
    subject: 'Angående din søknad til {{projectName}}',
    body: `Hei {{candidateName}},

Takk for at du deltok på casting for "{{projectName}}". Vi satte stor pris på tiden din og innsatsen du la ned.

Etter nøye vurdering har vi dessverre valgt å gå videre med andre kandidater for rollen som {{roleName}}.

Vi ønsker deg all lykke videre i karrieren!

Med vennlig hilsen,
{{senderName}}
{{companyName}}`,
    variables: ['candidateName', 'projectName', 'roleName', 'senderName', 'companyName'],
  },
  {
    id: 'reminder',
    name: 'Påminnelse',
    type: 'reminder',
    subject: 'Påminnelse: Casting i morgen - {{projectName}}',
    body: `Hei {{candidateName}},

Dette er en vennlig påminnelse om din casting i morgen.

<strong>Detaljer:</strong>
📅 Dato: {{auditionDate}}
⏰ Tid: {{auditionTime}}
📍 Sted: {{location}}
🎬 Rolle: {{roleName}}

Lykke til!

Med vennlig hilsen,
{{senderName}}
{{companyName}}`,
    variables: ['candidateName', 'projectName', 'auditionDate', 'auditionTime', 'location', 'roleName', 'senderName', 'companyName'],
  },
  {
    id: 'owner-invitation',
    name: 'Eier Invitasjon',
    type: 'owner_invitation',
    subject: 'Du er invitert som Eier av {{companyName}}',
    body: `Hei {{ownerName}},

Du har blitt invitert til å bli <strong>Eier</strong> av {{companyName}} på Casting Planner.

Som eier får du full tilgang til:
🔐 Alle administrative funksjoner
👥 Brukeradministrasjon
📊 Fullstendig oversikt over alle prosjekter
💼 Fakturering og abonnement
⚙️ Systeminnstillinger

<strong>For å aktivere kontoen din:</strong>
1. Klikk på lenken under
2. Opprett et sikkert passord
3. Logg inn og ta kontroll

🔗 Aktiveringslenke: {{activationLink}}

Denne invitasjonen utløper om 7 dager.

Med vennlig hilsen,
{{senderName}}
{{companyName}}`,
    variables: ['ownerName', 'companyName', 'activationLink', 'senderName'],
  },
  {
    id: 'owner-welcome',
    name: 'Eier Velkomstmelding',
    type: 'owner_welcome',
    subject: 'Velkommen som Eier av {{companyName}} - Kom i gang',
    body: `Hei {{ownerName}},

<strong>Velkommen som Eier av {{companyName}}!</strong> 🎉

Din konto er nå aktivert og du har full tilgang til alle funksjoner.

<strong>Her er hvordan du kommer i gang:</strong>

📋 <strong>Steg 1: Sett opp teamet ditt</strong>
Inviter administratorer og teammedlemmer via Admin-panelet.

🎬 <strong>Steg 2: Opprett ditt første prosjekt</strong>
Start en ny produksjon og legg til roller.

📧 <strong>Steg 3: Tilpass e-postmaler</strong>
Gjør kommunikasjonen personlig med dine egne maler.

<strong>Viktig informasjon:</strong>
• Brukernavn: {{ownerEmail}}
• Support: {{supportEmail}}
• Dokumentasjon: {{docsLink}}

Har du spørsmål? Vi er her for å hjelpe!

Med vennlig hilsen,
{{senderName}}
Casting Planner Team`,
    variables: ['ownerName', 'companyName', 'ownerEmail', 'supportEmail', 'docsLink', 'senderName'],
  },
  {
    id: 'owner-transfer',
    name: 'Overføring av Eierskap',
    type: 'owner_transfer',
    subject: 'Viktig: Overføring av eierskap for {{companyName}}',
    body: `Hei {{newOwnerName}},

<strong>Du har blitt utnevnt som ny Eier av {{companyName}}.</strong>

{{previousOwnerName}} har overført eierskapet til deg. Dette gir deg full kontroll over:

🔐 <strong>Administrative rettigheter</strong>
• Legge til/fjerne alle brukere inkludert administratorer
• Endre abonnement og faktureringsdetaljer
• Slette eller overføre selskapet

📊 <strong>Full datatilgang</strong>
• Alle prosjekter og produksjoner
• Kandidatdatabase
• Alle dokumenter og kontrakter

⚠️ <strong>Viktig sikkerhetsinformasjon:</strong>
• Din konto har nå høyeste tilgangsnivå
• Vi anbefaler å aktivere to-faktor-autentisering
• Gjennomgå eksisterende brukertilganger

<strong>For å bekrefte overføringen:</strong>
Klikk her: {{confirmationLink}}

Denne forespørselen utløper om 48 timer.

Med vennlig hilsen,
{{senderName}}
Casting Planner Sikkerhetsteam`,
    variables: ['newOwnerName', 'companyName', 'previousOwnerName', 'confirmationLink', 'senderName'],
  },
];

const templateTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  invitation: { label: 'Invitasjon', color: '#00d4ff', icon: <EmailIcon /> },
  callback: { label: 'Callback', color: '#8b5cf6', icon: <ScheduleIcon /> },
  confirmation: { label: 'Bekreftelse', color: '#10b981', icon: <CheckCircleIcon /> },
  rejection: { label: 'Avslag', color: '#ef4444', icon: <CancelIcon /> },
  reminder: { label: 'Påminnelse', color: '#f59e0b', icon: <CalendarIcon /> },
  custom: { label: 'Egendefinert', color: '#6b7280', icon: <EditIcon /> },
  owner_invitation: { label: 'Eier Invitasjon', color: '#ef4444', icon: <AdminPanelSettingsIcon /> },
  owner_welcome: { label: 'Eier Velkomst', color: '#ef4444', icon: <AdminPanelSettingsIcon /> },
  owner_transfer: { label: 'Eieroverføring', color: '#ef4444', icon: <VpnKeyIcon /> },
};

const variableConfig: Record<string, { label: string; icon: React.ReactNode; example: string }> = {
  candidateName: { label: 'Kandidatnavn', icon: <PersonIcon />, example: 'Ola Nordmann' },
  projectName: { label: 'Prosjektnavn', icon: <MovieIcon />, example: 'Sommerfilmen 2026' },
  roleName: { label: 'Rollenavn', icon: <PersonIcon />, example: 'Hovedrolle' },
  auditionDate: { label: 'Audition dato', icon: <CalendarIcon />, example: '15. januar 2026' },
  auditionTime: { label: 'Audition tid', icon: <TimeIcon />, example: '14:00' },
  callbackDate: { label: 'Callback dato', icon: <CalendarIcon />, example: '20. januar 2026' },
  callbackTime: { label: 'Callback tid', icon: <TimeIcon />, example: '10:00' },
  location: { label: 'Lokasjon', icon: <LocationIcon />, example: 'Studio A, Filmens Hus' },
  mainLocation: { label: 'Hovedlokasjon', icon: <LocationIcon />, example: 'Bergen Filmstudio' },
  responseDeadline: { label: 'Svarfrist', icon: <CalendarIcon />, example: '10. januar 2026' },
  productionStartDate: { label: 'Produksjonsstart', icon: <CalendarIcon />, example: '1. februar 2026' },
  productionDuration: { label: 'Produksjonsvarighet', icon: <TimeIcon />, example: '8 uker' },
  preparationNotes: { label: 'Forberedelsesnotater', icon: <EditIcon />, example: 'Lær de første 5 sidene av manuset' },
  senderName: { label: 'Avsendernavn', icon: <PersonIcon />, example: 'Maria Hansen' },
  companyName: { label: 'Selskapsnavn', icon: <BusinessIcon />, example: 'CreatorHub Productions' },
  contactEmail: { label: 'Kontakt e-post', icon: <EmailIcon />, example: 'casting@creatorhub.no' },
  contactPhone: { label: 'Kontakt telefon', icon: <PhoneIcon />, example: '+47 123 45 678' },
  ownerName: { label: 'Eiernavn', icon: <AdminPanelSettingsIcon />, example: 'Erik Johansen' },
  ownerEmail: { label: 'Eier e-post', icon: <EmailIcon />, example: 'eier@creatorhub.no' },
  activationLink: { label: 'Aktiveringslenke', icon: <VpnKeyIcon />, example: 'https://casting.app/activate/abc123' },
  newOwnerName: { label: 'Ny eiernavn', icon: <AdminPanelSettingsIcon />, example: 'Kari Olsen' },
  previousOwnerName: { label: 'Tidligere eier', icon: <PersonIcon />, example: 'Erik Johansen' },
  confirmationLink: { label: 'Bekreftelseslenke', icon: <VpnKeyIcon />, example: 'https://casting.app/confirm/xyz789' },
  supportEmail: { label: 'Support e-post', icon: <EmailIcon />, example: 'support@castingplanner.no' },
  docsLink: { label: 'Dokumentasjon', icon: <EditIcon />, example: 'https://docs.castingplanner.no' },
};

export default function AdminDashboard({ open, onClose, projectName = 'Mitt Prosjekt' }: AdminDashboardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:599px)');
  const isTablet = useMediaQuery('(min-width:600px) and (max-width:959px)');
  const is720p = useMediaQuery('(min-width:960px) and (max-width:1279px)');
  const is1080p = useMediaQuery('(min-width:1280px) and (max-width:1919px)');
  const is2K = useMediaQuery('(min-width:1920px) and (max-width:2559px)');
  const is4K = useMediaQuery('(min-width:2560px)');

  const getResponsiveValue = <T,>(mobile: T, tablet: T, hd720: T, hd1080: T, qhd2k: T, uhd4k: T): T => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    if (is720p) return hd720;
    if (is1080p) return hd1080;
    if (is2K) return qhd2k;
    return uhd4k;
  };

  const buttonMinHeight = getResponsiveValue(44, 44, 40, 42, 48, 56);
  const iconButtonSize = getResponsiveValue(44, 44, 36, 40, 48, 56);
  const fontSize = {
    title: getResponsiveValue('1rem', '1.1rem', '1.15rem', '1.25rem', '1.5rem', '1.75rem'),
    subtitle: getResponsiveValue('0.8rem', '0.85rem', '0.875rem', '0.9rem', '1rem', '1.15rem'),
    body: getResponsiveValue('0.875rem', '0.9rem', '0.95rem', '1rem', '1.1rem', '1.25rem'),
    caption: getResponsiveValue('0.7rem', '0.75rem', '0.8rem', '0.85rem', '0.95rem', '1.1rem'),
    button: getResponsiveValue('0.75rem', '0.8rem', '0.85rem', '0.9rem', '1rem', '1.15rem'),
  };
  const spacing = getResponsiveValue(1.5, 2, 2, 2.5, 3, 4);
  const chipHeight = getResponsiveValue(24, 26, 26, 28, 32, 38);
  const iconSize = getResponsiveValue(18, 20, 20, 22, 26, 30);

  const [mainTab, setMainTab] = useState(0);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(defaultTemplates[0]);
  const [emailTabValue, setEmailTabValue] = useState(0);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editName, setEditName] = useState('');
    const [variableValues, setVariableValues] = useState<Record<string, string>>({
    candidateName: 'Kandidatnavn',
    projectName: projectName,
    roleName: 'Hovedrolle',
    auditionDate: '15. januar 2026',
    auditionTime: '14:00',
    callbackDate: '20. januar 2026',
    callbackTime: '10:00',
    location: 'Studio A, Filmens Hus',
    mainLocation: 'Bergen Filmstudio',
    responseDeadline: '10. januar 2026',
    productionStartDate: '1. februar 2026',
    productionDuration: '8 uker',
    preparationNotes: 'Lær de første 5 sidene av manuset',
    senderName: 'Casting Team',
    companyName: 'CreatorHub Productions',
    contactEmail: 'casting@creatorhub.no',
    contactPhone: '+47 123 45 678',
    ownerName: 'Erik Johansen',
    ownerEmail: 'eier@creatorhub.no',
    activationLink: 'https://casting.app/activate/abc123',
    newOwnerName: 'Kari Olsen',
    previousOwnerName: 'Erik Johansen',
    confirmationLink: 'https://casting.app/confirm/xyz789',
    supportEmail: 'support@castingplanner.no',
    docsLink: 'https://docs.castingplanner.no',
  });

  useEffect(() => {
    if (open) {
      loadAdmins();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTemplate) {
      setEditSubject(selectedTemplate.subject);
      setEditBody(selectedTemplate.body);
      setEditName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admins`);
      const data = await response.json();
      if (data.success) {
        setAdmins(data.admins);
      }
    } catch (error) {
      console.error('Failed to load admins:', error);
      setSnackbar({ open: true, message: 'Kunne ikke laste administratorer', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAdmin = async () => {
    if (!newEmail.trim()) {
      setSnackbar({ open: true, message: 'E-post er påkrevd', severity: 'error' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          display_name: newDisplayName.trim() || undefined,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setGeneratedPassword(data.generated_password);
        setShowPasswordDialog(true);
        setInviteDialogOpen(false);
        setNewEmail('');
        setNewDisplayName('');
        setNewRole('admin');
        loadAdmins();
        setSnackbar({ open: true, message: 'Administrator opprettet', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.detail || 'Kunne ikke opprette administrator', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to create admin:', error);
      setSnackbar({ open: true, message: 'Nettverksfeil', severity: 'error' });
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm('Er du sikker på at du vil slette denne administratoren?')) return;

    try {
      const response = await fetch(`${API_BASE}/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadAdmins();
        setSnackbar({ open: true, message: 'Administrator slettet', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Kunne ikke slette administrator', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete admin:', error);
      setSnackbar({ open: true, message: 'Nettverksfeil', severity: 'error' });
    }
  };

  const handleResetPassword = async (adminId: number) => {
    try {
      const response = await fetch(`${API_BASE}/admins/${adminId}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setGeneratedPassword(data.new_password);
        setShowPasswordDialog(true);
        setSnackbar({ open: true, message: 'Passord tilbakestilt', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Kunne ikke tilbakestille passord', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      setSnackbar({ open: true, message: 'Nettverksfeil', severity: 'error' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Kopiert til utklippstavle', severity: 'success' });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Eier',
      admin: 'Administrator',
      editor: 'Redaktør',
      viewer: 'Leser',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      owner: '#ef4444',
      admin: '#8b5cf6',
      editor: '#00d4ff',
      viewer: '#6b7280',
    };
    return colors[role] || '#6b7280';
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variableValues).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    
    const updatedTemplate: EmailTemplate = {
      ...selectedTemplate,
      name: editName,
      subject: editSubject,
      body: editBody,
    };
    
    setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t));
    setSelectedTemplate(updatedTemplate);
    setSnackbar({ open: true, message: 'Mal lagret', severity: 'success' });
  };

  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: `custom-${Date.now()}`,
      name: 'Ny mal',
      type: 'custom',
      subject: 'Emne',
      body: 'Skriv din e-post her...',
      variables: [],
    };
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
  };

  const insertVariable = (variable: string) => {
    setEditBody(prev => prev + `{{${variable}}}`);
  };

  const handleCopyEmail = () => {
    const processedBody = replaceVariables(selectedTemplate?.body || '');
    const plainText = processedBody.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setSnackbar({ open: true, message: 'E-post kopiert til utklippstavle', severity: 'success' });
  };

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(255,255,255,0.03)',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: '#fff' },
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: '#0d1117',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? 0 : 3,
            height: isMobile ? '100%' : '90vh',
            maxHeight: isMobile ? '100%' : '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: 'linear-gradient(180deg, #1c2128 0%, #161b22 100%)',
            background: 'linear-gradient(180deg, #1c2128 0%, #161b22 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: spacing,
            px: spacing,
            minHeight: buttonMinHeight + 24,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing }}>
            <Box
              sx={{
                width: getResponsiveValue(36, 40, 40, 44, 52, 60),
                height: getResponsiveValue(36, 40, 40, 44, 52, 60),
                borderRadius: 2,
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <AdminPanelSettingsIcon sx={{ color: '#8b5cf6', fontSize: iconSize + 4 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: fontSize.title }}>
                Admin Dashboard
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: fontSize.caption }}>
                Administrer brukere og e-postmaler
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              minWidth: iconButtonSize,
              minHeight: iconButtonSize,
            }}
          >
            <CloseIcon sx={{ fontSize: iconSize }} />
          </IconButton>
        </DialogTitle>

        <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', px: spacing, bgcolor: '#161b22' }}>
          <Tabs
            value={mainTab}
            onChange={(_: React.SyntheticEvent, v: number) => setMainTab(v)}
            sx={{
              minHeight: buttonMinHeight,
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.6)',
                minHeight: buttonMinHeight,
                textTransform: 'none',
                fontSize: fontSize.body,
                fontWeight: 500,
                gap: 1,
                px: spacing,
                '&.Mui-selected': { color: '#8b5cf6' },
              },
              '& .MuiTabs-indicator': { bgcolor: '#8b5cf6', height: 3 },
            }}
          >
            <Tab label="Brukere" icon={<PeopleIcon sx={{ fontSize: iconSize }} />} iconPosition="start" />
            <Tab label="E-post Designer" icon={<EmailIcon sx={{ fontSize: iconSize }} />} iconPosition="start" />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mainTab === 0 && (
            <Box sx={{ p: spacing, overflow: 'auto', flex: 1 }}>
              <Box sx={{ mb: spacing, display: 'flex', gap: spacing, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon sx={{ fontSize: iconSize }} />}
                  onClick={() => setInviteDialogOpen(true)}
                  sx={{
                    bgcolor: '#8b5cf6',
                    '&:hover': { bgcolor: '#7c3aed' },
                    borderRadius: 2,
                    minHeight: buttonMinHeight,
                    fontSize: fontSize.button,
                    px: spacing,
                  }}
                >
                  Inviter Administrator
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon sx={{ fontSize: iconSize }} />}
                  onClick={loadAdmins}
                  disabled={loading}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.8)',
                    '&:hover': { borderColor: '#8b5cf6', bgcolor: 'rgba(139,92,246,0.1)' },
                    borderRadius: 2,
                    minHeight: buttonMinHeight,
                    fontSize: fontSize.button,
                    px: spacing,
                  }}
                >
                  Oppdater
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: '#8b5cf6' }} />
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 2,
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.body, py: spacing }}>Navn</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.body, py: spacing, display: { xs: 'none', sm: 'table-cell' } }}>E-post</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.body, py: spacing }}>Rolle</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.body, py: spacing, display: { xs: 'none', md: 'table-cell' } }}>Opprettet</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.body, py: spacing }} align="right">Handlinger</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {admins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 4, borderBottom: 'none' }}>
                            Ingen administratorer funnet. Klikk "Inviter Administrator" for å legge til.
                          </TableCell>
                        </TableRow>
                      ) : (
                        admins.map((admin) => (
                          <TableRow key={admin.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: fontSize.body, py: spacing }}>
                              {admin.display_name || '-'}
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: fontSize.body, py: spacing, display: { xs: 'none', sm: 'table-cell' } }}>
                              {admin.email}
                            </TableCell>
                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: spacing }}>
                              <Chip
                                label={getRoleLabel(admin.role)}
                                size="small"
                                sx={{
                                  bgcolor: `${getRoleColor(admin.role)}20`,
                                  color: getRoleColor(admin.role),
                                  border: `1px solid ${getRoleColor(admin.role)}40`,
                                  fontWeight: 600,
                                  height: chipHeight,
                                  fontSize: fontSize.caption,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: fontSize.caption, py: spacing, display: { xs: 'none', md: 'table-cell' } }}>
                              {admin.created_at ? new Date(admin.created_at).toLocaleDateString('nb-NO') : '-'}
                            </TableCell>
                            <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: spacing }}>
                              <Tooltip title="Generer nytt passord">
                                <IconButton
                                  onClick={() => handleResetPassword(admin.id)}
                                  sx={{ color: '#8b5cf6', '&:hover': { bgcolor: 'rgba(139,92,246,0.1)' }, minWidth: iconButtonSize, minHeight: iconButtonSize }}
                                >
                                  <VpnKeyIcon sx={{ fontSize: iconSize }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Slett">
                                <IconButton
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                  sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, minWidth: iconButtonSize, minHeight: iconButtonSize }}
                                >
                                  <DeleteIcon sx={{ fontSize: iconSize }} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {mainTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <EmailDesigner
                projectVariables={variableValues}
                projectName={projectName}
                onSave={(template) => {
                  setSnackbar({
                    open: true,
                    message: 'E-postmal lagret',
                    severity: 'success',
                  });
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: '#0d1117',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? 0 : 2,
            minWidth: isMobile ? '100%' : getResponsiveValue(320, 380, 400, 450, 500, 560),
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: fontSize.title, p: spacing }}>
          Inviter ny Administrator
        </DialogTitle>
        <DialogContent sx={{ mt: spacing, p: spacing }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
            <TextField
              label="E-post"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              fullWidth
              required
              size={isMobile ? 'medium' : 'small'}
              sx={{ 
                ...inputStyles, 
                '& .MuiOutlinedInput-root': { 
                  ...inputStyles['& .MuiOutlinedInput-root'],
                  minHeight: buttonMinHeight,
                  fontSize: fontSize.body,
                } 
              }}
              InputLabelProps={{ sx: { fontSize: fontSize.body } }}
            />
            <TextField
              label="Visningsnavn (valgfritt)"
              autoComplete="name"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              fullWidth
              size={isMobile ? 'medium' : 'small'}
              sx={{ 
                ...inputStyles, 
                '& .MuiOutlinedInput-root': { 
                  ...inputStyles['& .MuiOutlinedInput-root'],
                  minHeight: buttonMinHeight,
                  fontSize: fontSize.body,
                } 
              }}
              InputLabelProps={{ sx: { fontSize: fontSize.body } }}
            />
            <FormControl fullWidth size={isMobile ? 'medium' : 'small'}>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)', fontSize: fontSize.body }}>Rolle</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                label="Rolle"
                sx={{
                  color: '#fff',
                  minHeight: buttonMinHeight,
                  fontSize: fontSize.body,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
                  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' },
                }}
              >
                <MenuItem value="owner" sx={{ fontSize: fontSize.body, minHeight: buttonMinHeight }}>Eier</MenuItem>
                <MenuItem value="admin" sx={{ fontSize: fontSize.body, minHeight: buttonMinHeight }}>Administrator</MenuItem>
                <MenuItem value="editor" sx={{ fontSize: fontSize.body, minHeight: buttonMinHeight }}>Redaktør</MenuItem>
                <MenuItem value="viewer" sx={{ fontSize: fontSize.body, minHeight: buttonMinHeight }}>Leser</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: spacing, borderTop: '1px solid rgba(255,255,255,0.08)', gap: 1 }}>
          <Button 
            onClick={() => setInviteDialogOpen(false)} 
            sx={{ color: 'rgba(255,255,255,0.6)', minHeight: buttonMinHeight, fontSize: fontSize.button }}
          >
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={handleInviteAdmin}
            sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, minHeight: buttonMinHeight, fontSize: fontSize.button }}
          >
            Opprett
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: '#0d1117',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? 0 : 2,
            minWidth: isMobile ? '100%' : getResponsiveValue(300, 360, 380, 420, 480, 540),
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', fontSize: fontSize.title, p: spacing }}>Generert Passord</DialogTitle>
        <DialogContent sx={{ p: spacing }}>
          <Alert severity="info" sx={{ mb: spacing, bgcolor: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontSize: fontSize.body }}>
            Lagre dette passordet sikkert. Det kan ikke hentes igjen.
          </Alert>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: spacing,
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography sx={{ flex: 1, fontFamily: 'monospace', color: '#fff', fontSize: fontSize.body }}>
              {generatedPassword}
            </Typography>
            <IconButton 
              onClick={() => copyToClipboard(generatedPassword)} 
              sx={{ color: '#8b5cf6', minWidth: iconButtonSize, minHeight: iconButtonSize }}
            >
              <CopyIcon sx={{ fontSize: iconSize }} />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: spacing }}>
          <Button
            variant="contained"
            onClick={() => setShowPasswordDialog(false)}
            sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, minHeight: buttonMinHeight, fontSize: fontSize.button }}
          >
            Lukk
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            bgcolor: snackbar.severity === 'success' ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
            color: '#fff',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
