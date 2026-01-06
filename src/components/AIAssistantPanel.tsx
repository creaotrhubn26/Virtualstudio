/**
 * AI Scene Assistant Panel
 * 
 * Comprehensive AI-powered assistant for scene composition, lighting, and optimization
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Lightbulb as IdeaIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  School as LearnIcon,
  AutoAwesome as AIIcon,
  TrendingUp as ImprovementIcon,
} from '@mui/icons-material';
import { Tabs, Tab, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  reasoning: string;
  expectedImprovement: string;
  difficulty: string;
}

interface AIAssistantPanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function AIAssistantPanel({ onClose, isFullscreen = false, onToggleFullscreen }: AIAssistantPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [analysis, setAnalysis] = useState({
    qualityScore: 75,
    grade: 'B+',
    summary: 'Scene-komposisjonen er god, men kan optimaliseres med noen justeringer.',
    recommendations: [
      {
        id: '1',
        title: 'Optimaliser kamera-vinkel',
        description: 'Juster kameraet for bedre rammekomposisjon basert på rule of thirds.',
        priority: 'high' as const,
        category: 'composition',
        reasoning: 'Nåværende vinkel kan forbedres for bedre visuell balanse.',
        expectedImprovement: '+15% visuell appell',
        difficulty: 'Easy',
      },
      {
        id: '2',
        title: 'Tilføy fill-lys',
        description: 'Legg til et fill-lys for å redusere harde skygger.',
        priority: 'medium' as const,
        category: 'lighting',
        reasoning: 'Fill-lys vil gi mer jevn belysning og bedre detaljgjengivelse.',
        expectedImprovement: '+10% kvalitet',
        difficulty: 'Medium',
      },
      {
        id: '3',
        title: 'Juster HDRI-eksponering',
        description: 'Reduser HDRI-eksponeringen med 0.5 stops for bedre balanse.',
        priority: 'low' as const,
        category: 'exposure',
        reasoning: 'Mindre justering vil gi bedre eksponering uten å miste detaljer.',
        expectedImprovement: '+5% eksponering',
        difficulty: 'Easy',
      },
    ],
    suggestedPatterns: [
      {
        id: '1',
        name: 'Three-Point Lighting',
        description: 'Klassisk belysningsmønster som gir dybde og dimensjon.',
      },
      {
        id: '2',
        name: 'Rembrandt Lighting',
        description: 'Dramatisk belysning med karakteristisk trekant på kinnet.',
      },
    ],
  });

  // Simulate loading on mount
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <WarningIcon fontSize="small" />;
      case 'medium':
        return <IdeaIcon fontSize="small" />;
      case 'low':
        return <LearnIcon fontSize="small" />;
      default:
        return <IdeaIcon fontSize="small" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'composition':
        return <AIIcon fontSize="small" />;
      case 'lighting':
        return <IdeaIcon fontSize="small" />;
      case 'exposure':
        return <ImprovementIcon fontSize="small" />;
      case 'camera':
        return <AIIcon fontSize="small" />;
      default:
        return <IdeaIcon fontSize="small" />;
    }
  };

  const handleApplyRecommendation = (recommendation: AIRecommendation) => {
    // Dispatch event to apply recommendation
    window.dispatchEvent(new CustomEvent('ai-assistant-apply', { detail: recommendation }));
    alert(`Anbefaling "${recommendation.title}" vil bli anvendt på scenen.`);
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#4CAF50';
    if (grade.startsWith('B')) return '#8BC34A';
    if (grade.startsWith('C')) return '#FF9800';
    if (grade.startsWith('D')) return '#F44336';
    return '#9E9E9E';
  };

  // Show loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: '#0d1117',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <CircularProgress sx={{ color: '#00d4ff', mb: 2 }} size={48} />
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
          Analyserer scene...
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          AI-assistenten analyserer komposisjon, belysning og optimalisering
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      {isFullscreen && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            bgcolor: '#1c2128',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AIIcon sx={{ color: '#00d4ff', fontSize: 32 }} />
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
              AI Scene Assistant
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onToggleFullscreen && (
              <IconButton onClick={onToggleFullscreen} sx={{ color: '#fff' }} title="Gå tilbake til panel">
                <CloseIcon />
              </IconButton>
            )}
            {onClose && (
              <IconButton onClick={onClose} sx={{ color: '#fff' }}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <AIIcon sx={{ color: '#00d4ff', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, flex: 1 }}>
            AI Scene Assistant
          </Typography>
        <Chip
          label={`${analysis.qualityScore}/100`}
          sx={{
            bgcolor: getGradeColor(analysis.grade),
            color: 'white',
            fontWeight: 600}}
        />
        <Chip
          label={`Grade ${analysis.grade}`}
          sx={{
            bgcolor: getGradeColor(analysis.grade),
            color: 'white',
            fontWeight: 600}}
        />
      </Stack>

      {/* Quality Score Bar */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Overall Quality
          </Typography>
          <Typography variant="caption" sx={{ color: '#666', fontWeight: 600}}>
            {analysis.qualityScore}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={analysis.qualityScore}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
              bgcolor: getGradeColor(analysis.grade),
            }}}
        />
      </Box>

      {/* Summary */}
      <Alert
        severity={analysis.qualityScore >= 75 ? 'success' : analysis.qualityScore >= 60 ? 'warning' : 'error'}
        icon={<AIIcon />}
        sx={{ mb: 2 }}
      >
        <Typography variant="caption" sx={{ fontWeight: 500}}>
          {analysis.summary}
        </Typography>
      </Alert>

      <Divider sx={{ my: 2 }} />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            mb: 3,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              '&.Mui-selected': { color: '#00d4ff' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#00d4ff' },
          }}
        >
          <Tab label="Anbefalinger" />
          <Tab label="Komposisjon" />
          <Tab label="Optimalisering" />
        </Tabs>

        {/* Recommendations Tab */}
        {activeTab === 0 && (
          <>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                display: 'block',
                mb: 2,
                color: '#ffffff',
                fontSize: '18px',
              }}
            >
              🎯 Anbefalinger ({analysis.recommendations.length})
            </Typography>

            <Box sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
              <Stack spacing={2}>
                {analysis.recommendations.map((rec) => (
                  <Card
                    key={rec.id}
                    variant="outlined"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { borderColor: '#00d4ff' },
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        {getPriorityIcon(rec.priority)}
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            flex: 1,
                            fontSize: 15,
                            color: '#ffffff',
                          }}
                        >
                          {rec.title}
                        </Typography>
                        <Chip
                          label={rec.priority === 'high' ? 'Høy' : rec.priority === 'medium' ? 'Middels' : 'Lav'}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: 11,
                            bgcolor: getPriorityColor(rec.priority),
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="body2"
                        sx={{
                          display: 'block',
                          mb: 1,
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        {rec.description}
                      </Typography>

                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    bgcolor: 'transparent', '&:before': { display: 'none' },
                    mt: 0.5}}
                >
                  <AccordionSummary
                    expandIcon={<ExpandIcon sx={{ fontSize: 16 }} />}
                    sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                  >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 12,
                          color: '#00d4ff',
                          fontWeight: 600,
                        }}
                      >
                        Hvorfor dette betyr noe
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0, pt: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.7)',
                          lineHeight: 1.6,
                        }}
                      >
                        {rec.reasoning}
                      </Typography>
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: 'rgba(0,212,255,0.1)',
                          borderRadius: 1,
                          border: '1px solid rgba(0,212,255,0.2)',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SuccessIcon sx={{ fontSize: 16, color: '#00d4ff' }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 13,
                              color: '#00d4ff',
                              fontWeight: 600,
                            }}
                          >
                            Forventet forbedring: {rec.expectedImprovement}
                          </Typography>
                        </Stack>
                      </Box>
                    </AccordionDetails>
                </Accordion>
              </CardContent>

              <CardActions sx={{ pt: 0, px: 2, pb: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleApplyRecommendation(rec)}
                  sx={{
                    textTransform: 'none',
                    fontSize: 12,
                    bgcolor: '#00d4ff',
                    color: '#000',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#00b8e6' },
                  }}
                >
                  Anvend
                </Button>
                <Chip
                  label={rec.difficulty}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    ml: 'auto',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                />
              </CardActions>
            </Card>
          ))}
        </Stack>
            </Box>
          </>
        )}

        {/* Composition Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                display: 'block',
                mb: 2,
                color: '#ffffff',
                fontSize: '18px',
              }}
            >
              🎨 Komposisjonsanalyse
            </Typography>
            <Alert
              severity="info"
              sx={{
                mb: 2,
                bgcolor: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                '& .MuiAlert-icon': { color: '#00d4ff' },
              }}
            >
              <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Komposisjonsscore: 78%
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                Scenen følger rule of thirds godt, men kan forbedres med justeringer i dybde og fokus.
              </Typography>
            </Alert>
            <Stack spacing={2}>
              <Card
                variant="outlined"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 15, color: '#ffffff', mb: 1 }}>
                    Juster kamera-vinkel
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    Flytt kameraet 15° til høyre for bedre balanse i rammen.
                  </Typography>
                </CardContent>
              </Card>
              <Card
                variant="outlined"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 15, color: '#ffffff', mb: 1 }}>
                    Optimaliser dybdeskarphet
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    Reduser aperture til f/2.8 for bedre fokus på hovedmotivet.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}

        {/* Optimization Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                display: 'block',
                mb: 2,
                color: '#ffffff',
                fontSize: '18px',
              }}
            >
              ⚡ Optimalisering
            </Typography>
            <Alert
              severity="success"
              sx={{
                mb: 2,
                bgcolor: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                '& .MuiAlert-icon': { color: '#10b981' },
              }}
            >
              <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                Ytelsesoptimalisering
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
                Scenen er godt optimalisert. FPS: 60, Render time: 16ms
              </Typography>
            </Alert>
            <Stack spacing={2}>
              <Card
                variant="outlined"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 15, color: '#ffffff', mb: 1 }}>
                    Reduser polygon-telling
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    Noen objekter kan forenkles uten å miste visuell kvalitet. Forventet FPS-forbedring: +5-10
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}

        {/* Suggested Patterns */}
        {analysis.suggestedPatterns.length > 0 && activeTab === 0 && (
          <>
            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                display: 'block',
                mb: 2,
                color: '#ffffff',
                fontSize: '18px',
              }}
            >
              🎬 Foreslåtte mønstre
            </Typography>
            <Stack spacing={2}>
              {analysis.suggestedPatterns.map((pattern) => (
                <Box
                  key={pattern.id}
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    '&:hover': { borderColor: '#00d4ff' },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 15, color: '#ffffff', mb: 0.5 }}>
                    {pattern.name}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    {pattern.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            p: 2,
            bgcolor: 'rgba(0,212,255,0.1)',
            borderRadius: 2,
            border: '1px solid rgba(0,212,255,0.2)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#00d4ff',
              display: 'block',
              fontWeight: 700,
              fontSize: 14,
              mb: 0.5,
            }}
          >
            💡 AI-drevet analyse
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            Basert på ASC-standarder, cinematografi best practices og bransjeforskning
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

