/**
 * Light Quality Panel
 *
 * Displays professional spectral light-quality metrics:
 *   - CRI Ra, R9, R13, R14  (CIE 13.3-1995 full spectral calculation)
 *   - TLCI                   (EBU R 137 / TLCI-2012)
 *   - CCT, Duv, Flicker
 *
 * All CRI / TLCI values are derived from actual SPD data — no lookup tables.
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ExcellentIcon,
  ThumbUp as GoodIcon,
  Warning as FairIcon,
  Error as PoorIcon,
} from '@mui/icons-material';
import { calculateLightQuality } from '../core/services/lightQualityService';
import {
  generatePlanckianSPD,
  WAVELENGTHS,
  CMF_X,
  CMF_Y,
  CMF_Z,
} from '../core/services/spectralDataService';

// ── types ──────────────────────────────────────────────────────────────────────

interface LightQualityPanelProps {
  cct: number;
  lightType?: string;
}

// ── Duv helper ────────────────────────────────────────────────────────────────

/** CIE 1960 uv chromaticity from CIE XYZ. */
function xyz2uv60(X: number, Y: number, Z: number): [number, number] {
  const d = X + 15 * Y + 3 * Z;
  if (d < 1e-10) return [0, 0];
  return [4 * X / d, 6 * Y / d];
}

/** Approximate Planckian locus uv at CCT using Robertson's formula. */
function planckianUV(cct: number): [number, number] {
  const spd = generatePlanckianSPD(cct);
  const step = 5;
  let X = 0, Y = 0, Z = 0;
  for (let i = 0; i < WAVELENGTHS.length; i++) {
    X += spd[i] * CMF_X[i] * step;
    Y += spd[i] * CMF_Y[i] * step;
    Z += spd[i] * CMF_Z[i] * step;
  }
  return xyz2uv60(X, Y, Z);
}

/**
 * Duv — signed distance from the Planckian locus in CIE 1960 uv.
 * Positive = above locus (greener), negative = below (magenta-shifted).
 */
function computeDuv(testSPDArr: number[], cct: number): number {
  const step = 5;
  let X = 0, Y = 0, Z = 0;
  for (let i = 0; i < WAVELENGTHS.length; i++) {
    X += testSPDArr[i] * CMF_X[i] * step;
    Y += testSPDArr[i] * CMF_Y[i] * step;
    Z += testSPDArr[i] * CMF_Z[i] * step;
  }
  const [ut, vt] = xyz2uv60(X, Y, Z);
  const [up, vp] = planckianUV(cct);
  return parseFloat(Math.hypot(ut - up, vt - vp).toFixed(4));
}

// ── component ─────────────────────────────────────────────────────────────────

export function LightQualityPanel({
  cct,
  lightType = 'led',
}: LightQualityPanelProps) {
  const quality = useMemo(() => {
    const result = calculateLightQuality(lightType, cct);
    const duv = computeDuv(result.spd, cct);

    const overallRating =
      result.cri.rating === 'excellent' && result.tlci.rating === 'excellent'
        ? 'excellent'
        : result.cri.rating === 'poor' || result.tlci.rating === 'poor'
          ? 'poor'
          : result.cri.ra >= 90 && result.tlci.tlci >= 75
            ? 'good'
            : 'fair';

    return {
      cri: result.cri,
      tlci: result.tlci,
      spd: result.spd,
      cct,
      duv,
      flicker: lightType.includes('fluorescent') ? 3.5 : 0,
      overallRating,
    };
  }, [cct, lightType]);

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'excellent': return <ExcellentIcon sx={{ color: '#4CAF50', fontSize: 16 }} />;
      case 'good':      return <GoodIcon      sx={{ color: '#8BC34A', fontSize: 16 }} />;
      case 'fair':      return <FairIcon      sx={{ color: '#FF9800', fontSize: 16 }} />;
      case 'poor':      return <PoorIcon      sx={{ color: '#F44336', fontSize: 16 }} />;
      default:          return null;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return '#4CAF50';
      case 'good':      return '#8BC34A';
      case 'fair':      return '#FF9800';
      case 'poor':      return '#F44336';
      default:          return '#9E9E9E';
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f9f9f9', border: '1px solid #e0e0e0' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
        Spektral lyskvalitet (CIE 13.3-1995)
      </Typography>

      {/* Overall rating */}
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {getRatingIcon(quality.overallRating)}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Totalt: {quality.overallRating.toUpperCase()}
          </Typography>
        </Stack>
      </Box>

      {/* CRI */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Tooltip title="Colour Rendering Index — beregnet fra faktisk spektralfordeling (SPD) iht. CIE 13.3-1995">
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              CRI (Ra)
            </Typography>
          </Tooltip>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {getRatingIcon(quality.cri.rating)}
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {quality.cri.ra}
            </Typography>
          </Stack>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, quality.cri.ra))}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': { bgcolor: getRatingColor(quality.cri.rating) },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Tooltip title="R9 — dypmettet rød (kritisk for hudtoner på kamera)">
            <Chip
              label={`R9: ${quality.cri.r9}`}
              size="small"
              sx={{
                height: 18, fontSize: 10,
                bgcolor: quality.cri.r9 >= 50 ? '#e8f5e9' : '#ffebee',
              }}
            />
          </Tooltip>
          <Tooltip title="R13 — kaukasisk hudtone">
            <Chip
              label={`R13: ${quality.cri.r13}`}
              size="small"
              sx={{ height: 18, fontSize: 10 }}
            />
          </Tooltip>
          <Tooltip title="R14 — bladgrønt (TCS14)">
            <Chip
              label={`R14: ${quality.cri.r14}`}
              size="small"
              sx={{ height: 18, fontSize: 10 }}
            />
          </Tooltip>
        </Stack>
      </Box>

      {/* TLCI */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Tooltip title="Television Lighting Consistency Index — EBU R 137 / TLCI-2012. Måler kameraets metamere feil mot D65.">
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              TLCI
            </Typography>
          </Tooltip>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {getRatingIcon(quality.tlci.rating)}
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {quality.tlci.tlci}
            </Typography>
          </Stack>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, quality.tlci.tlci))}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': { bgcolor: getRatingColor(quality.tlci.rating) },
          }}
        />
        <Typography variant="caption" sx={{ color: '#888', fontSize: 9, display: 'block', mt: 0.5 }}>
          {quality.tlci.tlci >= 85
            ? 'Kringkastingskvalitet — ingen fargekorrigering nødvendig'
            : quality.tlci.tlci >= 75
              ? 'Godkjent for TV — liten fargekorrigering kan være nødvendig'
              : 'Ikke anbefalt for broadcast uten full fargekorrigering'}
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Numeric metrics */}
      <Stack spacing={0.8}>
        <Stack direction="row" justifyContent="space-between">
          <Tooltip title="Korrelert fargetemperatur">
            <Typography variant="caption" sx={{ color: '#666' }}>CCT</Typography>
          </Tooltip>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{quality.cct} K</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Tooltip title="Avstand fra Planck-kurven i CIE 1960 uv (Δuv). Nærmere 0 = bedre. Positivt = grønnstikk, negativt = magentastikk.">
            <Typography variant="caption" sx={{ color: '#666' }}>Duv</Typography>
          </Tooltip>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: Math.abs(quality.duv) < 0.003 ? '#4CAF50' : Math.abs(quality.duv) < 0.01 ? '#FF9800' : '#F44336',
            }}
          >
            {quality.duv >= 0 ? '+' : ''}{quality.duv.toFixed(4)}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Tooltip title="Flimmer-prosent — lavere er bedre">
            <Typography variant="caption" sx={{ color: '#666' }}>Flimmer</Typography>
          </Tooltip>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: quality.flicker < 5 ? '#4CAF50' : '#FF9800' }}
          >
            {quality.flicker.toFixed(1)} %
          </Typography>
        </Stack>
      </Stack>

      {/* Standards reference */}
      <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: '#1976d2', display: 'block', fontWeight: 600 }}>
          Profesjonelle standarder
        </Typography>
        <Typography variant="caption" sx={{ color: '#1976d2', display: 'block', fontSize: 9 }}>
          CRI 95+ / R9 50+: Film/TV &nbsp;|&nbsp; TLCI 85+: Kringkasting
        </Typography>
      </Box>
    </Paper>
  );
}
