/**
 * Utility functions for Course Creator components
 */

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimecode = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const parseTimecode = (timecode: string): number => {
  // Supports formats: HH:MM:SS, MM:SS, HH:MM:SS.mmm, MM:SS.mmm
  const parts = timecode.split(':');
  if (parts.length === 2) {
    // MM:SS or MM:SS.mmm
    const [mins, secsPart] = parts;
    const secsParts = secsPart.split('.');
    const secs = parseFloat(secsParts[0] || '0');
    const ms = parseFloat(secsParts[1] || '0') / 1000;
    return parseInt(mins) * 60 + secs + ms;
  } else if (parts.length === 3) {
    // HH:MM:SS or HH:MM:SS.mmm
    const [hours, mins, secsPart] = parts;
    const secsParts = secsPart.split('.');
    const secs = parseFloat(secsParts[0] || '0');
    const ms = parseFloat(secsParts[1] || '0') / 1000;
    return parseInt(hours) * 3600 + parseInt(mins) * 60 + secs + ms;
  }
  return parseFloat(timecode) || 0;
};


















