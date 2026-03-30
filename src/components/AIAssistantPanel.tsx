/**
 * AI Studio Director Panel
 *
 * GPT-4o-powered orchestrator for Virtual Studio:
 * - Natural language scene control (function calling)
 * - Reference photo → lighting recreation (Vision)
 * - Text → gpt-image-1 → TripoSR GLB asset pipeline
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Movie as DirectorIcon,
  PhotoCamera as CameraIcon,
  ViewInAr as Model3DIcon,
} from '@mui/icons-material';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
  isLoading?: boolean;
}

interface PropGenState {
  status: 'idle' | 'generating-image' | 'converting-3d' | 'done' | 'error';
  jobId?: string;
  description: string;
  modelUrl?: string;
  error?: string;
  progress: number;
}

interface AIAssistantPanelProps {
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const QUICK_BRIEFS = [
  'Tre-punkt belysning for profesjonelt portrett',
  'Dramatisk low-key noir med hardt sidelys',
  'Varm gylden timebelysning, 15° solvinkel',
  'Napoli-restaurant scene, stearinlys og varm glødepære',
];

function dispatchStudioEvents(events: Array<{ event: string; detail: unknown }>) {
  for (const { event, detail } of events) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

export function AIAssistantPanel({ onClose, isFullscreen = false, onToggleFullscreen }: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hei! Jeg er AI Direktøren for Virtual Studio. Beskriv scenen du vil lage, og jeg setter opp lys, kamera og props automatisk. Prøv for eksempel: "Lag en dramatisk portrettscene med varm belysning".',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [refImage, setRefImage] = useState<string | null>(null);
  const [refFileName, setRefFileName] = useState('');
  const [refLoading, setRefLoading] = useState(false);
  const [refResult, setRefResult] = useState<{
    summary: string;
    mood: string;
    light_count: number;
    events: Array<{ event: string; detail: unknown }>;
  } | null>(null);
  const [refApplied, setRefApplied] = useState(false);
  const [refError, setRefError] = useState('');
  const refInputRef = useRef<HTMLInputElement>(null);

  const [propDesc, setPropDesc] = useState('');
  const [propGen, setPropGen] = useState<PropGenState>({
    status: 'idle',
    description: '',
    progress: 0,
  });
  const propPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (propPollRef.current) clearTimeout(propPollRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      setIsSending(true);

      const userMsg: ChatMessage = { role: 'user', content: text };
      const loadingMsg: ChatMessage = { role: 'assistant', content: '', isLoading: true, steps: [] };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInputText('');

      const history = [
        ...messages.filter((m) => !m.isLoading),
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      const accumulatedSteps: string[] = [];
      let finalReply = '';

      try {
        const res = await fetch('/api/ai/director/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Forespørsel feilet');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            let evt: { type: string; text?: string; events?: Array<{ event: string; detail: unknown }> };
            try {
              evt = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (evt.type === 'step' && evt.text) {
              accumulatedSteps.push(evt.text);
              setMessages((prev) =>
                prev.map((m) =>
                  m.isLoading ? { ...m, steps: [...accumulatedSteps] } : m
                )
              );
            } else if (evt.type === 'events' && evt.events?.length) {
              dispatchStudioEvents(evt.events);
            } else if (evt.type === 'reply' && evt.text !== undefined) {
              finalReply = evt.text;
            } else if (evt.type === 'error' && evt.text) {
              finalReply = `Feil: ${evt.text}`;
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading
              ? { role: 'assistant' as const, content: finalReply || 'Ferdig!', steps: accumulatedSteps }
              : m
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ukjent feil';
        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading ? { role: 'assistant' as const, content: `Feil: ${msg}`, steps: accumulatedSteps } : m
          )
        );
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages]
  );

  const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFileName(file.name);
    setRefResult(null);
    setRefApplied(false);
    setRefError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRefImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeReference = async () => {
    if (!refImage) return;
    setRefLoading(true);
    setRefError('');
    setRefResult(null);
    setRefApplied(false);
    try {
      const res = await fetch('/api/ai/analyze-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: refImage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Analyse feilet');
      }
      const data = await res.json();
      setRefResult(data);
    } catch (err) {
      setRefError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setRefLoading(false);
    }
  };

  const handleApplyReference = () => {
    if (!refResult?.events) return;
    dispatchStudioEvents(refResult.events);
    setRefApplied(true);
  };

  const pollTriposrStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/triposr/status/${jobId}`);
      const data = await res.json();
      const status = data.status;

      if (status === 'succeeded') {
        const dlRes = await fetch(`/api/triposr/download/${jobId}`, { method: 'POST' });
        const dlData = await dlRes.json();
        const modelUrl = dlData.url || `/api/triposr/model/${dlData.filename}`;
        setPropGen((prev) => ({
          ...prev,
          status: 'done',
          modelUrl,
          progress: 100,
        }));
        window.dispatchEvent(
          new CustomEvent('vs-add-prop', {
            detail: {
              propId: `triposr-generated-${Date.now()}`,
              modelUrl,
              position: [0, 0, 0],
            },
          })
        );
      } else if (status === 'failed' || status === 'canceled') {
        setPropGen((prev) => ({
          ...prev,
          status: 'error',
          error: 'TripoSR-generering mislyktes.',
          progress: 0,
        }));
      } else {
        setPropGen((prev) => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + 8, 90),
        }));
        propPollRef.current = setTimeout(() => pollTriposrStatus(jobId), 4000);
      }
    } catch (err) {
      console.warn('[PropGen] Polling error:', err);
      propPollRef.current = setTimeout(() => pollTriposrStatus(jobId), 6000);
    }
  }, []);

  const handleGenerateProp = async () => {
    if (!propDesc.trim()) return;
    if (propPollRef.current) clearTimeout(propPollRef.current);
    setPropGen({ status: 'generating-image', description: propDesc, progress: 10 });

    try {
      const res = await fetch('/api/ai/generate-prop-glb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: propDesc }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Generering feilet');
      }
      const data = await res.json();
      const jobId = data.job_id;
      setPropGen((prev) => ({
        ...prev,
        status: 'converting-3d',
        jobId,
        progress: 25,
      }));
      propPollRef.current = setTimeout(() => pollTriposrStatus(jobId), 4000);
    } catch (err) {
      setPropGen({
        status: 'error',
        description: propDesc,
        error: err instanceof Error ? err.message : 'Ukjent feil',
        progress: 0,
      });
    }
  };

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
      {isFullscreen && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            bgcolor: '#1c2128',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AIIcon sx={{ color: '#00d4ff', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              AI Direktør
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {onToggleFullscreen && (
              <IconButton onClick={onToggleFullscreen} sx={{ color: '#ccc' }} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            {onClose && (
              <IconButton onClick={onClose} sx={{ color: '#ccc' }} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': {
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 44,
            py: 0,
            '&.Mui-selected': { color: '#00d4ff' },
          },
          '& .MuiTabs-indicator': { bgcolor: '#00d4ff' },
        }}
      >
        <Tab icon={<DirectorIcon fontSize="small" />} iconPosition="start" label="Direktør" />
        <Tab icon={<CameraIcon fontSize="small" />} iconPosition="start" label="Referanse" />
        <Tab icon={<Model3DIcon fontSize="small" />} iconPosition="start" label="3D Prop" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  mb: 1.5,
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '88%',
                    px: 1.5,
                    py: 1,
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    bgcolor: msg.role === 'user' ? '#00d4ff' : 'rgba(255,255,255,0.07)',
                    border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}
                >
                  {msg.isLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={14} sx={{ color: '#00d4ff' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                        Tenker…
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {msg.steps && msg.steps.length > 0 && (
                        <Box sx={{ mb: 0.5 }}>
                          {msg.steps.map((step, si) => (
                            <Stack key={si} direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.3 }}>
                              <CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                                {step}
                              </Typography>
                            </Stack>
                          ))}
                          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                        </Box>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: msg.role === 'user' ? '#000' : 'rgba(255,255,255,0.9)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.content}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{ flexShrink: 0, px: 1.5, pb: 0.5 }}>
            <Box
              sx={{
                overflowX: 'auto',
                display: 'flex',
                gap: 0.5,
                pb: 0.5,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {QUICK_BRIEFS.map((brief) => (
                <Chip
                  key={brief}
                  label={brief}
                  size="small"
                  onClick={() => sendMessage(brief)}
                  disabled={isSending}
                  sx={{
                    whiteSpace: 'nowrap',
                    bgcolor: 'rgba(0,212,255,0.08)',
                    color: '#00d4ff',
                    border: '1px solid rgba(0,212,255,0.2)',
                    fontSize: 11,
                    cursor: 'pointer',
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.18)' },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              gap: 1,
              px: 1.5,
              pb: 1.5,
              pt: 0.5,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder="Beskriv scenen på norsk…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(inputText);
                }
              }}
              disabled={isSending}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: 13,
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)' },
              }}
            />
            <IconButton
              onClick={() => sendMessage(inputText)}
              disabled={isSending || !inputText.trim()}
              sx={{
                bgcolor: '#00d4ff',
                color: '#000',
                borderRadius: 2,
                width: 40,
                height: 40,
                alignSelf: 'flex-end',
                flexShrink: 0,
                '&:hover': { bgcolor: '#00b8e6' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
              }}
            >
              {isSending ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <SendIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CameraIcon sx={{ color: '#00d4ff', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              Referansebilde → Lysoppsett
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, fontSize: 13 }}>
            Last opp et bilde og AI rekonstruerer lyssettingen direkte i studioet.
          </Typography>

          <input
            ref={refInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleRefImageChange}
          />

          {!refImage ? (
            <Box
              onClick={() => refInputRef.current?.click()}
              sx={{
                border: '2px dashed rgba(0,212,255,0.3)',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'rgba(0,212,255,0.04)',
                '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.08)' },
                mb: 2,
              }}
            >
              <UploadIcon sx={{ fontSize: 40, color: 'rgba(0,212,255,0.5)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                Klikk for å laste opp referansebilde
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                PNG, JPG, WebP
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Box
                component="img"
                src={refImage}
                alt="Referanse"
                sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, mb: 1 }}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  {refFileName}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setRefImage(null);
                    setRefFileName('');
                    setRefResult(null);
                    setRefApplied(false);
                    setRefError('');
                  }}
                  sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'none', minWidth: 0, p: 0.5 }}
                >
                  Fjern
                </Button>
              </Stack>
            </Box>
          )}

          {refImage && !refResult && (
            <Button
              fullWidth
              variant="contained"
              onClick={handleAnalyzeReference}
              disabled={refLoading}
              startIcon={refLoading ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <AIIcon />}
              sx={{
                bgcolor: '#00d4ff',
                color: '#000',
                fontWeight: 700,
                textTransform: 'none',
                mb: 1.5,
                '&:hover': { bgcolor: '#00b8e6' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              {refLoading ? 'Analyserer…' : 'Analyser lyssetting'}
            </Button>
          )}

          {refLoading && (
            <LinearProgress sx={{ mb: 1.5, borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#00d4ff' } }} />
          )}

          {refError && (
            <Alert severity="error" sx={{ mb: 1.5, bgcolor: 'rgba(244,67,54,0.1)', '& .MuiAlert-message': { color: '#ff8a8a' } }}>
              {refError}
            </Alert>
          )}

          {refResult && (
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                mb: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                  Analyse fullført
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, mb: 1 }}>
                {refResult.summary}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Chip
                  label={`${refResult.light_count} lys`}
                  size="small"
                  sx={{ bgcolor: 'rgba(0,212,255,0.15)', color: '#00d4ff', fontSize: 11 }}
                />
                <Chip
                  label={refResult.mood}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,193,7,0.15)', color: '#ffc107', fontSize: 11 }}
                />
              </Stack>
              {!refApplied ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleApplyReference}
                  sx={{
                    bgcolor: '#4caf50',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: 13,
                    '&:hover': { bgcolor: '#43a047' },
                  }}
                >
                  Anvend i studio
                </Button>
              ) : (
                <Alert
                  severity="success"
                  sx={{ bgcolor: 'rgba(76,175,80,0.1)', '& .MuiAlert-message': { color: '#a5d6a7', fontSize: 13 } }}
                >
                  Lysoppsett er lagt inn i studioet!
                </Alert>
              )}
            </Box>
          )}

          {refResult && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => refInputRef.current?.click()}
              sx={{
                color: 'rgba(255,255,255,0.5)',
                borderColor: 'rgba(255,255,255,0.15)',
                textTransform: 'none',
                fontSize: 12,
                '&:hover': { borderColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              Last opp nytt bilde
            </Button>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Model3DIcon sx={{ color: '#00d4ff', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              AI 3D Prop-generator
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, fontSize: 13 }}>
            Beskriv et objekt og AI genererer et 3D-bilde som konverteres til GLB og lastes inn i scenen.
            Tar 60–120 sekunder.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="F.eks: Vintage espressomaskin i rustikk kobber og messing, detaljert"
            value={propDesc}
            onChange={(e) => setPropDesc(e.target.value)}
            disabled={propGen.status !== 'idle' && propGen.status !== 'error' && propGen.status !== 'done'}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: 13,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)' },
            }}
          />

          {(propGen.status === 'idle' || propGen.status === 'error' || propGen.status === 'done') && (
            <Button
              fullWidth
              variant="contained"
              onClick={handleGenerateProp}
              disabled={!propDesc.trim()}
              startIcon={<Model3DIcon />}
              sx={{
                bgcolor: '#7c4dff',
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                mb: 1.5,
                '&:hover': { bgcolor: '#651fff' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
              }}
            >
              Generer 3D-prop
            </Button>
          )}

          {propGen.status === 'generating-image' && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CircularProgress size={16} sx={{ color: '#7c4dff' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  Genererer konseptbilde med gpt-image-1…
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={propGen.progress}
                sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#7c4dff' } }}
              />
            </Box>
          )}

          {propGen.status === 'converting-3d' && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <CircularProgress size={16} sx={{ color: '#7c4dff' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  Konverterer til 3D-modell via TripoSR…
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                Ca. 60–120 sekunder
              </Typography>
              <LinearProgress
                variant="determinate"
                value={propGen.progress}
                sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: '#7c4dff' } }}
              />
            </Box>
          )}

          {propGen.status === 'done' && (
            <Alert
              severity="success"
              sx={{ mb: 1.5, bgcolor: 'rgba(76,175,80,0.1)', '& .MuiAlert-message': { color: '#a5d6a7', fontSize: 13 } }}
            >
              3D-prop generert og lagt inn i scenen!
              {propGen.modelUrl && (
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                  {propGen.modelUrl}
                </Typography>
              )}
            </Alert>
          )}

          {propGen.status === 'error' && (
            <Alert
              severity="error"
              sx={{ mb: 1.5, bgcolor: 'rgba(244,67,54,0.1)', '& .MuiAlert-message': { color: '#ff8a8a', fontSize: 13 } }}
            >
              {propGen.error}
            </Alert>
          )}

          {(propGen.status === 'done' || propGen.status === 'error') && (
            <Button
              size="small"
              onClick={() => setPropGen({ status: 'idle', description: '', progress: 0 })}
              sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: 12 }}
            >
              Generer en ny prop
            </Button>
          )}

          <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            Pipeline: Beskrivelse → GPT-4o optimaliserer prompt → gpt-image-1 genererer bilde →
            TripoSR (Replicate) konverterer til GLB → auto-lastet i Babylon.js
          </Typography>
        </Box>
      )}
    </Box>
  );
}
