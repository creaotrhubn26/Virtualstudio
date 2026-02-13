import { useMemo, type FC, type CSSProperties, type ReactNode } from 'react';
import { Box, Typography, Paper, Stack, Chip, Divider, Tooltip } from '@mui/material';

// Fountain element types
type FountainElement = 
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'centered'
  | 'section'
  | 'synopsis'
  | 'note'
  | 'page_break'
  | 'dual_dialogue';

interface FountainHighlighterProps {
  content: string;
  showLineNumbers?: boolean;
  highlightLine?: number;
  onLineClick?: (lineNumber: number, element: FountainElement) => void;
  fontSize?: number;
  compact?: boolean;
}

interface ParsedLine {
  type: FountainElement;
  content: string;
  lineNumber: number;
  raw: string;
  dualDialogue?: boolean;
}

// Fountain syntax patterns
const SCENE_HEADING_PATTERN = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[\.\s]/i;
const FORCED_SCENE_HEADING_PATTERN = /^\./;
const CHARACTER_PATTERN = /^[A-ZÆØÅ][A-ZÆØÅ0-9\s\-'\.]*(\s*\(.*\))?$/;
const FORCED_CHARACTER_PATTERN = /^@/;
const DUAL_DIALOGUE_PATTERN = /\^$/;
const TRANSITION_PATTERN = /^[A-Z\s]+:$/;
const FORCED_TRANSITION_PATTERN = /^>/;
const CENTERED_PATTERN = /^>.*<$/;
const PARENTHETICAL_PATTERN = /^\(.*\)$/;
const SECTION_PATTERN = /^#+\s/;
const SYNOPSIS_PATTERN = /^=(?!=)/;
const PAGE_BREAK_PATTERN = /^={3,}$/;
const NOTE_PATTERN = /\[\[([^\]]*)\]\]/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /\*([^*]+)\*/g;
const UNDERLINE_PATTERN = /_([^_]+)_/g;

export const FountainHighlighter: FC<FountainHighlighterProps> = ({
  content,
  showLineNumbers = true,
  highlightLine,
  onLineClick,
  fontSize = 12,
  compact = false,
}) => {
  // Parse the entire document
  const parsedLines = useMemo((): ParsedLine[] => {
    const lines = content.split('\n');
    const result: ParsedLine[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      const prevResult = result.length > 0 ? result[result.length - 1] : null;
      
      let type: FountainElement = 'action';
      let dualDialogue = false;
      
      if (!trimmed) {
        type = 'action';
      } else if (PAGE_BREAK_PATTERN.test(trimmed)) {
        type = 'page_break';
      } else if (SECTION_PATTERN.test(trimmed)) {
        type = 'section';
      } else if (SYNOPSIS_PATTERN.test(trimmed)) {
        type = 'synopsis';
      } else if (SCENE_HEADING_PATTERN.test(trimmed) || FORCED_SCENE_HEADING_PATTERN.test(trimmed)) {
        type = 'scene_heading';
      } else if (CENTERED_PATTERN.test(trimmed)) {
        type = 'centered';
      } else if (FORCED_TRANSITION_PATTERN.test(trimmed) && !CENTERED_PATTERN.test(trimmed)) {
        type = 'transition';
      } else if (TRANSITION_PATTERN.test(trimmed) && trimmed === trimmed.toUpperCase()) {
        type = 'transition';
      } else if (PARENTHETICAL_PATTERN.test(trimmed)) {
        if (prevResult && ['character', 'dialogue', 'parenthetical'].includes(prevResult.type)) {
          type = 'parenthetical';
        }
      } else if (FORCED_CHARACTER_PATTERN.test(trimmed)) {
        type = 'character';
        dualDialogue = DUAL_DIALOGUE_PATTERN.test(trimmed);
      } else if (CHARACTER_PATTERN.test(trimmed) && prevResult) {
        // Character name should follow action, dialogue, or parenthetical
        // and should have dialogue or parenthetical after it
        if (['action', 'character', 'parenthetical', 'dialogue'].includes(prevResult.type)) {
          if (nextLine && nextLine.trim() !== '') {
            const nextTrimmed = nextLine.trim();
            // Check if next line looks like dialogue or parenthetical
            const isNextDialogue = !SCENE_HEADING_PATTERN.test(nextTrimmed) &&
                                   !FORCED_SCENE_HEADING_PATTERN.test(nextTrimmed) &&
                                   !TRANSITION_PATTERN.test(nextTrimmed) &&
                                   !FORCED_TRANSITION_PATTERN.test(nextTrimmed) &&
                                   !SECTION_PATTERN.test(nextTrimmed) &&
                                   !PAGE_BREAK_PATTERN.test(nextTrimmed) &&
                                   !CHARACTER_PATTERN.test(nextTrimmed);
            
            if (isNextDialogue) {
              type = 'character';
              dualDialogue = DUAL_DIALOGUE_PATTERN.test(trimmed);
            }
          }
        }
      }
      
      // Check for dialogue
      if (type === 'action' && prevResult) {
        if (['character', 'parenthetical', 'dialogue'].includes(prevResult.type)) {
          if (trimmed && !CHARACTER_PATTERN.test(trimmed) && !PARENTHETICAL_PATTERN.test(trimmed)) {
            type = 'dialogue';
          }
        }
      }
      
      result.push({
        type,
        content: trimmed,
        lineNumber: i + 1,
        raw: line,
        dualDialogue,
      });
    }
    
    return result;
  }, [content]);

  // Get color for element type
  const getElementColor = (type: FountainElement): string => {
    const colors: Record<FountainElement, string> = {
      scene_heading: '#fbbf24', // Amber
      action: '#e5e5e5', // Light gray
      character: '#60a5fa', // Blue
      dialogue: '#f5f5f5', // White
      parenthetical: '#a78bfa', // Purple
      transition: '#f472b6', // Pink
      centered: '#34d399', // Green
      section: '#f97316', // Orange
      synopsis: '#6b7280', // Gray
      note: '#9ca3af', // Light gray
      page_break: '#4b5563', // Dark gray
      dual_dialogue: '#60a5fa', // Blue
    };
    return colors[type];
  };

  // Get styling for element type
  const getElementStyle = (type: FountainElement, dualDialogue?: boolean): CSSProperties => {
    const baseStyle: CSSProperties = {
      fontFamily: 'Courier Prime, Courier New, monospace',
      fontSize: `${fontSize}pt`,
      lineHeight: compact ? 1.3 : 1.5,
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      color: getElementColor(type),
    };
    
    switch (type) {
      case 'scene_heading':
        return {
          ...baseStyle,
          fontWeight: 700,
          textTransform: 'uppercase',
          marginTop: compact ? '0.75em' : '1.5em',
          marginBottom: compact ? '0.25em' : '0.5em',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          padding: '2px 4px',
          borderLeft: '3px solid #fbbf24',
        };
      case 'character':
        return {
          ...baseStyle,
          fontWeight: 600,
          textTransform: 'uppercase',
          marginLeft: dualDialogue ? '50%' : '37%',
          marginTop: compact ? '0.5em' : '1em',
        };
      case 'dialogue':
        return {
          ...baseStyle,
          marginLeft: '17%',
          marginRight: '17%',
        };
      case 'parenthetical':
        return {
          ...baseStyle,
          fontStyle: 'italic',
          marginLeft: '27%',
          marginRight: '27%',
        };
      case 'transition':
        return {
          ...baseStyle,
          fontWeight: 600,
          textTransform: 'uppercase',
          textAlign: 'right',
          marginTop: compact ? '0.5em' : '1em',
          marginBottom: compact ? '0.5em' : '1em',
        };
      case 'centered':
        return {
          ...baseStyle,
          textAlign: 'center',
        };
      case 'section':
        return {
          ...baseStyle,
          fontWeight: 700,
          fontSize: `${fontSize + 2}pt`,
          marginTop: compact ? '1em' : '2em',
          borderBottom: '1px solid rgba(249, 115, 22, 0.3)',
          paddingBottom: '0.25em',
        };
      case 'synopsis':
        return {
          ...baseStyle,
          fontStyle: 'italic',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          padding: '4px 8px',
          borderRadius: '4px',
        };
      case 'page_break':
        return {
          ...baseStyle,
          textAlign: 'center',
          borderTop: '1px dashed #4b5563',
          marginTop: compact ? '0.5em' : '1em',
          marginBottom: compact ? '0.5em' : '1em',
          paddingTop: '0.25em',
        };
      case 'note':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          padding: '2px 4px',
          borderRadius: '2px',
        };
      default:
        return baseStyle;
    }
  };

  // Format inline styles (bold, italic, underline, notes)
  const formatInlineStyles = (text: string): ReactNode => {
    if (!text) return '\u00A0';
    
    // Replace patterns with spans
    let result: ReactNode[] = [];
    let lastIndex = 0;
    const parts: { start: number; end: number; type: string; content: string }[] = [];
    
    // Find all matches
    let match: RegExpExecArray | null;
    
    // Notes [[text]]
    const noteRegex = /\[\[([^\]]*)\]\]/g;
    while ((match = noteRegex.exec(text)) !== null) {
      parts.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'note',
        content: match[1],
      });
    }
    
    // Bold **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    while ((match = boldRegex.exec(text)) !== null) {
      parts.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold',
        content: match[1],
      });
    }
    
    // Italic *text*
    const italicRegex = /\*([^*]+)\*/g;
    while ((match = italicRegex.exec(text)) !== null) {
      // Skip if this is part of bold
      const currentMatch = match;
      const isBold = parts.some(p => p.type === 'bold' && currentMatch && p.start <= currentMatch.index && p.end >= currentMatch.index + currentMatch[0].length);
      if (!isBold) {
        parts.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'italic',
          content: match[1],
        });
      }
    }
    
    // Underline _text_
    const underlineRegex = /_([^_]+)_/g;
    while ((match = underlineRegex.exec(text)) !== null) {
      parts.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'underline',
        content: match[1],
      });
    }
    
    // Sort parts by position
    parts.sort((a, b) => a.start - b.start);
    
    // Build result
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Add text before this part
      if (part.start > lastIndex) {
        result.push(text.substring(lastIndex, part.start));
      }
      
      // Add styled part
      switch (part.type) {
        case 'note':
          result.push(
            <Tooltip key={i} title="Notat">
              <span style={{ 
                backgroundColor: 'rgba(156, 163, 175, 0.2)', 
                padding: '0 4px',
                borderRadius: '2px',
                color: '#9ca3af',
              }}>
                [{part.content}]
              </span>
            </Tooltip>
          );
          break;
        case 'bold':
          result.push(<strong key={i}>{part.content}</strong>);
          break;
        case 'italic':
          result.push(<em key={i}>{part.content}</em>);
          break;
        case 'underline':
          result.push(<u key={i}>{part.content}</u>);
          break;
      }
      
      lastIndex = part.end;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    
    return result.length > 0 ? result : text;
  };

  // Clean display content
  const cleanContent = (line: ParsedLine): string => {
    let content = line.content;
    
    // Remove forced markers
    if (line.type === 'scene_heading' && content.startsWith('.')) {
      content = content.substring(1);
    }
    if (line.type === 'character' && content.startsWith('@')) {
      content = content.substring(1);
    }
    if (line.type === 'transition' && content.startsWith('>')) {
      content = content.substring(1);
    }
    if (line.type === 'centered') {
      content = content.replace(/^>/, '').replace(/<$/, '');
    }
    // Remove dual dialogue marker
    content = content.replace(/\^$/, '');
    
    return content;
  };

  return (
    <Box sx={{ fontFamily: 'Courier Prime, Courier New, monospace' }}>
      {parsedLines.map((line, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            cursor: onLineClick ? 'pointer' : 'default',
            backgroundColor: highlightLine === line.lineNumber ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
            '&:hover': onLineClick ? { backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {},
          }}
          onClick={() => onLineClick?.(line.lineNumber, line.type)}
        >
          {/* Line Number */}
          {showLineNumbers && (
            <Typography
              component="span"
              sx={{
                width: 40,
                minWidth: 40,
                textAlign: 'right',
                pr: 1.5,
                color: highlightLine === line.lineNumber ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                fontSize: `${fontSize}pt`,
                fontFamily: 'inherit',
                lineHeight: compact ? 1.3 : 1.5,
                userSelect: 'none',
              }}
            >
              {line.lineNumber}
            </Typography>
          )}
          
          {/* Content */}
          <Box
            sx={{
              flex: 1,
              ...getElementStyle(line.type, line.dualDialogue),
              minHeight: `${fontSize * (compact ? 1.3 : 1.5)}pt`,
            }}
          >
            {formatInlineStyles(cleanContent(line))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Mini preview component for screenplay content
 */
export const FountainMiniPreview: FC<{
  content: string;
  maxLines?: number;
}> = ({ content, maxLines = 10 }) => {
  const lines = content.split('\n').slice(0, maxLines);
  
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 1.5, 
        bgcolor: 'rgba(0,0,0,0.3)',
        maxHeight: 200,
        overflow: 'hidden',
      }}
    >
      <FountainHighlighter 
        content={lines.join('\n')} 
        showLineNumbers={false}
        fontSize={9}
        compact
      />
      {content.split('\n').length > maxLines && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          ... og {content.split('\n').length - maxLines} linjer til
        </Typography>
      )}
    </Paper>
  );
};

export default FountainHighlighter;
