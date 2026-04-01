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
  ContentCopy as CopyIcon,
  Replay as RetryIcon,
  Stop as StopIcon,
  DeleteSweep as ClearIcon,
  KeyboardArrowDown as ScrollDownIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  LightbulbOutlined as LightIcon,
  People as PeopleIcon,
  Inventory2Outlined as PropsIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
    __virtualStudioDiagnostics?: {
      environment?: {
        sceneState?: {
          lights?: unknown[];
          props?: unknown[];
          characters?: unknown[];
          sceneName?: string;
          [key: string]: unknown;
        };
      };
    };
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start(): void;
    stop(): void;
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
  isLoading?: boolean;
  suggestions?: string[];
  isError?: boolean;
  timestamp?: number;
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
  'Fashion editorial med hard kontrastbelysning',
  'Mykt skjønnhetslys, octabox, hvit bakgrunn',
  'Produktfotografi med rent hvitt lys og reflektorer',
  'Film noir krimscene, ett enkelt sidelys',
];

const INPUT_PLACEHOLDERS = [
  'Beskriv scenen på norsk…',
  'F.eks. "Dramatisk portrett med varm belysning"…',
  'F.eks. "Legg til rim-lys bak karakteren"…',
  'F.eks. "Analyser og forbedre lyskvaliteten"…',
  'F.eks. "Gjenskap en golden hour-scene utendørs"…',
];

const LS_KEY = 'vs-ai-chat-history';

function dispatchStudioEvents(events: Array<{ event: string; detail: unknown }>) {
  for (const { event, detail } of events) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

const INITIAL_MSG: ChatMessage = {
  role: 'assistant',
  content:
    'Hei! Jeg er AI Direktøren for Virtual Studio. Beskriv scenen du vil lage, og jeg setter opp lys, kamera og props automatisk. Prøv for eksempel: «Lag en dramatisk portrettscene med varm belysning».',
};

export function AIAssistantPanel({ onClose, isFullscreen = false, onToggleFullscreen }: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Load persisted history on mount
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [INITIAL_MSG];
  });

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [sceneName, setSceneName] = useState('');
  const [sceneStats, setSceneStats] = useState({ lights: 0, props: 0, chars: 0 });
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastUserMsgRef = useRef('');

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

  // Persist chat history (skip loading messages to avoid storing stale state)
  useEffect(() => {
    const toSave = messages.filter(m => !m.isLoading);
    try { localStorage.setItem(LS_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }
  }, [messages]);

  // Auto-scroll during token streaming
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Smooth scroll to bottom on first load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Show/hide scroll-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(dist > 150);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Thinking elapsed timer
  useEffect(() => {
    if (isSending) {
      setThinkingSeconds(0);
      timerRef.current = setInterval(() => setThinkingSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setThinkingSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSending]);

  // Rotating input placeholder
  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % INPUT_PLACEHOLDERS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Scene stats and name from diagnostics
  useEffect(() => {
    const updateStats = () => {
      const diag = window.__virtualStudioDiagnostics;
      const ss = diag?.environment?.sceneState;
      if (ss) {
        setSceneStats({
          lights: ss.lights?.length ?? 0,
          props: ss.props?.length ?? 0,
          chars: ss.characters?.length ?? 0,
        });
        if (ss.sceneName) setSceneName(ss.sceneName);
      }
    };
    updateStats();
    const h = () => updateStats();
    window.addEventListener('vs-environment-diagnostics', h);
    window.addEventListener('vs-scene-name-changed', (e: Event) => {
      const name = (e as CustomEvent).detail?.name;
      if (name) setSceneName(name);
    });
    return () => { window.removeEventListener('vs-environment-diagnostics', h); };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      setIsSending(true);
      lastUserMsgRef.current = text;

      // Cancel any in-flight request
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const ctrl = new AbortController();
      abortControllerRef.current = ctrl;

      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
      const loadingMsg: ChatMessage = { role: 'assistant', content: '', isLoading: true, steps: [], timestamp: Date.now() };

      // Dismiss suggestions from previous messages when starting a new send
      setMessages((prev) => prev.map(m => ({ ...m, suggestions: undefined })));

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInputText('');

      const history = [
        ...messages.filter((m) => !m.isLoading),
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      const accumulatedSteps: string[] = [];
      let finalReply = '';
      let finalSuggestions: string[] = [];

      // Capture live scene state (props + lights + camera) so the AI knows exactly what exists
      const sceneContext = (() => {
        const diag = window.__virtualStudioDiagnostics;
        return diag?.environment?.sceneState ?? null;
      })();

      // Capture the rendered Babylon.js canvas as a 768×432 JPEG thumbnail
      // so GPT-4o Vision can actually see the scene, not just its metadata.
      const canvasSnapshot = await (async () => {
        try {
          const src = (document.getElementById('renderCanvas') ?? document.querySelector('canvas')) as HTMLCanvasElement | null;
          if (!src || src.width === 0) return null;
          const thumb = document.createElement('canvas');
          thumb.width = 768;
          thumb.height = Math.round(src.height * (768 / src.width));
          const ctx = thumb.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(src, 0, 0, thumb.width, thumb.height);
          const dataUrl = thumb.toDataURL('image/jpeg', 0.72);
          return dataUrl.split(',')[1] ?? null; // base64 only
        } catch (e) {
          console.warn('[AIDirector] Canvas capture failed:', e);
          return null;
        }
      })();

      try {
        const res = await fetch('/api/ai/director/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, sceneContext, canvasSnapshot }),
          signal: ctrl.signal,
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

            let evt: {
              type: string;
              text?: string;
              items?: string[];
              events?: Array<{ event: string; detail: unknown }>;
            };
            try {
              evt = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (evt.type === 'token' && evt.text) {
              // Real-time character streaming — show partial text immediately
              setMessages((prev) =>
                prev.map((m) =>
                  m.isLoading ? { ...m, content: (m.content || '') + evt.text! } : m
                )
              );
            } else if (evt.type === 'step' && evt.text) {
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
            } else if (evt.type === 'suggestions' && evt.items?.length) {
              finalSuggestions = evt.items;
            } else if (evt.type === 'error' && evt.text) {
              finalReply = `Feil: ${evt.text}`;
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading
              ? {
                  role: 'assistant' as const,
                  content: finalReply || m.content || 'Ferdig!',
                  steps: accumulatedSteps,
                  suggestions: finalSuggestions.length ? finalSuggestions : undefined,
                }
              : m
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.isLoading
                ? { role: 'assistant' as const, content: m.content || 'Avbrutt.', steps: accumulatedSteps }
                : m
            )
          );
        } else {
          const msg = err instanceof Error ? err.message : 'Ukjent feil';
          setMessages((prev) =>
            prev.map((m) =>
              m.isLoading
                ? { role: 'assistant' as const, content: `Feil: ${msg}`, steps: accumulatedSteps, isError: true }
                : m
            )
          );
        }
      } finally {
        setIsSending(false);
        abortControllerRef.current = null;
      }
    },
    [isSending, messages]
  );

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSending(false);
  }, []);

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(console.warn);
  }, []);

  const clearConversation = useCallback(() => {
    if (!window.confirm('Tøm hele samtalen?')) return;
    setMessages([INITIAL_MSG]);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  const retryLastMessage = useCallback(() => {
    if (lastUserMsgRef.current) void sendMessage(lastUserMsgRef.current);
  }, [sendMessage]);

  const toggleVoice = useCallback(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      console.warn('[Voice] SpeechRecognition not supported');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'nb-NO';
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

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

  const pollTriposrStatus = useCallback(async (jobId: string, targetPos: number[] = [0, 0, 0]) => {
    try {
      const res = await fetch(`/api/triposr/status/${jobId}`);
      const data = await res.json();
      const status = data.status;

      if (status === 'succeeded') {
        const dlRes = await fetch(`/api/triposr/download/${jobId}`, { method: 'POST' });
        const dlData = await dlRes.json();
        const modelUrl = dlData.url || `/api/triposr/model/${dlData.filename}`;
        setPropGen((prev) => ({ ...prev, status: 'done', modelUrl, progress: 100 }));
        window.dispatchEvent(
          new CustomEvent('vs-add-prop', {
            detail: { propId: `triposr-generated-${Date.now()}`, modelUrl, position: targetPos },
          })
        );
      } else if (status === 'failed' || status === 'canceled') {
        setPropGen((prev) => ({ ...prev, status: 'error', error: 'TripoSR-generering mislyktes.', progress: 0 }));
      } else {
        setPropGen((prev) => ({ ...prev, progress: Math.min((prev.progress || 0) + 8, 90) }));
        propPollRef.current = setTimeout(() => pollTriposrStatus(jobId, targetPos), 4000);
      }
    } catch (err) {
      console.warn('[PropGen] Polling error:', err);
      propPollRef.current = setTimeout(() => pollTriposrStatus(jobId, targetPos), 6000);
    }
  }, []);

  useEffect(() => {
    const handleDirectorPropRequest = async (e: Event) => {
      const { description, position } = (e as CustomEvent).detail || {};
      if (!description) return;
      if (propPollRef.current) clearTimeout(propPollRef.current);
      setPropDesc(description);
      setPropGen({ status: 'generating-image', description, progress: 10 });
      setActiveTab(2);

      try {
        const res = await fetch('/api/ai/generate-prop-glb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Generering feilet');
        }
        const data = await res.json();
        const jobId = data.job_id;
        const targetPos: number[] = Array.isArray(position) ? position : [0, 0, 0];
        setPropGen((prev) => ({ ...prev, status: 'converting-3d', jobId, progress: 25 }));
        propPollRef.current = setTimeout(() => pollTriposrStatus(jobId, targetPos), 4000);
      } catch (err) {
        setPropGen({
          status: 'error',
          description,
          error: err instanceof Error ? err.message : 'Ukjent feil',
          progress: 0,
        });
      }
    };

    window.addEventListener('vs-ai-prop-generation-started', handleDirectorPropRequest);
    return () => {
      window.removeEventListener('vs-ai-prop-generation-started', handleDirectorPropRequest);
      if (propPollRef.current) clearTimeout(propPollRef.current);
    };
  }, [pollTriposrStatus]);

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
      setPropGen((prev) => ({ ...prev, status: 'converting-3d', jobId, progress: 25 }));
      propPollRef.current = setTimeout(() => pollTriposrStatus(jobId, [0, 0, 0]), 4000);
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

          {/* Scene status bar */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.5,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            bgcolor: 'rgba(0,0,0,0.2)', flexShrink: 0,
          }}>
            {sceneName && (
              <Typography variant="caption" sx={{ color: '#00d4ff', fontWeight: 600, fontSize: 10, mr: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {sceneName}
              </Typography>
            )}
            <Stack direction="row" alignItems="center" spacing={0.3}>
              <LightIcon sx={{ fontSize: 11, color: sceneStats.lights > 0 ? '#ffcc44' : 'rgba(255,255,255,0.25)' }} />
              <Typography variant="caption" sx={{ color: sceneStats.lights > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontSize: 10 }}>{sceneStats.lights}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.3}>
              <PropsIcon sx={{ fontSize: 11, color: sceneStats.props > 0 ? '#88aaff' : 'rgba(255,255,255,0.25)' }} />
              <Typography variant="caption" sx={{ color: sceneStats.props > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontSize: 10 }}>{sceneStats.props}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.3}>
              <PeopleIcon sx={{ fontSize: 11, color: sceneStats.chars > 0 ? '#88ffaa' : 'rgba(255,255,255,0.25)' }} />
              <Typography variant="caption" sx={{ color: sceneStats.chars > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontSize: 10 }}>{sceneStats.chars}</Typography>
            </Stack>
            <Tooltip title="Tøm samtale" placement="top">
              <IconButton onClick={clearConversation} size="small" sx={{ color: 'rgba(255,255,255,0.3)', p: 0.3, '&:hover': { color: '#ff6b6b' } }}>
                <ClearIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box ref={scrollContainerRef} sx={{ flex: 1, overflowY: 'auto', p: 1.5, position: 'relative' }}>
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  mb: 1.5,
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Box sx={{ maxWidth: '88%', position: 'relative', '&:hover .msg-actions': { opacity: 1 } }}>
                  {/* Copy / Retry actions on hover */}
                  {!msg.isLoading && msg.role === 'assistant' && (
                    <Box className="msg-actions" sx={{
                      position: 'absolute', top: -14, right: 0, opacity: 0, transition: 'opacity 0.15s',
                      display: 'flex', gap: 0.3,
                    }}>
                      <Tooltip title="Kopier" placement="top">
                        <IconButton size="small" onClick={() => copyMessage(msg.content)} sx={{ p: 0.3, bgcolor: 'rgba(30,40,60,0.9)', color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
                          <CopyIcon sx={{ fontSize: 11 }} />
                        </IconButton>
                      </Tooltip>
                      {msg.isError && (
                        <Tooltip title="Prøv igjen" placement="top">
                          <IconButton size="small" onClick={retryLastMessage} sx={{ p: 0.3, bgcolor: 'rgba(30,40,60,0.9)', color: '#ff9955', '&:hover': { color: '#ffbb77' } }}>
                            <RetryIcon sx={{ fontSize: 11 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      bgcolor: msg.role === 'user' ? '#00d4ff' : msg.isError ? 'rgba(255,80,80,0.1)' : 'rgba(255,255,255,0.07)',
                      border: msg.role === 'assistant' ? `1px solid ${msg.isError ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.1)'}` : 'none',
                    }}
                  >
                  {msg.isLoading ? (
                    <Box>
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
                          {msg.content && <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />}
                        </Box>
                      )}
                      {msg.content ? (
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                        >
                          {msg.content}
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-block',
                              width: '2px',
                              height: '1em',
                              bgcolor: '#00d4ff',
                              ml: '2px',
                              verticalAlign: 'text-bottom',
                              animation: 'vs-blink 1s step-end infinite',
                              '@keyframes vs-blink': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0 },
                              },
                            }}
                          />
                        </Typography>
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <CircularProgress size={14} sx={{ color: '#00d4ff' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                            Tenker{thinkingSeconds > 2 ? ` (${thinkingSeconds}s)` : '…'}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
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
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {msg.suggestions.map((s) => (
                            <Chip
                              key={s}
                              label={s}
                              size="small"
                              onClick={() => sendMessage(s)}
                              disabled={isSending}
                              sx={{
                                bgcolor: 'rgba(0,212,255,0.06)',
                                color: '#00d4ff',
                                border: '1px solid rgba(0,212,255,0.25)',
                                fontSize: 11,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(0,212,255,0.16)' },
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                  </Box>
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

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && (
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <IconButton
                size="small"
                onClick={() => scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' })}
                sx={{
                  position: 'absolute', bottom: 4, right: 16, zIndex: 10,
                  bgcolor: 'rgba(0,212,255,0.18)', color: '#00d4ff',
                  border: '1px solid rgba(0,212,255,0.35)',
                  width: 28, height: 28,
                  '&:hover': { bgcolor: 'rgba(0,212,255,0.3)' },
                }}
              >
                <ScrollDownIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}

          <Box
            sx={{
              flexShrink: 0,
              px: 1.5,
              pb: 1.5,
              pt: 0.5,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  size="small"
                  placeholder={INPUT_PLACEHOLDERS[placeholderIdx]}
                  value={inputText}
                  onChange={(e) => {
                    if (e.target.value.length <= 600) setInputText(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(inputText);
                    }
                    if (e.key === 'ArrowUp' && !inputText && lastUserMsgRef.current) {
                      e.preventDefault();
                      setInputText(lastUserMsgRef.current);
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
                    '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
                  }}
                />
                {/* Character counter */}
                {inputText.length > 300 && (
                  <Typography variant="caption" sx={{
                    position: 'absolute', bottom: 4, right: 8,
                    fontSize: 9, color: inputText.length > 550 ? '#ff9955' : 'rgba(255,255,255,0.3)',
                    pointerEvents: 'none',
                  }}>
                    {inputText.length}/600
                  </Typography>
                )}
              </Box>

              {/* Voice input */}
              <Tooltip title={isListening ? 'Stopp lytting' : 'Taleinndata'} placement="top">
                <IconButton
                  onClick={toggleVoice}
                  size="small"
                  sx={{
                    width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                    bgcolor: isListening ? 'rgba(255,80,80,0.2)' : 'rgba(255,255,255,0.07)',
                    border: isListening ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(255,255,255,0.12)',
                    color: isListening ? '#ff6b6b' : 'rgba(255,255,255,0.5)',
                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
                  }}
                >
                  <MicIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              {/* Send / Stop button */}
              {isSending ? (
                <Tooltip title={`Stopp (${thinkingSeconds}s)`} placement="top">
                  <IconButton
                    onClick={cancelRequest}
                    sx={{
                      bgcolor: 'rgba(255,80,80,0.18)', color: '#ff6b6b',
                      border: '1px solid rgba(255,80,80,0.35)',
                      borderRadius: 2, width: 40, height: 40, flexShrink: 0,
                      '&:hover': { bgcolor: 'rgba(255,80,80,0.32)' },
                    }}
                  >
                    <StopIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <IconButton
                  onClick={() => void sendMessage(inputText)}
                  disabled={!inputText.trim()}
                  sx={{
                    bgcolor: '#00d4ff', color: '#000',
                    borderRadius: 2, width: 40, height: 40, flexShrink: 0,
                    '&:hover': { bgcolor: '#00b8e6' },
                    '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
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
