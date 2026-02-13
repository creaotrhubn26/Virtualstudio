# Script-Storyboard Integration Guide

## Overview

The Script-Storyboard Integration enables simultaneous screenplay writing and storyboard frame creation with bidirectional sync. This matches the workflow shown in professional tools like Apple Storyboards, where script context informs frame creation.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                  ScriptStoryboardProvider                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    ScriptStoryboardContext                  ││
│  │  - currentSceneContext                                      ││
│  │  - dialogueContext                                          ││
│  │  - scriptPosition (line, character)                         ││
│  │  - activeFrameId                                            ││
│  │  - frameToScriptLinks[]                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌───────────────────┐
│ScreenplayEditor│   │StoryboardIntView │   │DrawingToolsPanel  │
│ (Script Side) │◄──►│ (Frame Canvas)   │◄──►│ (Drawing Tools)   │
└───────────────┘   └──────────────────┘   └───────────────────┘
```

### Files Created/Modified

| File | Purpose |
|------|---------|
| `src/contexts/ScriptStoryboardContext.tsx` | React Context for sync state |
| `src/components/ScriptStoryboardSplitView.tsx` | Side-by-side split layout |
| `src/core/models/casting.ts` | Extended `StoryboardFrame` & `SceneBreakdown` |
| `src/components/drawing/DrawingToolsPanel.tsx` | Added script context banner |
| `src/components/StoryboardIntegrationView.tsx` | Added sync mode & script linking |
| `src/contexts/index.ts` | Barrel export for all contexts |

---

## Usage

### 1. Wrap Your App with the Provider

```tsx
import { ScriptStoryboardProvider } from '../contexts/ScriptStoryboardContext';

function App() {
  return (
    <ScriptStoryboardProvider>
      <YourAppContent />
    </ScriptStoryboardProvider>
  );
}
```

### 2. Use the Split View Component

```tsx
import ScriptStoryboardSplitView from './ScriptStoryboardSplitView';

<ScriptStoryboardSplitView
  scene={currentScene}  // SceneBreakdown
  initialScriptContent={fountainContent}
  initialFrameIndex={0}
  onScriptChange={(content) => saveScript(content)}
  onFrameSelect={(index) => setActiveFrame(index)}
  renderScriptEditor={(props) => <ScreenplayEditor {...props} />}
  renderStoryboardCanvas={(props) => <StoryboardIntegrationView {...props} />}
/>
```

### 3. Access Context in Child Components

```tsx
import { useScriptStoryboard } from '../contexts/ScriptStoryboardContext';

function MyComponent() {
  const {
    currentSceneContext,
    dialogueContext,
    scriptPosition,
    activeFrameId,
    setScriptPosition,
    setActiveFrame,
    linkFrameToScript,
    getFrameLink,
  } = useScriptStoryboard();

  // React to script position changes
  useEffect(() => {
    if (scriptPosition.lineNumber) {
      scrollToLine(scriptPosition.lineNumber);
    }
  }, [scriptPosition]);

  return <div>...</div>;
}
```

---

## Data Models

### StoryboardFrame (Extended)

```typescript
interface StoryboardFrame {
  id: string;
  shotNumber: string;
  description: string;
  cameraAngle: string;
  movement: string;
  duration: number;
  
  // Script linking - NEW
  sceneId?: string;                      // Links to SceneBreakdown.id
  scriptLineRange?: [number, number];    // Start/end line in script
  dialogueCharacter?: string;            // Character speaking
  dialogueText?: string;                 // Dialogue line
  actionDescription?: string;            // Action from script
  
  // Drawing data - NEW
  drawingData?: {
    strokes: any[];
    layers: any[];
    template?: { aspectRatio: string; guides: string; };
  };
  
  imageSource?: 'ai' | 'captured' | 'drawn' | 'uploaded' | 'generated';
  generatedFromScript?: boolean;
}
```

### SceneBreakdown (Extended)

```typescript
interface SceneBreakdown {
  // ... existing fields ...
  
  // Storyboard integration - NEW
  storyboardFrames?: StoryboardFrame[];
}
```

### ScriptStoryboardState

```typescript
interface ScriptStoryboardState {
  // Current script context
  currentSceneContext: SceneContext | null;
  dialogueContext: DialogueContext | null;
  scriptPosition: ScriptPosition;
  
  // Storyboard state
  activeFrameId: string | null;
  activeFrameIndex: number;
  
  // Sync settings
  syncEnabled: boolean;
  autoAdvanceFrame: boolean;
  
  // Links between frames and script lines
  frameToScriptLinks: StoryboardFrameLink[];
}
```

---

## Features

### 1. Bidirectional Sync

When enabled, navigating in the script automatically selects the corresponding storyboard frame:

```tsx
// In script editor
const handleCursorChange = (line: number, character: string) => {
  setScriptPosition({ lineNumber: line, characterName: character });
};

// In storyboard view
useEffect(() => {
  const link = getFrameLink(activeFrameId);
  if (link?.lineRange) {
    scrollScriptToLine(link.lineRange[0]);
  }
}, [activeFrameId]);
```

### 2. Frame-to-Script Linking

Associate storyboard frames with specific lines:

```tsx
const handleLinkFrame = (frameId: string) => {
  linkFrameToScript(frameId, {
    lineRange: [scriptPosition.lineNumber, scriptPosition.lineNumber],
    character: scriptPosition.characterName,
    sceneId: currentSceneContext?.sceneId,
  });
};
```

### 3. Split Pane Layout

Resizable panels with collapse support:

```tsx
<ScriptStoryboardSplitView
  defaultLeftWidth={50}           // 50% default
  collapsedWidth={48}             // Collapsed panel width in px
  minPaneWidth={300}              // Minimum panel width
  initialSyncEnabled={true}       // Sync on by default
/>
```

### 4. Script Context Banner

When `ScriptContext` is set in `DrawingToolsPanel`, a banner shows:

- Current scene heading
- Active character (if dialogue)
- Dialogue text being illustrated

---

## Integration Examples

### With ScreenplayEditor

```tsx
import ScreenplayEditor from './ScreenplayEditor';
import { useScriptStoryboard } from '../contexts';

function IntegratedEditor() {
  const { setScriptPosition, setCurrentScene } = useScriptStoryboard();

  const handleEditorChange = (elements: FountainElement[]) => {
    // Find current scene
    const scene = elements.find(e => e.type === 'scene_heading');
    if (scene) {
      setCurrentScene({
        sceneId: scene.id,
        sceneHeading: scene.text,
        sceneNumber: extractSceneNumber(scene.text),
      });
    }
  };

  return (
    <ScreenplayEditor
      onCursorPositionChange={({ line, element }) => {
        setScriptPosition({
          lineNumber: line,
          characterName: element?.type === 'character' ? element.text : undefined,
        });
      }}
      onChange={handleEditorChange}
    />
  );
}
```

### With StoryboardIntegrationView

```tsx
import StoryboardIntegrationView from './StoryboardIntegrationView';
import { useScriptStoryboard } from '../contexts';

function IntegratedStoryboard() {
  const { 
    activeFrameIndex,
    setActiveFrame,
    linkFrameToScript,
    scriptPosition,
  } = useScriptStoryboard();

  return (
    <StoryboardIntegrationView
      activeFrameIndex={activeFrameIndex}
      onFrameSelect={(index, frame) => {
        setActiveFrame(frame.id, index);
      }}
      onLinkToScript={(frameId) => {
        linkFrameToScript(frameId, {
          lineRange: [scriptPosition.lineNumber, scriptPosition.lineNumber],
          sceneId: currentScene.id,
        });
      }}
      showScriptPanel={true}
    />
  );
}
```

---

## Best Practices

1. **Always wrap** components needing sync in `ScriptStoryboardProvider`
2. **Use the hook** `useScriptStoryboard()` for all context access
3. **Link frames explicitly** when creating new storyboard frames from script
4. **Enable sync selectively** - allow users to toggle sync for focused work
5. **Debounce rapid updates** - the context includes 150ms debounce for position changes

---

## Keyboard Shortcuts (Recommended)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + [` | Previous frame |
| `Cmd/Ctrl + ]` | Next frame |
| `Cmd/Ctrl + L` | Link current frame to script position |
| `Cmd/Ctrl + Shift + S` | Toggle sync mode |
| `Cmd/Ctrl + \\` | Toggle split view |

---

## Troubleshooting

### Sync Not Working

1. Ensure `ScriptStoryboardProvider` wraps both script and storyboard components
2. Check that `syncEnabled` is `true` in context
3. Verify `frameToScriptLinks` contains valid entries

### Frame Links Missing

1. Frames must be explicitly linked using `linkFrameToScript()`
2. Auto-generated frames from script parsing set `generatedFromScript: true`

### Context Not Available

```tsx
// Use the custom hook, not raw useContext
import { useScriptStoryboard } from '../contexts/ScriptStoryboardContext';

// ❌ Wrong
const ctx = useContext(ScriptStoryboardContext);

// ✅ Correct
const ctx = useScriptStoryboard();
```
